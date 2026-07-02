<template>
  <div class="defect-detection-page p-4">
    <Card title="路面缺陷检测" :bordered="false">
      <!-- 模型选择 -->
      <div class="mb-4">
        <div class="mb-2 font-medium">选择模型（仅显示检测模型）</div>
        <Select
          v-model:value="selectedModelId"
          placeholder="选择检测模型"
          style="width: 350px"
          :loading="modelsLoading"
        >
          <SelectOption v-for="model in models" :key="model.id" :value="model.id">
            {{ model.name }} ({{ model.version }})
          </SelectOption>
        </Select>
        <span v-if="models.length === 0 && !modelsLoading" class="ml-2 text-sm text-gray-500">
          暂无可用的检测模型
        </span>
      </div>

      <Divider />

      <!-- 图片上传 -->
      <div class="mb-4">
        <div class="mb-2 font-medium">上传图片</div>
        <Space>
          <Upload
            v-model:file-list="singleFileList"
            :before-upload="handleBeforeSingleUpload"
            :max-count="1"
            accept="image/*"
            :show-upload-list="false"
          >
            <Button>上传单张图片</Button>
          </Upload>

          <Upload
            v-model:file-list="folderFileList"
            :before-upload="handleBeforeFolderUpload"
            :max-count="1"
            accept=".zip,.rar,.7z"
            :show-upload-list="false"
          >
            <Button>上传图片压缩包</Button>
          </Upload>

          <Button @click="showDatabaseModal = true">
            从图片库选择
          </Button>

          <Button>
            连接摄像头
          </Button>
        </Space>

        <!-- 已选择文件 -->
        <div v-if="uploadedFiles.length > 0" class="mt-2">
          <Tag
            v-for="(file, index) in uploadedFiles"
            :key="index"
            closable
            @close="removeFile(index)"
          >
            {{ file.name }}
          </Tag>
        </div>

        <!-- 上传图片预览 -->
        <div class="mt-4">
          <Card :bordered="true" size="small" class="preview-card">
            <template #title>
              <span class="text-sm">原图预览</span>
            </template>
            <!-- 单张图片预览 -->
            <div v-if="previewImageUrl" class="preview-image-container">
              <img
                :src="previewImageUrl"
                :alt="uploadedFiles[0]?.name"
                class="preview-image"
              />
            </div>
            <!-- 多张图片预览 -->
            <div v-else-if="selectedDatabaseImages.length > 0" class="multi-preview-content">
              <div class="mb-2 text-sm text-gray-600">
                已选择 {{ selectedDatabaseImages.length }} 张图片
              </div>
              <div class="preview-grid">
                <div
                  v-for="image in selectedDatabaseImages"
                  :key="image.id"
                  class="preview-grid-item"
                >
                  <img
                    :src="getImageUrl(image.path)"
                    :alt="image.filename"
                    :title="image.filename"
                    class="preview-grid-image"
                  />
                </div>
              </div>
            </div>
            <!-- 空状态 -->
            <Empty v-else description="请上传图片或从图片库选择" class="empty-preview" />
          </Card>
        </div>
      </div>

      <Divider />

      <!-- 推理参数设置 -->
      <div class="mb-4">
        <div class="mb-2 font-medium">推理参数</div>
        <Space direction="vertical" size="small">
          <div class="param-item">
            <span class="param-label">置信度阈值:</span>
            <InputNumber
              v-model:value="confThreshold"
              :min="0.1"
              :max="0.95"
              :step="0.05"
              :precision="2"
              style="width: 120px"
            />
            <span class="param-hint">范围: 0.1 ~ 0.95</span>
          </div>
          <div class="param-description">
            值越高结果越精确但可能漏检，值越低检测越全面但可能误检
          </div>
        </Space>
      </div>

      <Divider />

      <!-- 开始推理 -->
      <div class="mb-4">
        <Button
          type="primary"
          size="large"
          :loading="inferenceStatus === 'processing'"
          :disabled="!canStartInference"
          @click="handleStartInference"
        >
          开始推理
        </Button>
        <span class="ml-4 text-gray-600">{{ statusText }}</span>

        <!-- 推理进度条 -->
        <div v-if="inferenceStatus === 'processing'" class="mt-4">
          <Progress
            :percent="inferenceProgress"
            :status="inferenceProgress === 100 ? 'success' : 'active'"
          />
          <div class="text-sm text-gray-600 mt-2">
            {{ inferenceMessage }}
          </div>
        </div>
      </div>

      <Divider />

      <!-- 推理结果 -->
      <div class="results-section">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">推理结果</h3>
          <Space v-if="inferenceStatus === 'completed' && currentResult">
            <span class="text-sm text-gray-600">
              当前图片: {{ currentIndex + 1 }} / {{ inferenceResults.length }}
            </span>
            <Button
              v-if="inferenceResults.length > 1"
              @click="handleDownloadAll"
            >
              下载结果
            </Button>
          </Space>
        </div>

        <div v-if="inferenceStatus === 'completed' && currentResult">

          <!-- 检测信息 -->
          <div class="mb-4">
            <Descriptions :column="2" size="small" bordered>
              <DescriptionsItem label="原图">
                {{ getFileName(currentResult.originalImage) }}
              </DescriptionsItem>
              <DescriptionsItem label="检测数量">
                <Tag color="blue">{{ currentResult.detections?.length || 0 }} 个目标</Tag>
              </DescriptionsItem>
              <DescriptionsItem label="平均置信度">
                <Tag :color="currentResult.confidence > 0.7 ? 'green' : 'orange'">
                  {{ ((currentResult.confidence || 0) * 100).toFixed(2) }}%
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="严重程度">
                <div class="flex items-center gap-2">
                  <Tag :color="currentResult.severity?.level_color || 'default'">
                    {{ currentResult.severity?.level_text || 'N/A' }}
                  </Tag>
                  <span class="text-sm text-gray-600">
                    (得分: {{ currentResult.severity?.score || 0 }})
                  </span>
                </div>
              </DescriptionsItem>
            </Descriptions>
          </div>

          <!-- 左右布局：左侧结果图，右侧检测详情 -->
          <div class="result-layout">
            <!-- 左侧：结果图片 -->
            <Card :bordered="true" class="result-image-card">
              <div class="result-image-container">
                <img
                  :src="getImageUrl(currentResult.resultImage)"
                  :alt="`Result ${currentIndex + 1}`"
                  class="result-image"
                  @error="handleImageError"
                />
              </div>
            </Card>

            <!-- 右侧：检测详情 -->
            <Card :bordered="true" class="detection-details-card">
              <template #title>
                <span class="font-medium">检测详情</span>
              </template>
              <div v-if="currentResult.detections && currentResult.detections.length > 0">
                <Table
                  :columns="detectionColumns"
                  :data-source="currentResult.detections"
                  :pagination="false"
                  size="small"
                  :row-key="(record, index) => index"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'confidence'">
                      <Progress
                        :percent="Number((record.confidence * 100).toFixed(0))"
                        status="normal"
                        size="small"
                      />
                    </template>
                    <template v-else-if="column.key === 'bbox'">
                      <span class="text-xs text-gray-500">
                        {{ formatBbox(record.bbox) }}
                      </span>
                    </template>
                  </template>
                </Table>
              </div>

              <!-- 无检测结果提示 -->
              <div v-else class="text-center text-gray-500 py-8">
                未检测到缺陷目标
              </div>
            </Card>
          </div>

          <!-- 翻页控制 -->
          <div v-if="inferenceResults.length > 1" class="flex justify-center items-center gap-4 mt-4">
            <Button
              :disabled="currentIndex === 0"
              @click="previousImage"
            >
              上一张
            </Button>
            <span class="text-sm text-gray-600">
              {{ currentIndex + 1 }} / {{ inferenceResults.length }}
            </span>
            <Button
              :disabled="currentIndex === inferenceResults.length - 1"
              @click="nextImage"
            >
              下一张
            </Button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="result-layout">
          <!-- 左侧：结果图片 -->
          <Card :bordered="true" class="result-image-card">
            <div class="result-image-container">
              <Empty description="等待推理结果" />
            </div>
          </Card>

          <!-- 右侧：检测详情 -->
          <Card :bordered="true" class="detection-details-card">
            <template #title>
              <span class="font-medium">检测详情</span>
            </template>
            <div class="text-center text-gray-500 py-8">
              <Empty description="暂无检测数据" />
            </div>
          </Card>
        </div>
      </div>
    </Card>

    <!-- 图片数据库选择弹窗 -->
    <ImageDatabaseModal
      v-model:open="showDatabaseModal"
      :allow-multiple="true"
      @confirm="handleDatabaseConfirm"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Divider,
  Empty,
  InputNumber,
  Progress,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue';
