"""
Hybrid recommendation engine for multi-vendor marketplace.

Signals (scalable design — all features read from indexed Mongo collections):
- Purchase history: order line items (strongest signal).
- Collaborative filtering: users who bought the same products bought X.
- Behavioral: co-view / shared-interest users from product_view events.
- Content affinity: category + vendor preferences from purchases and events.
- Cold start: global purchase popularity.

Vendor diversity: greedy re-ranking caps products per vendor in the result set.
Future scale: precompute co-occurrence in batch jobs, cache per-user results in Redis.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, DefaultDict, Dict, List, Set, Tuple

from bson import ObjectId

# Time windows
EVENT_LOOKBACK_DAYS = 90
COVIEW_USER_CAP = 400
MAX_MY_VIEWED_FOR_COVIEW = 40

# Hybrid weights (sum ≈ 1)
W_CATEGORY = 0.26
W_VENDOR = 0.10
W_COLLAB = 0.24
W_COVIEW = 0.24
W_POP = 0.16


def ensure_behavior_indexes(behavior_events_collection) -> None:
    try:
        behavior_events_collection.create_index([("user_id", 1), ("created_at", -1)])
        behavior_events_collection.create_index([("product_id", 1), ("created_at", -1)])
        behavior_events_collection.create_index([("user_id", 1), ("event_type", 1)])
    except Exception:
        pass


def _norm(counter: Counter, key: str) -> float:
    if not counter:
        return 0.0
    m = max(counter.values())
    if m <= 0:
        return 0.0
    return counter.get(key, 0) / m


def _serialize_product(doc: Dict[str, Any]) -> Dict[str, Any]:
    p = dict(doc)
    p["_id"] = str(p["_id"])
    return p


def compute_recommendations(
    user_id: str,
    limit: int,
    products_collection,
    orders_collection,
    behavior_events_collection,
) -> Dict[str, Any]:
    """
    Returns { products: [...], strategy: str, meta: {...} }.
    """
    try:
        ObjectId(user_id)
    except Exception:
        return {"products": [], "strategy": "invalid_user", "meta": {}}

    now = datetime.utcnow()
    event_since = now - timedelta(days=EVENT_LOOKBACK_DAYS)

    all_products = [
        p
        for p in products_collection.find({})
        if int(p.get("stock") or 0) > 0
    ]
    products_by_id: Dict[str, dict] = {}
    for p in all_products:
        products_by_id[str(p["_id"])] = p

    # --- Purchase history ---
    orders = list(orders_collection.find({"customer_id": user_id}))
    purchased_ids = {o["product_id"] for o in orders if o.get("product_id")}

    category_w = Counter()
    vendor_w = Counter()
    for pid in purchased_ids:
        pr = products_by_id.get(pid)
        if pr:
            category_w[pr.get("category") or ""] += 3.0
            vendor_w[pr.get("vendor_id") or ""] += 2.0

    # --- Behavior events (views, intents, category affinity) ---
    events = list(
        behavior_events_collection.find(
            {"user_id": user_id, "created_at": {"$gte": event_since}}
        )
    )
    viewed_ids: Set[str] = set()
    for e in events:
        et = e.get("event_type") or ""
        pid = e.get("product_id")
        if pid:
            w = 1.0
            if et == "order_intent":
                w = 2.8
            elif et == "purchase":
                w = 4.0
            elif et == "product_impression":
                w = 0.35
            elif et == "category_filter":
                w = 0.9
            viewed_ids.add(pid)
            pr = products_by_id.get(pid)
            if pr:
                category_w[pr.get("category") or ""] += w
                vendor_w[pr.get("vendor_id") or ""] += w * 0.6
        cat = e.get("category")
        if cat and et == "category_browse":
            category_w[cat] += 0.7

    # --- Global popularity (order counts) ---
    popularity: Counter[str] = Counter()
    for o in orders_collection.find({}):
        pid = o.get("product_id")
        if pid:
            popularity[pid] += 1

    # --- Collaborative: items bought by customers who bought the same products as you ---
    related_users: Set[str] = set()
    for pid in purchased_ids:
        for o in orders_collection.find(
            {"product_id": pid, "customer_id": {"$ne": user_id}}
        ):
            cid = o.get("customer_id")
            if cid:
                related_users.add(cid)

    co_purchase = Counter()
    for uid in related_users:
        for o in orders_collection.find({"customer_id": uid}):
            oid = o.get("product_id")
            if oid and oid not in purchased_ids:
                co_purchase[oid] += 1

    # --- Co-view: users who viewed the same products also viewed ---
    co_view = Counter()
    seed_views = list(viewed_ids)[:MAX_MY_VIEWED_FOR_COVIEW]
    if seed_views:
        peer_users: Set[str] = set()
        for pid in seed_views:
            for uid in behavior_events_collection.distinct(
                "user_id",
                {
                    "product_id": pid,
                    "event_type": {"$in": ["product_view", "product_impression"]},
                    "user_id": {"$ne": user_id},
                },
            ):
                peer_users.add(uid)
                if len(peer_users) >= COVIEW_USER_CAP:
                    break
            if len(peer_users) >= COVIEW_USER_CAP:
                break

        peer_list = list(peer_users)[:COVIEW_USER_CAP]
        if peer_list:
            for e in behavior_events_collection.find(
                {
                    "user_id": {"$in": peer_list},
                    "event_type": {"$in": ["product_view", "order_intent"]},
                    "created_at": {"$gte": event_since},
                }
            ):
                opid = e.get("product_id")
                if (
                    opid
                    and opid not in purchased_ids
                    and opid in products_by_id
                ):
                    co_view[opid] += 1

    # --- Score all candidate products ---
    candidates: List[Tuple[float, dict, List[str]]] = []
    for pid, pr in products_by_id.items():
        if pid in purchased_ids:
            continue
        cat = pr.get("category") or ""
        vid = pr.get("vendor_id") or ""

        s_cat = _norm(category_w, cat)
        s_vend = _norm(vendor_w, vid)
        s_cf = _norm(co_purchase, pid)
        s_cv = _norm(co_view, pid)
        s_pop = _norm(popularity, pid)

        score = (
            W_CATEGORY * s_cat
            + W_VENDOR * s_vend
            + W_COLLAB * s_cf
            + W_COVIEW * s_cv
            + W_POP * s_pop
        )

        reasons: List[str] = []
        if s_cat >= 0.2:
            reasons.append("category_match")
        if s_vend >= 0.2:
            reasons.append("vendor_affinity")
        if s_cf >= 0.15:
            reasons.append("similar_shoppers")
        if s_cv >= 0.15:
            reasons.append("browsing_patterns")
        if s_pop >= 0.2 and not reasons:
            reasons.append("popular")

        candidates.append((score, pr, reasons))

    candidates.sort(key=lambda x: x[0], reverse=True)

    # Cold start: heavy popularity if user has no signal
    has_signal = bool(purchased_ids or events)
    strategy = "personalized" if has_signal else "popular_fallback"

    if not has_signal:
        candidates = []
        for pid, pr in products_by_id.items():
            if pid in purchased_ids:
                continue
            s_pop = _norm(popularity, pid)
            candidates.append((s_pop, pr, ["popular"] if s_pop > 0 else ["explore"]))
        candidates.sort(key=lambda x: x[0], reverse=True)

    # Vendor diversification (max 3 per vendor in top results)
    picked: list[dict] = []
    per_vendor: DefaultDict[str, int] = defaultdict(int)
    for score, pr, reasons in candidates:
        if len(picked) >= limit * 3:
            break
        vid = pr.get("vendor_id") or ""
        if per_vendor[vid] >= 3:
            continue
        item = _serialize_product(pr)
        item["recommendation_score"] = round(score, 4)
        item["match_reasons"] = reasons[:4]
        picked.append(item)
        per_vendor[vid] += 1
        if len(picked) >= limit:
            break

    # If still short, fill without diversity cap
    if len(picked) < limit:
        seen = {p["_id"] for p in picked}
        for score, pr, reasons in candidates:
            if len(picked) >= limit:
                break
            sid = str(pr["_id"])
            if sid in seen:
                continue
            item = _serialize_product(pr)
            item["recommendation_score"] = round(score, 4)
            item["match_reasons"] = reasons[:4]
            picked.append(item)
            seen.add(sid)

    return {
        "products": picked[:limit],
        "strategy": strategy,
        "meta": {
            "purchased_products": len(purchased_ids),
            "behavior_events": len(events),
            "weights": {
                "category": W_CATEGORY,
                "vendor": W_VENDOR,
                "collaborative": W_COLLAB,
                "co_view": W_COVIEW,
                "popularity": W_POP,
            },
        },
    }
