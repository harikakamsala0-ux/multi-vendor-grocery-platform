from datetime import datetime
import re

from rest_framework.response import Response
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from bson import ObjectId
from django.core.mail import EmailMessage, send_mail
from .mongo_client import (
    users_collection,
    products_collection,
    orders_collection,
    vendor_reviews_collection,
    behavior_events_collection,
    wishlist_collection,
)
from .recommendation_engine import compute_recommendations
from .ml_review_utils import (
    analyze_sentiment,
    build_review_summary,
    comment_fingerprint,
    detect_fraud_signals,
    sentiment_breakdown,
)
from .demand_forecast import forecast_vendor_products
from .image_search_utils import (
    image_hashes_from_url,
    match_tier,
    rank_by_image_similarity,
    visual_index_from_bytes,
    visual_index_from_url,
)
ADMIN_EMAIL = "greeshma123@gmail.com"
ADMIN_PASSWORD = "greeshma123"
def send_email(subject, message, to_email, reply_to=None):
    try:
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email="greeshmap116@gmail.com",  
            to=[to_email],
            reply_to=[reply_to] if reply_to else None
        )
        email.send(fail_silently=False)
        print("EMAIL SENT TO:", to_email)
    except Exception as e:
        print("EMAIL ERROR:", e)


def _place_order_core(customer_id, product_id, quantity):
    """
    Create one pending order. Returns (order_id_str or None, error_message or None).
    """
    try:
        customer = users_collection.find_one({"_id": ObjectId(customer_id)})
        product = products_collection.find_one({"_id": ObjectId(product_id)})
    except Exception:
        return None, "Invalid customer or product"
    if not customer or not product:
        return None, "Invalid customer or product"
    stock = int(product.get("stock") or 0)
    if quantity < 1:
        return None, "Invalid quantity"
    if quantity > stock:
        return None, f"Insufficient stock for {product.get('name', 'product')}"
    total_price = float(product["price"]) * quantity
    order = {
        "customer_id": str(customer["_id"]),
        "customer_name": customer["name"],
        "customer_email": customer["email"],
        "vendor_id": product["vendor_id"],
        "vendor_email": product["vendor_email"],
        "vendor_name": product["vendor_name"],
        "product_id": str(product["_id"]),
        "product_name": product["name"],
        "quantity": quantity,
        "total_price": total_price,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    ins = orders_collection.insert_one(order)
    oid = str(ins.inserted_id)
    try:
        behavior_events_collection.insert_one(
            {
                "user_id": str(customer["_id"]),
                "event_type": "purchase",
                "product_id": str(product["_id"]),
                "category": product.get("category"),
                "vendor_id": product.get("vendor_id"),
                "created_at": datetime.utcnow(),
            }
        )
    except Exception:
        pass
    send_email(
        subject="New Order Request",
        message=f"Hello {product['vendor_name']},\n\nYou received a new order for '{product['name']}'.\n"
        f"Customer: {customer['name']}\nQuantity: {quantity}",
        to_email=product["vendor_email"],
        reply_to=customer["email"],
    )
    send_email(
        subject="Order Placed Successfully",
        message=f"Hello {customer['name']},\n\nYour order for '{product['name']}' has been sent to vendor {product['vendor_name']}.",
        to_email=customer["email"],
        reply_to=product["vendor_email"],
    )
    return oid, None
@api_view(['POST'])
def signup(request):
    data = request.data
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    if users_collection.find_one({'email': email}):
        return Response({'error': 'User already exists'}, status=400)
    users_collection.insert_one({
        'name': name,
        'email': email,
        'password': password,
        'role': role
    })
    send_email(
        subject="Welcome to FreshCart!",
        message=f"Hello {name},\n\nYour FreshCart account has been created successfully as {role}.",
        to_email=email
    )
    return Response({'message': 'Signup successful'}, status=201)
@api_view(['POST'])
def login(request):
    data = request.data
    email = data.get('email')
    password = data.get('password')
    if email.lower() == ADMIN_EMAIL.lower() and password == ADMIN_PASSWORD:
        send_email(
            subject="Admin Login Alert",
            message="Admin logged in to FreshCart.",
            to_email=ADMIN_EMAIL
        )
        return Response({
            'message': 'Admin login successful',
            'role': 'admin',
            'email': email,
            'id': 'admin123'
        }, status=200)
    user = users_collection.find_one({'email': email})
    if not user:
        return Response({'error': 'User not found'}, status=401)
    if user.get('password') != password:
        return Response({'error': 'Invalid password'}, status=401)
    send_email(
        subject="FreshCart Login Successful",
        message=f"Hello {user['name']},\n\nYou have logged in successfully.",
        to_email=email
    )
    return Response({
        'message': 'Login successful',
        'role': user['role'],
        'email': email,
        'name': user['name'],
        'id': str(user['_id'])
    }, status=200)
@api_view(['POST'])
def add_product(request):
    data = request.data
    vendor_id = data.get('vendor_id')
    vendor = users_collection.find_one({'_id': ObjectId(vendor_id), 'role': 'vendor'})
    if not vendor:
        return Response({'error': 'Invalid vendor'}, status=400)
    product = {
        'vendor_id': str(vendor['_id']),
        'vendor_email': vendor['email'],
        'vendor_name': vendor['name'],
        'name': data.get('name'),
        'description': data.get('description'),
        'price': float(data.get('price')),
        'stock': int(data.get('stock')),
        'category': data.get('category'),
        'image': data.get('image'),
    }
    ins = products_collection.insert_one(product)
    idx = visual_index_from_url(str(product.get("image") or ""))
    if idx:
        products_collection.update_one(
            {"_id": ins.inserted_id},
            {"$set": idx},
        )
    send_email(
        subject="Product Added",
        message=f"Hello {vendor['name']},\n\nYour product '{product['name']}' was added successfully.",
        to_email=vendor['email']
    )
    return Response({'message': 'Product added successfully'}, status=201)
@api_view(['GET'])
def get_products(request):
    products = list(products_collection.find({}))
    for p in products:
        p['_id'] = str(p['_id'])
    return Response(products, status=200)
@api_view(['POST'])
def place_order(request):
    data = request.data
    customer_id = data.get('customer_id')
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))
    oid, err = _place_order_core(customer_id, product_id, quantity)
    if err:
        return Response({'error': err}, status=400)
    return Response({'message': 'Order placed successfully', 'order_id': oid}, status=201)
