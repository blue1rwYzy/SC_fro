/**
 * 推理结果管理 API
 */
import { requestClient } from '#/api/request';

/**
 * 推理结果接口
 */
export interface InferenceResultDetail {
  id: number;
  taskId: string;
  batchName: string;
  originalImage: string;
  resultImage: string;
  originalImageRel: string;
  resultImageRel: string;
  detections: any[];
  detectionCount: number;
  avgConfidence: number;
  severityLevel: number;
  severityScore: number;
  severityText: string;
  severityColor: string;
  imageWidth: number;
  imageHeight: number;
  processingTime: number;
  createdAt: string;
}

/**
 * 批次信息接口
 */
export interface BatchInfo {
  batchName: string;
  imageCount: number;
  avgConfidence: number;
  avgSeverityScore: number;
  severityDistribution: Record<string, number>;
  firstCreated: string;
  lastCreated: string;
}

/**
 * 推理结果 API
 */
export const inferenceResultsApi = {
  /**
   * 检查图片是否有推理结果
   */
  checkImageResult: (imagePath: string) =>
    requestClient.get<{
      hasResult: boolean;
      count: number;
      results: InferenceResultDetail[];
    }>('/inference-results/check-image', {
      params: { image_path: imagePath },
    }),

  /**
   * 获取所有推理批次
   */
  getBatches: () =>
    requestClient.get<{
      total: number;
      batches: BatchInfo[];
    }>('/inference-results/batches'),

  /**
   * 获取指定批次的推理结果
   */
  getBatchResults: (batchName: string) =>
    requestClient.get<{
      batchName: string;
      total: number;
      results: InferenceResultDetail[];
    }>(`/inference-results/batch/${batchName}`),

  /**
   * 删除推理结果
   */
  deleteResult: (resultId: number, deleteFiles = false) =>
    requestClient.delete(`/inference-results/${resultId}`, {
      params: { delete_files: deleteFiles },
    }),

  /**
   * 批量删除推理结果（按批次）
   */
  batchDeleteByBatches: (batchNames: string[], deleteFiles = false) =>
    requestClient.post<{
      deleted_records: number;
      deleted_files: number;
      total_batches: number;
      failed_batches: Array<{ batch_name: string; reason: string }>;
    }>('/inference-results/batch-delete', {
      batch_names: batchNames,
      delete_files: deleteFiles,
    }),

  /**
   * 批量查询所有图片的推理结果状态
   */
  checkAllImages: () =>
    requestClient.get<{
      total: number;
      imageMap: Record<string, boolean>;
    }>('/inference-results/check-all'),
};
