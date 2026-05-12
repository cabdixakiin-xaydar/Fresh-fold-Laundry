from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceViewSet,
    EmployeeViewSet,
    ShiftViewSet,
    TaskRecordViewSet,
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'tasks', TaskRecordViewSet, basename='task')

urlpatterns = router.urls