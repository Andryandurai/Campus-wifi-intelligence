import datetime
import time
import re
from functools import wraps
from flask import request, jsonify, g
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config

# In-memory sliding window rate limiter
_request_history = {} # ip -> list of timestamps

def check_rate_limit(ip_address: str, max_requests: int = Config.RATE_LIMIT_PER_MINUTE, window_seconds: int = 60) -> bool:
    now = time.time()
    cutoff = now - window_seconds
    
    if ip_address not in _request_history:
        _request_history[ip_address] = [now]
        return True
        
    # Purge old requests
    _request_history[ip_address] = [t for t in _request_history[ip_address] if t > cutoff]
    
    if len(_request_history[ip_address]) >= max_requests:
        return False
        
    _request_history[ip_address].append(now)
    return True

def rate_limit():
    ip = request.remote_addr or "127.0.0.1"
    if not check_rate_limit(ip):
        return jsonify({
            "error": "Rate limit exceeded",
            "message": f"Too many requests. Limit is {Config.RATE_LIMIT_PER_MINUTE} requests/min."
        }), 429
    return None

def generate_jwt(user_id: int, username: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def decode_jwt(token: str):
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS for CORS preflight
        if request.method == "OPTIONS":
            return f(*args, **kwargs)
            
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
                
        if not token:
            return jsonify({"error": "Unauthorized", "message": "Authentication token missing."}), 401
            
        payload = decode_jwt(token)
        if not payload:
            return jsonify({"error": "Unauthorized", "message": "Invalid or expired token."}), 401
            
        g.user = payload
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if request.method == "OPTIONS":
                return f(*args, **kwargs)
            if not hasattr(g, "user") or g.user.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden", "message": "Insufficient permissions for this action."}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def validate_privacy(columns_or_dict) -> tuple[bool, str]:
    """
    Privacy-by-Design Verification:
    Ensures dataset/payload does not contain any PII (MAC address, IP, emails, student IDs).
    """
    keys = columns_or_dict.keys() if isinstance(columns_or_dict, dict) else columns_or_dict
    for key in keys:
        norm_key = re.sub(r'[^a-zA-Z0-9]', '', str(key)).lower()
        for forbidden in Config.FORBIDDEN_COLUMNS:
            if forbidden in norm_key:
                return False, f"Privacy Violation: Forbidden identifier column '{key}' detected. System only processes aggregated metrics."
    return True, "Privacy check passed: Anonymized aggregation verified."

def apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    return response

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(hashed: str, password: str) -> bool:
    return check_password_hash(hashed, password)
