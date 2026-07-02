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
const PORT = 51031;

// API 代理中间件 - 根据路径动态路由
app.use('/api/system', (req, res, next) => {
  // 车辆追踪服务相关请求 -> 51034
  if (req.path.startsWith('/tracking') ||
      req.path.startsWith('/uploads/vid_results') ||
      req.path.startsWith('/uploads/tracking_analysis') ||
      req.path.startsWith('/uploads/videos')) {
    const proxy = createProxyMiddleware({
      target: 'http://localhost:51034',
      pathRewrite: { '^/api/system': '' },
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy 51034] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error 51034] ${req.url}:`, err.message);
      }
    });
    return proxy(req, res, next);
  }

  // 推理服务相关请求 -> 51033
  if (req.path.startsWith('/inference') ||
      req.path.startsWith('/uploads/results') ||  // 推理结果图片
      req.path.startsWith('/predict-results')) {
    const proxy = createProxyMiddleware({
      target: 'http://localhost:51033',
      pathRewrite: { '^/api/system': '' },
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy 51033] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error 51033] ${req.url}:`, err.message);
      }
    });
    return proxy(req, res, next);
  }

  // 业务服务相关请求（模型、图片数据库管理、视频数据库管理、静态文件）-> 8001
  if (req.path.startsWith('/models') ||
      req.path.startsWith('/images') ||
      req.path.startsWith('/videos') ||
      req.path.startsWith('/uploads/images') ||
      req.path.startsWith('/uploads/videos') ||
      req.path.startsWith('/uploads/vid_results')) {  // 图片和视频数据库静态文件
    const proxy = createProxyMiddleware({
      target: 'http://localhost:51032',
      pathRewrite: { '^/api/system': '' },
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy 51032] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error 51032] ${req.url}:`, err.message);
      }
    });
    return proxy(req, res, next);
  }

  next();
});

// 推理服务直接路径 /api/inference -> 51033
app.use('/api/inference', createProxyMiddleware({
  target: 'http://localhost:51033',
  pathRewrite: { '^/': '/inference/' },
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy 51033 Inference] ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error 51033 Inference] ${req.url}:`, err.message);
  }
}));

// 其他 API 请求 -> 51032
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:51032',
  pathRewrite: { '^/api': '' },
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy 51032 Default] ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error 51032 Default] ${req.url}:`, err.message);
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

// 用 http.request 做 WebSocket upgrade 代理（标准方式，无需手动构造帧头）
import http from 'http';

function tunnelWs(req, socket, head, targetPort, rewritePrefix) {
  const targetPath = req.url.replace(rewritePrefix, '');
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${targetPort}` },
  };
  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // 把握手响应原样写回客户端
    const resLines = [
      `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}`,
    ];
    for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
      resLines.push(`${proxyRes.rawHeaders[i]}: ${proxyRes.rawHeaders[i + 1]}`);
    }
    resLines.push('', '');
    socket.write(resLines.join('\r\n'));
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
    proxySocket.on('error', () => socket.destroy());
    socket.on('error', () => proxySocket.destroy());
  });
  proxyReq.on('error', (err) => {
    console.error(`[WS Proxy Error] port=${targetPort}:`, err.message);
    socket.destroy();
  });
  proxyReq.end();
  if (head && head.length) proxyReq.write(head);
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 生产服务器启动成功！');
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`📍 网络访问: http://192.168.x.x:${PORT}`);
  console.log(`📍 内网穿透: 通过域名访问\n`);
});

// 处理 WebSocket upgrade 请求
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api/system/ws/inference/')) {
    tunnelWs(req, socket, head, 51033, '/api/system');
  } else if (req.url.startsWith('/api/system/tracking/ws/')) {
    tunnelWs(req, socket, head, 51034, '/api/system');
  }
});
