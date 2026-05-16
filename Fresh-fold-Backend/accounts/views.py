from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsAppAdmin
from .serializers import (
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserDetailSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {'token': token.key, 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('customer_profile').all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAppAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        account_type = self.request.query_params.get('account_type')
        query = self.request.query_params.get('q')
        is_active = self.request.query_params.get('is_active')

        if account_type == 'customer':
            qs = qs.filter(role=User.Role.CUSTOMER)
        elif account_type == 'staff':
            qs = qs.exclude(role=User.Role.CUSTOMER)

        if role:
            qs = qs.filter(role=role)

        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=is_active == 'true')

        if query:
            qs = qs.filter(
                Q(username__icontains=query)
                | Q(email__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(phone__icontains=query)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return AdminUserUpdateSerializer
        return UserSerializer
