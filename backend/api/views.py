from rest_framework.response import Response
from rest_framework.decorators import api_view
from bson import ObjectId
from django.core.mail import EmailMessage, send_mail
from .mongo_client import users_collection, products_collection, orders_collection
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
    products_collection.insert_one(product)
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
    customer = users_collection.find_one({'_id': ObjectId(customer_id)})
    product = products_collection.find_one({'_id': ObjectId(product_id)})
    if not customer or not product:
        return Response({'error': 'Invalid customer or product'}, status=400)
    total_price = float(product['price']) * quantity
    order = {
        'customer_id': str(customer['_id']),
        'customer_name': customer['name'],
        'customer_email': customer['email'],
        'vendor_id': product['vendor_id'],
        'vendor_email': product['vendor_email'],
        'vendor_name': product['vendor_name'],
        'product_id': str(product['_id']),
        'product_name': product['name'],
        'quantity': quantity,
        'total_price': total_price,
        'status': 'pending',
    }
    orders_collection.insert_one(order)
    send_email(
        subject="New Order Request",
        message=f"Hello {product['vendor_name']},\n\nYou received a new order for '{product['name']}'.\n"
                f"Customer: {customer['name']}\nQuantity: {quantity}",
        to_email=product['vendor_email'],
        reply_to=customer['email']  
    )
    send_email(
        subject="Order Placed Successfully",
        message=f"Hello {customer['name']},\n\nYour order for '{product['name']}' has been sent to vendor {product['vendor_name']}.",
        to_email=customer['email'],
        reply_to=product['vendor_email']
    )
    return Response({'message': 'Order placed successfully'}, status=201)
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
