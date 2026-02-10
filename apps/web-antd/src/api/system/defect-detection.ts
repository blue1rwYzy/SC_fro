/**
 * 路面缺陷检测 API
 */
import type { UploadFile } from 'ant-design-vue';

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
 * 图片数据库项接口
 */
export interface ImageDatabaseItem {
  id: number | string;
  filename: string;
  path: string;
  fullPath?: string; // 完整文件系统路径
  folder: string;
  size: number;
  uploadedAt: string;
  isFolder?: boolean;
  children?: ImageDatabaseItem[];
}

/**
 * 推理任务接口
 */
export interface InferenceTask {
  taskId: string;
  modelId: number;
  imageCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultPath?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * 检测结果接口
 */
export interface DetectionResult {
  bbox: number[]; // [x, y, w, h]
  class: string;
  confidence: number;
  severity?: string;
}

/**
 * 推理结果接口
 */
export interface InferenceResult {
  id: number;
  taskId: string;
  originalImage: string;
  resultImage: string;
  detections: DetectionResult[];
  confidence: number;
  createdAt: string;
}

/**
 * 推理请求参数
 */
export interface InferenceRequest {
  modelId: number;
  images?: File[];
  imageIds?: number[];
  folderPath?: string;
}

/**
 * API 接口定义
 */
export const defectDetectionApi = {
  /**
   * 获取可用模型列表
   */
  getModels: () => {
    return requestClient.get<ModelInfo[]>('/system/models');
  },

  /**
   * 获取图片数据库目录树
   */
  getImageDatabase: () => {
    return requestClient.get<ImageDatabaseItem[]>('/system/images/database');
  },

  /**
   * 单张图片推理
   */
  inferenceSingle: (data: FormData) => {
    return requestClient.post<InferenceResult>('/system/inference/single', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2分钟超时，推理可能需要较长时间
    });
  },

  /**
   * 批量图片推理
   */
  inferenceBatch: (data: FormData) => {
    return requestClient.post<InferenceTask>('/system/inference/batch', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5分钟超时
    });
  },

  /**
   * 从数据库选择图片推理
   */
  inferenceFromDatabase: (params: {
    modelId: number;
    imageIds?: string[];  // 改为字符串数组，包含完整路径
    folderPath?: string;
  }) => {
    return requestClient.post<InferenceTask>('/system/inference/from-database', params);
  },

  /**
   * 获取推理任务状态
   */
  getTaskStatus: (taskId: string) => {
    return requestClient.get<InferenceTask>(`/system/inference/task/${taskId}`);
  },

  /**
   * 获取推理结果列表
   */
  getResults: (taskId: string) => {
    return requestClient.get<InferenceResult[]>(`/system/inference/results/${taskId}`);
  },

  /**
   * 下载推理结果压缩包
   */
  downloadResults: (taskId: string) => {
    return requestClient.get(`/system/inference/download/${taskId}`, {
      responseType: 'blob',
    });
  },

  /**
   * 上传图片到数据库
   */
  uploadToDatabase: (data: FormData) => {
    return requestClient.post('/system/images/upload', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 上传压缩包到数据库并解压
   */
  uploadZipToDatabase: (data: FormData) => {
    return requestClient.post('/system/images/upload-zip', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2分钟超时，解压可能需要较长时间
    });
  },

  /**
   * 删除图片(数据库方式)
   */
  deleteImage: (imageId: number | string) => {
    return requestClient.delete(`/system/images/${imageId}`);
  },

  /**
   * 删除图片文件(文件系统方式)
   */
  deleteImageFile: (filePath: string) => {
    return requestClient.delete('/system/images/file', {
      params: { file_path: filePath }
    });
  },

  /**
   * 批量删除图片(数据库方式)
   */
  batchDeleteImages: (imageIds: (number | string)[]) => {
    return requestClient.post('/system/images/batch-delete', imageIds);
  },

  /**
   * 批量删除图片文件(文件系统方式)
   */
  batchDeleteImageFiles: (filePaths: string[]) => {
    return requestClient.post('/system/images/batch-delete-files', filePaths);
  },
};
