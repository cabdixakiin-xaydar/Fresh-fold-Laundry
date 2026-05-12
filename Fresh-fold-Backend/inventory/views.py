from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import InventoryItem, StockMovement, Supplier
from .serializers import (
    InventoryItemSerializer,
    StockMovementSerializer,
    SupplierSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(contact_name__icontains=query)
                | Q(phone__icontains=query)
                | Q(email__icontains=query)
            )
        return qs


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related('supplier')
    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        supplier_id = self.request.query_params.get('supplier')
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(sku__icontains=query))
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        rows = []
        for item in self.get_queryset():
            if item.is_low_stock:
                rows.append(item)
        return Response(InventoryItemSerializer(rows, many=True).data)


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('item', 'created_by')
    serializer_class = StockMovementSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        item_id = self.request.query_params.get('item')
        if item_id:
            qs = qs.filter(item_id=item_id)
        return qs
