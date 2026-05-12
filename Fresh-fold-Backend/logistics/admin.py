from django.contrib import admin

from .models import PickupDelivery


@admin.register(PickupDelivery)
class PickupDeliveryAdmin(admin.ModelAdmin):
    list_display = ('order', 'trip_type', 'scheduled_at', 'driver', 'status')