import type { UploadFile } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { $t } from '@vben/locales';

import {
  defectDetectionApi,
  type ImageDatabaseItem,
  type InferenceResult,
  type ModelInfo,
} from '#/api/system/defect-detection';
import ImageDatabaseModal from './components/ImageDatabaseModal.vue';

// 状态
const models = ref<ModelInfo[]>([]);
const modelsLoading = ref(false);
const selectedModelId = ref<number>();
const singleFileList = ref<UploadFile[]>([]);
const folderFileList = ref<UploadFile[]>([]);
const uploadedFiles = ref<File[]>([]);
const selectedDatabaseImages = ref<ImageDatabaseItem[]>([]);
const inferenceStatus = ref<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
const inferenceResults = ref<InferenceResult[]>([]);
const currentIndex = ref(0);
const showDatabaseModal = ref(false);
const currentTaskId = ref<string>('');
const inferenceProgress = ref(0);
const inferenceMessage = ref('');

// 推理参数
const confThreshold = ref<number>(0.45); // 置信度阈值，默认 0.45

// 检测结果表格列
const detectionColumns = [
  { title: '类型', dataIndex: 'class', key: 'class' },
  { title: '置信度', dataIndex: 'confidence', key: 'confidence', width: 200 },
  { title: '位置', dataIndex: 'bbox', key: 'bbox' },
];

