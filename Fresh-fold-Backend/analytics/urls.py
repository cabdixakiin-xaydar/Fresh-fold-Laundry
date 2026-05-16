from django.urls import path

from .views import (
    CustomersReportView,
    DashboardView,
    FinancialSummaryView,
    OrdersReportView,
    RevenueBreakdownView,
    SalesReportView,
    ServicePopularityView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='analytics-dashboard'),
    path('reports/sales/', SalesReportView.as_view(), name='analytics-sales-report'),
    path('reports/orders/', OrdersReportView.as_view(), name='analytics-orders-report'),
    path('reports/customers/', CustomersReportView.as_view(), name='analytics-customers-report'),
    path('reports/revenue-breakdown/', RevenueBreakdownView.as_view(), name='analytics-revenue-breakdown'),
    path('reports/services/', ServicePopularityView.as_view(), name='analytics-services'),
    path('reports/financial/', FinancialSummaryView.as_view(), name='analytics-financial'),
]
