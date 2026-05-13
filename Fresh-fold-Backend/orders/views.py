from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from billing.models import TaxRate

from .models import Order, OrderItem, OrderStatus, ServiceType
from .serializers import (
    OrderItemSerializer,
    OrderSerializer,
    PublicOrderTrackingSerializer,
    ServiceTypeSerializer,
    WebBookingSerializer,
)
from .services import apply_default_tax_from_active_rate, recalculate_order
from .utils import normalize_order_number


class OrderRecalculateTaxSerializer(serializers.Serializer):
    tax_rate_id = serializers.IntegerField(required=False)


class ServiceTypeViewSet(viewsets.ModelViewSet):
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated()]


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('customer', 'created_by').prefetch_related(
        'items__service_type'
    )
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        customer_id = self.request.query_params.get('customer')
        query = self.request.query_params.get('q')
        service_type = self.request.query_params.get('service_type')
        created_date = self.request.query_params.get('date')
        if status_param:
            qs = qs.filter(status=status_param)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if query:
            qs = qs.filter(
                Q(order_number__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(status__icontains=query)
                | Q(special_instructions__icontains=query)
            )
        if service_type:
            qs = qs.filter(items__service_type_id=service_type)
        if created_date:
            parsed_date = parse_date(created_date)
            if parsed_date:
                qs = qs.filter(created_at__date=parsed_date)
        return qs.distinct()

    @action(detail=True, methods=['post'], url_path='recalculate')
    def recalculate_totals(self, request, pk=None):
        order = self.get_object()
        recalculate_order(order)
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='recalculate-tax')
    def recalculate_tax(self, request, pk=None):
        order = self.get_object()
        ser = OrderRecalculateTaxSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tid = ser.validated_data.get('tax_rate_id')
        if tid:
            rate = TaxRate.objects.filter(pk=tid, active=True).first()
            if not rate:
                return Response(
                    {'detail': 'Invalid or inactive tax_rate_id.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            rate = TaxRate.objects.filter(active=True).order_by('-id').first()
            if not rate:
                return Response(
                    {'detail': 'No active tax rate configured.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        apply_default_tax_from_active_rate(order, rate.rate_percent)
        order.refresh_from_db()
        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'detail': 'Field "status" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valid_statuses = {choice[0] for choice in OrderStatus.choices}
        if new_status not in valid_statuses:
            return Response(
                {'detail': f'Invalid status. Choose one of: {", ".join(valid_statuses)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])
        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(
        detail=False,
        methods=['post'],
        url_path='web-booking',
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def web_booking(self, request):
        serializer = WebBookingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(serializer.to_representation(order), status=status.HTTP_201_CREATED)

    @action(
        detail=False,
        methods=['get'],
        url_path='track',
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def track(self, request):
        raw = request.query_params.get('order') or request.query_params.get('order_number')
        if not raw:
            return Response(
                {'detail': 'Missing query parameter "order".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        key = normalize_order_number(raw)
        order = (
            Order.objects.select_related('customer', 'invoice')
            .prefetch_related('items__service_type')
            .filter(order_number__iexact=key)
            .first()
        )
        if not order:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PublicOrderTrackingSerializer(order).data)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('order', 'service_type')
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs

    def perform_destroy(self, instance):
        order = instance.order
        super().perform_destroy(instance)
        recalculate_order(order)
