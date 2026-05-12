from rest_framework.routers import DefaultRouter

from .views import OrderItemViewSet, OrderViewSet, ServiceTypeViewSet

router = DefaultRouter()
router.register(r'service-types', ServiceTypeViewSet, basename='service-type')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-items', OrderItemViewSet, basename='order-item')

urlpatterns = router.urls
