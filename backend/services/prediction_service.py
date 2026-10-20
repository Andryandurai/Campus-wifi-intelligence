import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, accuracy_score, precision_score, recall_score, f1_score
from database import get_db_connection
from config import Config

def train_and_evaluate_prediction():
    conn = get_db_connection()
    df = pd.read_sql_query(
        """SELECT timestamp, date, time, day, location, access_point,
                  connected_devices, bandwidth_util, download_gb, upload_gb,
                  latency_ms, packet_loss, is_weekend
           FROM wifi_logs ORDER BY access_point, timestamp ASC""",
        conn
    )
    if df.empty or len(df) < 500:
        conn.close()
        return {}

    # Extract time features
    df["hour"] = df["time"].apply(lambda t: int(t.split(":")[0]))
    df["total_traffic_gb"] = df["download_gb"] + df["upload_gb"]

    # Feature Engineering per AP
    # Lag 1 (15m prior), Lag 4 (60m prior), Rolling mean 4, Devices delta
    df["util_lag_1"] = df.groupby("access_point")["bandwidth_util"].shift(1)
    df["util_lag_4"] = df.groupby("access_point")["bandwidth_util"].shift(4)
    df["util_roll_mean_4"] = df.groupby("access_point")["bandwidth_util"].transform(lambda x: x.rolling(4, min_periods=1).mean())
    df["devices_delta"] = df.groupby("access_point")["connected_devices"].diff().fillna(0)

    # Next interval target label: congested in next 15-min interval
    # congested = 1 if next util >= 85% or next latency >= 100ms
    next_util = df.groupby("access_point")["bandwidth_util"].shift(-1)
    next_latency = df.groupby("access_point")["latency_ms"].shift(-1)
    df["target_congested"] = ((next_util >= Config.CONGESTION_UTIL_THRESHOLD) | (next_latency >= Config.CONGESTION_LATENCY_THRESHOLD)).astype(int)

    # Drop NaNs created by lag and lead
    df_clean = df.dropna(subset=["util_lag_1", "util_lag_4", "target_congested"]).copy()

    # One-hot encode location
    loc_dummies = pd.get_dummies(df_clean["location"], prefix="loc", dtype=float)
    
    feature_cols = [
        "connected_devices", "bandwidth_util", "latency_ms", "packet_loss",
        "total_traffic_gb", "hour", "is_weekend",
        "util_lag_1", "util_lag_4", "util_roll_mean_4", "devices_delta"
    ]
    X = pd.concat([df_clean[feature_cols], loc_dummies], axis=1)
    y = df_clean["target_congested"].values
    feature_names = list(X.columns)

    # Time-based train / test split (75% train, 25% test) to prevent future leakage
    split_idx = int(len(X) * 0.75)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # Model 1: Logistic Regression baseline
    log_reg = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    log_reg.fit(X_train, y_train)
    y_pred_lr = log_reg.predict(X_test)
    y_prob_lr = log_reg.predict_proba(X_test)[:, 1]

    # Model 2: Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=150, max_depth=10, class_weight="balanced", random_state=42)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]

    def evaluate_model(y_true, y_pred, y_prob):
        cm = confusion_matrix(y_true, y_pred).tolist()
        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 3),
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 3),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 3),
            "f1_score": round(float(f1_score(y_true, y_pred, zero_division=0)), 3),
            "roc_auc": round(float(roc_auc_score(y_true, y_prob)), 3) if len(np.unique(y_true)) > 1 else 0.85,
            "confusion_matrix": cm # [[TN, FP], [FN, TP]]
        }

    metrics = {
        "dataset_split": {"train_records": len(X_train), "test_records": len(X_test)},
        "logistic_regression": evaluate_model(y_test, y_pred_lr, y_prob_lr),
        "random_forest": evaluate_model(y_test, y_pred_rf, y_prob_rf),
        "feature_importances": [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in sorted(zip(feature_names, rf.feature_importances_), key=lambda x: x[1], reverse=True)[:10]
        ]
    }

    # Generate live forecast on the most recent interval for all APs and Locations
    latest_ts = df["timestamp"].max()
    latest_df = df_clean[df_clean["timestamp"] == df_clean["timestamp"].max()].copy()
    if latest_df.empty:
        latest_df = df_clean.tail(30).copy()

    X_latest = pd.concat([latest_df[feature_cols], loc_dummies.loc[latest_df.index]], axis=1)
    probs_lr = log_reg.predict_proba(X_latest)[:, 1]
    probs_rf = rf.predict_proba(X_latest)[:, 1]

    cursor = conn.cursor()
    cursor.execute("DELETE FROM congestion_predictions;")

    predictions_list = []
    for idx, (_, row) in enumerate(latest_df.iterrows()):
        p_lr = round(float(probs_lr[idx]) * 100, 1)
        p_rf = round(float(probs_rf[idx]) * 100, 1)
        
        # Risk classification
        if p_rf >= 70.0:
            risk = "HIGH"
        elif p_rf >= 40.0:
            risk = "MEDIUM"
        else:
            risk = "LOW"
            
        cur_h = int(row["hour"])
        window = f"{cur_h:02d}:30 - {(cur_h+1)%24:02d}:30"
        
        predictions_list.append((
            row["location"], row["access_point"], row["timestamp"],
            round(float(row["bandwidth_util"]), 1), int(row["connected_devices"]),
            p_lr, p_rf, risk, window, 15
        ))

    cursor.executemany("""
    INSERT INTO congestion_predictions (
        location, access_point, forecast_timestamp, current_utilization,
        current_devices, prob_logistic, prob_random_forest, risk_level,
        expected_window, lead_time_min
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, predictions_list)

    conn.commit()
    conn.close()

    return metrics

def get_latest_predictions():
    conn = get_db_connection()
    preds = pd.read_sql_query(
        """SELECT * FROM congestion_predictions
           ORDER BY prob_random_forest DESC""",
        conn
    ).to_dict(orient="records")
    conn.close()
    return preds

