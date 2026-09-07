from rest_framework.permissions import BasePermission

class IsATCVerified(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'atc' and 
            hasattr(request.user, 'atc_profile') and 
            request.user.atc_profile.verified
        )
