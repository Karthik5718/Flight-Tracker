from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, ATCProfile
from .serializers import ATCTokenObtainPairSerializer, UserSerializer

class LoginView(TokenObtainPairView):
    """Login that hands the account role to the client via the access token."""
    serializer_class = ATCTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

class RegisterATCView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save(role='atc')
            atc_number = request.data.get('atc_number')
            if not atc_number:
                return Response({"error": "atc_number is required"}, status=status.HTTP_400_BAD_REQUEST)
            ATCProfile.objects.create(user=user, atc_number=atc_number, verified=False)
            return Response({"message": "ATC user created. Verification pending."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)
