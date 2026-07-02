import { requestClient } from '#/api/request';

export interface DefectStatistics {
  overview: {
    total_inspections: number;
    total_defects: number;
    avg_confidence: number;
  };
  severity_distribution: Array<{
    level: number;
    text: string;
    inspection_count: number;
    defect_count: number;
  }>;
  class_distribution: Array<{
    class_name: string;
    count: number;
  }>;
  trends: Array<{
    date: string;
    inspection_count: number;
    defect_count: number;
  }>;
  recent_batches: Array<{
    batch_name: string;
    image_count: number;
    defect_count: number;
    latest_time: string;
  }>;
}

export interface VisitorStatistics {
  total_visits: number;
  unique_visitors: number;
  today_visits: number;
  week_visits: number;
  province_stats: Array<{
    province: string;
    count: number;
  }>;
  city_stats: Array<{
    city: string;
    province: string;
    count: number;
  }>;
  daily_trends: Array<{
    date: string;
    count: number;
  }>;
  map_data: Array<{
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    visit_count: number;
  }>;
}

export interface VisitorRecord {
  id: number;
  ip_address: string;
  country: string;
  province: string;
  city: string;
  isp: string;
  latitude: number | null;
  longitude: number | null;
  user_agent: string;
  endpoint: string;
  visit_time: string;
}

export const analyticsApi = {
  // 获取缺陷检测统计数据
  getDefectStatistics: () =>
    requestClient.get<DefectStatistics>('/analytics/defect-statistics'),

  // 获取访客统计数据
  getVisitorStatistics: () =>
    requestClient.get<VisitorStatistics>('/analytics/visitor-statistics'),

  // 获取最近访客记录
  getRecentVisitors: (limit = 50) =>
    requestClient.get<VisitorRecord[]>('/analytics/recent-visitors', {
      params: { limit },
    }),
};
