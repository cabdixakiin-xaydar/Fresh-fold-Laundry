from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class PricingUnit(models.TextChoices):
    ITEM = 'item', 'Per item'
    KG = 'kg', 'Per kg'


class ServiceType(models.Model):
    """Wash / dry clean / iron with per-item or per-kg pricing (documentation §3–4)."""

    name = models.CharField(max_length=64)
    code = models.CharField(max_length=32, unique=True)
    description = models.CharField(max_length=255, blank=True)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    pricing_unit = models.CharField(
        max_length=10,
        choices=PricingUnit.choices,
        default=PricingUnit.ITEM,
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class OrderStatus(models.TextChoices):
    RECEIVED = 'received', 'Received'
    PROCESSING = 'processing', 'Processing'
    READY = 'ready', 'Ready'
    DELIVERED = 'delivered', 'Delivered'


class Order(models.Model):
    order_number = models.CharField(max_length=40, unique=True, editable=False)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='orders',
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.RECEIVED,
        db_index=True,
    )
    special_instructions = models.TextField(blank=True)
    is_express = models.BooleanField(default=False)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='orders_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            super().save(*args, **kwargs)
            self.order_number = (
                f'FF-{timezone.now().strftime("%Y%m%d")}-{self.pk:05d}'
            )
            super().save(update_fields=['order_number'])
        else:
            super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    service_type = models.ForeignKey(ServiceType, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ['id']
