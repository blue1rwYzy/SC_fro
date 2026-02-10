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
  error?: string;
  created_at: string;
  completed_at?: string;
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
  startTracking: (videoPath: string, modelId: number) => {
    const formData = new FormData();
    formData.append('video_path', videoPath);
    formData.append('model_id', modelId.toString());
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
    const wsUrl = `${protocol}//localhost:8003/tracking/ws/${taskId}`;
    return new WebSocket(wsUrl);
  },
};
