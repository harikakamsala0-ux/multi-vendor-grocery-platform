"""
Seed the MongoDB catalog: 4 demo vendors + 22 products across all categories.

Vendors (password for each: seed123):
  - greenvalley@seed.freshcart      — Green Valley Farms (Vegetables, Fruits)
  - sparkelectronics@seed.freshcart — Spark Electronics (Electronics, Mobiles)
  - bakehouse@seed.freshcart        — Bake House Co. (Bakery, Beauty)
  - homeessentials@seed.freshcart   — Home Essentials (Kitchen, Clothes)

Product images use category-matched keywords via Lorem Flickr (not random stock).

  python manage.py seed_catalog --refresh-images
updates image URLs on existing seeded rows.

Usage (from backend/ directory):
  python manage.py seed_catalog
  python manage.py seed_catalog --force
  python manage.py seed_catalog --refresh-images
"""

import hashlib
from collections import defaultdict

from django.core.management.base import BaseCommand

from api.image_search_utils import visual_index_from_url
from api.mongo_client import products_collection, users_collection


def _apply_visual_index_to_product(product_oid, image_url: str) -> bool:
    """Store pHash / aHash / dHash + color signature for image search (same as add_product)."""
    idx = visual_index_from_url(str(image_url))
    if not idx:
        return False
    products_collection.update_one({"_id": product_oid}, {"$set": idx})
    return True

# Second tag in URL reinforces the category (e.g. tomato + vegetable).
CATEGORY_FLICKR_TAG = {
    "Vegetables": "vegetable",
    "Fruits": "fruit",
    "Electronics": "electronics",
    "Mobiles": "mobile",
    "Bakery": "bakery",
    "Kitchen": "kitchen",
    "Clothes": "clothes",
    "Beauty": "beauty",
}

# Rotate through these search terms per product within the same category.
CATEGORY_KEYWORDS = {
    "Vegetables": ["tomato", "carrot", "spinach", "pepper", "broccoli", "lettuce"],
    "Fruits": ["apple", "banana", "orange", "strawberry", "grape", "kiwi"],
    "Electronics": ["headphones", "laptop", "speaker", "camera", "keyboard", "gadget"],
    "Mobiles": ["iphone", "android", "smartphone", "mobile", "phone", "cellphone"],
    "Bakery": ["bread", "croissant", "pastry", "muffin", "cake", "donut"],
    "Kitchen": ["cookware", "knife", "cooking", "kitchen", "pan", "blender"],
    "Clothes": ["shirt", "jeans", "fashion", "clothing", "tshirt", "jacket"],
    "Beauty": ["lipstick", "makeup", "cosmetics", "perfume", "skincare", "beauty"],
}


def _category_image_url(category: str, product_name: str, slot_in_category: int) -> str:
    """Image URL matched to category name + product-specific lock for variety."""
    keywords = CATEGORY_KEYWORDS.get(
        category, ["product", "shopping", "store", "market", "retail"]
    )
    keyword = keywords[slot_in_category % len(keywords)]
    broad = CATEGORY_FLICKR_TAG.get(category, "product")
    lock = int(hashlib.md5(f"{category}:{product_name}".encode()).hexdigest()[:8], 16) % 9999 + 1
    return f"https://loremflickr.com/800/600/{keyword},{broad}?lock={lock}"


SEED_VENDORS = [
    {
        "email": "greenvalley@seed.freshcart",
        "password": "seed123",
        "name": "Green Valley Farms",
        "role": "vendor",
    },
    {
        "email": "sparkelectronics@seed.freshcart",
        "password": "seed123",
        "name": "Spark Electronics",
        "role": "vendor",
    },
    {
        "email": "bakehouse@seed.freshcart",
        "password": "seed123",
        "name": "Bake House Co.",
        "role": "vendor",
    },
    {
        "email": "homeessentials@seed.freshcart",
        "password": "seed123",
        "name": "Home Essentials",
        "role": "vendor",
    },
]

