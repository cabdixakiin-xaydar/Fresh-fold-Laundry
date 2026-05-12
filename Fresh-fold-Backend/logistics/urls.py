from rest_framework.routers import DefaultRouter

from .views import PickupDeliveryViewSet

router = DefaultRouter()
router.register(r'trips', PickupDeliveryViewSet, basename='trip')

urlpatterns = router.urls
