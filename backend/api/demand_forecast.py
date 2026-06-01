"""
Simple demand signals from behavior_events + orders (no external ML library).
Suitable for final-year demo: moving-style blend of views and historical sales.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List


def forecast_vendor_products(
    vendor_id: str,
    products_collection,
    behavior_events_collection,
    orders_collection,
    horizon_days: int = 7,
) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    window_start = now - timedelta(days=14)

    products = list(products_collection.find({"vendor_id": vendor_id}))
    out: List[Dict[str, Any]] = []

    for p in products:
        pid = str(p["_id"])
        views = behavior_events_collection.count_documents(
            {
                "product_id": pid,
                "event_type": {"$in": ["product_view", "product_impression", "order_intent", "add_to_cart"]},
                "created_at": {"$gte": window_start},
            }
        )
        cart_hints = behavior_events_collection.count_documents(
            {
                "product_id": pid,
                "event_type": "add_to_cart",
                "created_at": {"$gte": window_start},
            }
        )

        sold_pipeline = [
            {"$match": {"product_id": pid}},
            {"$group": {"_id": None, "units": {"$sum": "$quantity"}}},
        ]
        agg = list(orders_collection.aggregate(sold_pipeline))
        total_units = int(agg[0]["units"]) if agg else 0

        # Daily engagement proxy (last 14 days)
        daily_views = views / 14.0
        # Heuristic: small fraction of views convert; past sales add baseline
        base = daily_views * 0.08 * horizon_days
        momentum = (total_units ** 0.5) * 0.15
        predicted = max(0.5, round(base + momentum + cart_hints * 0.3, 1))
        stock = int(p.get("stock") or 0)
        suggested_restock = max(0, int(predicted * 1.2) - stock) if stock < predicted else 0

        out.append(
            {
                "product_id": pid,
                "name": p.get("name"),
                "category": p.get("category"),
                "stock": stock,
                "engagement_14d": views,
                "cart_adds_14d": cart_hints,
                "total_units_sold": total_units,
                "predicted_demand_next_7d_units": predicted,
                "suggested_restock_if_below_prediction": suggested_restock,
                "note": "Heuristic model: blends recent views, cart adds, and lifetime sales.",
            }
        )

    out.sort(key=lambda x: x["predicted_demand_next_7d_units"], reverse=True)
    return out
