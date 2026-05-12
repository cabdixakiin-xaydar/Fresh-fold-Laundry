from django.urls import path

from .views import DashboardView, FinancialSummaryView, SalesReportView, ServicePopularityView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='analytics-dashboard'),
    path('reports/sales/', SalesReportView.as_view(), name='analytics-sales-report'),
    path('reports/services/', ServicePopularityView.as_view(), name='analytics-services'),
    path('reports/financial/', FinancialSummaryView.as_view(), name='analytics-financial'),
]
