from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup),
    path('login/', views.login),
    path('users/', views.get_all_users),          
    path('orders/all/', views.get_all_orders), 
    path('add_product/', views.add_product),
    path('products/', views.get_products),
    path('products/search_by_image/', views.search_products_by_image),
    path('place_order/', views.place_order),
    path('vendor/<str:vendor_id>/demand_forecast/', views.get_vendor_demand_forecast),
    path('reviews/admin/flagged/', views.get_flagged_reviews_admin),
    path('orders/<str:vendor_id>/', views.get_orders_for_vendor),
    path('products/vendor/<str:vendor_id>/', views.get_vendor_products),
    path('orders/customer/<str:customer_id>/', views.get_orders_for_customer), 
    path('update_order_status/', views.update_order_status, name='update_order_status'),
    path('reviews/vendor/<str:vendor_id>/insights/', views.get_vendor_review_insights),
    path('reviews/vendor/<str:vendor_id>/', views.get_vendor_reviews),
    path('reviews/customer/<str:customer_id>/', views.get_customer_reviews),
    path('reviews/submit/', views.submit_vendor_review),
    path('reviews/summaries/', views.get_vendor_rating_summaries),
    path('events/', views.track_behavior_event),
    path('recommendations/<str:user_id>/', views.get_recommendations),
    path('wishlist/<str:customer_id>/', views.get_wishlist),
    path('wishlist/toggle/', views.wishlist_toggle),
    path('checkout/', views.checkout),
    path('chatbot/', views.chatbot),

]
