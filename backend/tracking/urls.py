from django.urls import path
from .views import FlightPositionView

urlpatterns = [
    path('positions/', FlightPositionView.as_view(), name='flight_positions'),
]
