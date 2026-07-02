# 图像数据库管理模块

## 功能概述

新增了一个完整的图像数据库管理子模块，提供以下功能：

### 1. 图片浏览
- 左侧文件夹树形结构展示
- 右侧网格布局展示图片
- 支持图片预览（点击图片查看大图）
- 显示图片详细信息（文件名、大小、路径、上传时间）

### 2. 图片上传
- **单张图片上传**：支持上传单张图片到当前文件夹
- **压缩包上传**（待实现）：支持上传 ZIP 压缩包批量导入图片

### 3. 图片删除
- **单张删除**：点击图片下方的"删除"按钮
- **批量删除**：选中多张图片后，点击"删除选中"按钮

### 4. 图片选择
- 支持单选和多选
- 全选功能
- 显示已选数量

## 技术实现

### 前端文件
- 路由配置：`apps/web-antd/src/router/routes/modules/system.ts`
- 页面组件：`apps/web-antd/src/views/system/image-database/index.vue`
- API 定义：`apps/web-antd/src/api/system/defect-detection.ts`
- 国际化：`apps/web-antd/src/locales/langs/zh-CN/page.json`

### 后端接口

#### 业务服务 (8001端口)

1. **获取图片列表**
   ```
   GET /images/database
   ```

2. **上传图片**
   ```
   POST /images/upload
   FormData: { file, folder }
   ```

3. **删除单张图片**
   ```
   DELETE /images/{image_id}
   ```

4. **批量删除图片**
   ```
   POST /images/batch-delete
   Body: [imageId1, imageId2, ...]
   ```

### 代理配置

在生产环境的 `server.js` 中：
- `/api/system/images/*` → 转发到业务服务 (8001)
- `/api/system/uploads/*` → 转发到推理服务 (8002) 用于访问图片文件

## 使用说明

### 开发环境启动

```bash
cd apps/web-antd
pnpm dev
```

访问：http://localhost:5555

### 生产环境启动

1. 构建前端：
   ```bash
   cd apps/web-antd
   pnpm build
   ```

2. 启动代理服务器：
   ```bash
   node server.js
   ```

3. 访问：http://localhost:5666

### 菜单访问

登录后，点击左侧菜单：
- **系统功能** → **图像数据库管理**

## 数据存储

- 图片文件存储路径：`G:\ShuangChuang\ShuangC\backend\uploads\images`
- 数据库记录：存储在 SQLite 数据库的 `image_database` 表中

## 待实现功能

1. **压缩包上传**
   - 解压 ZIP 文件
   - 批量导入图片到数据库

2. **文件夹管理**
   - 创建新文件夹
   - 重命名文件夹
   - 删除文件夹

3. **图片移动**
   - 将图片移动到其他文件夹

4. **图片搜索**
   - 按文件名搜索
   - 按上传日期筛选

5. **批量操作增强**
   - 批量移动
   - 批量下载

## 注意事项

1. 删除图片时会同时删除：
   - 文件系统中的图片文件
   - 数据库中的记录

2. 上传限制：
   - 仅支持图片格式（image/*）
   - 压缩包仅支持 .zip 格式

3. 网格布局自适应：
   - 每列最小宽度 200px
   - 自动计算列数
   - 支持垂直滚动
