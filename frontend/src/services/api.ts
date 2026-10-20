import axios from 'axios';
import {
  KpiData,
  NetworkHealthData,
  CampusBlock3D,
  PeakWindowItem,
  AnomalyItem,
  LocationClusterItem,
  CongestionPredictionItem,
  RecommendationItem,
  UserProfile
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wifi_intel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post<{ token: string; user: UserProfile; message: string }>('/auth/login', credentials);
    return res.data;
  },
  register: async (data: { username: string; password: string; full_name: string; department?: string; role?: string }) => {
    const res = await api.post<{ token: string; user: UserProfile; message: string }>('/auth/register', data);
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await api.get<{ user: UserProfile }>('/auth/me');
    return res.data.user;
  },
};

export const analyticsApi = {
  getKpis: async () => {
    const res = await api.get<KpiData>('/analytics/kpis');
    return res.data;
  },
  getStats: async () => {
    const res = await api.get<Record<string, any>>('/analytics/stats');
    return res.data;
  },
  getHourlyMatrix: async () => {
    const res = await api.get<any[]>('/analytics/hourly-matrix');
    return res.data;
  },
  getCorrelations: async () => {
    const res = await api.get<{ features: string[]; matrix: any[] }>('/analytics/correlations');
    return res.data;
  },
  getDayTrends: async () => {
    const res = await api.get<any[]>('/analytics/day-trends');
    return res.data;
  },
};

export const peaksApi = {
  getSummary: async () => {
    const res = await api.get<PeakWindowItem[]>('/peaks/summary');
    return res.data;
  },
  runDetection: async () => {
    const res = await api.post<{ message: string; peaks: PeakWindowItem[] }>('/peaks/run');
    return res.data;
  },
};

export const anomaliesApi = {
  getList: async (severity = 'all', limit = 50) => {
    const res = await api.get<AnomalyItem[]>(`/anomalies/list?severity=${severity}&limit=${limit}`);
    return res.data;
  },
  runDetection: async () => {
    const res = await api.post<{ message: string; metrics: any }>('/anomalies/run');
    return res.data;
  },
};

export const clustersApi = {
  getList: async () => {
    const res = await api.get<LocationClusterItem[]>('/clusters/list');
    return res.data;
  },
  runClustering: async () => {
    const res = await api.post<any>('/clusters/run');
    return res.data;
  },
};

export const predictionsApi = {
  getLatest: async () => {
    const res = await api.get<CongestionPredictionItem[]>('/predictions/latest');
    return res.data;
  },
  runTraining: async () => {
    const res = await api.post<any>('/predictions/train');
    return res.data;
  },
};

export const healthApi = {
  getCurrent: async () => {
    const res = await api.get<NetworkHealthData>('/health/current');
    return res.data;
  },
};

export const recommendationsApi = {
  getList: async (status = 'all') => {
    const res = await api.get<RecommendationItem[]>(`/recommendations/list?status=${status}`);
    return res.data;
  },
  updateStatus: async (id: number, status: string) => {
    const res = await api.put<{ message: string }>(`/recommendations/${id}/status`, { status });
    return res.data;
  },
};

export const campusApi = {
  getLayout: async () => {
    const res = await api.get<{ timestamp: string; blocks: CampusBlock3D[] }>('/campus/layout');
    return res.data;
  },
  getBlockDrilldown: async (code: string) => {
    const res = await api.get<{ block: any; access_points: any[]; hourly_trend: any[] }>(`/campus/block/${code}`);
    return res.data;
  },
};

export const adminApi = {
  runFullPipeline: async (days = 14) => {
    const res = await api.post<any>(`/admin/pipeline/run-all?days=${days}`);
    return res.data;
  },
};

export default api;

