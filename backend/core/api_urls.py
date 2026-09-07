from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('accounts/', include('accounts.urls')),
    path('flights/', include('flights.urls')),
    path('airports/', include('airports.urls')),
    path('weather/', include('weather.urls')),
    path('tracking/', include('tracking.urls')),
]
