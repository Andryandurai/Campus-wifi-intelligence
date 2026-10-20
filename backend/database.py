import sqlite3
import json
import os
from config import Config
from werkzeug.security import generate_password_hash

def get_db_connection():
    conn = sqlite3.connect(Config.DATABASE_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users table for authentication
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'network_engineer', 'viewer'
        full_name TEXT NOT NULL,
        department TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 2. Campus blocks metadata
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campus_blocks (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        pos_z REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        depth REAL NOT NULL,
        color TEXT NOT NULL,
        floors INTEGER NOT NULL
    );
    """)
    
    # 3. Main Wi-Fi Logs table (15-min intervals)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wifi_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        day TEXT NOT NULL,
        location TEXT NOT NULL,
        access_point TEXT NOT NULL,
        connected_devices INTEGER NOT NULL,
        bandwidth_util REAL NOT NULL,
        download_gb REAL NOT NULL,
        upload_gb REAL NOT NULL,
        latency_ms REAL NOT NULL,
        packet_loss REAL NOT NULL,
        period_type TEXT NOT NULL,
        is_weekend INTEGER NOT NULL DEFAULT 0,
        is_anomaly INTEGER NOT NULL DEFAULT 0,
        anomaly_type TEXT DEFAULT NULL,
        FOREIGN KEY (location) REFERENCES campus_blocks(code)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON wifi_logs(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_loc_ts ON wifi_logs(location, timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_ap ON wifi_logs(access_point);")

    # 4. Detected Anomalies
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        location TEXT NOT NULL,
        access_point TEXT NOT NULL,
        metric TEXT NOT NULL,
        observed_value REAL NOT NULL,
        expected_range TEXT NOT NULL,
        z_score REAL,
        z_flag INTEGER DEFAULT 0,
        iqr_flag INTEGER DEFAULT 0,
        if_flag INTEGER DEFAULT 0,
        vote_count INTEGER NOT NULL,
        severity TEXT NOT NULL, -- Low, Medium, High, Critical
        details TEXT,
        resolved INTEGER DEFAULT 0
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_ts ON anomalies(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_sev ON anomalies(severity);")

    # 5. Peak Usage Windows
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS peak_windows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        day TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        avg_utilization REAL NOT NULL,
        p90_utilization REAL NOT NULL,
        peak_frequency INTEGER NOT NULL,
        recurrence_weeks INTEGER NOT NULL,
        total_weeks INTEGER NOT NULL,
        rank_score REAL NOT NULL
    );
    """)

    # 6. Location Clusters (K-Means)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS location_clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        access_point TEXT UNIQUE NOT NULL,
        location TEXT NOT NULL,
        cluster_id INTEGER NOT NULL,
        cluster_name TEXT NOT NULL,
        avg_devices REAL NOT NULL,
        avg_utilization REAL NOT NULL,
        avg_traffic_gb REAL NOT NULL,
        avg_latency REAL NOT NULL,
        avg_packet_loss REAL NOT NULL,
        pca_x REAL NOT NULL,
        pca_y REAL NOT NULL,
        pca_z REAL NOT NULL,
        suggested_action TEXT NOT NULL
    );
    """)

    # 7. Congestion Predictions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS congestion_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        access_point TEXT NOT NULL,
        forecast_timestamp TEXT NOT NULL,
        current_utilization REAL NOT NULL,
        current_devices INTEGER NOT NULL,
        prob_logistic REAL NOT NULL,
        prob_random_forest REAL NOT NULL,
        risk_level TEXT NOT NULL, -- Low, Medium, High
        expected_window TEXT NOT NULL,
        lead_time_min INTEGER NOT NULL DEFAULT 15
    );
    """)

    # 8. Network Health Score history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS network_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        health_score REAL NOT NULL,
        status TEXT NOT NULL, -- EXCELLENT, GOOD, FAIR, POOR
        capacity_headroom_u REAL NOT NULL,
        responsiveness_l REAL NOT NULL,
        reliability_p REAL NOT NULL,
        stability_a REAL NOT NULL,
        near_term_risk_c REAL NOT NULL,
        active_anomalies_count INTEGER NOT NULL,
        congested_blocks_count INTEGER NOT NULL
    );
    """)

    # 9. Recommendations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL, -- 'Capacity', 'Reliability', 'Rebalance', 'Security'
        priority TEXT NOT NULL, -- 'High', 'Medium', 'Low'
        location TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        metric_trigger TEXT NOT NULL,
        status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Applied'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Users if none exist
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] == 0:
        default_users = [
            ("admin", generate_password_hash("AdminPass2026!"), "admin", "Campus IT Director", "Information Technology"),
            ("operator", generate_password_hash("NetworkOps2026!"), "network_engineer", "Lead Network Engineer", "NOC Operations"),
            ("viewer", generate_password_hash("ViewerREC2026!"), "viewer", "Academic Reviewer", "Computer Science")
        ]
        cursor.executemany("""
        INSERT INTO users (username, password_hash, role, full_name, department)
        VALUES (?, ?, ?, ?, ?);
        """, default_users)

    # Seed Campus Blocks from JSON if empty
    cursor.execute("SELECT COUNT(*) FROM campus_blocks;")
    if cursor.fetchone()[0] == 0:
        layout_path = os.path.join(Config.BASE_DIR, "campus_layout.json")
        if os.path.exists(layout_path):
            with open(layout_path, "r") as f:
                layout = json.load(f)
                block_rows = []
                for b in layout.get("blocks", []):
                    block_rows.append((
                        b["code"],
                        b["name"],
                        b["type"],
                        b["capacity"],
                        b["position"]["x"],
                        b["position"]["y"],
                        b["position"]["z"],
                        b["size"]["width"],
                        b["size"]["height"],
                        b["size"]["depth"],
                        b["color"],
                        b["floors"]
                    ))
                cursor.executemany("""
                INSERT INTO campus_blocks (code, name, type, capacity, pos_x, pos_y, pos_z, width, height, depth, color, floors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, block_rows)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")

