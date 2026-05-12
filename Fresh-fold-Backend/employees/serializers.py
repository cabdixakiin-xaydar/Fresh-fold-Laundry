from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Attendance, Employee, Shift, TaskRecord

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = Employee
        fields = (
            'id',
            'user',
            'username',
            'role',
            'employee_code',
            'department',
            'hire_date',
            'active',
        )


class EmployeeWriteSerializer(serializers.ModelSerializer):
    """Create employee profile linked to an existing user account."""

    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Employee
        fields = ('user', 'employee_code', 'department', 'hire_date', 'active')


class AttendanceSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)

    class Meta:
        model = Attendance
        fields = (
            'id',
            'employee',
            'employee_code',
            'date',
            'clock_in',
            'clock_out',
            'notes',
        )


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ('id', 'employee', 'starts_at', 'ends_at', 'label')


class TaskRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskRecord
        fields = (
            'id',
            'employee',
            'title',
            'related_order_id',
            'completed',
            'completed_at',
            'created_at',
        )
        read_only_fields = ('created_at',)