# (vendor_email, category, name, description, price, stock)
CATALOG = [
    (
        "greenvalley@seed.freshcart",
        "Vegetables",
        "Organic Cherry Tomatoes",
        "Vine-ripened cherry tomatoes, 500g pack.",
        89,
        120,
    ),
    (
        "greenvalley@seed.freshcart",
        "Vegetables",
        "Fresh Spinach Bunch",
        "Washed baby spinach, ideal for salads.",
        45,
        80,
    ),
    (
        "greenvalley@seed.freshcart",
        "Vegetables",
        "Rainbow Bell Peppers",
        "Mixed color bell peppers, 3 pack.",
        120,
        60,
    ),
    (
        "greenvalley@seed.freshcart",
        "Vegetables",
        "Baby Carrots",
        "Sweet organic carrots, 1kg.",
        65,
        100,
    ),
    (
        "greenvalley@seed.freshcart",
        "Fruits",
        "Himalayan Apples",
        "Crisp red apples, 1kg.",
        180,
        90,
    ),
    (
        "greenvalley@seed.freshcart",
        "Fruits",
        "Navel Oranges",
        "Juicy oranges, rich in vitamin C.",
        140,
        75,
    ),
    (
        "greenvalley@seed.freshcart",
        "Fruits",
        "Banana Bunch",
        "Ripe yellow bananas.",
        55,
        150,
    ),
    (
        "sparkelectronics@seed.freshcart",
        "Electronics",
        "Wireless Noise-Canceling Headphones",
        "Bluetooth 5.2, 30h battery, foldable design.",
        4999,
        35,
    ),
    (
        "sparkelectronics@seed.freshcart",
        "Electronics",
        "Ergonomic Laptop Stand",
        "Aluminum, adjustable height.",
        1299,
        70,
    ),
    (
        "sparkelectronics@seed.freshcart",
        "Electronics",
        "Smart Fitness Band",
        "Heart rate, sleep tracking, OLED display.",
        1999,
        45,
    ),
    (
        "sparkelectronics@seed.freshcart",
        "Mobiles",
        "Nova X5 5G Smartphone",
        "128GB storage, 50MP camera, 6.5\" AMOLED.",
        18999,
        25,
    ),
    (
        "sparkelectronics@seed.freshcart",
        "Mobiles",
        "LitePhone SE",
        "Compact 5G, great battery life.",
        12499,
        40,
    ),
    (
        "sparkelectronics@seed.freshcart",
        "Mobiles",
        "Tempered Glass Screen Guard (2-pack)",
        "Universal fit, anti-fingerprint.",
        299,
        200,
    ),
    (
        "bakehouse@seed.freshcart",
        "Bakery",
        "Artisan Sourdough Loaf",
        "Slow-fermented, crusty golden loaf.",
        149,
        30,
    ),
    (
        "bakehouse@seed.freshcart",
        "Bakery",
        "Butter Croissants (4 pack)",
        "Flaky French-style croissants.",
        199,
        25,
    ),
    (
        "bakehouse@seed.freshcart",
        "Bakery",
        "Multigrain Sandwich Bread",
        "High-fibre, no preservatives.",
        89,
        55,
    ),
    (
        "homeessentials@seed.freshcart",
        "Kitchen",
        "Stainless Steel Cookware Set",
        "5-piece induction-ready set.",
        3499,
        20,
    ),
    (
        "homeessentials@seed.freshcart",
        "Kitchen",
        "Chef Knife 8 inch",
        "High-carbon steel, ergonomic handle.",
        899,
        45,
    ),
    (
        "homeessentials@seed.freshcart",
        "Kitchen",
        "Non-Stick Frying Pan 28cm",
        "PFOA-free coating.",
        1199,
        35,
    ),
    (
        "homeessentials@seed.freshcart",
        "Clothes",
        "Classic Cotton T-Shirt",
        "Unisex, breathable organic cotton.",
        599,
        80,
    ),
    (
        "homeessentials@seed.freshcart",
        "Clothes",
        "Slim Fit Denim Jeans",
        "Stretch denim, dark wash.",
        1899,
        50,
    ),
    (
        "bakehouse@seed.freshcart",
        "Beauty",
        "Hydrating Face Serum",
        "Hyaluronic acid, 30ml.",
        899,
        60,
    ),
    (
        "bakehouse@seed.freshcart",
        "Beauty",
        "Matte Lipstick Set",
        "Long-wear, 3 shades.",
        1299,
        40,
    ),
]