// 计算属性
const canStartInference = computed(() => {
  return (
    selectedModelId.value &&
    (uploadedFiles.value.length > 0 || selectedDatabaseImages.value.length > 0) &&
    inferenceStatus.value !== 'processing'
  );
});

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    idle: '待处理',
    uploading: '上传中',
    processing: '推理中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[inferenceStatus.value] || '未知状态';
});

const currentResult = computed(() => {
  return inferenceResults.value[currentIndex.value];
});

// 上传图片预览URL
const previewImageUrl = computed(() => {
  if (uploadedFiles.value.length > 0) {
    const file = uploadedFiles.value[0];
    // 只有图片类型才显示预览
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
  }
  return '';
});

// 获取图片 URL（支持 MinIO 路径格式）
const getImageUrl = (path: string) => {
  if (!path) return '';

  // 1. 处理 MinIO 格式: minio://images/xxx 或 minio://img-results/xxx
  if (path.startsWith('minio://')) {
    const minioPath = path.replace('minio://', '');

    // 提取 bucket 和 object_name
    const firstSlash = minioPath.indexOf('/');
    if (firstSlash > 0) {
      const bucket = minioPath.substring(0, firstSlash);
      const objectName = minioPath.substring(firstSlash + 1);

      // 根据 bucket 名称构建正确的请求路径
      // 图片和推理结果都请求 8001 (business-service)
      if (bucket === 'images') {
        return `/api/uploads/images/${objectName}`;
      } else if (bucket === 'img-results') {
        return `/api/uploads/img_results/${objectName}`;
      } else if (bucket === 'videos') {
        return `/api/uploads/videos/${objectName}`;
      } else if (bucket === 'vid-results') {
        return `/api/uploads/vid_results/${objectName}`;
      }
    }
  }

  // 2. 处理完整的文件系统路径 (如 G:\...) - 兼容旧格式
  if (path.includes('\\')) {
    // Windows 路径格式
    const match = path.match(/uploads[\\/]img_results[\\/](.+)/);
    if (match) {
      return `/api/uploads/img_results/${match[1].replace(/\\/g, '/')}`;
    }
    // 尝试匹配 uploads/images
    const matchImages = path.match(/uploads[\\/]images[\\/](.+)/);
    if (matchImages) {
      return `/api/uploads/images/${matchImages[1].replace(/\\/g, '/')}`;
    }
  }

  // 3. 处理已经是 HTTP 路径的情况
  if (path.startsWith('/uploads')) {
    return `/api${path}`;
  }

  // 4. 处理相对路径
  if (path.startsWith('predict') || path.includes('/predict')) {
    // 推理结果相对路径: predict0/xxx.jpg
    return `/api/uploads/img_results/${path}`;
  }

  // 5. 默认返回原路径
  return path;
};

