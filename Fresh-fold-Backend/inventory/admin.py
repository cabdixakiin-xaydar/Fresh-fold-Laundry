from django.contrib import admin

from .models import InventoryItem, StockMovement, Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_name', 'phone', 'email')
    search_fields = ('name', 'contact_name', 'phone', 'email')


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'supplier', 'quantity', 'unit', 'low_stock_threshold')
    search_fields = ('name', 'sku')
    list_filter = ('supplier', 'unit')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('item', 'movement_type', 'quantity', 'created_by', 'created_at')
    list_filter = ('movement_type',)
