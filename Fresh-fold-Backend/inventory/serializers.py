from decimal import Decimal

from rest_framework import serializers

from .models import InventoryItem, StockMovement, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = (
            'id',
            'name',
            'contact_name',
            'phone',
            'email',
            'address',
            'notes',
            'created_at',
        )
        read_only_fields = ('created_at',)


class InventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = (
            'id',
            'name',
            'sku',
            'quantity',
            'unit',
            'low_stock_threshold',
            'supplier',
            'supplier_name',
            'is_low_stock',
            'updated_at',
        )
        read_only_fields = ('updated_at',)


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = StockMovement
        fields = (
            'id',
            'item',
            'item_name',
            'movement_type',
            'quantity',
            'note',
            'created_at',
            'created_by',
        )
        read_only_fields = ('created_at', 'created_by')

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value

    def validate(self, attrs):
        item = attrs.get('item')
        movement_type = attrs.get('movement_type')
        quantity = attrs.get('quantity')
        if item and movement_type == StockMovement.MovementType.OUT and quantity > item.quantity:
            raise serializers.ValidationError({'quantity': 'Cannot remove more stock than is currently available.'})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        movement = StockMovement.objects.create(**validated_data)
        item = movement.item
        qty = movement.quantity
        if movement.movement_type == StockMovement.MovementType.IN:
            item.quantity = item.quantity + qty
        elif movement.movement_type == StockMovement.MovementType.OUT:
            item.quantity = item.quantity - qty
        else:
            item.quantity = qty
        if item.quantity < 0:
            item.quantity = Decimal('0')
        item.save(update_fields=['quantity', 'updated_at'])
        return movement
