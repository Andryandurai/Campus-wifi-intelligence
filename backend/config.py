import os

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATABASE_PATH = os.path.join(BASE_DIR, "campus_wifi.db")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "campus_wifi_intel_sec_key_rec_2026_x89a!")
    JWT_EXPIRATION_HOURS = 24
    
    # Security config
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    RATE_LIMIT_PER_MINUTE = 200
    
    # Campus ML Parameters
    CONGESTION_UTIL_THRESHOLD = 85.0
    CONGESTION_LATENCY_THRESHOLD = 100.0
    PEAK_PERCENTILE = 90.0
    ANOMALY_Z_THRESHOLD = 3.0
    
    # Privacy check config
    FORBIDDEN_COLUMNS = ["mac", "mac_address", "ip", "client_ip", "user_id", "email", "student_id", "imsi"]

