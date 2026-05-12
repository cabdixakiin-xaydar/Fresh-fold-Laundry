from django.contrib import admin

from .models import Customer, LoyaltyTransaction


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'loyalty_points', 'created_at')
    search_fields = ('name', 'phone', 'email')


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ('customer', 'points_change', 'reason', 'created_at')
    list_filter = ('created_at',)
