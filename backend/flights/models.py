from django.db import models

class Flight(models.Model):
    flight_number = models.CharField(max_length=20, unique=True)
    airline = models.CharField(max_length=100, null=True, blank=True)
    aircraft = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    origin = models.CharField(max_length=10, null=True, blank=True)
    destination = models.CharField(max_length=10, null=True, blank=True)
    
    scheduled_departure = models.DateTimeField(null=True, blank=True)
    estimated_departure = models.DateTimeField(null=True, blank=True)
    actual_departure = models.DateTimeField(null=True, blank=True)
    
    scheduled_arrival = models.DateTimeField(null=True, blank=True)
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    actual_arrival = models.DateTimeField(null=True, blank=True)
    
    gate = models.CharField(max_length=20, null=True, blank=True)
    terminal = models.CharField(max_length=20, null=True, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.flight_number
