from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Staff, driver, and customer portal accounts with role-based access."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        CASHIER = 'cashier', 'Cashier'
        WORKER = 'worker', 'Worker'
        DRIVER = 'driver', 'Driver'
        CUSTOMER = 'customer', 'Customer'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.WORKER)
    phone = models.CharField(max_length=32, blank=True)
    customer_profile = models.OneToOneField(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_account',
    )

    class Meta:
        ordering = ['username']

    def __str__(self):
        return self.username
