from django.contrib import admin

from .models import Order, OrderItem, ServiceType


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'base_price', 'pricing_unit', 'active')
    list_filter = ('active', 'pricing_unit')
    search_fields = ('name', 'code', 'description')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer', 'status', 'is_express', 'total', 'created_at')
    list_filter = ('status', 'is_express')
    search_fields = ('order_number', 'customer__name', 'customer__phone')
    list_editable = ('status', 'is_express')
    readonly_fields = ('order_number', 'subtotal', 'tax_amount', 'total', 'created_at', 'updated_at')
    inlines = [OrderItemInline]
