export interface KpiData {
  timestamp: string;
  total_active_devices: number;
  avg_utilization: number;
  avg_latency_ms: number;
  avg_packet_loss_pct: number;
  traffic_download_24h_gb: number;
  traffic_upload_24h_gb: number;
  peak_util_24h: number;
  peak_devices_24h: number;
  active_ap_count: number;
}

export interface HealthFactors {
  capacity_headroom_u: number;
  responsiveness_l: number;
  reliability_p: number;
  stability_a: number;
  near_term_risk_c: number;
}

export interface BlockHealthItem {
  score: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  utilization: number;
  latency: number;
  packet_loss: number;
  devices: number;
}

export interface NetworkHealthData {
  timestamp: string;
  health_score: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  factors: HealthFactors;
  active_anomalies: number;
  block_health: Record<string, BlockHealthItem>;
}

export interface CampusBlock3D {
  code: string;
  name: string;
  type: string;
  capacity: number;
  floors: number;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  color: string;
  status_color: string;
  status_text: string;
  ap_count: number;
  telemetry: {
    avg_utilization: number;
    total_devices: number;
    avg_latency: number;
    avg_packet_loss: number;
  };
  prediction: {
    prob: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface PeakWindowItem {
  id: number;
  location: string;
  day: string;
  time_slot: string;
  avg_utilization: number;
  p90_utilization: number;
  peak_frequency: number;
  recurrence_weeks: number;
  total_weeks: number;
  rank_score: number;
  avg_devices?: number;
}

export interface AnomalyItem {
  id: number;
  timestamp: string;
  location: string;
  access_point: string;
  metric: string;
  observed_value: number;
  expected_range: string;
  z_score: number;
  z_flag: number;
  iqr_flag: number;
  if_flag: number;
  vote_count: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  details: string;
  resolved: number;
}

export interface LocationClusterItem {
  id: number;
  access_point: string;
  location: string;
  cluster_id: number;
  cluster_name: string;
  avg_devices: number;
  avg_utilization: number;
  avg_traffic_gb: number;
  avg_latency: number;
  avg_packet_loss: number;
  pca_x: number;
  pca_y: number;
  pca_z: number;
  suggested_action: string;
}

export interface CongestionPredictionItem {
  id: number;
  location: string;
  access_point: string;
  forecast_timestamp: string;
  current_utilization: number;
  current_devices: number;
  prob_logistic: number;
  prob_random_forest: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  expected_window: string;
  lead_time_min: number;
}

export interface RecommendationItem {
  id: number;
  category: 'Capacity' | 'Reliability' | 'Rebalance' | 'Security';
  priority: 'High' | 'Medium' | 'Low';
  location: string;
  title: string;
  description: string;
  suggested_action: string;
  metric_trigger: string;
  status: 'Pending' | 'In Progress' | 'Applied';
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  role: 'admin' | 'network_engineer' | 'viewer';
  full_name: string;
  department: string;
}

