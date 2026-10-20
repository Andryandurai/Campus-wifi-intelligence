import pandas as pd
from database import get_db_connection

def calculate_network_health():
    conn = get_db_connection()
    
    # Latest 15-min interval slice
    latest_ts_row = conn.execute("SELECT MAX(timestamp) FROM wifi_logs").fetchone()
    latest_ts = latest_ts_row[0] if latest_ts_row and latest_ts_row[0] else None
    
    if not latest_ts:
        conn.close()
        return {}

    df_latest = pd.read_sql_query(
        "SELECT * FROM wifi_logs WHERE timestamp = ?",
        conn,
        params=[latest_ts]
    )

    # Active anomalies in latest 4 hours
    anom_count = conn.execute(
        "SELECT COUNT(*) FROM anomalies WHERE timestamp >= datetime(?, '-4 hours') AND severity IN ('Critical', 'High')",
        [latest_ts]
    ).fetchone()[0]

    # Predictions
    pred_row = conn.execute("SELECT AVG(prob_random_forest) FROM congestion_predictions").fetchone()
    avg_pred_prob = float(pred_row[0]) if pred_row and pred_row[0] is not None else 25.0

    avg_util = float(df_latest["bandwidth_util"].mean()) if not df_latest.empty else 50.0
    avg_latency = float(df_latest["latency_ms"].mean()) if not df_latest.empty else 25.0
    avg_loss = float(df_latest["packet_loss"].mean()) if not df_latest.empty else 0.5

    # 5 Factors:
    # U = 100 - utilization% (capacity headroom)
    U = max(0.0, min(100.0, 100.0 - avg_util))
    # L = max(0, 100 - latency_ms) (responsiveness)
    L = max(0.0, min(100.0, 100.0 - avg_latency))
    # P = max(0, 100 - 20 * packet_loss%) (reliability)
    P = max(0.0, min(100.0, 100.0 - (20.0 * avg_loss)))
    # A = max(0, 100 - 25 * active_anomalies) (stability)
    A = max(0.0, min(100.0, 100.0 - (25.0 * anom_count)))
    # C = 100 - congestion_prob% (near-term risk)
    C = max(0.0, min(100.0, 100.0 - avg_pred_prob))

    # Health = 0.30*U + 0.25*L + 0.20*P + 0.15*A + 0.10*C
    score = round(0.30 * U + 0.25 * L + 0.20 * P + 0.15 * A + 0.10 * C, 1)

    if score >= 85.0:
        status = "EXCELLENT"
    elif score >= 70.0:
        status = "GOOD"
    elif score >= 50.0:
        status = "FAIR"
    else:
        status = "POOR"

    # Per-block health scores
    block_health = {}
    for loc, grp in df_latest.groupby("location"):
        loc_util = grp["bandwidth_util"].mean()
        loc_lat = grp["latency_ms"].mean()
        loc_loss = grp["packet_loss"].mean()
        
        loc_u = max(0.0, min(100.0, 100.0 - loc_util))
        loc_l = max(0.0, min(100.0, 100.0 - loc_lat))
        loc_p = max(0.0, min(100.0, 100.0 - (20.0 * loc_loss)))
        loc_a = 90.0
        loc_c = max(0.0, min(100.0, 100.0 - avg_pred_prob))
        
        loc_score = round(0.30 * loc_u + 0.25 * loc_l + 0.20 * loc_p + 0.15 * loc_a + 0.10 * loc_c, 1)
        block_health[loc] = {
            "score": loc_score,
            "status": "EXCELLENT" if loc_score >= 85 else ("GOOD" if loc_score >= 70 else ("FAIR" if loc_score >= 50 else "POOR")),
            "utilization": round(loc_util, 1),
            "latency": round(loc_lat, 1),
            "packet_loss": round(loc_loss, 2),
            "devices": int(grp["connected_devices"].sum())
        }

    # Store latest health record
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO network_health (
        timestamp, health_score, status, capacity_headroom_u,
        responsiveness_l, reliability_p, stability_a, near_term_risk_c,
        active_anomalies_count, congested_blocks_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        latest_ts, score, status, round(U, 1), round(L, 1),
        round(P, 1), round(A, 1), round(C, 1),
        anom_count, sum(1 for b in block_health.values() if b["score"] < 70)
    ))
    conn.commit()
    conn.close()

    return {
        "timestamp": latest_ts,
        "health_score": score,
        "status": status,
        "factors": {
            "capacity_headroom_u": round(U, 1),
            "responsiveness_l": round(L, 1),
            "reliability_p": round(P, 1),
            "stability_a": round(A, 1),
            "near_term_risk_c": round(C, 1)
        },
        "active_anomalies": anom_count,
        "block_health": block_health
    }

