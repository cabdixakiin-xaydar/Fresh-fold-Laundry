from rest_framework.routers import DefaultRouter

from .views import InventoryItemViewSet, StockMovementViewSet, SupplierViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'items', InventoryItemViewSet, basename='inventory-item')
router.register(r'stock-movements', StockMovementViewSet, basename='stock-movement')

urlpatterns = router.urls
