"""
Backfill visual fingerprints for image search.

Stores on each product (when the image URL is reachable over HTTP):
  - image_phash   — perceptual hash (primary anchor for similarity)
  - image_ahash   — average hash
  - image_dhash   — difference hash
  - image_color_sig — compact color histogram (helps “same item, different photo”)

Usage (from the backend/ directory, venv active):
  py manage.py reindex_product_image_phash
  py manage.py reindex_product_image_phash --all
  py manage.py reindex_product_image_phash -v

Or: py scripts/reindex_image_fingerprints.py [--all] [-v]
"""

from django.core.management.base import BaseCommand

from api.mongo_client import products_collection
from api.image_search_utils import visual_index_from_url


class Command(BaseCommand):
    help = "Scan product image URLs and store pHash + related fingerprints in MongoDB."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Recompute for every product whose image URL starts with http(s).",
        )
        parser.add_argument(
            "-v",
            "--verbose",
            action="store_true",
            help="Print each failed URL (download/decode errors).",
        )

    def handle(self, *args, **options):
        n_ok = 0
        n_fail = 0
        if options["all"]:
            cursor = products_collection.find({"image": {"$regex": r"^https?://"}})
        else:
            cursor = products_collection.find(
                {
                    "image": {"$regex": r"^https?://"},
                    "$or": [
                        {"image_phash": {"$exists": False}},
                        {"image_phash": None},
                        {"image_phash": ""},
                        {"image_color_sig": {"$exists": False}},
                        {"image_color_sig": None},
                    ],
                }
            )
        for p in cursor:
            url = str(p.get("image") or "").strip()
            idx = visual_index_from_url(url)
            if not idx:
                n_fail += 1
                if options["verbose"]:
                    sid = str(p.get("_id", ""))
                    self.stdout.write(
                        self.style.WARNING(f"[skip] {sid} — could not index ({url[:100]})")
                    )
                continue
            products_collection.update_one({"_id": p["_id"]}, {"$set": idx})
            n_ok += 1
            if options["verbose"]:
                self.stdout.write(self.style.SUCCESS(f"[ok] {p.get('_id')} {url[:80]}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Indexed {n_ok} product(s). Skipped/failed: {n_fail}. "
                f"(Requires public http(s) image URLs and Pillow + ImageHash installed.)"
            )
        )
