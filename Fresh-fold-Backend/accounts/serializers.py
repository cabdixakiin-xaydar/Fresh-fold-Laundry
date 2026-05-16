from django.contrib.auth import authenticate
from rest_framework import serializers

from customers.models import Customer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    customer_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'phone',
            'customer_id',
            'is_active',
            'date_joined',
        )
        read_only_fields = ('id', 'date_joined', 'customer_id')

    def get_customer_id(self, obj):
        if obj.customer_profile_id:
            return obj.customer_profile_id
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    account_type = serializers.ChoiceField(
        choices=('staff', 'customer'),
        write_only=True,
        default='customer',
    )

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'phone',
            'account_type',
        )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, attrs):
        account_type = attrs.pop('account_type', 'customer')
        email = attrs.get('email', '')
        if not attrs.get('username') and email:
            attrs['username'] = email.split('@')[0]
            base = attrs['username']
            n = 1
            while User.objects.filter(username=attrs['username']).exists():
                attrs['username'] = f'{base}{n}'
                n += 1
        if account_type == 'customer':
            attrs['role'] = User.Role.CUSTOMER
        else:
            attrs['role'] = User.Role.WORKER
        return attrs

    def create(self, validated_data):
        role = validated_data.pop('role', User.Role.CUSTOMER)
        password = validated_data.pop('password')
        user = User(role=role, **validated_data)
        user.set_password(password)
        user.save()
        if role == User.Role.CUSTOMER:
            name = f'{user.first_name} {user.last_name}'.strip() or user.username
            customer = Customer.objects.create(
                name=name,
                phone=user.phone or '',
                email=user.email,
            )
            user.customer_profile = customer
            user.save(update_fields=['customer_profile'])
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs['username']
        username = identifier
        if '@' in identifier:
            match = User.objects.filter(email__iexact=identifier).first()
            if match:
                username = match.username
        user = authenticate(
            request=self.context.get('request'),
            username=username,
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')
        attrs['user'] = user
        return attrs
