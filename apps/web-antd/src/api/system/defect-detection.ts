/**
 * 路面缺陷检测 API
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
  hasInferenceResult?: boolean; // 是否有推理结果
  inferenceResultCount?: number; // 推理结果数量
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
}

/**
 * 严重程度接口
 */
export interface SeverityLevel {
  level: number; // 1-5
  score: number; // 0-100
  level_text: string; // 轻微/较轻/中等/严重/极严重
  level_color: string; // green/blue/orange/red/purple
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
  severity: SeverityLevel; // 严重程度等级
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
   * @param modelType - 模型类型筛选（detection 或 tracking）
   */
  getModels: (modelType?: 'detection' | 'tracking') => {
    return requestClient.get<ModelInfo[]>('/models', {
      params: modelType ? { model_type: modelType } : {},
    });
  },

  /**
   * 获取图片数据库目录树
   */
  getImageDatabase: () => {
    return requestClient.get<ImageDatabaseItem[]>('/system/images/database');
  },

  /**
   * 启动推理任务（统一接口）
   * 支持单张图片、批量图片、压缩包、从图库选择
   */
  startInference: (data: FormData) => {
    return requestClient.post<{
      taskId: string;
      imageCount: number;
      outputDir: string;
    }>('/inference/start', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
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
