from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    InvoiceViewSet,
    PaymentViewSet,
    PromoCodeViewSet,
    ReceiptPdfByOrderNumberView,
    ReceiptPdfPlaceholderView,
    TaxRateViewSet,
)

router = DefaultRouter()
router.register(r'tax-rates', TaxRateViewSet, basename='tax-rate')
router.register(r'promo-codes', PromoCodeViewSet, basename='promo-code')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path(
        'invoices/by-order/<str:order_number>/receipt.pdf',
        ReceiptPdfByOrderNumberView.as_view(),
        name='invoice-receipt-by-order',
    ),
    path(
        'invoices/<int:invoice_id>/receipt.pdf',
        ReceiptPdfPlaceholderView.as_view(),
        name='invoice-receipt-pdf',
    ),
] + router.urls