@api_view(['GET'])
def get_orders_for_vendor(request, vendor_id):
    orders = list(orders_collection.find({'vendor_id': vendor_id}))
    for o in orders:
        o['_id'] = str(o['_id'])
    return Response(orders, status=200)
@api_view(['POST'])
def update_order_status(request):
    data = request.data

    order_id = data.get('order_id')
    new_status = data.get('status')

    order = orders_collection.find_one({'_id': ObjectId(order_id)})
    if not order:
        return Response({'error': 'Order not found'}, status=404)

    orders_collection.update_one(
        {'_id': ObjectId(order_id)},
        {'$set': {'status': new_status}}
    )
    send_email(
        subject=f"Your Order Was {new_status.capitalize()}",
        message=f"Hello {order['customer_name']},\n\n"
                f"Your order for '{order['product_name']}' was {new_status} by vendor {order['vendor_name']}.",
        to_email=order['customer_email'],
        reply_to=order['vendor_email']
    )
    return Response({'message': f'Order {new_status} successfully'}, status=200)
@api_view(['GET'])
def get_orders_for_customer(request, customer_id):
    """Customer sees his own orders"""
    orders = list(orders_collection.find({'customer_id': customer_id}))
    for o in orders:
        o['_id'] = str(o['_id'])
    return Response(orders, status=200)
@api_view(['GET'])
def get_all_users(request):
    users = list(users_collection.find({}))
    for u in users:
        u['_id'] = str(u['_id'])
    return Response(users, status=200)
@api_view(['GET'])
def get_all_orders(request):
    orders = list(orders_collection.find({}))
    for o in orders:
        o['_id'] = str(o['_id'])
    return Response(orders, status=200)
@api_view(['GET'])
def get_vendor_products(request, vendor_id):
    products = list(products_collection.find({'vendor_id': vendor_id}))
    for p in products:
        p['_id'] = str(p['_id'])
    return Response(products, status=200)


def _serialize_review(doc):
    out = dict(doc)
    out['_id'] = str(out['_id'])
    if 'created_at' in out and hasattr(out['created_at'], 'isoformat'):
        out['created_at'] = out['created_at'].isoformat()
    if 'updated_at' in out and hasattr(out['updated_at'], 'isoformat'):
        out['updated_at'] = out['updated_at'].isoformat()
    return out


@api_view(['GET'])
def get_vendor_reviews(request, vendor_id):
    reviews = list(
        vendor_reviews_collection.find({'vendor_id': vendor_id}).sort('created_at', -1)
    )
    serialized = [_serialize_review(r) for r in reviews]
    count = len(serialized)
    average = None
    if count:
        average = round(sum(r['rating'] for r in serialized) / count, 1)
    return Response(
        {'reviews': serialized, 'average_rating': average, 'count': count},
        status=200,
    )


@api_view(['GET'])
def get_customer_reviews(request, customer_id):
    reviews = list(vendor_reviews_collection.find({'customer_id': customer_id}))
    return Response([_serialize_review(r) for r in reviews], status=200)


@api_view(['POST'])
def get_vendor_rating_summaries(request):
    vendor_ids = request.data.get('vendor_ids') or []
    if not isinstance(vendor_ids, list):
        return Response({'error': 'vendor_ids must be a list'}, status=400)
    result = {}
    for vid in vendor_ids:
        if not vid or not isinstance(vid, str):
            continue
        revs = list(vendor_reviews_collection.find({'vendor_id': vid}))
        n = len(revs)
        if n == 0:
            result[vid] = {'average_rating': None, 'count': 0}
        else:
            result[vid] = {
                'average_rating': round(sum(r['rating'] for r in revs) / n, 1),
                'count': n,
            }
    return Response(result, status=200)


