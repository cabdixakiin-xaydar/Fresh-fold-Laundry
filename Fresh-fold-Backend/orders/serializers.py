from decimal import Decimal

from rest_framework import serializers

from customers.models import Customer

from .models import Order, OrderItem, OrderStatus, ServiceType
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
        from billing.models import TaxRate

        from .services import apply_default_tax_from_active_rate

        rate = TaxRate.objects.filter(active=True).order_by('-id').first()
        if rate:
            apply_default_tax_from_active_rate(order, rate.rate_percent)
            order.refresh_from_db()
        return order

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data


class PublicOrderTrackingSerializer(serializers.ModelSerializer):
    """Anonymous customer-facing order summary for /orders/track/."""

    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True)
    items = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()
    estimated_completion = serializers.SerializerMethodField()
    tax_percent_display = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'order_number',
            'status',
            'subtotal',
            'discount_amount',
            'tax_amount',
            'total',
            'special_instructions',
            'customer_name',
            'customer_phone',
            'customer_email',
            'customer_address',
            'items',
            'invoice',
            'estimated_completion',
            'tax_percent_display',
            'timeline',
            'created_at',
            'updated_at',
        )

    def get_items(self, obj):
        rows = []
        for item in obj.items.select_related('service_type').all():
            st = item.service_type
            if st.pricing_unit == 'kg':
                w = item.weight_kg
                qty_label = f'{w} lb' if w is not None else ''
            else:
                q = item.quantity
                qty_label = f'{q} item' if q == 1 else f'{q} items'
            code_lower = (st.code or '').lower()
            name_lower = st.name.lower()
            delicate = 'dry' in code_lower or 'delicate' in name_lower or 'dry clean' in name_lower
            rows.append(
                {
                    'category': st.name,
                    'service_label': st.name,
                    'quantity_label': qty_label,
                    'line_total': str(item.line_total),
                    'delicate': delicate,
                }
            )
        return rows

    def get_invoice(self, obj):
        inv = getattr(obj, 'invoice', None)
        if not inv:
            return None
        return {
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'payment_status': inv.payment_status,
        }

    def get_estimated_completion(self, obj):
        from datetime import timedelta

        from django.utils import timezone

        if obj.status == OrderStatus.DELIVERED:
            local = timezone.localtime(obj.updated_at)
            return {
                'headline': 'Order delivered',
                'detail': local.strftime('%b %d, %Y · %I:%M %p'),
            }
        eta = obj.created_at + timedelta(hours=8)
        local_eta = timezone.localtime(eta)
        return {
            'headline': f'Estimated completion: {local_eta.strftime("%A, %b %d")}',
            'detail': local_eta.strftime('%I:%M %p'),
        }

    def get_tax_percent_display(self, obj):
        taxable = obj.subtotal - obj.discount_amount
        if taxable <= 0 or obj.tax_amount <= 0:
            return None
        pct = (obj.tax_amount / taxable) * 100
        return f'{pct:.0f}%'

    def get_timeline(self, obj):
        """Five-step customer-facing progress (backend has four statuses; delivery stage is synthetic)."""

        from django.utils import timezone

        tz = timezone.get_current_timezone()
        created = timezone.localtime(obj.created_at, tz)
        updated = timezone.localtime(obj.updated_at, tz)

        steps_meta = [
            ('received', 'Received'),
            ('processing', 'Processing'),
            ('ready', 'Ready'),
            ('out_for_delivery', 'Out for Delivery'),
            ('delivered', 'Delivered'),
        ]

        status = obj.status
        if status == OrderStatus.DELIVERED:
            current_idx = len(steps_meta)
        elif status == OrderStatus.READY:
            current_idx = 2
        elif status == OrderStatus.PROCESSING:
            current_idx = 1
        else:
            current_idx = 0

        steps_out = []
        for i, (key, label) in enumerate(steps_meta):
            if current_idx >= len(steps_meta):
                step_state = 'complete'
                detail = updated.strftime('%I:%M %p') if i == len(steps_meta) - 1 else (
                    created.strftime('%I:%M %p') if i == 0 else updated.strftime('%I:%M %p')
                )
            elif i < current_idx:
                step_state = 'complete'
                detail = created.strftime('%I:%M %p') if i == 0 else updated.strftime('%I:%M %p')
            elif i == current_idx:
                step_state = 'current'
                if key == 'ready':
                    detail = 'In Progress'
                elif key == 'processing':
                    detail = updated.strftime('%I:%M %p')
                elif key == 'received':
                    detail = created.strftime('%I:%M %p')
                else:
                    detail = updated.strftime('%I:%M %p')
            else:
                step_state = 'pending'
                detail = 'Pending'

            steps_out.append(
                {
                    'key': key,
                    'label': label,
                    'state': step_state,
                    'detail': detail,
                }
            )

        return {'steps': steps_out}
