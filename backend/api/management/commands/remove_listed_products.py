"""
Remove specific catalog products from MongoDB (by exact name or cake in Kitchen).

Run from backend/:
  python manage.py remove_listed_products
"""

from django.core.management.base import BaseCommand

from api.mongo_client import products_collection

# Exact names removed from seed_catalog + user-requested items
REMOVE_EXACT_NAMES = [
    "Fresh Strawberries",
    "Blueberry Muffins (6 pack)",
    "Portable Bluetooth Speaker",
    "Fast USB-C Wall Charger 65W",
    "Glass Food Storage Containers (Set of 6)",
]


class Command(BaseCommand):
    help = "Delete listed products from the products collection."

    def handle(self, *args, **options):
        deleted = 0
        res = products_collection.delete_many({"name": {"$in": REMOVE_EXACT_NAMES}})
        deleted += res.deleted_count
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {res.deleted_count} product(s) by exact name.")
        )

        # "cake" in Kitchen (case-insensitive); avoids removing names like "cupcake" if any
        res2 = products_collection.delete_many(
            {
                "category": {"$regex": "^kitchen$", "$options": "i"},
                "name": {"$regex": "^cake$", "$options": "i"},
            }
        )
        deleted += res2.deleted_count
        if res2.deleted_count:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Deleted {res2.deleted_count} Kitchen product(s) named 'cake' (case-insensitive)."
                )
            )

        self.stdout.write(self.style.SUCCESS(f"Total removed: {deleted}"))
