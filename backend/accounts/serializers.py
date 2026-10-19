from rest_framework import serializers
from .models import User, ATCProfile
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'normal')
        )
        return user

class ATCProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ATCProfile
        fields = ('atc_number', 'verified')

class ATCTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Puts the account role into the access token.

    The role is decided at registration ('normal' via /register, 'atc' via
    /register-atc), so the client can tell from the token alone whether the
    account belongs to an ATC employee and show ATC-only navigation.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token
