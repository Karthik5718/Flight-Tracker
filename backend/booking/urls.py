from django.urls import path
from .views import (
    BookingOneWaySearchView,
    BookingRoundTripSearchView,
    BookingLinksView,
    BookingAirportSearchView,
)

urlpatterns = [
    path('search/one-way/', BookingOneWaySearchView.as_view(), name='booking_one_way'),
    path('search/round-trip/', BookingRoundTripSearchView.as_view(), name='booking_round_trip'),
    path('links/', BookingLinksView.as_view(), name='booking_links'),
    path('airports/', BookingAirportSearchView.as_view(), name='booking_airports'),
]
