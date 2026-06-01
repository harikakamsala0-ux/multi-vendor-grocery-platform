"""Recompute sentiment + fraud fields for existing vendor_reviews (no new text)."""

from django.core.management.base import BaseCommand

from api.mongo_client import vendor_reviews_collection
from api.ml_review_utils import (
    analyze_sentiment,
    comment_fingerprint,
    detect_fraud_signals,
)


class Command(BaseCommand):
    help = "Backfill sentiment_label, fraud_flags, etc. on existing reviews."

    def handle(self, *args, **options):
        n = 0
        for r in vendor_reviews_collection.find({}):
            comment = (r.get("comment") or "").strip()
            rating = int(r.get("rating") or 3)
            vid = r.get("vendor_id")
            fp = comment_fingerprint(comment)
            dup_others = vendor_reviews_collection.count_documents(
                {
                    "vendor_id": vid,
                    "comment_fingerprint": fp,
                    "_id": {"$ne": r["_id"]},
                }
            )
            label, compound, scores = analyze_sentiment(comment)
            flags, risk = detect_fraud_signals(comment, rating, compound, dup_others + 1)
            if dup_others >= 1 and "duplicate_or_near_duplicate_text" not in flags:
                flags.append("duplicate_or_near_duplicate_text")
                flags, risk = detect_fraud_signals(comment, rating, compound, dup_others + 2)
            needs_admin = risk in ("medium", "high")
            vendor_reviews_collection.update_one(
                {"_id": r["_id"]},
                {
                    "$set": {
                        "comment_fingerprint": fp,
                        "sentiment_label": label,
                        "sentiment_compound": compound,
                        "sentiment_scores": scores,
                        "fraud_flags": flags,
                        "fraud_risk": risk,
                        "needs_admin_review": needs_admin,
                    }
                },
            )
            n += 1
        self.stdout.write(self.style.SUCCESS(f"Updated {n} review(s)."))
