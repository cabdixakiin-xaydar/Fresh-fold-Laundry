from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth
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


def period_range(request):
    period = request.query_params.get('period', 'daily')
    days_map = {'daily': 14, 'weekly': 84, 'monthly': 365}
    days = days_map.get(period, 14)
    end_date = requested_date(request)
    start_date = end_date - timedelta(days=days - 1)
    return period, start_date, end_date


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
        period, start_date, end_date = period_range(request)
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


class OrdersReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period, start_date, end_date = period_range(request)
        orders_qs = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        )
        series = (
            orders_qs.annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(
                count=Count('id'),
                revenue=Sum('total'),
            )
            .order_by('day')
        )
        by_status = (
            orders_qs.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        aggregates = orders_qs.aggregate(
            total_count=Count('id'),
            total_revenue=Sum('total'),
            average_order_value=Avg('total'),
            express_count=Count('id', filter=Q(is_express=True)),
        )
        return Response(
            {
                'period': period,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'series': [
                    {
                        'day': row['day'].isoformat() if row['day'] else None,
                        'count': row['count'],
                        'revenue': str(row['revenue'] or 0),
                    }
                    for row in series
                ],
                'by_status': list(by_status),
                'summary': {
                    'total_orders': aggregates['total_count'] or 0,
                    'total_revenue': str(aggregates['total_revenue'] or 0),
                    'average_order_value': str(aggregates['average_order_value'] or 0),
                    'express_orders': aggregates['express_count'] or 0,
                },
            }
        )


class CustomersReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period, start_date, end_date = period_range(request)
        new_customers = Customer.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).count()
        signup_series = (
            Customer.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            )
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        tier_rows = {
            'gold': Customer.objects.filter(loyalty_points__gte=100).count(),
            'silver': Customer.objects.filter(loyalty_points__gte=50, loyalty_points__lt=100).count(),
            'regular': Customer.objects.filter(loyalty_points__lt=50).count(),
        }
        top_customers = (
            Order.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            )
            .values('customer_id', 'customer__name', 'customer__email')
            .annotate(order_count=Count('id'), spend=Sum('total'))
            .order_by('-spend')[:10]
        )
        return Response(
            {
                'period': period,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'new_customers': new_customers,
                'total_customers': Customer.objects.count(),
                'signup_series': [
                    {
                        'day': row['day'].isoformat() if row['day'] else None,
                        'count': row['count'],
                    }
                    for row in signup_series
                ],
                'loyalty_tiers': tier_rows,
                'top_customers': [
                    {
                        'customer_id': row['customer_id'],
                        'name': row['customer__name'],
                        'email': row['customer__email'] or '',
                        'order_count': row['order_count'],
                        'spend': str(row['spend'] or 0),
                    }
                    for row in top_customers
                ],
            }
        )


class RevenueBreakdownView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period, start_date, end_date = period_range(request)
        invoices_qs = Invoice.objects.filter(
            issued_at__date__gte=start_date,
            issued_at__date__lte=end_date,
        )
        by_payment_status = (
            invoices_qs.values('payment_status')
            .annotate(count=Count('id'), total=Sum('total'))
            .order_by('payment_status')
        )
        monthly = (
            invoices_qs.annotate(month=TruncMonth('issued_at'))
            .values('month')
            .annotate(count=Count('id'), revenue=Sum('total'))
            .order_by('month')
        )
        paid_total = invoices_qs.filter(payment_status='paid').aggregate(s=Sum('total'))['s'] or Decimal('0')
        return Response(
            {
                'period': period,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'paid_revenue': str(paid_total),
                'by_payment_status': [
                    {
                        'payment_status': row['payment_status'],
                        'count': row['count'],
                        'total': str(row['total'] or 0),
                    }
                    for row in by_payment_status
                ],
                'monthly_series': [
                    {
                        'month': row['month'].isoformat() if row['month'] else None,
                        'count': row['count'],
                        'revenue': str(row['revenue'] or 0),
                    }
                    for row in monthly
                ],
            }
        )
