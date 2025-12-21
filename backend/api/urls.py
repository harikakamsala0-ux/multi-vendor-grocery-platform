from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup),
    path('login/', views.login),
    path('users/', views.get_all_users),          
    path('orders/all/', views.get_all_orders), 
    path('add_product/', views.add_product),
    path('products/', views.get_products),
    path('place_order/', views.place_order),
    path('orders/<str:vendor_id>/', views.get_orders_for_vendor),
    path('products/vendor/<str:vendor_id>/', views.get_vendor_products),
    path('orders/customer/<str:customer_id>/', views.get_orders_for_customer), 
    path('update_order_status/', views.update_order_status, name='update_order_status'),

]
