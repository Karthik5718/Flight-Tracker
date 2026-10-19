from django.urls import path
from .views import DelayPredictionView, CongestionPredictionView

urlpatterns = [
    path('delay-prediction/', DelayPredictionView.as_view(), name='ml_delay_prediction'),
    path('airport-congestion/', CongestionPredictionView.as_view(), name='ml_airport_congestion'),
]
