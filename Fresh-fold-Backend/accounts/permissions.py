from rest_framework.permissions import BasePermission

from .models import User


class IsAppAdmin(BasePermission):
    """Django staff/superuser or application role administrator."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or getattr(user, 'role', None) == User.Role.ADMIN)
        )
