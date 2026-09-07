from django.db import models
from flights.models import Flight

class FlightPosition(models.Model):
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='positions')
    lat = models.FloatField()
    lon = models.FloatField()
    altitude = models.FloatField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.flight.flight_number} at {self.timestamp}"
