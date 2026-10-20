import pandas as pd
from database import get_db_connection

def detect_peak_windows():
    conn = get_db_connection()
    df = pd.read_sql_query(
        "SELECT timestamp, date, time, day, location, access_point, bandwidth_util, connected_devices FROM wifi_logs",
        conn
    )
    if df.empty:
        conn.close()
        return []

    # Calculate 90th percentile per location
    p90_by_loc = df.groupby("location")["bandwidth_util"].quantile(0.90).to_dict()
    
    # Extract 1-hour slot from time (e.g. "12:00 - 13:00")
    df["hour"] = df["time"].apply(lambda t: int(t.split(":")[0]))
    df["time_slot"] = df["hour"].apply(lambda h: f"{h:02d}:00 - {(h+1)%24:02d}:00")
    
    # Total weeks in dataset
    dates = pd.to_datetime(df["date"])
    total_weeks = max(1, (dates.max() - dates.min()).days // 7 + 1)
    
    # Group by location, day, hour
    slot_agg = df.groupby(["location", "day", "time_slot", "hour"]).agg(
        avg_util=("bandwidth_util", "mean"),
        max_util=("bandwidth_util", "max"),
        avg_dev=("connected_devices", "mean"),
        sample_count=("bandwidth_util", "count")
    ).reset_index()

    peak_rows = []
    for _, row in slot_agg.iterrows():
        loc = row["location"]
        threshold = max(75.0, p90_by_loc.get(loc, 75.0))
        if row["avg_util"] >= threshold:
            # Estimate how many weeks this peak recurs
            recurrence_weeks = min(total_weeks, max(1, int(round((row["avg_util"] / 100.0) * total_weeks))))
            intensity_score = round(row["avg_util"] * (recurrence_weeks / total_weeks), 2)
            
            peak_rows.append({
                "location": loc,
                "day": row["day"],
                "time_slot": row["time_slot"],
                "hour": row["hour"],
                "avg_utilization": round(row["avg_util"], 1),
                "p90_utilization": round(threshold, 1),
                "peak_frequency": int(row["sample_count"]),
                "recurrence_weeks": recurrence_weeks,
                "total_weeks": total_weeks,
                "rank_score": intensity_score,
                "avg_devices": int(row["avg_dev"])
            })

    # Sort by rank score descending
    peak_rows.sort(key=lambda x: x["rank_score"], reverse=True)

    # Persist top peaks
    cursor = conn.cursor()
    cursor.execute("DELETE FROM peak_windows;")
    cursor.executemany("""
    INSERT INTO peak_windows (
        location, day, time_slot, avg_utilization, p90_utilization,
        peak_frequency, recurrence_weeks, total_weeks, rank_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (
            p["location"], p["day"], p["time_slot"], p["avg_utilization"],
            p["p90_utilization"], p["peak_frequency"], p["recurrence_weeks"],
            p["total_weeks"], p["rank_score"]
        ) for p in peak_rows
    ])
    conn.commit()
    conn.close()
    
    return peak_rows

def get_peak_summary():
    conn = get_db_connection()
    peaks = pd.read_sql_query("SELECT * FROM peak_windows ORDER BY rank_score DESC LIMIT 20", conn).to_dict(orient="records")
    conn.close()
    return peaks

