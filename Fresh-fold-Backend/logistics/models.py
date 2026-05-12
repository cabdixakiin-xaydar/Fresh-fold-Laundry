from django.conf import settings
from django.db import models


class TripType(models.TextChoices):
    PICKUP = 'pickup', 'Pickup'
    DELIVERY = 'delivery', 'Delivery'


class TripStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'
    IN_TRANSIT = 'in_transit', 'In transit'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class PickupDelivery(models.Model):
    """Pickup / delivery scheduling (documentation §7)."""

    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='trips',
    )
    trip_type = models.CharField(max_length=20, choices=TripType.choices)
    scheduled_at = models.DateTimeField()
    address = models.TextField(blank=True)
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_trips',
    )
    status = models.CharField(
        max_length=20,
        choices=TripStatus.choices,
        default=TripStatus.SCHEDULED,
    )
    route_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_at']
