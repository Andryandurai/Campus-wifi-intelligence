import pandas as pd
from database import get_db_connection

def generate_recommendations():
    conn = get_db_connection()
    recs = []

    # 1. Congestion Forecast Triggers
    df_preds = pd.read_sql_query("SELECT * FROM congestion_predictions WHERE prob_random_forest >= 65.0", conn)
    for _, row in df_preds.iterrows():
        recs.append({
            "category": "Capacity",
            "priority": "High" if row["prob_random_forest"] >= 75.0 else "Medium",
            "location": row["location"],
            "title": f"Anticipated Congestion in {row['location']}",
            "description": f"Predicted {row['prob_random_forest']}% congestion probability during window {row['expected_window']} with current utilization at {row['current_utilization']}%.",
            "suggested_action": f"Pre-allocate secondary SSID bandwidth and dynamically adjust AP transmit power in {row['location']}.",
            "metric_trigger": f"Forecast Prob: {row['prob_random_forest']}%",
            "status": "Pending"
        })

    # 2. Recurring Peaks Triggers
    df_peaks = pd.read_sql_query("SELECT * FROM peak_windows WHERE avg_utilization >= 85.0 ORDER BY rank_score DESC LIMIT 5", conn)
    for _, row in df_peaks.iterrows():
        recs.append({
            "category": "Capacity",
            "priority": "High",
            "location": row["location"],
            "title": f"Persistent Peak in {row['location']} on {row['day']}s",
            "description": f"{row['location']} reaches {row['avg_utilization']}% average utilization consistently during {row['time_slot']} (recurs in {row['recurrence_weeks']} of {row['total_weeks']} observed weeks).",
            "suggested_action": f"Provision an additional high-density dual-band AP in {row['location']} to alleviate recurring load.",
            "metric_trigger": f"Recurrence: {row['recurrence_weeks']}/{row['total_weeks']} weeks, Util: {row['avg_utilization']}%",
            "status": "Pending"
        })

    # 3. Underutilized APs for Rebalancing
    df_under = pd.read_sql_query("SELECT * FROM location_clusters WHERE cluster_name = 'Underutilized Zones' LIMIT 4", conn)
    for _, row in df_under.iterrows():
        recs.append({
            "category": "Rebalance",
            "priority": "Medium",
            "location": row["location"],
            "title": f"Hardware Reallocation Candidate: {row['access_point']}",
            "description": f"{row['access_point']} in {row['location']} operates at only {row['avg_utilization']}% average utilization with {row['avg_devices']} devices.",
            "suggested_action": f"Consider relocating {row['access_point']} to high-density zones (e.g. Block B or Canteen food court) to improve campus coverage ROI.",
            "metric_trigger": f"Util: {row['avg_utilization']}%, Dev: {row['avg_devices']}",
            "status": "Pending"
        })

    # 4. Unstable APs
    df_unstable = pd.read_sql_query("SELECT * FROM location_clusters WHERE cluster_name = 'Unstable Zones' LIMIT 3", conn)
    for _, row in df_unstable.iterrows():
        recs.append({
            "category": "Reliability",
            "priority": "High",
            "location": row["location"],
            "title": f"Signal Degradation & Packet Loss at {row['access_point']}",
            "description": f"{row['access_point']} in {row['location']} exhibits high packet loss ({row['avg_packet_loss']}%) and elevated latency ({row['avg_latency']}ms).",
            "suggested_action": "Perform RF spectrum analysis to check 2.4/5GHz channel overlap, check PoE cable runs, or replace deteriorating AP transceiver.",
            "metric_trigger": f"Loss: {row['avg_packet_loss']}%, Latency: {row['avg_latency']}ms",
            "status": "Pending"
        })

    # 5. Critical Anomalies Trigger
    df_anom = pd.read_sql_query("SELECT * FROM anomalies WHERE severity = 'Critical' ORDER BY timestamp DESC LIMIT 3", conn)
    for _, row in df_anom.iterrows():
        recs.append({
            "category": "Security",
            "priority": "High",
            "location": row["location"],
            "title": f"Critical Telemetry Anomaly in {row['location']}",
            "description": f"All 3 anomaly detection algorithms flagged {row['access_point']} with z-score {row['z_score']}. {row['details']}",
            "suggested_action": "Cross-reference access point client associations with physical campus access control logs to rule out unauthorized gatherings or bot traffic.",
            "metric_trigger": f"Z-Score: {row['z_score']}, 3/3 Algorithm Consensus",
            "status": "Pending"
        })

    # Insert into database
    cursor = conn.cursor()
    cursor.execute("DELETE FROM recommendations;")
    cursor.executemany("""
    INSERT INTO recommendations (category, priority, location, title, description, suggested_action, metric_trigger, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (r["category"], r["priority"], r["location"], r["title"], r["description"], r["suggested_action"], r["metric_trigger"], r["status"])
        for r in recs
    ])
    conn.commit()
    conn.close()

    return recs

def get_recommendations_list(status_filter: str = None):
    conn = get_db_connection()
    query = "SELECT * FROM recommendations"
    params = []
    if status_filter and status_filter.lower() != "all":
        query += " WHERE status = ?"
        params.append(status_filter)
    query += " ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, id ASC"
    
    recs = pd.read_sql_query(query, conn, params=params).to_dict(orient="records")
    conn.close()
    return recs

def update_recommendation_status(rec_id: int, new_status: str):
    conn = get_db_connection()
    conn.execute("UPDATE recommendations SET status = ? WHERE id = ?", (new_status, rec_id))
    conn.commit()
    conn.close()
    return True

