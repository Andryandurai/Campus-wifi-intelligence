import pandas as pd
import numpy as np
from database import get_db_connection

def get_kpis():
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
    
    # 24h summary
    df_24h = pd.read_sql_query(
        "SELECT * FROM wifi_logs WHERE timestamp >= datetime(?, '-24 hours')",
        conn,
        params=[latest_ts]
    )
    conn.close()
    
    total_active_devices = int(df_latest["connected_devices"].sum())
    avg_utilization = round(float(df_latest["bandwidth_util"].mean()), 1)
    avg_latency = round(float(df_latest["latency_ms"].mean()), 1)
    avg_packet_loss = round(float(df_latest["packet_loss"].mean()), 2)
    total_download_gb = round(float(df_24h["download_gb"].sum()), 1)
    total_upload_gb = round(float(df_24h["upload_gb"].sum()), 1)
    
    # Concurrency and peak utilization in last 24h
    peak_util_24h = round(float(df_24h["bandwidth_util"].max()), 1)
    peak_devices_24h = int(df_24h["connected_devices"].max())
    
    return {
        "timestamp": latest_ts,
        "total_active_devices": total_active_devices,
        "avg_utilization": avg_utilization,
        "avg_latency_ms": avg_latency,
        "avg_packet_loss_pct": avg_packet_loss,
        "traffic_download_24h_gb": total_download_gb,
        "traffic_upload_24h_gb": total_upload_gb,
        "peak_util_24h": peak_util_24h,
        "peak_devices_24h": peak_devices_24h,
        "active_ap_count": len(df_latest)
    }

def get_descriptive_stats():
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT location, connected_devices, bandwidth_util, latency_ms, packet_loss, download_gb, upload_gb FROM wifi_logs", conn)
    conn.close()
    
    if df.empty:
        return {}
        
    stats = {}
    for loc, group in df.groupby("location"):
        stats[loc] = {
            "devices": {
                "mean": round(float(group["connected_devices"].mean()), 1),
                "median": round(float(group["connected_devices"].median()), 1),
                "std": round(float(group["connected_devices"].std()), 1),
                "p90": round(float(group["connected_devices"].quantile(0.90)), 1),
                "max": int(group["connected_devices"].max())
            },
            "utilization": {
                "mean": round(float(group["bandwidth_util"].mean()), 1),
                "median": round(float(group["bandwidth_util"].median()), 1),
                "std": round(float(group["bandwidth_util"].std()), 1),
                "p90": round(float(group["bandwidth_util"].quantile(0.90)), 1),
                "max": round(float(group["bandwidth_util"].max()), 1)
            },
            "latency": {
                "mean": round(float(group["latency_ms"].mean()), 1),
                "p90": round(float(group["latency_ms"].quantile(0.90)), 1),
                "max": round(float(group["latency_ms"].max()), 1)
            },
            "packet_loss": {
                "mean": round(float(group["packet_loss"].mean()), 2),
                "max": round(float(group["packet_loss"].max()), 2)
            }
        }
    return stats

def get_hourly_matrix():
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT location, time, bandwidth_util FROM wifi_logs", conn)
    conn.close()
    
    if df.empty:
        return []
        
    df["hour"] = df["time"].apply(lambda t: int(t.split(":")[0]))
    pivot = df.groupby(["location", "hour"])["bandwidth_util"].mean().reset_index()
    
    # Return formatted table for heatmap
    locations = sorted(pivot["location"].unique())
    matrix = []
    for loc in locations:
        loc_df = pivot[pivot["location"] == loc]
        hours_map = {row["hour"]: round(row["bandwidth_util"], 1) for _, row in loc_df.iterrows()}
        row_data = {"location": loc}
        for h in range(24):
            row_data[f"h_{h}"] = hours_map.get(h, 0.0)
        matrix.append(row_data)
        
    return matrix

def get_correlations():
    conn = get_db_connection()
    df = pd.read_sql_query(
        "SELECT connected_devices, bandwidth_util, download_gb, upload_gb, latency_ms, packet_loss FROM wifi_logs",
        conn
    )
    conn.close()
    
    if df.empty:
        return {}
        
    corr = df.corr(method="pearson").round(3)
    features = list(corr.columns)
    
    matrix = []
    for f1 in features:
        row = {"feature": f1}
        for f2 in features:
            row[f2] = float(corr.loc[f1, f2])
        matrix.append(row)
        
    return {
        "features": features,
        "matrix": matrix
    }

def get_day_of_week_trends():
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT day, location, bandwidth_util, connected_devices FROM wifi_logs", conn)
    conn.close()
    
    if df.empty:
        return []
        
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    agg = df.groupby(["day", "location"]).agg({"bandwidth_util": "mean", "connected_devices": "mean"}).reset_index()
    agg["day_cat"] = pd.Categorical(agg["day"], categories=day_order, ordered=True)
    agg = agg.sort_values(["day_cat", "location"])
    
    results = []
    for _, row in agg.iterrows():
        results.append({
            "day": row["day"],
            "location": row["location"],
            "avg_utilization": round(float(row["bandwidth_util"]), 1),
            "avg_devices": round(float(row["connected_devices"]), 0)
        })
    return results

