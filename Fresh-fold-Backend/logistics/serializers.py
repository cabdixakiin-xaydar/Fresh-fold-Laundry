from rest_framework import serializers

from .models import PickupDelivery


class PickupDeliverySerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = PickupDelivery
        fields = (
            'id',
            'order',
            'order_number',
            'trip_type',
            'scheduled_at',
            'address',
            'driver',
            'status',
            'route_notes',
            'created_at',
        )
        read_only_fields = ('created_at',)