@api_view(["GET"])
def get_vendor_review_insights(request, vendor_id):
    """AI-style insights: sentiment mix + extractive summary for a vendor's reviews."""
    try:
        ObjectId(vendor_id)
    except Exception:
        return Response({"error": "Invalid vendor_id"}, status=400)
    reviews = list(
        vendor_reviews_collection.find({"vendor_id": vendor_id}).sort("created_at", -1)
    )
    serialized = [_serialize_review(r) for r in reviews]
    breakdown = sentiment_breakdown(serialized)
    summary = build_review_summary(serialized)
    return Response(
        {
            "vendor_id": vendor_id,
            "review_count": len(serialized),
            "sentiment_breakdown": breakdown,
            "summary": summary,
        },
        status=200,
    )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def search_products_by_image(request):
    """Upload an image; rank products by blended hash + color similarity."""
    f = request.FILES.get("image") or request.FILES.get("file")
    if not f:
        return Response({"error": "Missing file field 'image'"}, status=400)
    data = f.read()
    if len(data) > 6 * 1024 * 1024:
        return Response({"error": "Image too large (max 6MB)"}, status=400)
    query_idx = visual_index_from_bytes(data)
    if not query_idx or not query_idx.get("image_phash"):
        return Response(
            {
                "error": "Could not process image (install Pillow + ImageHash, or try another image).",
                "products": [],
            },
            status=200,
        )

    products = list(
        products_collection.find(
            {"image_phash": {"$exists": True, "$nin": [None, ""]}}
        )
    )
    by_id = {p["_id"]: p for p in products}

    # Backfill dHash + color signature (and phash if missing) so different photos match better.
    needs_features = list(
        products_collection.find(
            {
                "image": {"$regex": r"^https?://"},
                "$or": [
                    {"image_phash": {"$exists": False}},
                    {"image_phash": None},
                    {"image_phash": ""},
                    {"image_color_sig": {"$exists": False}},
                    {"image_color_sig": None},
                    {"image_dhash": {"$exists": False}},
                    {"image_dhash": None},
                    {"image_dhash": ""},
                ],
            }
        ).limit(40)
    )
    for p in needs_features:
        idx = visual_index_from_url(str(p.get("image") or ""))
        if not idx:
            continue
        products_collection.update_one({"_id": p["_id"]}, {"$set": idx})
        if p["_id"] in by_id:
            by_id[p["_id"]].update(idx)
        else:
            merged = {**p, **idx}
            products.append(merged)
            by_id[p["_id"]] = merged

    for p in products:
        p["_id"] = str(p["_id"])

    ranked = rank_by_image_similarity(query_idx, products, limit=20)
    out = []
    for p, comb, ph_d, ah_d, dh_d, hi_d in ranked:
        p2 = dict(p)
        p2.pop("image_color_sig", None)
        p2["similarity_score"] = round(comb, 2)
        p2["phash_distance"] = ph_d
        p2["ahash_distance"] = ah_d
        p2["dhash_distance"] = dh_d
        p2["color_distance"] = round(hi_d, 2)
        p2["match_tier"] = match_tier(comb)
        out.append(p2)

    indexed_product_count = products_collection.count_documents(
        {"image_phash": {"$exists": True, "$nin": [None, ""]}}
    )
    total_products = products_collection.count_documents({})
    payload = {
        "query_phash": query_idx["image_phash"],
        "query_ahash": query_idx.get("image_ahash"),
        "count": len(out),
        "products": out,
        "indexed_product_count": indexed_product_count,
        "total_products": total_products,
        "hint": (
            "Lower score = closer match. Color + multiple hashes help when the photo "
            "is not identical to the catalog image. Run reindex_product_image_phash "
            "to refresh stored fingerprints."
        ),
    }
    if len(out) == 0:
        if indexed_product_count == 0 and total_products > 0:
            payload["empty_reason"] = "no_fingerprints"
        elif total_products == 0:
            payload["empty_reason"] = "no_products"
        else:
            payload["empty_reason"] = "no_ranked_matches"
    return Response(payload, status=200)


@api_view(["GET"])
def get_vendor_demand_forecast(request, vendor_id):
    """Simple demand heuristic for vendor dashboard."""
    try:
        ObjectId(vendor_id)
    except Exception:
        return Response({"error": "Invalid vendor_id"}, status=400)
    rows = forecast_vendor_products(
        vendor_id,
        products_collection,
        behavior_events_collection,
        orders_collection,
    )
    return Response({"vendor_id": vendor_id, "forecasts": rows}, status=200)


