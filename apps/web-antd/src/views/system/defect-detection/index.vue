<template>
  <div class="defect-detection-page p-4">
    <Card title="路面缺陷检测" :bordered="false">
      <!-- 模型选择 -->
      <div class="mb-4">
        <div class="mb-2 font-medium">选择模型</div>
        <Select
          v-model:value="selectedModelId"
          placeholder="选择模型"
          style="width: 300px"
          :loading="modelsLoading"
        >
          <SelectOption v-for="model in models" :key="model.id" :value="model.id">
            {{ model.name }} ({{ model.version }})
          </SelectOption>
        </Select>
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
              <DescriptionsItem label="检测时间">
                {{ formatDate(currentResult.createdAt) }}
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
                        :status="record.confidence > 0.8 ? 'success' : 'normal'"
                        size="small"
                      />
                    </template>
                    <template v-else-if="column.key === 'severity'">
                      <Tag :color="getSeverityColor(record.severity)">
                        {{ getSeverityText(record.severity) }}
                      </Tag>
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
import { computed, onMounted, ref } from 'vue';
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Divider,
  Empty,
  Progress,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
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

// 检测结果表格列
const detectionColumns = [
  { title: '类型', dataIndex: 'class', key: 'class' },
  { title: '置信度', dataIndex: 'confidence', key: 'confidence', width: 200 },
  { title: '严重程度', dataIndex: 'severity', key: 'severity', width: 120 },
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

// 获取图片 URL（添加代理前缀）
const getImageUrl = (path: string) => {
  if (!path) return '';
  // 如果路径以 / 开头，添加 /api/system 前缀
  if (path.startsWith('/uploads') || path.startsWith('/predict-results')) {
    return `/api/system${path}`;
  }
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

// 获取严重程度文本
const getSeverityText = (severity?: string) => {
  const textMap: Record<string, string> = {
    high: '严重',
    medium: '中等',
    low: '轻微',
  };
  return severity ? textMap[severity] || severity : 'N/A';
};

// 图片加载错误处理
const handleImageError = (e: Event) => {
  console.error('图片加载失败:', e);
};

// 加载模型列表
const loadModels = async () => {
  modelsLoading.value = true;
  try {
    models.value = await defectDetectionApi.getModels();
    if (models.value.length > 0) {
      selectedModelId.value = models.value[0].id;
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

// 开始推理
const handleStartInference = async () => {
  if (!selectedModelId.value) {
    message.warning('请选择模型');
    return;
  }

  inferenceStatus.value = 'processing';
  currentIndex.value = 0;
  inferenceResults.value = [];

  try {
    if (uploadedFiles.value.length > 0) {
      await handleFileInference();
    } else if (selectedDatabaseImages.value.length > 0) {
      await handleDatabaseInference();
    }
  } catch (error: any) {
    inferenceStatus.value = 'failed';
    message.error(error.message || '推理失败');
  }
};

// 文件推理
const handleFileInference = async () => {
  const file = uploadedFiles.value[0];
  const formData = new FormData();
  formData.append('modelId', String(selectedModelId.value));

  if (file.type.startsWith('image/')) {
    formData.append('image', file);
    const result = await defectDetectionApi.inferenceSingle(formData);
    console.log('推理结果:', result);
    inferenceResults.value = [result];
    inferenceStatus.value = 'completed';
    message.success('推理完成');
  } else {
    formData.append('archive', file);
    const task = await defectDetectionApi.inferenceBatch(formData);
    currentTaskId.value = task.taskId;
    await pollTaskStatus(task.taskId);
  }
};

// 数据库推理
const handleDatabaseInference = async () => {
  // id 现在包含完整的文件路径
  const imageIds = selectedDatabaseImages.value.map((img) => String(img.id));
  console.log('选中的图片路径:', imageIds);
  const task = await defectDetectionApi.inferenceFromDatabase({
    modelId: selectedModelId.value!,
    imageIds,
  });
  currentTaskId.value = task.taskId;
  await pollTaskStatus(task.taskId);
};

// 轮询任务状态
const pollTaskStatus = async (taskId: string) => {
  const maxAttempts = 60;
  let attempts = 0;

  const poll = async () => {
    try {
      const task = await defectDetectionApi.getTaskStatus(taskId);

      if (task.status === 'completed') {
        const results = await defectDetectionApi.getResults(taskId);
        inferenceResults.value = results;
        inferenceStatus.value = 'completed';
        message.success(`推理完成，共 ${results.length} 张图片`);
        return;
      }

      if (task.status === 'failed') {
        inferenceStatus.value = 'failed';
        message.error('推理失败');
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      } else {
        inferenceStatus.value = 'failed';
        message.error('推理超时');
      }
    } catch (error) {
      inferenceStatus.value = 'failed';
      message.error('获取任务状态失败');
    }
  };

  await poll();
};

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

// 获取严重程度颜色
const getSeverityColor = (severity?: string) => {
  const colorMap: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'green',
  };
  return severity ? colorMap[severity] || 'default' : 'default';
};

// 初始化
onMounted(() => {
  loadModels();
});
</script>

<style scoped lang="scss">
.defect-detection-page {
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
