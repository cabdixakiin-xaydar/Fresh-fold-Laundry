from io import BytesIO

from django.db.models import Q
from django.utils.dateparse import parse_date
from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .models import Invoice, Payment, PromoCode, TaxRate
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
        invoice = (
            Invoice.objects.select_related('order', 'order__customer')
            .prefetch_related('payments', 'order__items__service_type')
            .filter(pk=invoice_id)
            .first()
        )
        if not invoice:
            return Response({'detail': 'Invoice not found.'}, status=status.HTTP_404_NOT_FOUND)

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        page_width, page_height = A4
        left = 18 * mm
        right = page_width - (18 * mm)
        y = page_height - (18 * mm)

        def draw_line(label, value, size=10, gap=6 * mm):
            nonlocal y
            pdf.setFont('Helvetica-Bold', size)
            pdf.drawString(left, y, label)
            pdf.setFont('Helvetica', size)
            pdf.drawRightString(right, y, value)
            y -= gap

        pdf.setTitle(f'{invoice.invoice_number}.pdf')
        pdf.setFont('Helvetica-Bold', 18)
        pdf.drawString(left, y, 'Fresh-Fold Laundry')
        y -= 8 * mm
        pdf.setFont('Helvetica', 10)
        pdf.drawString(left, y, 'Invoice Receipt')
        y -= 10 * mm

        draw_line('Invoice Number', invoice.invoice_number, size=11)
        draw_line('Issued', invoice.issued_at.strftime('%b %d, %Y %H:%M'))
        draw_line('Order', invoice.order.order_number)
        draw_line('Customer', invoice.order.customer.name)
        y -= 2 * mm

        pdf.setFont('Helvetica-Bold', 11)
        pdf.drawString(left, y, 'Line Items')
        y -= 6 * mm
        pdf.setFont('Helvetica-Bold', 9)
        pdf.drawString(left, y, 'Service')
        pdf.drawRightString(right - 32 * mm, y, 'Qty')
        pdf.drawRightString(right, y, 'Line Total')
        y -= 4 * mm
        pdf.line(left, y, right, y)
        y -= 5 * mm

        pdf.setFont('Helvetica', 9)
        for item in invoice.order.items.all():
            qty_value = str(item.weight_kg or item.quantity)
            pdf.drawString(left, y, item.service_type.name)
            pdf.drawRightString(right - 32 * mm, y, qty_value)
            pdf.drawRightString(right, y, f'${item.line_total}')
            y -= 5 * mm
            if y < 50 * mm:
                pdf.showPage()
                y = page_height - (18 * mm)
                pdf.setFont('Helvetica-Bold', 11)
                pdf.drawString(left, y, f'Invoice Receipt Continued - {invoice.invoice_number}')
                y -= 8 * mm
                pdf.setFont('Helvetica-Bold', 9)
                pdf.drawString(left, y, 'Service')
                pdf.drawRightString(right - 32 * mm, y, 'Qty')
                pdf.drawRightString(right, y, 'Line Total')
                y -= 4 * mm
                pdf.line(left, y, right, y)
                y -= 5 * mm
                pdf.setFont('Helvetica', 9)

        y -= 2 * mm
        pdf.line(left, y, right, y)
        y -= 7 * mm

        draw_line('Subtotal', f'${invoice.subtotal}')
        draw_line('Tax', f'${invoice.tax_amount}')
        draw_line('Discount', f'-${invoice.discount_amount}')
        pdf.setFont('Helvetica-Bold', 11)
        pdf.drawString(left, y, 'Total Due')
        pdf.drawRightString(right, y, f'${invoice.total}')
        y -= 8 * mm
        pdf.setFont('Helvetica', 10)
        pdf.drawString(left, y, f'Amount Paid: ${invoice.amount_paid}')
        y -= 6 * mm
        pdf.drawString(left, y, f'Payment Status: {invoice.payment_status.title()}')
        y -= 8 * mm

        pdf.setFont('Helvetica-Bold', 11)
        pdf.drawString(left, y, 'Payments')
        y -= 6 * mm
        pdf.setFont('Helvetica', 9)
        if invoice.payments.exists():
            for payment in invoice.payments.all():
                pdf.drawString(left, y, payment.paid_at.strftime('%b %d, %Y'))
                pdf.drawString(left + 40 * mm, y, payment.get_method_display())
                pdf.drawRightString(right, y, f'${payment.amount}')
                y -= 5 * mm
        else:
            pdf.drawString(left, y, 'No payments recorded yet.')
            y -= 5 * mm

        if invoice.notes:
            y -= 4 * mm
            pdf.setFont('Helvetica-Bold', 11)
            pdf.drawString(left, y, 'Notes')
            y -= 6 * mm
            pdf.setFont('Helvetica', 9)
            for line in invoice.notes.splitlines():
                pdf.drawString(left, y, line[:110])
                y -= 5 * mm

        pdf.save()
        buffer.seek(0)
        return FileResponse(
            buffer,
            as_attachment=False,
            filename=f'{invoice.invoice_number}.pdf',
            content_type='application/pdf',
        )
