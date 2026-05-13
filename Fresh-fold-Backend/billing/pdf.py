"""Shared invoice PDF rendering."""

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .models import Invoice


def render_invoice_pdf(invoice: Invoice) -> BytesIO:
    """Build a PDF receipt for an invoice into an in-memory buffer."""
    inv = (
        Invoice.objects.select_related('order', 'order__customer')
        .prefetch_related('payments', 'order__items__service_type')
        .filter(pk=invoice.pk)
        .first()
    )
    if not inv:
        raise ValueError('Invoice not found')
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

    pdf.setTitle(f'{inv.invoice_number}.pdf')
    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawString(left, y, 'Fresh-Fold Laundry')
    y -= 8 * mm
    pdf.setFont('Helvetica', 10)
    pdf.drawString(left, y, 'Invoice Receipt')
    y -= 10 * mm

    draw_line('Invoice Number', inv.invoice_number, size=11)
    draw_line('Issued', inv.issued_at.strftime('%b %d, %Y %H:%M'))
    draw_line('Order', inv.order.order_number)
    draw_line('Customer', inv.order.customer.name)
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
    for item in inv.order.items.all():
        qty_value = str(item.weight_kg or item.quantity)
        pdf.drawString(left, y, item.service_type.name)
        pdf.drawRightString(right - 32 * mm, y, qty_value)
        pdf.drawRightString(right, y, f'${item.line_total}')
        y -= 5 * mm
        if y < 50 * mm:
            pdf.showPage()
            y = page_height - (18 * mm)
            pdf.setFont('Helvetica-Bold', 11)
            pdf.drawString(left, y, f'Invoice Receipt Continued - {inv.invoice_number}')
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

    draw_line('Subtotal', f'${inv.subtotal}')
    draw_line('Tax', f'${inv.tax_amount}')
    draw_line('Discount', f'-${inv.discount_amount}')
    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(left, y, 'Total Due')
    pdf.drawRightString(right, y, f'${inv.total}')
    y -= 8 * mm
    pdf.setFont('Helvetica', 10)
    pdf.drawString(left, y, f'Amount Paid: ${inv.amount_paid}')
    y -= 6 * mm
    pdf.drawString(left, y, f'Payment Status: {inv.payment_status.title()}')
    y -= 8 * mm

    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(left, y, 'Payments')
    y -= 6 * mm
    pdf.setFont('Helvetica', 9)
    if inv.payments.exists():
        for payment in inv.payments.all():
            pdf.drawString(left, y, payment.paid_at.strftime('%b %d, %Y'))
            pdf.drawString(left + 40 * mm, y, payment.get_method_display())
            pdf.drawRightString(right, y, f'${payment.amount}')
            y -= 5 * mm
    else:
        pdf.drawString(left, y, 'No payments recorded yet.')
        y -= 5 * mm

    if inv.notes:
        y -= 4 * mm
        pdf.setFont('Helvetica-Bold', 11)
        pdf.drawString(left, y, 'Notes')
        y -= 6 * mm
        pdf.setFont('Helvetica', 9)
        for line in inv.notes.splitlines():
            pdf.drawString(left, y, line[:110])
            y -= 5 * mm

    pdf.save()
    buffer.seek(0)
    return buffer
