import os
import json
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from config import Config
from database import init_db, get_db_connection
from security import (
    generate_jwt, token_required, role_required,
    rate_limit, apply_security_headers, hash_password, verify_password,
    validate_privacy
)
from services.data_generator import generate_campus_dataset
from services.analytics_service import (
    get_kpis, get_descriptive_stats, get_hourly_matrix,
    get_correlations, get_day_of_week_trends
)
from services.peaks_service import detect_peak_windows, get_peak_summary
from services.anomaly_service import run_anomaly_detection, get_recent_anomalies
from services.clustering_service import run_location_clustering, get_clusters_data
from services.prediction_service import train_and_evaluate_prediction, get_latest_predictions
from services.health_service import calculate_network_health
from services.recommendation_service import generate_recommendations, get_recommendations_list, update_recommendation_status

app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with explicit allowed origins & headers
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)

# Global Security Middlewares
@app.before_request
def before_request_hook():
    # Apply sliding-window rate limiter
    rate_limit_res = rate_limit()
    if rate_limit_res:
        return rate_limit_res

@app.after_request
def after_request_hook(response):
    return apply_security_headers(response)

@app.errorhandler(404)
def not_found_handler(e):
    return jsonify({"error": "Not Found", "message": "The requested endpoint does not exist."}), 404

@app.errorhandler(500)
def internal_error_handler(e):
    return jsonify({"error": "Internal Server Error", "message": str(e)}), 500

