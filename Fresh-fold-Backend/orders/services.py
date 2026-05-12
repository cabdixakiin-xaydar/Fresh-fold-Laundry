from decimal import Decimal

from django.db import transaction

from .models import Order, OrderItem, PricingUnit, ServiceType


def compute_line_total(item: OrderItem) -> Decimal:
    if item.service_type.pricing_unit == PricingUnit.KG:
        weight = item.weight_kg or Decimal('0')
        return (item.unit_price * weight).quantize(Decimal('0.01'))
    qty = Decimal(item.quantity)
    return (item.unit_price * qty).quantize(Decimal('0.01'))


def recalculate_order(order: Order) -> None:
    subtotal = Decimal('0')
    for line in order.items.select_related('service_type').all():
        line.line_total = compute_line_total(line)
        line.save(update_fields=['line_total'])
        subtotal += line.line_total
    order.subtotal = subtotal.quantize(Decimal('0.01'))
    order.total = (
        order.subtotal - order.discount_amount + order.tax_amount
    ).quantize(Decimal('0.01'))
    order.save(update_fields=['subtotal', 'total', 'updated_at'])


def create_order_item(
    order: Order,
    service_type: ServiceType,
    *,
    quantity: int = 1,
    weight_kg=None,
) -> OrderItem:
    unit_price = service_type.base_price
    item = OrderItem(
        order=order,
        service_type=service_type,
        quantity=quantity,
        weight_kg=weight_kg,
        unit_price=unit_price,
        line_total=Decimal('0'),
    )
    item.line_total = compute_line_total(item)
    item.save()
    recalculate_order(order)
    return item


@transaction.atomic
def apply_default_tax_from_active_rate(order: Order, tax_percent: Decimal) -> None:
    """Apply tax on subtotal after discount (simple model)."""
    taxable = order.subtotal - order.discount_amount
    if taxable < 0:
        taxable = Decimal('0')
    order.tax_amount = (taxable * tax_percent / Decimal('100')).quantize(Decimal('0.01'))
    order.total = (
        order.subtotal - order.discount_amount + order.tax_amount
    ).quantize(Decimal('0.01'))
    order.save(update_fields=['tax_amount', 'total', 'updated_at'])
