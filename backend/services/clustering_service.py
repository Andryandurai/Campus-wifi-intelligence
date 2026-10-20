import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score
from database import get_db_connection

def run_location_clustering():
    conn = get_db_connection()
    df = pd.read_sql_query(
        """SELECT access_point, location, connected_devices, bandwidth_util,
                  download_gb, upload_gb, latency_ms, packet_loss
           FROM wifi_logs""",
        conn
    )
    if df.empty:
        conn.close()
        return {}

    # Profile vector per AP
    df["total_traffic_gb"] = df["download_gb"] + df["upload_gb"]
    ap_profiles = df.groupby(["access_point", "location"]).agg(
        avg_devices=("connected_devices", "mean"),
        avg_utilization=("bandwidth_util", "mean"),
        avg_traffic_gb=("total_traffic_gb", "mean"),
        avg_latency=("latency_ms", "mean"),
        avg_packet_loss=("packet_loss", "mean"),
        peak_rate=("bandwidth_util", lambda s: float(np.mean(s >= 80.0)))
    ).reset_index()

    feature_cols = ["avg_devices", "avg_utilization", "avg_traffic_gb", "avg_latency", "avg_packet_loss", "peak_rate"]
    X = ap_profiles[feature_cols].values
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-Means clustering with k=4
    k = 4
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    ap_profiles["cluster_id"] = cluster_labels

    # 3D PCA projection for Three.js visualization
    pca = PCA(n_components=3, random_state=42)
    X_pca = pca.fit_transform(X_scaled)
    ap_profiles["pca_x"] = np.round(X_pca[:, 0] * 12.0, 2)
    ap_profiles["pca_y"] = np.round(X_pca[:, 1] * 12.0, 2)
    ap_profiles["pca_z"] = np.round(X_pca[:, 2] * 12.0, 2)

    # Clustering evaluation scores
    sil_score = round(float(silhouette_score(X_scaled, cluster_labels)), 3)
    db_score = round(float(davies_bouldin_score(X_scaled, cluster_labels)), 3)

    # Inspect centroids to intelligently assign cluster names
    centroids = kmeans.cluster_centers_
    # centroid features order: avg_devices(0), avg_utilization(1), avg_traffic(2), avg_latency(3), avg_packet_loss(4), peak_rate(5)
    cluster_meta = {}
    
    # Sort cluster IDs by avg_utilization to map logically
    cluster_util_map = {cid: centroids[cid][1] for cid in range(k)}
    cluster_loss_map = {cid: (centroids[cid][3] + centroids[cid][4]*1.5) for cid in range(k)}

    # Pick the cluster with highest latency/loss as Unstable
    unstable_cid = max(cluster_loss_map, key=cluster_loss_map.get)
    remaining_cids = [c for c in range(k) if c != unstable_cid]
    
    # Sort remaining by utilization
    remaining_cids.sort(key=lambda c: cluster_util_map[c])
    underutilized_cid = remaining_cids[0]
    moderate_cid = remaining_cids[1]
    high_demand_cid = remaining_cids[2]

    cluster_naming = {
        high_demand_cid: ("High-Demand Zones", "Prioritize Wi-Fi 6 AP upgrades and beamforming antenna tuning"),
        moderate_cid: ("Moderate Zones", "Normal operating profile. Routine periodic inspection"),
        underutilized_cid: ("Underutilized Zones", "Low load. Reallocate excess AP hardware to high-demand blocks"),
        unstable_cid: ("Unstable Zones", "Elevated latency/loss. Investigate RF interference, channel overlap or cable faults")
    }

    ap_profiles["cluster_name"] = ap_profiles["cluster_id"].apply(lambda cid: cluster_naming[cid][0])
    ap_profiles["suggested_action"] = ap_profiles["cluster_id"].apply(lambda cid: cluster_naming[cid][1])

    # Persist to database
    cursor = conn.cursor()
    cursor.execute("DELETE FROM location_clusters;")
    cursor.executemany("""
    INSERT INTO location_clusters (
        access_point, location, cluster_id, cluster_name,
        avg_devices, avg_utilization, avg_traffic_gb, avg_latency, avg_packet_loss,
        pca_x, pca_y, pca_z, suggested_action
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (
            row["access_point"], row["location"], int(row["cluster_id"]), row["cluster_name"],
            round(float(row["avg_devices"]), 1), round(float(row["avg_utilization"]), 1),
            round(float(row["avg_traffic_gb"]), 2), round(float(row["avg_latency"]), 1),
            round(float(row["avg_packet_loss"]), 2), float(row["pca_x"]),
            float(row["pca_y"]), float(row["pca_z"]), row["suggested_action"]
        ) for _, row in ap_profiles.iterrows()
    ])
    conn.commit()
    conn.close()

    return {
        "silhouette_score": sil_score,
        "davies_bouldin_index": db_score,
        "k": k,
        "clusters": ap_profiles.to_dict(orient="records"),
        "cluster_summary": [
            {
                "cluster_name": name,
                "action": action,
                "count": int((ap_profiles["cluster_name"] == name).sum())
            }
            for cid, (name, action) in cluster_naming.items()
        ]
    }

def get_clusters_data():
    conn = get_db_connection()
    clusters = pd.read_sql_query("SELECT * FROM location_clusters ORDER BY location, access_point", conn).to_dict(orient="records")
    conn.close()
    return clusters

