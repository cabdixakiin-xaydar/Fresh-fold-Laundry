from rest_framework import serializers

from orders.models import Order

from .models import Invoice, Payment, PromoCode, TaxRate


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = ('id', 'name', 'rate_percent', 'active')


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = (
            'id',
            'code',
            'description',
            'discount_percent',
            'discount_fixed',
            'valid_from',
            'valid_until',
            'active',
        )


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    customer_name = serializers.CharField(source='invoice.order.customer.name', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id',
            'invoice',
            'invoice_number',
            'customer_name',
            'amount',
            'method',
            'reference',
            'paid_at',
            'recorded_by',
        )
        read_only_fields = ('paid_at',)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value

    def validate(self, attrs):
        invoice = attrs.get('invoice')
        amount = attrs.get('amount')
        if invoice and amount:
            remaining = invoice.total - invoice.amount_paid
            if remaining <= 0:
                raise serializers.ValidationError({'invoice': 'This invoice is already fully paid.'})
            if amount > remaining:
                raise serializers.ValidationError(
                    {'amount': f'Payment exceeds remaining balance of {remaining}.'}
                )
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data.setdefault('recorded_by', request.user)
        return super().create(validated_data)


class InvoiceSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer.name', read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = (
            'id',
            'invoice_number',
            'order',
            'order_number',
            'customer_name',
            'issued_at',
            'payment_status',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total',
            'amount_paid',
            'promo_code',
            'notes',
            'payments',
        )
        read_only_fields = (
            'invoice_number',
            'issued_at',
            'payment_status',
            'amount_paid',
        )


class CreateInvoiceFromOrderSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    promo_code_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default='')

    def create(self, validated_data):
        try:
            order = Order.objects.get(pk=validated_data['order_id'])
        except Order.DoesNotExist:
            raise serializers.ValidationError({'order_id': 'Order not found.'})
        if hasattr(order, 'invoice'):
            raise serializers.ValidationError('An invoice already exists for this order.')
        promo = None
        pid = validated_data.get('promo_code_id')
        if pid:
            try:
                promo = PromoCode.objects.get(pk=pid, active=True)
            except PromoCode.DoesNotExist:
                raise serializers.ValidationError({'promo_code_id': 'Invalid or inactive promo code.'})
        inv = Invoice.objects.create(
            order=order,
            subtotal=order.subtotal,
            tax_amount=order.tax_amount,
            discount_amount=order.discount_amount,
            total=order.total,
            promo_code=promo,
            notes=validated_data.get('notes', ''),
        )
        return inv

    def to_representation(self, instance):
        return InvoiceSerializer(instance, context=self.context).data
