/**
 * 视频数据库管理 API
 */
import { requestClient } from '#/api/request';

/**
 * 视频文件信息接口
 */
export interface VideoFile {
  id: string;
  filename: string;
  path: string;
  fullPath: string;
  relativePath: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  uploadedAt: string;
  isFolder: boolean;
  children?: VideoFile[];
}

export const videoDatabaseApi = {
  /**
   * 获取视频数据库树形结构
   */
  getVideoDatabase: (folder?: string) =>
    requestClient.get<VideoFile[]>('/system/videos/database', {
      params: { folder },
    }),

  /**
   * 删除单个视频文件
   */
  deleteVideo: (filePath: string) =>
    requestClient.delete<void>('/system/videos/file', {
      params: { file_path: filePath },
    }),

  /**
   * 批量删除视频文件
   */
  batchDeleteVideos: (filePaths: string[]) =>
    requestClient.post<{
      deleted: number;
      failed: number;
      errors: string[];
    }>('/system/videos/batch-delete-files', filePaths),

  /**
   * 上传单个视频到数据库
   */
  uploadVideo: (formData: FormData) =>
    requestClient.post<{
      filename: string;
      path: string;
      folder: string;
    }>('/system/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * 上传视频压缩包到数据库
   */
  uploadVideoZip: (formData: FormData) =>
    requestClient.post<{
      extracted_count: number;
      folder: string;
    }>('/system/videos/upload-zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * 获取推理结果视频数据库
   */
  getVideoResultsDatabase: () =>
    requestClient.get<VideoFile[]>('/system/videos/results/database'),

  /**
   * 根据原视频路径查找对应的推理结果视频
   */
  findResultVideo: (originalVideoPath: string) =>
    requestClient.get<VideoFile | VideoFile[] | null>('/system/videos/find-result', {
      params: { original_video_path: originalVideoPath },
    }),
};
