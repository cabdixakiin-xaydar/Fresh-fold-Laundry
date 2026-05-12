from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import Invoice
from customers.models import Customer
from orders.models import Order, OrderItem, OrderStatus


def requested_date(request):
    raw_value = request.query_params.get('date')
    if not raw_value:
        return timezone.localdate()
    parsed = parse_date(raw_value)
    return parsed or timezone.localdate()


class DashboardView(APIView):
    """KPI snapshot for executive dashboard (documentation §10)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_date = requested_date(request)
        orders_qs = Order.objects.filter(created_at__date__lte=target_date)
        pending_statuses = (
            OrderStatus.RECEIVED,
            OrderStatus.PROCESSING,
            OrderStatus.READY,
        )
        data = {
            'total_orders': orders_qs.count(),
            'orders_today': orders_qs.filter(created_at__date=target_date).count(),
            'pending_orders': orders_qs.filter(status__in=pending_statuses).count(),
            'revenue_total': str(
                Invoice.objects.filter(
                    payment_status='paid', issued_at__date__lte=target_date
                ).aggregate(
                    s=Sum('total')
                )['s']
                or 0
            ),
            'customers_total': Customer.objects.filter(created_at__date__lte=target_date).count(),
        }
        return Response(data)


class SalesReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'daily')
        days_map = {'daily': 14, 'weekly': 84, 'monthly': 365}
        days = days_map.get(period, 14)
        end_date = requested_date(request)
        start_date = end_date - timedelta(days=days - 1)
        rows = (
            Invoice.objects.filter(issued_at__date__gte=start_date, issued_at__date__lte=end_date)
            .annotate(day=TruncDate('issued_at'))
            .values('day')
            .annotate(count=Count('id'), revenue=Sum('total'))
            .order_by('day')
        )
        return Response({'period': period, 'series': list(rows)})


class ServicePopularityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_date = requested_date(request)
        rows = (
            OrderItem.objects.filter(order__created_at__date__lte=target_date)
            .values('service_type__name', 'service_type__code')
            .annotate(line_count=Count('id'))
            .order_by('-line_count')[:20]
        )
        return Response(list(rows))


class FinancialSummaryView(APIView):
    """Lightweight profit view: revenue from paid invoices (expand with expenses later)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_date = requested_date(request)
        paid = Invoice.objects.filter(
            payment_status='paid', issued_at__date__lte=target_date
        ).aggregate(
            revenue=Sum('total')
        )['revenue'] or 0
        outstanding = Invoice.objects.exclude(payment_status='paid').filter(
            issued_at__date__lte=target_date
        ).aggregate(
            due=Sum('total')
        )['due'] or 0
        return Response(
            {
                'revenue_paid_invoices': str(paid),
                'outstanding_invoice_total': str(outstanding),
            }
        )
