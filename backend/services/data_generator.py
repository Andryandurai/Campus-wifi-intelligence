import datetime
import random
import numpy as np
import math
from database import get_db_connection

LOCATIONS_CONFIG = {
    "BLOCK_A": {
        "aps": ["AP_A_01", "AP_A_02", "AP_A_03", "AP_A_04"],
        "base_util": 45.0,
        "base_devices": 180,
        "capacity_per_ap": 250,
        "peak_hours": [10, 11, 14, 15],
        "weekend_mult": 0.20
    },
    "BLOCK_B": {
        "aps": ["AP_B_01", "AP_B_02", "AP_B_03", "AP_B_04", "AP_B_05"],
        "base_util": 60.0,
        "base_devices": 280,
        "capacity_per_ap": 300,
        "peak_hours": [10, 11, 12, 13, 14],
        "weekend_mult": 0.25
    },
    "BLOCK_C": {
        "aps": ["AP_C_01", "AP_C_02", "AP_C_03"],
        "base_util": 40.0,
        "base_devices": 150,
        "capacity_per_ap": 250,
        "peak_hours": [10, 11, 14],
        "weekend_mult": 0.15
    },
    "BLOCK_D": {
        "aps": ["AP_D_01", "AP_D_02", "AP_D_03"],
        "base_util": 30.0,
        "base_devices": 110,
        "capacity_per_ap": 200,
        "peak_hours": [11, 12, 14],
        "weekend_mult": 0.10
    },
    "LIBRARY": {
        "aps": ["AP_LIB_01", "AP_LIB_02", "AP_LIB_03", "AP_LIB_04"],
        "base_util": 50.0,
        "base_devices": 220,
        "capacity_per_ap": 260,
        "peak_hours": [14, 15, 16, 17],
        "weekend_mult": 0.65
    },
    "CANTEEN": {
        "aps": ["AP_CAN_01", "AP_CAN_02", "AP_CAN_03"],
        "base_util": 35.0,
        "base_devices": 130,
        "capacity_per_ap": 250,
        "peak_hours": [12, 13],
        "weekend_mult": 0.40
    },
    "HOSTEL": {
        "aps": ["AP_HST_01", "AP_HST_02", "AP_HST_03", "AP_HST_04", "AP_HST_05"],
        "base_util": 45.0,
        "base_devices": 250,
        "capacity_per_ap": 350,
        "peak_hours": [18, 19, 20, 21, 22],
        "weekend_mult": 1.15
    },
    "ADMIN": {
        "aps": ["AP_ADM_01", "AP_ADM_02"],
        "base_util": 30.0,
        "base_devices": 90,
        "capacity_per_ap": 180,
        "peak_hours": [10, 11, 14, 15],
        "weekend_mult": 0.05
    }
}

