from django.contrib import admin

from .models import Invoice, Payment, PromoCode, TaxRate


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(TaxRate)
class TaxRateAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate_percent', 'active')


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'discount_fixed', 'active')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'order', 'payment_status', 'total', 'amount_paid')
    list_filter = ('payment_status',)
    inlines = [PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'amount', 'method', 'paid_at')