class Command(BaseCommand):
    help = "Seed MongoDB with demo vendors and category-matched product images."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete previously seeded products and re-insert.",
        )
        parser.add_argument(
            "--refresh-images",
            action="store_true",
            help="Update image URLs for existing seed_catalog products (fixes broken hotlinks).",
        )

    def handle(self, *args, **options):
        if options["refresh_images"]:
            self._refresh_images_only()
            return

        force = options["force"]

        if force:
            r = products_collection.delete_many({"seed_catalog": True})
            self.stdout.write(
                self.style.WARNING(f"Removed {r.deleted_count} seeded products.")
            )

        existing = products_collection.count_documents({"seed_catalog": True})
        if existing > 0 and not force:
            self.stdout.write(
                self.style.WARNING(
                    f"Found {existing} seeded products. Use --force to replace, "
                    "or --refresh-images to fix image URLs only."
                )
            )
            return

        vendors_by_email = {}
        for v in SEED_VENDORS:
            doc = users_collection.find_one({"email": v["email"]})
            if not doc:
                users_collection.insert_one(
                    {
                        "name": v["name"],
                        "email": v["email"],
                        "password": v["password"],
                        "role": v["role"],
                    }
                )
                doc = users_collection.find_one({"email": v["email"]})
                self.stdout.write(self.style.SUCCESS(f"Created vendor: {v['name']}"))
            vendors_by_email[v["email"]] = doc

        n = 0
        slot_by_category = defaultdict(int)
        for row in CATALOG:
            email, category, name, description, price, stock = row
            vendor = vendors_by_email[email]
            vid = str(vendor["_id"])
            slot = slot_by_category[category]
            slot_by_category[category] += 1
            image_url = _category_image_url(category, name, slot)
            ins = products_collection.insert_one(
                {
                    "vendor_id": vid,
                    "vendor_email": vendor["email"],
                    "vendor_name": vendor["name"],
                    "name": name,
                    "description": description,
                    "price": float(price),
                    "stock": int(stock),
                    "category": category,
                    "image": image_url,
                    "seed_catalog": True,
                }
            )
            _apply_visual_index_to_product(ins.inserted_id, image_url)
            n += 1

        self.stdout.write(self.style.SUCCESS(f"Inserted {n} catalog products."))

    def _refresh_images_only(self):
        updated = 0
        slot_by_category = defaultdict(int)
        for row in CATALOG:
            email, category, name, description, price, stock = row
            vendor = users_collection.find_one({"email": email})
            if not vendor:
                self.stdout.write(self.style.WARNING(f"Skip (no vendor): {email}"))
                continue
            vid = str(vendor["_id"])
            slot = slot_by_category[category]
            slot_by_category[category] += 1
            image_url = _category_image_url(category, name, slot)
            filt = {
                "seed_catalog": True,
                "name": name,
                "vendor_id": vid,
            }
            res = products_collection.update_one(
                filt,
                {"$set": {"image": image_url}},
            )
            if res.matched_count:
                updated += 1
                doc = products_collection.find_one(filt)
                if doc:
                    _apply_visual_index_to_product(doc["_id"], image_url)
            else:
                self.stdout.write(
                    self.style.WARNING(f"No match for seeded product: {name} ({email})")
                )
        self.stdout.write(
            self.style.SUCCESS(f"Updated images on {updated} seeded products.")
        )