PERIOD_TYPES = ["Academic", "Academic", "Academic", "Exam", "Event"]
DAYS_NAME = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def generate_campus_dataset(days_back: int = 14):
    """
    Generates synthetic 15-minute campus network telemetry with explicit temporal patterns
    and 1.5% injected ground-truth anomalies.
    """
    random.seed(42)
    np.random.seed(42)
    
    end_dt = datetime.datetime.now().replace(minute=0, second=0, microsecond=0)
    start_dt = end_dt - datetime.timedelta(days=days_back)
    
    records = []
    current_dt = start_dt
    
    while current_dt <= end_dt:
        hour = current_dt.hour
        minute = current_dt.minute
        weekday_idx = current_dt.weekday() # 0 = Monday, 6 = Sunday
        day_name = DAYS_NAME[weekday_idx]
        is_weekend = 1 if weekday_idx >= 5 else 0
        date_str = current_dt.strftime("%Y-%m-%d")
        time_str = current_dt.strftime("%H:%M")
        ts_str = current_dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Period classification: last 3 days exam mode, otherwise academic
        period_type = "Exam" if (end_dt - current_dt).days <= 3 else "Academic"
        
        for loc_code, loc_info in LOCATIONS_CONFIG.items():
            base_util = loc_info["base_util"]
            base_dev = loc_info["base_devices"]
            weekend_factor = loc_info["weekend_mult"] if is_weekend else 1.0
            
            # Hourly diurnal bell curve
            hour_factor = 0.2
            if 7 <= hour <= 23:
                # Calculate proximity to peak hours
                min_dist = min([abs(hour - ph) for ph in loc_info["peak_hours"]])
                hour_factor = max(0.2, 1.0 - (min_dist * 0.22))
            else:
                hour_factor = 0.08 # late night
                
            # Canteen lunch surge
            if loc_code == "CANTEEN" and hour in [12, 13]:
                hour_factor = 1.65
                
            # Block B Friday lunch peak
            if loc_code == "BLOCK_B" and weekday_idx == 4 and hour in [12, 13]:
                hour_factor = 1.55
                
            # Hostel evening surge
            if loc_code == "HOSTEL" and (18 <= hour <= 23):
                hour_factor = 1.60
                
            # Library pre-exam boost
            if loc_code == "LIBRARY" and period_type == "Exam" and (10 <= hour <= 21):
                hour_factor *= 1.40

            for ap_name in loc_info["aps"]:
                # Normal variation
                noise = np.random.normal(0, 3.5)
                util = (base_util * hour_factor * weekend_factor) + noise
                util = max(4.0, min(99.0, util))
                
                # Device count based on capacity and utilization
                cap = loc_info["capacity_per_ap"]
                dev_count = int((util / 100.0) * cap * random.uniform(0.85, 1.05))
                dev_count = max(2, dev_count)
                
                # Traffic volumes (GB)
                dl_gb = round((dev_count * 0.72 * (util / 100.0)) + random.uniform(0.5, 4.0), 2)
                ul_gb = round((dl_gb * random.uniform(0.18, 0.28)), 2)
                
                # Latency formula: rises exponentially as utilization & devices saturate
                saturation_ratio = max(0.0, (util - 75.0) / 25.0)
                latency = 16.0 + 0.0055 * (dev_count ** 1.38) + (saturation_ratio ** 2 * 65.0) + np.random.normal(0, 2.5)
                latency = round(max(8.0, latency), 1)
                
                # Packet loss %
                packet_loss = 0.15 + max(0.0, (util - 80.0) * 0.18) + np.random.exponential(0.12)
                packet_loss = round(min(25.0, max(0.05, packet_loss)), 2)
                
                # Injected Ground-Truth Anomalies (~1.5% chance)
                is_anomaly = 0
                anomaly_type = None
                
                if random.random() < 0.015:
                    is_anomaly = 1
                    anomaly_scenario = random.choice(["device_surge", "latency_spike", "packet_loss_burst", "off_hours_spike"])
                    anomaly_type = anomaly_scenario
                    
                    if anomaly_scenario == "device_surge":
                        dev_count = int(dev_count * random.uniform(2.2, 3.4))
                        util = min(99.5, util + random.uniform(25.0, 40.0))
                        dl_gb *= 2.5
                        latency += random.uniform(40.0, 90.0)
                    elif anomaly_scenario == "latency_spike":
                        latency = round(latency + random.uniform(110.0, 240.0), 1)
                        packet_loss = round(packet_loss + random.uniform(3.5, 8.0), 2)
                    elif anomaly_scenario == "packet_loss_burst":
                        packet_loss = round(random.uniform(7.5, 18.0), 2)
                        latency = round(latency + random.uniform(45.0, 110.0), 1)
                    elif anomaly_scenario == "off_hours_spike":
                        if hour < 6 or hour > 23:
                            dev_count = random.randint(280, 520)
                            util = random.uniform(75.0, 92.0)
                            dl_gb = round(random.uniform(150.0, 320.0), 2)
                            latency = round(random.uniform(45.0, 95.0), 1)

                records.append((
                    ts_str, date_str, time_str, day_name, loc_code, ap_name,
                    dev_count, round(util, 1), dl_gb, ul_gb, latency, packet_loss,
                    period_type, is_weekend, is_anomaly, anomaly_type
                ))
                
        current_dt += datetime.timedelta(minutes=15)
        
    # Bulk insert into SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wifi_logs;")
    
    cursor.executemany("""
    INSERT INTO wifi_logs (
        timestamp, date, time, day, location, access_point,
        connected_devices, bandwidth_util, download_gb, upload_gb,
        latency_ms, packet_loss, period_type, is_weekend, is_anomaly, anomaly_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, records)
    
    conn.commit()
    conn.close()
    
    print(f"Dataset generated: {len(records)} records across {len(LOCATIONS_CONFIG)} locations over {days_back} days.")
    return len(records)

if __name__ == "__main__":
    generate_campus_dataset(days_back=7)

