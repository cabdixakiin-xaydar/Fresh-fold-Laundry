from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.models import Invoice, Payment
from orders.models import Order

from .models import Customer, LoyaltyTransaction
from .serializers import (
    CustomerDetailSerializer,
    CustomerSerializer,
    LoyaltyTransactionSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        tier = self.request.query_params.get('tier')
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(phone__icontains=query)
                | Q(email__icontains=query)
                | Q(address__icontains=query)
                | Q(notes__icontains=query)
                | Q(preferences__icontains=query)
            )
        if tier == 'gold':
            qs = qs.filter(loyalty_points__gte=100)
        elif tier == 'silver':
            qs = qs.filter(loyalty_points__gte=50, loyalty_points__lt=100)
        elif tier == 'regular':
            qs = qs.filter(loyalty_points__lt=50)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomerDetailSerializer
        return CustomerSerializer

    @action(detail=True, methods=['get'], url_path='loyalty')
    def loyalty_history(self, request, pk=None):
        customer = self.get_object()
        rows = customer.loyalty_transactions.all()[:100]
        return Response(LoyaltyTransactionSerializer(rows, many=True).data)

    @action(detail=True, methods=['post'], url_path='loyalty/adjust')
    def adjust_loyalty(self, request, pk=None):
        customer = self.get_object()
        change = int(request.data.get('points_change', 0))
        reason = request.data.get('reason', '')
        if change == 0:
            return Response(
                {'detail': 'points_change is required and must be non-zero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        customer.loyalty_points = max(0, customer.loyalty_points + change)
        customer.save(update_fields=['loyalty_points', 'updated_at'])
        LoyaltyTransaction.objects.create(
            customer=customer,
            points_change=change,
            reason=reason,
        )
        return Response(CustomerSerializer(customer).data)

    @action(detail=True, methods=['get'], url_path='transactions')
    def transactions(self, request, pk=None):
        customer = self.get_object()
        rows = []

        for order in Order.objects.filter(customer=customer).order_by('-created_at')[:10]:
            rows.append(
                {
                    'type': 'order',
                    'reference': order.order_number,
                    'status': order.status,
                    'amount': str(order.total),
                    'occurred_at': order.created_at.isoformat(),
                }
            )

        for invoice in (
            Invoice.objects.select_related('order')
            .filter(order__customer=customer)
            .order_by('-issued_at')[:10]
        ):
            rows.append(
                {
                    'type': 'invoice',
                    'reference': invoice.invoice_number,
                    'status': invoice.payment_status,
                    'amount': str(invoice.total),
                    'occurred_at': invoice.issued_at.isoformat(),
                }
            )

        for payment in (
            Payment.objects.select_related('invoice')
            .filter(invoice__order__customer=customer)
            .order_by('-paid_at')[:10]
        ):
            rows.append(
                {
                    'type': 'payment',
                    'reference': payment.invoice.invoice_number,
                    'status': payment.method,
                    'amount': str(payment.amount),
                    'occurred_at': payment.paid_at.isoformat(),
                }
            )

        rows.sort(key=lambda row: row['occurred_at'], reverse=True)
        return Response(rows[:12])


class LoyaltyTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoyaltyTransaction.objects.select_related('customer').all()
    serializer_class = LoyaltyTransactionSerializer
