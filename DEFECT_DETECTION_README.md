# 高速公路路面缺陷检测系统 - 开发文档

## 📋 已完成功能清单

### ✅ 前端功能 (已完成)

1. **系统管理菜单** ✅
   - 创建了系统管理父菜单
   - 添加了路面缺陷检测子菜单
   - 路由文件: `src/router/routes/modules/system.ts`

2. **多语言支持** ✅
   - 中文翻译: `src/locales/langs/zh-CN/page.json`
   - 英文翻译: `src/locales/langs/en-US/page.json`

3. **API 接口定义** ✅
   - 文件位置: `src/api/system/defect-detection.ts`
   - 包含所有后端接口调用封装

4. **图片数据库选择组件** ✅
   - 文件: `src/views/system/defect-detection/components/ImageDatabaseModal.vue`
   - 功能: 树形文件夹浏览、图片预览、单选/多选

5. **主推理页面** ✅
   - 文件: `src/views/system/defect-detection/index.vue`
   - 功能:
     - 模型选择下拉框
     - 三种图片上传方式
     - 推理状态显示
     - 结果图片查看器（支持翻页）
     - 检测详情表格
     - 批量下载功能

---

## 🔧 后端需要实现的接口

### 1. 模型管理接口

#### `GET /api/system/models`
获取可用的 YOLO 模型列表

**响应示例:**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "yolo11s.pt",
      "path": "/models/yolo11s.pt",
      "version": "v1.0",
      "description": "高速公路缺陷检测模型",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. 图片数据库接口

#### `GET /api/system/images/database`
获取图片数据库的目录树结构

**响应示例:**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "filename": "road_crack_001.jpg",
      "path": "/images/cracks/road_crack_001.jpg",
      "folder": "/cracks",
      "size": 1024000,
      "uploadedAt": "2024-01-01T00:00:00Z",
      "isFolder": false
    }
  ]
}
```

---

### 3. 推理接口

#### `POST /api/system/inference/single`
单张图片推理（立即返回结果）

**请求参数 (FormData):**
- `modelId`: 模型 ID
- `image`: 图片文件

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "taskId": "task_123",
    "originalImage": "/uploads/original/image.jpg",
    "resultImage": "/uploads/results/image_result.jpg",
    "detections": [
      {
        "bbox": [100, 200, 300, 400],
        "class": "crack",
        "confidence": 0.92,
        "severity": "high"
      }
    ],
    "confidence": 0.92,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/system/inference/batch`
批量图片推理（返回任务 ID，异步处理）

**请求参数 (FormData):**
- `modelId`: 模型 ID
- `archive`: 压缩包文件 (.zip)

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "taskId": "task_456",
    "modelId": 1,
    "imageCount": 10,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/system/inference/from-database`
从数据库选择图片推理

**请求参数 (JSON):**
```json
{
  "modelId": 1,
  "imageIds": [1, 2, 3]
}
```

**响应示例:** 同 batch 接口

---

### 4. 任务状态接口

#### `GET /api/system/inference/task/:taskId`
获取推理任务状态

**响应示例:**
```json
{
  "code": 0,
  "data": {
    "taskId": "task_456",
    "status": "completed",
    "imageCount": 10,
    "completedAt": "2024-01-01T00:05:00Z"
  }
}
```

---

### 5. 结果查询接口

#### `GET /api/system/inference/results/:taskId`
获取推理结果列表

**响应示例:**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "originalImage": "/uploads/original/img1.jpg",
      "resultImage": "/uploads/results/img1_result.jpg",
      "detections": [...],
      "confidence": 0.89
    }
  ]
}
```

---

### 6. 下载接口

#### `GET /api/system/inference/download/:taskId`
下载推理结果压缩包

**响应:** 返回 ZIP 文件流

---

## 🗄️ 数据库表结构

### 1. models (模型表)
```sql
CREATE TABLE models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,          -- 模型文件名
  path VARCHAR(255) NOT NULL,          -- 文件路径
  version VARCHAR(50),                 -- 版本号
  description TEXT,                    -- 描述
  created_at TIMESTAMP DEFAULT NOW()
);

-- 插入示例数据
INSERT INTO models (name, path, version, description) VALUES
('yolo11s.pt', '/models/yolo11s.pt', 'v1.0', '高速公路缺陷检测模型'),
('yolo11m.pt', '/models/yolo11m.pt', 'v1.0', '中等精度模型'),
('yolo11l.pt', '/models/yolo11l.pt', 'v1.0', '高精度模型');
```

### 2. image_database (图片库表)
```sql
CREATE TABLE image_database (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,      -- 文件名
  path VARCHAR(500) NOT NULL,          -- 存储路径
  folder VARCHAR(255),                 -- 所属文件夹
  size BIGINT,                         -- 文件大小(字节)
  is_folder BOOLEAN DEFAULT FALSE,     -- 是否是文件夹
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_folder ON image_database(folder);
```

### 3. inference_tasks (推理任务表)
```sql
CREATE TABLE inference_tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(100) UNIQUE NOT NULL,
  model_id INT REFERENCES models(id),
  image_count INT,
  status VARCHAR(50) NOT NULL,         -- pending/processing/completed/failed
  result_path VARCHAR(500),            -- 结果压缩包路径
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_task_id ON inference_tasks(task_id);
CREATE INDEX idx_status ON inference_tasks(status);
```

