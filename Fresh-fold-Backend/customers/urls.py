from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, LoyaltyTransactionViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'loyalty-transactions', LoyaltyTransactionViewSet, basename='loyalty-transaction')

urlpatterns = router.urls