# ----------------- AUTHENTICATION ROUTES -----------------
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    
    if not username or not password:
        return jsonify({"error": "Bad Request", "message": "Username and password are required."}), 400
        
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    
    if not user or not verify_password(user["password_hash"], password):
        return jsonify({"error": "Unauthorized", "message": "Invalid username or password credentials."}), 401
        
    token = generate_jwt(user["id"], user["username"], user["role"])
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"],
            "department": user["department"]
        }
    })

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    department = data.get("department", "Information Technology").strip()
    role = data.get("role", "viewer")
    
    if not username or not password or not full_name:
        return jsonify({"error": "Bad Request", "message": "Username, password, and full name are required."}), 400
        
    if len(password) < 6:
        return jsonify({"error": "Bad Request", "message": "Password must be at least 6 characters."}), 400
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        hashed = hash_password(password)
        cursor.execute(
            "INSERT INTO users (username, password_hash, role, full_name, department) VALUES (?, ?, ?, ?, ?)",
            (username, hashed, role, full_name, department)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        token = generate_jwt(user_id, username, role)
        return jsonify({
            "message": "User registered successfully",
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "role": role,
                "full_name": full_name,
                "department": department
            }
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": "Conflict", "message": "Username already exists."}), 409

@app.route("/api/auth/me", methods=["GET"])
@token_required
def get_current_user():
    return jsonify({"user": g.user})

# ----------------- ANALYTICS & KPIS ROUTES -----------------
@app.route("/api/analytics/kpis", methods=["GET"])
def api_kpis():
    return jsonify(get_kpis())

@app.route("/api/analytics/stats", methods=["GET"])
def api_stats():
    return jsonify(get_descriptive_stats())

@app.route("/api/analytics/hourly-matrix", methods=["GET"])
def api_hourly_matrix():
    return jsonify(get_hourly_matrix())

@app.route("/api/analytics/correlations", methods=["GET"])
def api_correlations():
    return jsonify(get_correlations())

@app.route("/api/analytics/day-trends", methods=["GET"])
def api_day_trends():
    return jsonify(get_day_of_week_trends())

# ----------------- PEAK USAGE DETECTION -----------------
@app.route("/api/peaks/summary", methods=["GET"])
def api_peaks_summary():
    return jsonify(get_peak_summary())

@app.route("/api/peaks/run", methods=["POST"])
@token_required
def api_run_peaks():
    results = detect_peak_windows()
    return jsonify({"message": f"Peak detection completed. Found {len(results)} peak windows.", "peaks": results})

# ----------------- ANOMALY DETECTION -----------------
@app.route("/api/anomalies/list", methods=["GET"])
def api_anomalies_list():
    severity = request.args.get("severity", "all")
    limit = int(request.args.get("limit", 50))
    return jsonify(get_recent_anomalies(limit=limit, severity=severity))

@app.route("/api/anomalies/run", methods=["POST"])
@token_required
def api_run_anomalies():
    metrics, count = run_anomaly_detection()
    return jsonify({
        "message": f"Anomaly detection completed. {count} anomalous intervals identified.",
        "metrics": metrics
    })

# ----------------- LOCATION CLUSTERING -----------------
@app.route("/api/clusters/list", methods=["GET"])
def api_clusters_list():
    return jsonify(get_clusters_data())

@app.route("/api/clusters/run", methods=["POST"])
@token_required
def api_run_clusters():
    result = run_location_clustering()
    return jsonify(result)

# ----------------- CONGESTION PREDICTION -----------------
@app.route("/api/predictions/latest", methods=["GET"])
def api_predictions_latest():
    return jsonify(get_latest_predictions())

@app.route("/api/predictions/train", methods=["POST"])
@token_required
def api_train_predictions():
    metrics = train_and_evaluate_prediction()
    return jsonify(metrics)

# ----------------- NETWORK HEALTH SCORE -----------------
@app.route("/api/health/current", methods=["GET"])
def api_health_current():
    return jsonify(calculate_network_health())

# ----------------- RECOMMENDATIONS ENGINE -----------------
@app.route("/api/recommendations/list", methods=["GET"])
def api_recommendations_list():
    status = request.args.get("status", "all")
    return jsonify(get_recommendations_list(status_filter=status))

@app.route("/api/recommendations/<int:rec_id>/status", methods=["PUT"])
@token_required
def api_update_rec_status(rec_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "Applied")
    update_recommendation_status(rec_id, new_status)
    return jsonify({"message": f"Recommendation #{rec_id} status updated to {new_status}"})

# ----------------- 3D DIGITAL TWIN & CAMPUS SPATIAL -----------------
@app.route("/api/campus/layout", methods=["GET"])
def api_campus_layout():
    """
    Returns campus blocks with 3D coordinates, dimensions, APs,
    and merged real-time telemetry/health for Three.js 3D Campus Digital Twin.
    """
    conn = get_db_connection()
    blocks = conn.execute("SELECT * FROM campus_blocks").fetchall()
    
    # Latest telemetry per block
    latest_ts_row = conn.execute("SELECT MAX(timestamp) FROM wifi_logs").fetchone()
    latest_ts = latest_ts_row[0] if latest_ts_row and latest_ts_row[0] else None
    
    block_telemetry = {}
    if latest_ts:
        rows = conn.execute("""
            SELECT location,
                   AVG(bandwidth_util) as avg_util,
                   SUM(connected_devices) as total_devices,
                   AVG(latency_ms) as avg_latency,
                   AVG(packet_loss) as avg_packet_loss
            FROM wifi_logs
            WHERE timestamp = ?
            GROUP BY location
        """, [latest_ts]).fetchall()
        for r in rows:
            block_telemetry[r["location"]] = {
                "avg_utilization": round(r["avg_util"], 1),
                "total_devices": int(r["total_devices"]),
                "avg_latency": round(r["avg_latency"], 1),
                "avg_packet_loss": round(r["avg_packet_loss"], 2)
            }
            
    # Predictions per block
    pred_rows = conn.execute("""
        SELECT location, AVG(prob_random_forest) as avg_prob, MAX(risk_level) as risk
        FROM congestion_predictions GROUP BY location
    """).fetchall()
    pred_map = {r["location"]: {"prob": round(r["avg_prob"], 1), "risk": r["risk"]} for r in pred_rows}

    # AP count per block
    ap_counts = {}
    ap_rows = conn.execute("SELECT location, COUNT(DISTINCT access_point) as cnt FROM wifi_logs GROUP BY location").fetchall()
    for r in ap_rows:
        ap_counts[r["location"]] = r["cnt"]

    conn.close()

    result = []
    for b in blocks:
        code = b["code"]
        tel = block_telemetry.get(code, {
            "avg_utilization": 42.0, "total_devices": 150, "avg_latency": 22.0, "avg_packet_loss": 0.4
        })
        pred = pred_map.get(code, {"prob": 25.0, "risk": "LOW"})
        
        # Color scale based on utilization: Green (<45%), Yellow (45-70%), Orange (70-85%), Red (>=85%)
        util = tel["avg_utilization"]
        if util >= 85.0:
            status_color = "#EF4444" # Red
            status_text = "CRITICAL"
        elif util >= 70.0:
            status_color = "#F97316" # Orange
            status_text = "HIGH"
        elif util >= 45.0:
            status_color = "#EAB308" # Yellow
            status_text = "MODERATE"
        else:
            status_color = "#10B981" # Green
            status_text = "NORMAL"

        result.append({
            "code": code,
            "name": b["name"],
            "type": b["type"],
            "capacity": b["capacity"],
            "floors": b["floors"],
            "position": {"x": b["pos_x"], "y": b["pos_y"], "z": b["pos_z"]},
            "size": {"width": b["width"], "height": b["height"], "depth": b["depth"]},
            "color": b["color"],
            "status_color": status_color,
            "status_text": status_text,
            "ap_count": ap_counts.get(code, 4),
            "telemetry": tel,
            "prediction": pred
        })

    return jsonify({
        "timestamp": latest_ts,
        "blocks": result
    })

@app.route("/api/campus/block/<loc_code>", methods=["GET"])
def api_block_drilldown(loc_code):
    conn = get_db_connection()
    block = conn.execute("SELECT * FROM campus_blocks WHERE code = ?", (loc_code,)).fetchone()
    if not block:
        conn.close()
        return jsonify({"error": "Not Found", "message": f"Block {loc_code} not found."}), 404
        
    # APs belonging to this block
    aps = conn.execute("""
        SELECT DISTINCT access_point,
               AVG(bandwidth_util) as avg_util,
               AVG(connected_devices) as avg_dev,
               AVG(latency_ms) as avg_lat,
               AVG(packet_loss) as avg_loss
        FROM wifi_logs WHERE location = ?
        GROUP BY access_point
    """, (loc_code,)).fetchall()
    
    # 24h trend for this block
    trend = conn.execute("""
        SELECT time, AVG(bandwidth_util) as util, SUM(connected_devices) as devices
        FROM wifi_logs WHERE location = ?
        GROUP BY time ORDER BY time ASC
    """, (loc_code,)).fetchall()
    
    conn.close()

    return jsonify({
        "block": dict(block),
        "access_points": [
            {
                "access_point": r["access_point"],
                "avg_utilization": round(r["avg_util"], 1),
                "avg_devices": int(r["avg_dev"]),
                "avg_latency": round(r["avg_lat"], 1),
                "avg_packet_loss": round(r["avg_loss"], 2)
            }
            for r in aps
        ],
        "hourly_trend": [{"time": r["time"], "utilization": round(r["util"], 1), "devices": int(r["devices"])} for r in trend]
    })

# ----------------- ADMIN DATA PIPELINE RUNNER -----------------
@app.route("/api/admin/pipeline/run-all", methods=["POST"])
@token_required
@role_required("admin", "network_engineer")
def api_run_full_pipeline():
    """
    Runs the complete data-science pipeline end-to-end:
    1. Data generator (simulates realistic campus patterns & anomalies)
    2. Peak usage detection
    3. Anomaly detection (Z-Score + IQR + Isolation Forest)
    4. Location Clustering (K-Means + 3D PCA)
    5. Congestion Prediction (Random Forest + Logistic Regression)
    6. Network Health Score
    7. Recommendations Engine
    """
    days = int(request.args.get("days", 14))
    count = generate_campus_dataset(days_back=days)
    peaks = detect_peak_windows()
    anomaly_metrics, anom_count = run_anomaly_detection()
    cluster_res = run_location_clustering()
    pred_metrics = train_and_evaluate_prediction()
    health = calculate_network_health()
    recs = generate_recommendations()

    return jsonify({
        "status": "Pipeline executed successfully",
        "records_generated": count,
        "peak_windows_detected": len(peaks),
        "anomalies_flagged": anom_count,
        "clusters_generated": cluster_res.get("k", 4),
        "prediction_metrics": pred_metrics,
        "network_health_score": health.get("health_score", 0),
        "recommendations_count": len(recs)
    })

# ----------------- DATASET PRIVACY UPLOAD CHECK -----------------
@app.route("/api/admin/dataset/validate-privacy", methods=["POST"])
@token_required
def api_privacy_check():
    data = request.get_json(silent=True) or {}
    columns = data.get("columns", [])
    valid, message = validate_privacy(columns)
    return jsonify({"compliant": valid, "message": message}), (200 if valid else 422)

def initialize_application():
    init_db()
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) FROM wifi_logs").fetchone()[0]
    conn.close()
    
    if count == 0:
        print("Empty database detected. Bootstrapping full campus data pipeline...")
        generate_campus_dataset(days_back=14)
        detect_peak_windows()
        run_anomaly_detection()
        run_location_clustering()
        train_and_evaluate_prediction()
        calculate_network_health()
        generate_recommendations()
        print("Bootstrap complete! All modules primed with telemetry.")

if __name__ == "__main__":
    initialize_application()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