### 4. inference_results (推理结果表)
```sql
CREATE TABLE inference_results (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(100) REFERENCES inference_tasks(task_id),
  original_image VARCHAR(500) NOT NULL,
  result_image VARCHAR(500) NOT NULL,
  detections JSONB,                    -- 检测结果 JSON
  confidence FLOAT,                    -- 平均置信度
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_result_task_id ON inference_results(task_id);

-- detections 字段示例:
-- [
--   {
--     "bbox": [100, 200, 300, 400],
--     "class": "crack",
--     "confidence": 0.92,
--     "severity": "high"
--   }
-- ]
```

---

## 🐍 后端实现示例 (Python + FastAPI)

### 项目结构
```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   └── system.py           # 系统管理接口
│   ├── core/
│   │   ├── config.py           # 配置
│   │   └── database.py         # 数据库连接
│   ├── models/
│   │   └── database.py         # ORM 模型
│   ├── services/
│   │   └── inference.py        # YOLO 推理服务
│   └── main.py                 # FastAPI 入口
├── models/                     # YOLO 模型存储
│   └── yolo11s.pt
├── uploads/                    # 上传文件
│   ├── original/
│   └── results/
└── requirements.txt
```

### 核心代码示例

#### 1. 推理服务 (`services/inference.py`)
```python
from ultralytics import YOLO
import cv2
import os

class InferenceService:
    def __init__(self):
        self.models = {}

    def load_model(self, model_path: str):
        """加载 YOLO 模型"""
        if model_path not in self.models:
            self.models[model_path] = YOLO(model_path)
        return self.models[model_path]

    def predict_single(self, model_path: str, image_path: str, output_path: str):
        """单张图片推理"""
        model = self.load_model(model_path)

        # 推理
        results = model(image_path)

        # 绘制结果
        annotated_image = results[0].plot()
        cv2.imwrite(output_path, annotated_image)

        # 提取检测信息
        detections = []
        for box in results[0].boxes:
            detections.append({
                "bbox": box.xyxy[0].tolist(),
                "class": results[0].names[int(box.cls[0])],
                "confidence": float(box.conf[0]),
            })

        return {
            "detections": detections,
            "confidence": float(results[0].boxes.conf.mean()) if len(detections) > 0 else 0
        }
```

#### 2. API 路由 (`api/system.py`)
```python
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse
import shutil
import uuid

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/models")
async def get_models():
    """获取模型列表"""
    # 从数据库查询
    models = db.query(Model).all()
    return {"code": 0, "data": models}

@router.post("/inference/single")
async def inference_single(
    modelId: int = Form(...),
    image: UploadFile = File(...)
):
    """单张图片推理"""
    # 保存上传的图片
    original_path = f"/uploads/original/{uuid.uuid4()}_{image.filename}"
    with open(original_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    # 获取模型
    model = db.query(Model).filter(Model.id == modelId).first()

    # 推理
    result_path = f"/uploads/results/{uuid.uuid4()}_result.jpg"
    inference_service = InferenceService()
    result = inference_service.predict_single(
        model.path,
        original_path,
        result_path
    )

    # 保存结果到数据库
    db_result = InferenceResult(
        task_id=f"task_{uuid.uuid4()}",
        original_image=original_path,
        result_image=result_path,
        detections=result["detections"],
        confidence=result["confidence"]
    )
    db.add(db_result)
    db.commit()

    return {"code": 0, "data": db_result}

@router.post("/inference/batch")
async def inference_batch(
    modelId: int = Form(...),
    archive: UploadFile = File(...)
):
    """批量推理"""
    task_id = f"task_{uuid.uuid4()}"

    # 创建任务
    task = InferenceTask(
        task_id=task_id,
        model_id=modelId,
        status="pending"
    )
    db.add(task)
    db.commit()

    # 异步处理（使用 Celery 或后台任务）
    process_batch_inference.delay(task_id, archive, modelId)

    return {"code": 0, "data": task}
```

---

## 🚀 部署步骤

### 1. 安装依赖
```bash
# Python 后端
pip install fastapi uvicorn ultralytics opencv-python sqlalchemy psycopg2

# 数据库
# 使用 PostgreSQL 或 MySQL
```

### 2. 配置环境变量
```bash
# .env
DATABASE_URL=postgresql://user:password@localhost/defect_detection
MODEL_PATH=/path/to/models
UPLOAD_PATH=/path/to/uploads
API_URL=http://localhost:8000
```

### 3. 初始化数据库
```bash
python scripts/init_db.py
```

### 4. 启动后端
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. 启动前端
```bash
cd apps/web-antd
pnpm dev
```

---

## 📝 使用说明

### 前端使用流程
1. 打开系统管理 -> 路面缺陷检测推理
2. 选择要使用的 YOLO 模型
3. 上传图片（三种方式任选）:
   - 上传单张图片
   - 上传压缩包
   - 从图片库选择
4. 点击"开始推理"
5. 查看推理结果
6. 下载结果（批量时）

### 后端任务流程
1. 接收推理请求
2. 加载 YOLO 模型
3. 对图片进行推理
4. 绘制检测框
5. 保存结果图片
6. 返回检测信息

---

## 🎯 功能扩展建议

1. **实时视频流推理**
   - 集成 WebRTC 实时推理
   - 添加摄像头管理模块

2. **模型训练管理**
   - 在线标注工具
   - 模型训练进度监控

3. **统计报表**
   - 缺陷统计图表
   - 趋势分析

4. **告警系统**
   - 严重缺陷实时告警
   - 邮件/短信通知

---

## 📞 技术支持

如遇到问题，请检查：
1. 后端 API 是否正常运行
2. 数据库是否正确配置
3. YOLO 模型文件是否存在
4. 浏览器控制台是否有错误

---

**开发完成时间:** 2024-02-07
**前端框架:** Vue 3 + Vben Admin + Ant Design Vue
**后端推荐:** Python + FastAPI + YOLO11
