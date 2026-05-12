from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Staff / driver accounts with role-based access (documentation §9)."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        CASHIER = 'cashier', 'Cashier'
        WORKER = 'worker', 'Worker'
        DRIVER = 'driver', 'Driver'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.WORKER)
    phone = models.CharField(max_length=32, blank=True)

    class Meta:
        ordering = ['username']

    def __str__(self):
        return self.username