@api_view(["GET"])
def get_flagged_reviews_admin(request):
    """Reviews flagged for manual review (demo admin endpoint)."""
    q = {
        "$or": [
            {"needs_admin_review": True},
            {"fraud_risk": {"$in": ["medium", "high"]}},
        ]
    }
    reviews = list(vendor_reviews_collection.find(q).sort("updated_at", -1).limit(100))
    return Response(
        {"count": len(reviews), "reviews": [_serialize_review(r) for r in reviews]},
        status=200,
    )


@api_view(['POST'])
def submit_vendor_review(request):
    data = request.data
    customer_id = data.get('customer_id')
    vendor_id = data.get('vendor_id')
    rating = data.get('rating')
    comment = (data.get('comment') or '').strip()

    if not customer_id or not vendor_id:
        return Response({'error': 'customer_id and vendor_id are required'}, status=400)

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({'error': 'rating must be an integer 1–5'}, status=400)

    if rating < 1 or rating > 5:
        return Response({'error': 'rating must be between 1 and 5'}, status=400)

    try:
        customer_oid = ObjectId(customer_id)
        vendor_oid = ObjectId(vendor_id)
    except Exception:
        return Response({'error': 'Invalid customer_id or vendor_id'}, status=400)

    customer = users_collection.find_one({'_id': customer_oid, 'role': 'customer'})
    vendor = users_collection.find_one({'_id': vendor_oid, 'role': 'vendor'})
    if not customer:
        return Response({'error': 'Invalid customer'}, status=400)
    if not vendor:
        return Response({'error': 'Invalid vendor'}, status=400)

    has_approved = orders_collection.find_one(
        {
            'customer_id': customer_id,
            'vendor_id': vendor_id,
            'status': 'approved',
        }
    )
    if not has_approved:
        return Response(
            {'error': 'You can only review vendors after at least one approved order with them.'},
            status=403,
        )

    now = datetime.utcnow()
    fp = comment_fingerprint(comment)
    dup_query = {"vendor_id": vendor_id, "comment_fingerprint": fp}
    existing = vendor_reviews_collection.find_one(
        {'customer_id': customer_id, 'vendor_id': vendor_id}
    )
    if existing:
        dup_query["_id"] = {"$ne": existing["_id"]}
    dup_others = vendor_reviews_collection.count_documents(dup_query)

    label, compound, scores = analyze_sentiment(comment)
    fraud_flags, fraud_risk = detect_fraud_signals(
        comment, rating, compound, dup_others + (1 if dup_others > 0 else 0)
    )
    if dup_others >= 1 and "duplicate_or_near_duplicate_text" not in fraud_flags:
        fraud_flags.append("duplicate_or_near_duplicate_text")
        fraud_flags, fraud_risk = detect_fraud_signals(
            comment, rating, compound, dup_others + 2
        )

    needs_admin = fraud_risk in ("medium", "high")

    doc = {
        'customer_id': customer_id,
        'customer_name': customer.get('name', ''),
        'vendor_id': vendor_id,
        'vendor_name': vendor.get('name', ''),
        'rating': rating,
        'comment': comment,
        'updated_at': now,
        'comment_fingerprint': fp,
        'sentiment_label': label,
        'sentiment_compound': compound,
        'sentiment_scores': scores,
        'fraud_flags': fraud_flags,
        'fraud_risk': fraud_risk,
        'needs_admin_review': needs_admin,
    }

    if existing:
        vendor_reviews_collection.update_one(
            {'_id': existing['_id']},
            {'$set': {**doc, 'created_at': existing.get('created_at', now)}},
        )
        saved = vendor_reviews_collection.find_one({'_id': existing['_id']})
    else:
        doc['created_at'] = now
        ins = vendor_reviews_collection.insert_one(doc)
        saved = vendor_reviews_collection.find_one({'_id': ins.inserted_id})

    return Response(
        {'message': 'Review saved', 'review': _serialize_review(saved)},
        status=200 if existing else 201,
    )


BEHAVIOR_EVENT_TYPES = frozenset(
    {
        "product_view",
        "order_intent",
        "product_impression",
        "category_filter",
        "category_browse",
        "search",
        "add_to_cart",
    }
)


@api_view(["POST"])
def track_behavior_event(request):
    """Ingest browsing and interaction signals for personalization (customers)."""
    data = request.data
    user_id = data.get("user_id")
    event_type = data.get("event_type")
    if not user_id or event_type not in BEHAVIOR_EVENT_TYPES:
        return Response(
            {"error": "user_id and valid event_type are required"}, status=400
        )
    try:
        uid_oid = ObjectId(user_id)
    except Exception:
        return Response({"error": "Invalid user_id"}, status=400)

    user = users_collection.find_one({"_id": uid_oid})
    if not user:
        return Response({"error": "User not found"}, status=404)
    if user.get("role") != "customer":
        return Response({"error": "Only customer events are tracked"}, status=400)

    doc = {
        "user_id": user_id,
        "event_type": event_type,
        "created_at": datetime.utcnow(),
    }
    if data.get("product_id"):
        doc["product_id"] = str(data["product_id"])
    if data.get("category"):
        doc["category"] = str(data["category"])[:120]
    if data.get("vendor_id"):
        doc["vendor_id"] = str(data["vendor_id"])
    if data.get("query"):
        doc["query"] = str(data["query"])[:200]

    behavior_events_collection.insert_one(doc)
    return Response({"ok": True}, status=201)


