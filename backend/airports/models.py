from django.db import models

class Airport(models.Model):
    iata = models.CharField(max_length=10, null=True, blank=True, unique=True)
    icao = models.CharField(max_length=10, null=True, blank=True, unique=True)
    name = models.CharField(max_length=255)
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    
    runways = models.JSONField(default=list, blank=True)
    terminals = models.JSONField(default=list, blank=True)
    gates = models.JSONField(default=list, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or self.iata or self.icao
