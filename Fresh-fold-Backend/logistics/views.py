from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import viewsets

from .models import PickupDelivery
from .serializers import PickupDeliverySerializer


class PickupDeliveryViewSet(viewsets.ModelViewSet):
    queryset = PickupDelivery.objects.select_related('order', 'driver').all()
    serializer_class = PickupDeliverySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        trip_type = self.request.query_params.get('trip_type')
        driver_id = self.request.query_params.get('driver')
        query = self.request.query_params.get('q')
        scheduled_date = self.request.query_params.get('date')
        if status_param:
            qs = qs.filter(status=status_param)
        if trip_type:
            qs = qs.filter(trip_type=trip_type)
        if driver_id:
            qs = qs.filter(driver_id=driver_id)
        if query:
            qs = qs.filter(Q(order__order_number__icontains=query) | Q(address__icontains=query))
        if scheduled_date:
            parsed_date = parse_date(scheduled_date)
            if parsed_date:
                qs = qs.filter(scheduled_at__date=parsed_date)
        return qs
