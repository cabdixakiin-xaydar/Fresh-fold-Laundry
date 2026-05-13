from django.db.models import Q
from django.utils.dateparse import parse_date
from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order

from .models import Invoice, Payment, PromoCode, TaxRate
from .pdf import render_invoice_pdf
from .serializers import (
    CreateInvoiceFromOrderSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    PromoCodeSerializer,
    TaxRateSerializer,
)


class TaxRateViewSet(viewsets.ModelViewSet):
    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer


class PromoCodeViewSet(viewsets.ModelViewSet):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('order', 'order__customer', 'promo_code').prefetch_related(
        'payments'
    )
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('payment_status')
        query = self.request.query_params.get('q')
        issued_date = self.request.query_params.get('date')
        if status_param:
            qs = qs.filter(payment_status=status_param)
        if query:
            qs = qs.filter(
                Q(invoice_number__icontains=query)
                | Q(order__order_number__icontains=query)
                | Q(order__customer__name__icontains=query)
            )
        if issued_date:
            parsed_date = parse_date(issued_date)
            if parsed_date:
                qs = qs.filter(issued_at__date=parsed_date)
        return qs

    @action(detail=False, methods=['post'], url_path='from-order')
    def from_order(self, request):
        ser = CreateInvoiceFromOrderSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        invoice = ser.save()
        return Response(
            InvoiceSerializer(invoice, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice', 'invoice__order__customer', 'recorded_by')
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        return qs


class ReceiptPdfPlaceholderView(APIView):
    def get(self, request, invoice_id):
        invoice = Invoice.objects.filter(pk=invoice_id).first()
        if not invoice:
            return Response({'detail': 'Invoice not found.'}, status=status.HTTP_404_NOT_FOUND)

        buffer = render_invoice_pdf(invoice)
        return FileResponse(
            buffer,
            as_attachment=False,
            filename=f'{invoice.invoice_number}.pdf',
            content_type='application/pdf',
        )


class ReceiptPdfByOrderNumberView(APIView):
    """Public receipt PDF when the customer knows their order number (no auth)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, order_number):
        from orders.utils import normalize_order_number

        key = normalize_order_number(order_number)
        order = Order.objects.select_related('invoice').filter(order_number__iexact=key).first()
        if not order:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        invoice = getattr(order, 'invoice', None)
        if not invoice:
            return Response({'detail': 'No invoice available for this order yet.'}, status=status.HTTP_404_NOT_FOUND)

        buffer = render_invoice_pdf(invoice)
        return FileResponse(
            buffer,
            as_attachment=False,
            filename=f'{invoice.invoice_number}.pdf',
            content_type='application/pdf',
        )
