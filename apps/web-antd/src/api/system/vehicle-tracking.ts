/**
 * 车辆追踪 API
 */
import { requestClient } from '../request';

/**
 * 模型信息接口
 */
export interface ModelInfo {
  id: number;
  name: string;
  path: string;
  version: string;
  description: string;
  model_type: 'detection' | 'tracking'; // 模型类型
  createdAt: string;
}

/**
 * 追踪任务接口
 */
export interface TrackingTask {
  task_id: string;
  model_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result_video_url?: string;
  analysis_video_url?: string;
  events_json_url?: string;
  report_html_url?: string;
  report_md_url?: string;
  analysis?: {
    summary?: Record<string, any>;
    tracks?: VehicleTrack[];
    events?: VehicleEvent[];
    audit_samples?: AuditSample[];
    scene_analysis?: Record<string, any> | null;
  };
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface TrackingStartOptions {
  enableLlmReport?: boolean;
  enableVlmCheck?: boolean;
}

export interface VehicleTrack {
  track_id: number;
  class_name: string;
  first_seen: number;
  last_seen: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  attributes?: Record<string, any>;
}

export interface VehicleEvent {
  event_id?: string;
  type: string;
  track_id?: number;
  frame_id?: number;
  frame?: number;
  start_time?: number;
  end_time?: number;
  time_s?: number;
  confidence?: number;
  description?: string;
  keyframe_path?: string;
  keyframe_error?: string;
  vlm_check?: Record<string, any>;
  [key: string]: any;
}

export interface AuditSample {
  frame: number;
  tid: number;
  x: number;
  y: number;
  speed_kmh: number;
  ppm: number;
}

/**
 * 上传视频响应接口
 */
export interface UploadVideoResponse {
  file_id: string;
  filename: string;
  video_url: string;
  video_path: string;
}

export interface TrackingReportRecord {
  id: number;
  task_id: string;
  report_type?: string;
  title?: string;
  video_name?: string;
  html_path?: string;
  html_url?: string;
  md_path?: string;
  md_url?: string;
  events_json_path?: string;
  events_json_url?: string;
  analysis_video_path?: string;
  analysis_video_url?: string;
  llm_enabled: boolean;
  vlm_enabled: boolean;
  summary?: Record<string, any>;
  created_at?: string;
}

export interface TrackingReportList {
  total: number;
  reports: TrackingReportRecord[];
}

/**
 * API 接口定义
 */
export const vehicleTrackingApi = {
  /**
   * 获取可用模型列表
   */
  getModels: () => {
    return requestClient.get<ModelInfo[]>('/system/tracking/models');
  },

  /**
   * 上传视频
   */
  uploadVideo: (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    return requestClient.post<UploadVideoResponse>(
      '/system/tracking/upload-video',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2分钟超时
      },
    );
  },

  /**
   * 开始追踪
   */
  startTracking: (videoPath: string, modelId: number, options: TrackingStartOptions = {}) => {
    const formData = new FormData();
    formData.append('video_path', videoPath);
    formData.append('model_id', modelId.toString());
    formData.append('enable_llm_report', options.enableLlmReport ? 'true' : 'false');
    formData.append('enable_vlm_check', options.enableVlmCheck ? 'true' : 'false');
    return requestClient.post<{ task_id: string }>('/system/tracking/start', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60秒超时
    });
  },

  /**
   * 获取追踪任务状态
   */
  getTrackingStatus: (taskId: string) => {
    return requestClient.get<TrackingTask>(`/system/tracking/status/${taskId}`);
  },

  /**
   * 获取追踪工件
   */
  getTrackingArtifacts: (taskId: string) => {
    return requestClient.get<TrackingTask>(`/system/tracking/artifacts/${taskId}`);
  },

  /**
   * 获取追踪报告索引列表
   */
  getTrackingReports: (params?: { limit?: number; offset?: number }) => {
    return requestClient.get<TrackingReportList>('/system/tracking/reports', {
      params,
    });
  },

  /**
   * 获取追踪报告详情
   */
  getTrackingReport: (reportId: number) => {
    return requestClient.get<TrackingReportRecord>(`/system/tracking/reports/${reportId}`);
  },

  /**
   * 删除追踪报告
   */
  deleteTrackingReport: (reportId: number) => {
    return requestClient.delete<{ id: number; deleted_files: string[] }>(`/system/tracking/reports/${reportId}`);
  },

  /**
   * 下载结果视频
   */
  downloadResult: (taskId: string) => {
    return requestClient.get(`/system/tracking/download/${taskId}`, {
      responseType: 'blob',
    });
  },

  /**
   * 创建实时推理 WebSocket 连接
   */
  connectRealtimeTracking: (taskId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/system/tracking/ws/${taskId}`;
    return new WebSocket(wsUrl);
  },
};
