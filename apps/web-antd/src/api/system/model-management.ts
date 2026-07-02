/**
 * 模型管理 API
 */
import { requestClient } from '#/api/request';

export interface ModelInfo {
  id: number;
  name: string;
  path: string;
  version: string;
  description?: string;
  model_type: 'detection' | 'tracking';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateModelRequest {
  name: string;
  version?: string;
  description?: string;
  model_type: 'detection' | 'tracking';
  model_file?: File;
  model_path?: string;
}

export interface UpdateModelRequest {
  name?: string;
  version?: string;
  description?: string;
  model_type?: 'detection' | 'tracking';
}

export const modelManagementApi = {
  /**
   * 获取模型列表
   */
  getModels: (model_type?: 'detection' | 'tracking') =>
    requestClient.get<ModelInfo[]>('/models', {
      params: { model_type },
    }),

  /**
   * 获取单个模型
   */
  getModel: (id: number) =>
    requestClient.get<ModelInfo>(`/models/${id}`),

  /**
   * 创建模型
   */
  createModel: (data: FormData) =>
    requestClient.post<ModelInfo>('/models', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * 更新模型
   */
  updateModel: (id: number, data: FormData) =>
    requestClient.put<ModelInfo>(`/models/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * 删除模型
   */
  deleteModel: (id: number) =>
    requestClient.delete<void>(`/models/${id}`),
};
