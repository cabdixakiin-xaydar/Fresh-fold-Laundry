from decimal import Decimal

from django.core.management.base import BaseCommand

from billing.models import TaxRate
from orders.models import PricingUnit, ServiceType


class Command(BaseCommand):
    help = 'Seed default service types and tax rate for local development (SQLite-friendly).'

    def handle(self, *args, **options):
        catalog = [
            ('Wash', 'wash', Decimal('5.00'), PricingUnit.ITEM),
            ('Dry cleaning', 'dry_clean', Decimal('12.00'), PricingUnit.ITEM),
            ('Ironing', 'iron', Decimal('3.50'), PricingUnit.ITEM),
        ]
        for name, code, price, unit in catalog:
            ServiceType.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'base_price': price,
                    'pricing_unit': unit,
                    'active': True,
                    'description': '',
                },
            )

        TaxRate.objects.update_or_create(
            name='Standard',
            defaults={'rate_percent': Decimal('8.0000'), 'active': True},
        )

        self.stdout.write(self.style.SUCCESS('Catalog seeded: service types + Standard tax rate.'))
