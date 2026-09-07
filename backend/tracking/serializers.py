from rest_framework import serializers
from .models import FlightPosition
from flights.serializers import FlightSerializer

class FlightPositionSerializer(serializers.ModelSerializer):
    flight = FlightSerializer(read_only=True)
    
    class Meta:
        model = FlightPosition
        fields = '__all__'
