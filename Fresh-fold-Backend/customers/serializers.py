from rest_framework import serializers

from .models import Customer, LoyaltyTransaction


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = ('id', 'customer', 'points_change', 'reason', 'created_at')
        read_only_fields = fields


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id',
            'name',
            'phone',
            'email',
            'address',
            'loyalty_points',
            'notes',
            'preferences',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('loyalty_points', 'created_at', 'updated_at')


class CustomerDetailSerializer(CustomerSerializer):
    loyalty_transactions = LoyaltyTransactionSerializer(many=True, read_only=True)

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + ('loyalty_transactions',)
