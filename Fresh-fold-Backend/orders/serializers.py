from decimal import Decimal

from rest_framework import serializers

from customers.models import Customer

from .models import Order, OrderItem, ServiceType
from .services import compute_line_total, recalculate_order


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = (
            'id',
            'name',
            'code',
            'description',
            'base_price',
            'pricing_unit',
            'active',
        )


class OrderItemSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(source='service_type.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'service_type',
            'service_type_name',
            'quantity',
            'weight_kg',
            'unit_price',
            'line_total',
        )
        read_only_fields = ('line_total',)
        extra_kwargs = {
            'unit_price': {'required': False},
        }

    def validate(self, attrs):
        service_type = attrs.get('service_type') or getattr(self.instance, 'service_type', None)
        quantity = attrs.get('quantity', getattr(self.instance, 'quantity', 1))
        weight_kg = attrs.get('weight_kg', getattr(self.instance, 'weight_kg', None))

        if not service_type:
            raise serializers.ValidationError({'service_type': 'Service type is required.'})

        if service_type.pricing_unit == 'kg':
            if weight_kg is None or Decimal(weight_kg) <= 0:
                raise serializers.ValidationError({'weight_kg': 'Weight is required for weight-based services.'})
        elif quantity < 1:
            raise serializers.ValidationError({'quantity': 'Quantity must be at least 1.'})

        return attrs

    def create(self, validated_data):
        validated_data.setdefault('unit_price', validated_data['service_type'].base_price)
        item = OrderItem(**validated_data)
        item.line_total = compute_line_total(item)
        item.save()
        recalculate_order(item.order)
        return item

    def update(self, instance, validated_data):
        incoming_service_type = validated_data.get('service_type')
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if incoming_service_type and 'unit_price' not in validated_data:
            instance.unit_price = incoming_service_type.base_price
        instance.line_total = compute_line_total(instance)
        instance.save()
        recalculate_order(instance.order)
        return instance


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True)
    source = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'customer',
            'customer_name',
            'customer_phone',
            'customer_email',
            'customer_address',
            'source',
            'status',
            'special_instructions',
            'is_express',
            'subtotal',
            'discount_amount',
            'tax_amount',
            'total',
            'created_by',
            'items',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'order_number',
            'subtotal',
            'tax_amount',
            'total',
            'created_by',
            'created_at',
            'updated_at',
        )

    def get_source(self, obj):
        return 'in_store' if obj.created_by_id else 'web'

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        order = Order.objects.create(**validated_data)
        for row in items_data:
            sid = row['service_type']
            st = sid if isinstance(sid, ServiceType) else ServiceType.objects.get(pk=sid)
            item = OrderItem(
                order=order,
                service_type=st,
                quantity=row.get('quantity', 1),
                weight_kg=row.get('weight_kg'),
                unit_price=row.get('unit_price') or st.base_price,
                line_total=Decimal('0'),
            )
            item.line_total = compute_line_total(item)
            item.save()
        recalculate_order(order)
        return order

    def update(self, instance, validated_data):
        validated_data.pop('items', None)
        return super().update(instance, validated_data)


class WebBookingCustomerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=32)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    preferences = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class WebBookingSerializer(serializers.Serializer):
    customer = WebBookingCustomerSerializer()
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    is_express = serializers.BooleanField(required=False, default=False)
    items = OrderItemSerializer(many=True)

    def create(self, validated_data):
        customer_data = validated_data.pop('customer')
        items_data = validated_data.pop('items', [])

        customer, created = Customer.objects.get_or_create(
            phone=customer_data['phone'],
            defaults=customer_data,
        )
        if not created:
            for field, value in customer_data.items():
                if value and not getattr(customer, field, ''):
                    setattr(customer, field, value)
            customer.save()

        order = Order.objects.create(customer=customer, **validated_data)
        for row in items_data:
            service_type = row['service_type']
            OrderItem.objects.create(
                order=order,
                service_type=service_type,
                quantity=row.get('quantity', 1),
                weight_kg=row.get('weight_kg'),
                unit_price=row.get('unit_price') or service_type.base_price,
                line_total=Decimal('0'),
            )
        recalculate_order(order)
        return order

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data
