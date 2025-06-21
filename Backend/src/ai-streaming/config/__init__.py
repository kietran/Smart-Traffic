import os
from dotenv import load_dotenv, find_dotenv
import logging

load_dotenv(find_dotenv(".env"), override=True)

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

LOGGING_LEVEL = logging.getLevelName(os.getenv("LOGGING_LEVEL", "INFO"))

MONGO_HOST = os.getenv("MONGO_HOST", "127.0.0.1")
MONGO_PORT = os.getenv("MONGO_PORT", "27010")
MONGO_USER = os.getenv("MONGO_USER", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "admin")
MONGODB_SERVER = f"mongodb://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/?authSource=admin"
KAFKA_SERVER = f"{os.getenv('KAFKA_SERVER', '127.0.0.1:9092')}"
