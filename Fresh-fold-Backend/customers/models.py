from django.db import models


class Customer(models.Model):
    """Customer directory and contact details (documentation §2)."""

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32, db_index=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    loyalty_points = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    preferences = models.TextField(blank=True, help_text='Service preferences / fabric notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone})'


class LoyaltyTransaction(models.Model):
    """Audit trail for loyalty point changes."""

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='loyalty_transactions',
    )
    points_change = models.IntegerField()
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
