from rest_framework import serializers

class WeatherSerializer(serializers.Serializer):
    temperature = serializers.FloatField(required=False, allow_null=True)
    wind_speed = serializers.FloatField(required=False, allow_null=True)
    wind_direction = serializers.FloatField(required=False, allow_null=True)
    precipitation = serializers.FloatField(required=False, allow_null=True)
    visibility = serializers.FloatField(required=False, allow_null=True)
    pressure = serializers.FloatField(required=False, allow_null=True)
    timestamp = serializers.DateTimeField(required=False, allow_null=True)
