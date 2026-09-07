from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('normal', 'Normal'),
        ('atc', 'ATC'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='normal')

class ATCProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='atc_profile')
    atc_number = models.CharField(max_length=50)
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - ATC Profile"
