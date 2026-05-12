"""
URL configuration — API under ``/api/v1/``.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path(
        'api/v1/',
        include(
            [
                path('auth/', include('accounts.urls')),
                path('', include('customers.urls')),
                path('', include('orders.urls')),
                path('', include('billing.urls')),
                path('', include('inventory.urls')),
                path('', include('employees.urls')),
                path('', include('logistics.urls')),
                path('analytics/', include('analytics.urls')),
            ]
        ),
    ),
]
