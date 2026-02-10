/**
 * 生产环境代理服务器
 * 用于处理 API 代理和静态文件服务
 */
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5666;

// API 代理中间件 - 根据路径动态路由
app.use('/api/system', (req, res, next) => {
  // 车辆追踪服务相关请求 -> 8003
  if (req.path.startsWith('/tracking') ||
      req.path.startsWith('/uploads/vid_results') ||
      req.path.startsWith('/uploads/videos')) {
    const proxy = createProxyMiddleware({
      target: 'http://localhost:8003',
      pathRewrite: { '^/api/system': '' },
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy 8003] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error 8003] ${req.url}:`, err.message);
      }
    });
    return proxy(req, res, next);
  }

  // 推理服务相关请求 -> 8002
  if (req.path.startsWith('/inference') ||
      req.path.startsWith('/uploads/results') ||  // 推理结果图片
      req.path.startsWith('/predict-results')) {
    const proxy = createProxyMiddleware({
      target: 'http://localhost:8002',
      pathRewrite: { '^/api/system': '' },
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy 8002] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error 8002] ${req.url}:`, err.message);
      }
    });
    return proxy(req, res, next);
  }

  // 业务服务相关请求（模型、图片数据库管理、视频数据库管理、静态文件）-> 8001
  if (req.path.startsWith('/models') ||
      req.path.startsWith('/images') ||
      req.path.startsWith('/videos') ||
      req.path.startsWith('/uploads/images') ||
      req.path.startsWith('/uploads/videos')) {  // 图片和视频数据库静态文件
    const proxy = createProxyMiddleware({
      target: 'http://localhost:8001',
      pathRewrite: { '^/api/system': '' },
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy 8001] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error 8001] ${req.url}:`, err.message);
      }
    });
    return proxy(req, res, next);
  }

  next();
});

// 其他 API 请求 -> 8001
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8001',
  pathRewrite: { '^/api': '' },
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy 8001 Default] ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error Default] ${req.url}:`, err.message);
  }
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 路由支持 - 所有路由都返回 index.html
app.use((req, res, next) => {
  // 如果请求的文件不存在，返回 index.html
  if (!req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 生产服务器启动成功！');
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`📍 网络访问: http://192.168.x.x:${PORT}`);
  console.log(`📍 内网穿透: 通过 cpolar 域名访问\n`);
});
