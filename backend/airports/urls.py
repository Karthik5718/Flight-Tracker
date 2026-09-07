from django.urls import path
from .views import AirportInfoView, AirportFlightsView

urlpatterns = [
    path('<str:code>/', AirportInfoView.as_view(), name='airport_info'),
    path('<str:code>/flights/', AirportFlightsView.as_view(), name='airport_flights'),
]
