from django.conf import settings
from django.db import models


class Employee(models.Model):
    """Staff profile linked to login (documentation §6)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employee_profile',
    )
    employee_code = models.CharField(max_length=32, unique=True, db_index=True)
    department = models.CharField(max_length=64, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['employee_code']

    def __str__(self):
        return f'{self.employee_code} ({self.user.username})'


class Attendance(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    date = models.DateField(db_index=True)
    clock_in = models.DateTimeField(null=True, blank=True)
    clock_out = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-date', '-clock_in']
        constraints = [
            models.UniqueConstraint(fields=['employee', 'date'], name='uniq_attendance_per_day'),
        ]


class Shift(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='shifts',
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    label = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ['starts_at']


class TaskRecord(models.Model):
    """Lightweight operational task / performance note."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='tasks',
    )
    title = models.CharField(max_length=255)
    related_order_id = models.PositiveIntegerField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