// 获取文件名
const getFileName = (path: string) => {
  if (!path) return '';
  return path.split('/').pop() || path;
};

// 格式化边界框
const formatBbox = (bbox: number[]) => {
  if (!bbox || bbox.length < 4) return 'N/A';
  return `[${bbox.map(v => Math.round(v)).join(', ')}]`;
};


// 图片加载错误处理
const handleImageError = (e: Event) => {
  console.error('图片加载失败:', e);
};

// 加载模型列表
const loadModels = async () => {
  modelsLoading.value = true;
  try {
    // 只加载检测模型
    models.value = await defectDetectionApi.getModels('detection');
    if (models.value.length > 0) {
      selectedModelId.value = models.value[0].id;
    } else {
      message.warning('暂无可用的检测模型，请先添加检测模型');
    }
  } catch (error) {
    message.error('加载模型列表失败');
  } finally {
    modelsLoading.value = false;
  }
};

// 单张图片上传前处理
const handleBeforeSingleUpload = (file: File) => {
  uploadedFiles.value = [file];
  selectedDatabaseImages.value = [];
  inferenceResults.value = [];
  inferenceStatus.value = 'idle';
  message.success(`已选择图片: ${file.name}`);
  return false;
};

// 文件夹上传前处理
const handleBeforeFolderUpload = (file: File) => {
  uploadedFiles.value = [file];
  selectedDatabaseImages.value = [];
  inferenceResults.value = [];
  inferenceStatus.value = 'idle';
  message.success(`已选择压缩包: ${file.name}`);
  return false;
};

// 移除文件
const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1);
  inferenceResults.value = [];
  inferenceStatus.value = 'idle';
};

// 数据库选择确认
const handleDatabaseConfirm = (items: ImageDatabaseItem[]) => {
  selectedDatabaseImages.value = items;
  uploadedFiles.value = [];
  inferenceResults.value = [];
  inferenceStatus.value = 'idle';
  message.success(`已选择 ${items.length} 张图片`);
};

// WebSocket 连接
let ws: WebSocket | null = null;

// 开始推理
const handleStartInference = async () => {
  if (!selectedModelId.value) {
    message.warning('请选择模型');
    return;
  }

  // 先关闭之前的 WebSocket
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    console.log('⚠️ 关闭旧的 WebSocket 连接');
    ws.close();
    ws = null;
  }

  inferenceStatus.value = 'processing';
  currentIndex.value = 0;
  inferenceResults.value = [];
  inferenceProgress.value = 0;
  inferenceMessage.value = '准备推理...';

  try {
    // 构建 FormData
    const formData = new FormData();
    formData.append('model_id', String(selectedModelId.value));
    formData.append('conf', String(confThreshold.value)); // 使用用户设定的置信度
    formData.append('imgsz', '1280');

    // 处理不同输入类型
    if (uploadedFiles.value.length > 0) {
      // 上传文件
      for (const file of uploadedFiles.value) {
        formData.append('image_files', file);
      }
    } else if (selectedDatabaseImages.value.length > 0) {
      // 从图库选择 - 使用完整文件系统路径
      const imagePaths = selectedDatabaseImages.value.map((img) => img.fullPath || String(img.id));
      formData.append('image_paths', JSON.stringify(imagePaths));
    } else {
      message.warning('请上传图片或从图库选择');
      inferenceStatus.value = 'idle';
      return;
    }

    // 先建立 WebSocket 连接（必须在启动推理任务之前）
    console.log('🔌 先建立 WebSocket 连接...');
    // 生成临时 taskId 用于 WebSocket
    const taskId = crypto.randomUUID();
    currentTaskId.value = taskId;

    // 等待 WebSocket 连接完成（Promise 会在 onopen 时 resolve）
    await connectWebSocket(taskId);
    console.log('✅ WebSocket 已连接，准备启动推理任务');

    // 启动推理任务
    console.log('🚀 启动推理任务...');
    formData.append('task_id', taskId); // 传递 taskId 给后端
    const response = await defectDetectionApi.startInference(formData);

    console.log(`✅ 任务已启动: ${taskId}`);

  } catch (error: any) {
    inferenceStatus.value = 'failed';
    message.error(error.message || '启动推理失败');
    console.error('启动推理失败:', error);
  }
};

