from rest_framework import viewsets

from .models import Attendance, Employee, Shift, TaskRecord
from .serializers import (
    AttendanceSerializer,
    EmployeeSerializer,
    EmployeeWriteSerializer,
    ShiftSerializer,
    TaskRecordSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user').all()
    serializer_class = EmployeeSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return EmployeeWriteSerializer
        return EmployeeSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('employee').all()
    serializer_class = AttendanceSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.select_related('employee').all()
    serializer_class = ShiftSerializer


class TaskRecordViewSet(viewsets.ModelViewSet):
    queryset = TaskRecord.objects.select_related('employee').all()
    serializer_class = TaskRecordSerializer
