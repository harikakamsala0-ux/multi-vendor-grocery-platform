from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

users_collection = db["users"]
products_collection = db["products"]
orders_collection = db["orders"]
vendor_reviews_collection = db["vendor_reviews"]
behavior_events_collection = db["behavior_events"]
wishlist_collection = db["wishlist"]

from .recommendation_engine import ensure_behavior_indexes

ensure_behavior_indexes(behavior_events_collection)
