from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CustomerMeView, CustomerViewSet, LoyaltyTransactionViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'loyalty-transactions', LoyaltyTransactionViewSet, basename='loyalty-transaction')

urlpatterns = [
    path('customers/me/', CustomerMeView.as_view(), name='customer-me'),
] + router.urls