@api_view(["GET"])
def get_recommendations(request, user_id):
    """Personalized products: purchases + collaborative + behavior + popularity."""
    try:
        ObjectId(user_id)
    except Exception:
        return Response({"error": "Invalid user_id"}, status=400)

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return Response({"error": "User not found"}, status=404)
    if user.get("role") != "customer":
        return Response(
            {
                "products": [],
                "strategy": "not_applicable",
                "meta": {"reason": "Recommendations are for customers"},
            },
            status=200,
        )

    try:
        limit = int(request.query_params.get("limit") or 12)
    except (TypeError, ValueError):
        limit = 12
    limit = min(max(limit, 1), 48)

    out = compute_recommendations(
        user_id,
        limit,
        products_collection,
        orders_collection,
        behavior_events_collection,
    )
    return Response(out, status=200)


@api_view(["POST"])
def wishlist_toggle(request):
    """Add or remove a product from the customer's wishlist."""
    data = request.data
    customer_id = data.get("customer_id")
    product_id = data.get("product_id")
    action = (data.get("action") or "add").lower()
    if not customer_id or not product_id:
        return Response({"error": "customer_id and product_id are required"}, status=400)
    try:
        cid_oid = ObjectId(customer_id)
        pid_oid = ObjectId(product_id)
    except Exception:
        return Response({"error": "Invalid ids"}, status=400)
    customer = users_collection.find_one({"_id": cid_oid, "role": "customer"})
    product = products_collection.find_one({"_id": pid_oid})
    if not customer or not product:
        return Response({"error": "Customer or product not found"}, status=404)
    key = {"customer_id": customer_id, "product_id": product_id}
    if action == "remove":
        wishlist_collection.delete_one(key)
        return Response({"in_wishlist": False}, status=200)
    wishlist_collection.update_one(
        key,
        {"$set": {"created_at": datetime.utcnow()}},
        upsert=True,
    )
    return Response({"in_wishlist": True}, status=200)


@api_view(["GET"])
def get_wishlist(request, customer_id):
    try:
        ObjectId(customer_id)
    except Exception:
        return Response({"error": "Invalid customer_id"}, status=400)
    user = users_collection.find_one({"_id": ObjectId(customer_id), "role": "customer"})
    if not user:
        return Response({"error": "Customer not found"}, status=404)
    rows = list(wishlist_collection.find({"customer_id": customer_id}))
    out = []
    for row in rows:
        pid = row.get("product_id")
        if not pid:
            continue
        try:
            p = products_collection.find_one({"_id": ObjectId(pid)})
        except Exception:
            continue
        if p:
            p["_id"] = str(p["_id"])
            out.append(p)
    return Response(out, status=200)


@api_view(["POST"])
def checkout(request):
    """
    Demo checkout: mock payment, then place one pending order per line item.
    Body: { customer_id, items: [{ product_id, quantity }], payment_method: "mock" }
    """
    data = request.data
    customer_id = data.get("customer_id")
    items = data.get("items")
    payment_method = (data.get("payment_method") or "mock").lower()
    if not customer_id or not isinstance(items, list) or len(items) == 0:
        return Response(
            {"error": "customer_id and a non-empty items array are required"},
            status=400,
        )
    try:
        ObjectId(customer_id)
    except Exception:
        return Response({"error": "Invalid customer_id"}, status=400)
    customer = users_collection.find_one(
        {"_id": ObjectId(customer_id), "role": "customer"}
    )
    if not customer:
        return Response({"error": "Customer not found"}, status=404)
    if payment_method != "mock":
        return Response(
            {"error": "Only mock payment is supported in this demo"},
            status=400,
        )
    order_ids = []
    errors = []
    for it in items:
        pid = it.get("product_id")
        qty = int(it.get("quantity", 1))
        oid, err = _place_order_core(customer_id, pid, qty)
        if err:
            errors.append({"product_id": pid, "error": err})
        else:
            order_ids.append(oid)
    if not order_ids and errors:
        return Response(
            {"error": "Checkout failed", "details": errors},
            status=400,
        )
    return Response(
        {
            "message": "Payment successful (demo). Your orders were sent to vendors.",
            "payment_status": "paid",
            "payment_method": "mock",
            "order_ids": order_ids,
            "failed": errors if errors else None,
        },
        status=201,
    )


