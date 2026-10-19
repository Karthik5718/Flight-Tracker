from django.urls import path
from .views import AirportInfoView, AirportFlightsView, AirportHistoryView, AirportSearchView

urlpatterns = [
    path('search/', AirportSearchView.as_view(), name='airport_search'),
    path('<str:code>/', AirportInfoView.as_view(), name='airport_info'),
    path('<str:code>/flights/', AirportFlightsView.as_view(), name='airport_flights'),
    path('<str:code>/history/', AirportHistoryView.as_view(), name='airport_history'),
]
