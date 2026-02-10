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
};