@api_view(["POST"])
def chatbot(request):
    """
    Simple rule-based chatbot that understands:
    - product search (by name/category)
    - price-based queries
    - rating-based queries (top vendors / products)
    - category-based queries
    - help / FAQ (orders, payment, delivery, returns/refunds)
    """
    text = (request.data.get("message") or "").strip()
    if not text:
        return Response(
            {
                "type": "help",
                "reply": (
                    "Please type something, for example: 'Show pizza', "
                    "'Products under 200', or 'Top rated products'."
                ),
            },
            status=200,
        )

    lower = text.lower().strip()
    has_greeting = bool(re.search(r"\b(hi|hello|hey|hlo|hy)\b", lower))
    lower = re.sub(r"\b(hi|hello|hey|hlo|hy)\b", " ", lower)
    lower = re.sub(r"\s+", " ", lower).strip()

    def _reply(message):
        return f"Hello! {message}" if has_greeting else message

    def _serialize_product(doc):
        return {
            "_id": str(doc.get("_id")),
            "name": doc.get("name"),
            "description": doc.get("description"),
            "price": doc.get("price"),
            "category": doc.get("category"),
            "stock": doc.get("stock"),
            "vendor_id": doc.get("vendor_id"),
            "vendor_name": doc.get("vendor_name"),
            "vendor_email": doc.get("vendor_email"),
            "image": doc.get("image"),
        }

    def _serialize_vendor(doc):
        return {
            "_id": str(doc.get("_id")),
            "name": doc.get("name"),
            "email": doc.get("email"),
            "role": doc.get("role"),
        }

    def _fetch_products(query, limit=10, sort=None):
        cursor = products_collection.find(query)
        if sort:
            cursor = cursor.sort(sort[0], sort[1])
        return [_serialize_product(p) for p in list(cursor.limit(limit))]

    if has_greeting and not lower:
        return Response(
            {
                "type": "help",
                "topic": "greeting",
                "reply": (
                    "Hello! I can help you with product search, prices, ratings, delivery, refunds, "
                    "and order steps. Try: 'show pizza' or 'products under 200'."
                ),
            },
            status=200,
        )

    # ----- POLITE CONVERSATION -----
    if any(k in lower for k in ["thank you", "thanks", "thx", "ty"]):
        return Response(
            {
                "type": "help",
                "topic": "gratitude",
                "reply": "You're welcome! I am happy to help. Ask me anytime about products, orders, delivery, or refunds.",
            },
            status=200,
        )

    if any(k in lower for k in ["bye", "goodbye", "see you", "ok bye", "bye bye"]):
        return Response(
            {
                "type": "help",
                "topic": "farewell",
                "reply": "Goodbye! Have a great day. If you need anything, I am here to help.",
            },
            status=200,
        )

    # ----- HELP / HOW-TO -----
    if any(k in lower for k in ["how to book", "how to order", "book order", "place order"]):
        return Response(
            {
                "type": "help",
                "topic": "booking",
                "reply": _reply(
                    "To place an order:\n"
                    "1) Open the product page.\n"
                    "2) Choose quantity.\n"
                    "3) Click 'Place order now' or add to cart and use 'Proceed to pay'."
                ),
            },
            status=200,
        )

    if any(k in lower for k in ["cancel order", "how to cancel"]):
        return Response(
            {
                "type": "help",
                "topic": "cancel",
                "reply": _reply(
                    "To cancel an order: open your customer dashboard, go to Orders, "
                    "and use the status/cancel controls for that order."
                ),
            },
            status=200,
        )

    if any(k in lower for k in ["payment options", "payment methods", "how to pay"]):
        return Response(
            {
                "type": "help",
                "topic": "payment",
                "reply": (
                    _reply("In this demo, payment is simulated on the Cart page after 'Proceed to pay'.")
                ),
            },
            status=200,
        )

    if any(
        k in lower
        for k in [
            "connect to vendor",
            "contact vendor",
            "talk to vendor",
            "reach vendor",
            "vendor contact",
            "how can i connect",
            "how can i connect to vendor",
            "connect vendor",
            "vendor phone",
            "vendor email",
        ]
    ):
        return Response(
            {
                "type": "help",
                "topic": "vendor_contact",
                "reply": _reply(
                    "You can connect with the vendor in these ways:\n"
                    "• Open the product page or your order details and check vendor name/email.\n"
                    "• In Customer Dashboard → Orders, open the order and use vendor contact details.\n"
                    "• Mention your order ID while contacting for faster support."
                ),
            },
            status=200,
        )

    if any(
        k in lower
        for k in [
            "online payment",
            "offline payment",
            "cash on delivery",
            "cod",
            "upi",
            "card payment",
            "pay online",
            "pay offline",
        ]
    ):
        return Response(
            {
                "type": "help",
                "topic": "payment_mode",
                "reply": _reply(
                    "Both payment options are available, so you can pay based on your interest/preference.\n"
                    "• Online payment (UPI/Card): fast confirmation and smooth checkout.\n"
                    "• Offline payment (Cash on Delivery): pay when the order is delivered.\n"
                    "Choose whichever option is comfortable for you."
                ),
            },
            status=200,
        )

    # ----- GENERAL HELP CENTER -----
    if any(k in lower for k in ["help center", "support", "customer care", "contact support", "help me"]):
        return Response(
            {
                "type": "help",
                "topic": "support",
                "reply": _reply(
                    "Help Center quick guide:\n"
                    "• Orders: Dashboard → Orders\n"
                    "• Delivery delay: ask vendor from order details\n"
                    "• Returns/refunds: check order status, refunds usually 5-10 business days\n"
                    "• Account/login issues: use signup/login again with correct email/password\n"
                    "• Product help: ask me 'show <product name>' or 'products under <price>'"
                ),
            },
            status=200,
        )

    if any(k in lower for k in ["login issue", "cannot login", "can't login", "forgot password", "signup issue"]):
        return Response(
            {
                "type": "help",
                "topic": "account",
                "reply": _reply(
                    "For account issues: verify email/password first, then try signup again if account is missing. "
                    "If login still fails, contact support with your registered email."
                ),
            },
            status=200,
        )

    # ----- RETURNS / REFUNDS (before delivery — avoids "when will refund" matching delivery) -----
    refund_keys = [
        "refund",
        "money back",
        "money not",
        "didn't get refund",
        "did not get refund",
        "no refund",
        "when will refund",
        "when money",
        "return the product",
        "returned the product",
        "i returned",
        "return product",
        "not get any refund",
        "not received refund",
    ]
    if any(k in lower for k in refund_keys) or (
        "return" in lower and any(x in lower for x in ["money", "refund", "product", "payment"])
    ):
        return Response(
            {
                "type": "help",
                "topic": "refund",
                "reply": _reply(
                    "Here’s how returns and refunds usually work:\n"
                    "• After the vendor approves your return, a refund is typically processed "
                    "within 5–10 business days. It may take a few extra days to show on your "
                    "card or UPI statement depending on your bank.\n"
                    "• If you already returned the item and still see no refund, check "
                    "Customer Dashboard → Orders for status, and message the vendor with your "
                    "order ID.\n"
                    "• If payment was only simulated in this demo, treat refunds as illustrative — "
                    "in production, the same flow would connect to your real payment provider.\n"
                    "Need help faster? Use the vendor’s contact email from your order details."
                ),
            },
            status=200,
        )

    # ----- DELIVERY / SHIPPING (general customer care) -----
    delivery_keys = [
        "delivery",
        "deliver",
        "delivary",
        "shipped",
        "shipping",
        "ship",
        "track",
        "tracking",
        "parcel",
        "courier",
        "late",
        "delay",
        "delayed",
        "where is my order",
        "when it will come",
        "when my order",
        "not arrived",
        "not received order",
    ]
    if any(k in lower for k in delivery_keys):
        return Response(
            {
                "type": "help",
                "topic": "delivery",
                "reply": _reply(
                    "Here’s how delivery usually works on FreshCart:\n"
                    "• After you pay, the vendor gets your order. Many vendors ship within "
                    "1–2 business days after they confirm.\n"
                    "• Delivery to your area often takes about 2–5 more days after shipping, "
                    "depending on location and the vendor’s courier.\n"
                    "• Open Customer Dashboard → Orders to see the latest status for each order.\n"
                    "• If it feels late, contact the vendor using the email shown on the order "
                    "or product page — they can give the exact update.\n"
                    "This demo doesn’t show live GPS tracking; a full production app would add "
                    "SMS/email updates and a tracking link."
                ),
            },
            status=200,
        )

    # ----- PRICE-BASED QUERIES -----
    # Handles: under 200, below 200, less than 200, <=200, 200 or less
    m = re.search(r"(under|below|less than|<=?)\s*(\d+)", lower)
    m2 = re.search(r"(\d+)\s*(or less|and below|and under)", lower)
    price_limit = None
    if m:
        price_limit = float(m.group(2))
    elif m2:
        price_limit = float(m2.group(1))

    if price_limit is not None:
        products = _fetch_products({"price": {"$lte": price_limit}}, limit=30, sort=("price", 1))
        reply = (
            _reply(f"I found {len(products)} product(s) under {int(price_limit)}.")
            if products
            else _reply(f"I could not find products under {int(price_limit)} right now.")
        )
        return Response(
            {
                "type": "products",
                "criteria": {"max_price": price_limit},
                "reply": reply,
                "products": products,
            },
            status=200,
        )

    if any(k in lower for k in ["cheap", "low price", "budget", "affordable"]):
        products = _fetch_products({}, limit=30, sort=("price", 1))
        return Response(
            {
                "type": "products",
                "criteria": {"sort": "price_asc"},
                "reply": _reply(f"Here are {len(products)} low-price items."),
                "products": products,
            },
            status=200,
        )

    # ----- CATEGORY / VENDOR QUERIES -----
    category_aliases = {
        "food": ["food", "pizza", "burger", "cake", "snack"],
        "electronics": ["electronics", "electronic", "laptop", "phone", "mobile"],
        "clothing": ["clothing", "clothes", "fashion", "shirt", "jeans"],
    }

    detected_category = None
    for cat, keys in category_aliases.items():
        if any(k in lower for k in keys):
            detected_category = cat
            break

    if detected_category == "food" and ("vendor" in lower or "vendors" in lower):
        vendor_ids = products_collection.distinct(
            "vendor_id", {"category": {"$regex": "food", "$options": "i"}}
        )
        vendors = [
            _serialize_vendor(v)
            for v in list(users_collection.find({"_id": {"$in": [ObjectId(x) for x in vendor_ids if ObjectId.is_valid(x)]}, "role": "vendor"}).limit(20))
        ]
        return Response(
            {
                "type": "vendors",
                "criteria": {"category": "food"},
                "reply": _reply(f"I found {len(vendors)} food vendor(s)."),
                "vendors": vendors,
            },
            status=200,
        )

    if detected_category:
        products = _fetch_products(
            {"category": {"$regex": detected_category, "$options": "i"}},
            limit=30,
        )
        return Response(
            {
                "type": "products",
                "criteria": {"category": detected_category},
                "reply": _reply(f"I found {len(products)} product(s) in {detected_category}."),
                "products": products,
            },
            status=200,
        )

    # ----- RATING-BASED -----
    if any(k in lower for k in ["best vendors", "top vendors", "highest rated vendors"]):
        pipeline = [
            {"$group": {"_id": "$vendor_id", "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}},
            {"$sort": {"avg_rating": -1, "count": -1}},
            {"$limit": 20},
        ]
        top_vendor_rows = list(vendor_reviews_collection.aggregate(pipeline))
        vendor_ids = [r["_id"] for r in top_vendor_rows if r.get("_id")]
        vendors_map = {
            str(v["_id"]): _serialize_vendor(v)
            for v in list(users_collection.find({"_id": {"$in": [ObjectId(x) for x in vendor_ids if ObjectId.is_valid(x)]}, "role": "vendor"}))
        }
        vendors = []
        for row in top_vendor_rows:
            vid = row.get("_id")
            if vid in vendors_map:
                item = vendors_map[vid]
                item["average_rating"] = round(float(row.get("avg_rating", 0)), 2)
                item["review_count"] = int(row.get("count", 0))
                vendors.append(item)
        return Response(
            {
                "type": "vendors",
                "criteria": {"sort": "rating_desc"},
                "reply": _reply(f"Top rated vendors ({len(vendors)} found)."),
                "vendors": vendors,
            },
            status=200,
        )

    if any(k in lower for k in ["top rated products", "best products", "top rated"]):
        pipeline = [
            {"$group": {"_id": "$vendor_id", "avg_rating": {"$avg": "$rating"}}},
            {"$sort": {"avg_rating": -1}},
            {"$limit": 20},
        ]
        top_vendor_rows = list(vendor_reviews_collection.aggregate(pipeline))
        vendor_ids = [r["_id"] for r in top_vendor_rows if r.get("_id")]
        products = _fetch_products({"vendor_id": {"$in": vendor_ids}}, limit=30)
        return Response(
            {
                "type": "products",
                "criteria": {"sort": "rating_desc"},
                "reply": _reply(f"Top rated products from well-reviewed vendors ({len(products)} found)."),
                "products": products,
            },
            status=200,
        )

    # ----- GENERIC PRODUCT SEARCH -----
    cleaned = re.sub(r"[^a-z0-9\s]", " ", lower)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Remove command words but keep meaning words.
    cleaned = re.sub(r"\b(show|find|search|for|me|products|product|items|item|please)\b", " ", cleaned)
    keyword_phrase = re.sub(r"\s+", " ", cleaned).strip()
    tokens = [t for t in keyword_phrase.split(" ") if len(t) >= 2]

    search_query = None
    if keyword_phrase:
        search_query = {
            "$or": [
                {"name": {"$regex": keyword_phrase, "$options": "i"}},
                {"description": {"$regex": keyword_phrase, "$options": "i"}},
                {"category": {"$regex": keyword_phrase, "$options": "i"}},
            ]
        }
    elif tokens:
        search_query = {
            "$or": [
                {"name": {"$regex": "|".join(tokens), "$options": "i"}},
                {"description": {"$regex": "|".join(tokens), "$options": "i"}},
                {"category": {"$regex": "|".join(tokens), "$options": "i"}},
            ]
        }

    products = _fetch_products(search_query or {}, limit=30)
    if products:
        return Response(
            {
                "type": "products",
                "criteria": {"keyword": keyword_phrase or text},
                "reply": _reply(f"I found {len(products)} matching product(s)."),
                "products": products,
            },
            status=200,
        )

    return Response(
        {
            "type": "help",
            "reply": _reply(
                "I could not find matching results for that query.\n"
                "Try: 'show pizza', 'products under 200', 'top rated products', "
                "'food vendors', or 'payment options'."
            ),
        },
        status=200,
    )
