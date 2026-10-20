import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from database import get_db_connection

def run_anomaly_detection():
    conn = get_db_connection()
    df = pd.read_sql_query(
        """SELECT id, timestamp, date, time, day, location, access_point,
                  connected_devices, bandwidth_util, latency_ms, packet_loss,
                  is_weekend, is_anomaly, anomaly_type
           FROM wifi_logs""",
        conn
    )
    if df.empty:
        conn.close()
        return {}, []

    df["hour"] = df["time"].apply(lambda t: int(t.split(":")[0]))

    # --- 1. Contextual Z-Score Method ---
    # Group by location, is_weekend, hour
    grp = df.groupby(["location", "is_weekend", "hour"])
    means = grp["connected_devices"].transform("mean")
    stds = grp["connected_devices"].transform("std").replace(0, 1.0).fillna(1.0)
    df["z_devices"] = (df["connected_devices"] - means) / stds

    mean_util = grp["bandwidth_util"].transform("mean")
    std_util = grp["bandwidth_util"].transform("std").replace(0, 1.0).fillna(1.0)
    df["z_util"] = (df["bandwidth_util"] - mean_util) / std_util

    df["max_z"] = df[["z_devices", "z_util"]].abs().max(axis=1)
    df["z_flag"] = (df["max_z"] > 3.0).astype(int)

    # --- 2. Contextual IQR Method ---
    q1 = grp["connected_devices"].transform(lambda x: x.quantile(0.25))
    q3 = grp["connected_devices"].transform(lambda x: x.quantile(0.75))
    iqr = (q3 - q1).replace(0, 1.0)
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    df["iqr_flag"] = ((df["connected_devices"] < lower_bound) | (df["connected_devices"] > upper_bound)).astype(int)

    # --- 3. Multivariate Isolation Forest Method ---
    iso_features = ["connected_devices", "bandwidth_util", "latency_ms", "packet_loss"]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df[iso_features].fillna(0))
    iso = IsolationForest(n_estimators=150, contamination=0.015, random_state=42)
    df["if_pred"] = iso.fit_predict(X_scaled)
    df["if_flag"] = (df["if_pred"] == -1).astype(int)

    # --- Ensemble Voting ---
    df["vote_count"] = df["z_flag"] + df["iqr_flag"] + df["if_flag"]
    df["ensemble_flag"] = (df["vote_count"] >= 2).astype(int)

    # Severity classification
    def assign_severity(row):
        votes = row["vote_count"]
        z = row["max_z"]
        if votes == 3 or z >= 4.5:
            return "Critical"
        elif votes == 2 or z >= 3.5:
            return "High"
        elif votes == 1:
            return "Medium" if z >= 2.5 else "Low"
        return "Normal"

    df["severity"] = df.apply(assign_severity, axis=1)

    # Performance Evaluation vs Injected Ground Truth
    y_true = df["is_anomaly"].values
    def calc_metrics(y_pred):
        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))
        precision = round(tp / (tp + fp), 3) if (tp + fp) > 0 else 0.0
        recall = round(tp / (tp + fn), 3) if (tp + fn) > 0 else 0.0
        f1 = round(2 * precision * recall / (precision + recall), 3) if (precision + recall) > 0 else 0.0
        return {"precision": precision, "recall": recall, "f1": f1, "detected_count": int(np.sum(y_pred))}

    evaluation_metrics = {
        "ground_truth_total": int(np.sum(y_true)),
        "z_score": calc_metrics(df["z_flag"].values),
        "iqr": calc_metrics(df["iqr_flag"].values),
        "isolation_forest": calc_metrics(df["if_flag"].values),
        "ensemble_vote_2plus": calc_metrics(df["ensemble_flag"].values)
    }

    # Extract detected anomaly records (severity != 'Normal')
    anomaly_df = df[df["severity"] != "Normal"].copy()
    
    # Generate human-readable expected ranges and details
    cursor = conn.cursor()
    cursor.execute("DELETE FROM anomalies;")
    
    anomaly_records = []
    for _, row in anomaly_df.iterrows():
        metric = "devices & util" if row["z_devices"] > row["z_util"] else "bandwidth & latency"
        obs_val = float(row["connected_devices"]) if "devices" in metric else float(row["bandwidth_util"])
        exp_range = f"{int(row['connected_devices'] - row['z_devices']*15)} - {int(row['connected_devices'] - row['z_devices']*15 + 60)}"
        
        detail_msg = (
            f"Observed {int(row['connected_devices'])} devices, {row['bandwidth_util']}% util, "
            f"latency {row['latency_ms']}ms. Flagged by {row['vote_count']} of 3 algorithms."
        )
        if row["anomaly_type"]:
            detail_msg += f" (Injected pattern: {row['anomaly_type']})"

        anomaly_records.append((
            row["timestamp"], row["location"], row["access_point"], metric,
            obs_val, exp_range, round(float(row["max_z"]), 2),
            int(row["z_flag"]), int(row["iqr_flag"]), int(row["if_flag"]),
            int(row["vote_count"]), row["severity"], detail_msg, 0
        ))

    cursor.executemany("""
    INSERT INTO anomalies (
        timestamp, location, access_point, metric, observed_value, expected_range,
        z_score, z_flag, iqr_flag, if_flag, vote_count, severity, details, resolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, anomaly_records)

    conn.commit()
    conn.close()

    return evaluation_metrics, len(anomaly_records)

def get_recent_anomalies(limit: int = 50, severity: str = None):
    conn = get_db_connection()
    query = "SELECT * FROM anomalies"
    params = []
    if severity and severity.lower() != "all":
        query += " WHERE severity = ?"
        params.append(severity)
    query += " ORDER BY timestamp DESC, vote_count DESC LIMIT ?"
    params.append(limit)
    
    records = pd.read_sql_query(query, conn, params=params).to_dict(orient="records")
    conn.close()
    return records