// 连接 WebSocket
const connectWebSocket = (taskId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 使用当前页面的协议和主机
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/system/ws/inference/${taskId}`;
    console.log(`🔌 连接 WebSocket: ${wsUrl}`);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket 连接成功');
      // 发送心跳
      const heartbeat = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        } else {
          clearInterval(heartbeat);
        }
      }, 15000);

      // 连接成功，resolve Promise
      resolve();
    };

  ws.onmessage = (event) => {
    if (event.data === 'pong' || event.data === 'ping') return;
    const data = JSON.parse(event.data);
    console.log('📨 收到进度更新:', data);

    if (data.status === 'processing') {
      // 更新进度
      inferenceStatus.value = 'processing';
      inferenceProgress.value = data.progress || 0;
      inferenceMessage.value = data.message || `推理中... (${data.current}/${data.total})`;

      // 如果有当前结果，添加到结果列表
      if (data.currentResult) {
        const existingIndex = inferenceResults.value.findIndex(
          r => r.imageIndex === data.currentResult.imageIndex
        );
        if (existingIndex >= 0) {
          inferenceResults.value[existingIndex] = data.currentResult;
        } else {
          inferenceResults.value.push(data.currentResult);
        }
        currentIndex.value = data.current - 1;
      }
    } else if (data.status === 'completed') {
      // 推理完成
      inferenceStatus.value = 'completed';
      inferenceProgress.value = 100;
      inferenceMessage.value = '推理完成';
      if (data.results) {
        inferenceResults.value = data.results;
      }
      message.success('推理完成！');
      ws?.close();
    } else if (data.status === 'failed') {
      // 推理失败
      inferenceStatus.value = 'failed';
      inferenceProgress.value = 0;
      inferenceMessage.value = data.message || '推理失败';
      message.error(data.message || '推理失败');
      ws?.close();
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket 错误:', error);
    message.error('WebSocket 连接错误');
    inferenceStatus.value = 'failed';
    reject(error);
  };

  ws.onclose = () => {
    console.log('❌ WebSocket 连接关闭');
  };
  });
};

// 组件卸载时关闭 WebSocket
onUnmounted(() => {
  if (ws) {
    ws.close();
    ws = null;
  }
});

// 下载所有结果
const handleDownloadAll = async () => {
  try {
    message.loading({ content: '下载中...', key: 'download' });
    const blob = await defectDetectionApi.downloadResults(currentTaskId.value);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inference_results_${currentTaskId.value}.zip`;
    link.click();
    window.URL.revokeObjectURL(url);
    message.success({ content: '下载完成', key: 'download' });
  } catch (error) {
    message.error({ content: '下载失败', key: 'download' });
  }
};

// 翻页
const previousImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextImage = () => {
  if (currentIndex.value < inferenceResults.value.length - 1) {
    currentIndex.value++;
  }
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('zh-CN');
};


// 初始化
onMounted(() => {
  loadModels();
});
</script>

<style scoped lang="scss">
.defect-detection-page {
  // 参数设置样式
  .param-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .param-label {
      font-size: 14px;
      color: #666;
      white-space: nowrap;
      min-width: 90px;
    }

    .param-hint {
      font-size: 12px;
      color: #999;
      margin-left: 8px;
    }
  }

  .param-description {
    font-size: 12px;
    color: #999;
    margin-left: 98px;
    line-height: 1.5;
  }

  .results-section {
    margin-top: 16px;
  }

  // 左右布局
  .result-layout {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  // 左侧结果图片卡片
  .result-image-card {
    flex: 1;
    background: #fafafa;
  }

  .result-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    background: #f0f0f0;
    border-radius: 8px;
    padding: 16px;
  }

  .result-image {
    max-width: 100%;
    max-height: 600px;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  // 右侧检测详情卡片
  .detection-details-card {
    flex: 1;
    background: #fafafa;
  }

  .preview-card {
    background: #fafafa;
  }

  .preview-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    background: #f0f0f0;
    border-radius: 8px;
    padding: 8px;
  }

  .empty-preview {
    padding: 60px 0;
  }

  .preview-image {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .multi-preview-content {
    max-height: 500px;
    overflow-y: auto;

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .preview-grid-item {
      position: relative;
      width: 100%;
      padding-top: 100%; // 1:1 aspect ratio
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      overflow: hidden;
      background-color: #fafafa;

      &:hover {
        border-color: #40a9ff;
      }
    }

    .preview-grid-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}
</style>
