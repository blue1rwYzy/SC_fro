import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      nitroMock: false, // 禁用 mock 服务
    },
    vite: {
      optimizeDeps: {
        force: true, // 强制预构建依赖
      },
      server: {
        host: '0.0.0.0', // 允许外部访问
        allowedHosts: [
          '3ad89a7c.r6.cpolar.top',
          '.cpolar.top', // 允许所有 cpolar 子域名
          'localhost',
          '127.0.0.1',
        ],
        hmr: {
          clientPort: 443, // 使用 HTTPS 端口，适配内网穿透
        },
        fs: {
          strict: false, // 允许访问工作区外的文件
        },
        middlewareMode: false,
        proxy: {
          // 模型管理 - 业务服务 (8001)
          '/api/system/models': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 图片数据库管理 - 业务服务 (8001)
          '/api/system/images/database': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          '/api/system/images/upload': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 上传压缩包 - 业务服务 (8001)
          '/api/system/images/upload-zip': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          '/api/system/images/batch-delete': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 删除单个文件 - 业务服务 (8001)
          '/api/system/images/file': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 批量删除文件 - 业务服务 (8001)
          '/api/system/images/batch-delete-files': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 删除单张图片 - 业务服务 (8001)
          '^/api/system/images/\\d+$': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 其他图片库请求（选择图片等）- 推理服务 (8002)
          '/api/system/images': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8002',
            ws: true,
          },
          // 视频数据库管理 - 业务服务 (8001)
          '/api/system/videos': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 推理服务 (8002)
          '/api/system/inference': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8002',
            ws: true,
          },
          // 车辆追踪服务 (8003)
          '/api/system/tracking': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8003',
            ws: true,
          },
          // 静态文件 - 图片数据库图片 (8001)
          '/api/system/uploads/images': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 静态文件 - 推理结果图片 (8002)
          '/api/system/uploads/results': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8002',
            ws: true,
          },
          // 静态文件 - 追踪结果视频 (8003)
          '/api/system/uploads/vid_results': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8003',
            ws: true,
          },
          // 静态文件 - 视频数据库视频 (8001)
          '/api/system/uploads/videos': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
          // 静态文件 - YOLO 推理结果图片 (8002)
          '/api/system/predict-results': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/system/, ''),
            target: 'http://localhost:8002',
            ws: true,
          },
          // 其他 API 使用业务服务 (8001)
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://localhost:8001',
            ws: true,
          },
        },
      },
    },
  };
});
