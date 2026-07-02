<template>
  <div class="image-database-container">
    <Card title="图像数据库管理" :bordered="false" class="full-height-card">
      <!-- 标签页切换 -->
      <Tabs v-model:activeKey="activeTab" @change="handleTabChange" class="image-tabs">
        <TabPane key="original" tab="原始图片">
        </TabPane>
        <TabPane key="results" tab="推理结果">
        </TabPane>
      </Tabs>

      <div class="content-wrapper">
        <!-- 左侧: 文件夹树 -->
        <div class="folder-tree-panel">
          <div class="panel-title">
            {{ activeTab === 'original' ? '📁 文件夹' : '📊 推理批次' }}
          </div>
          <div class="tree-container">
            <!-- 原始图片树（不带复选框） -->
            <Tree
              v-if="activeTab === 'original' && treeData.length > 0"
              v-model:selectedKeys="selectedTreeKeys"
              :tree-data="treeData"
              :default-expand-all="false"
              :field-names="{ children: 'children', title: 'filename', key: 'id' }"
              @select="handleFolderSelect"
            >
              <template #title="{ filename, isFolder }">
                <span>
                  {{ isFolder ? '📁' : '🖼️' }} {{ filename }}
                </span>
              </template>
            </Tree>

            <!-- 推理结果树（带复选框） -->
            <Tree
              v-if="activeTab === 'results' && inferenceTreeData.length > 0"
              v-model:selectedKeys="selectedTreeKeys"
              v-model:checkedKeys="selectedBatches"
              :tree-data="inferenceTreeData"
              :default-expand-all="false"
              :checkable="true"
              :field-names="{ children: 'children', title: 'filename', key: 'id' }"
              @select="handleFolderSelect"
              @check="handleBatchCheck"
            >
              <template #title="{ filename, isFolder }">
                <span>
                  {{ isFolder ? '📊' : '🖼️' }} {{ filename }}
                </span>
              </template>
            </Tree>
            <Empty v-else :description="activeTab === 'original' ? '暂无图片' : '暂无推理结果'" />
          </div>
        </div>

        <!-- 右侧: 图片列表和操作 -->
        <div class="image-content-panel">
          <!-- 操作栏 -->
          <div class="action-bar">
            <Space>
              <Upload
                v-if="activeTab === 'original'"
                :before-upload="handleUploadSingle"
                :show-upload-list="false"
                accept="image/*"
              >
                <Button class="custom-btn">
                  上传单张图片
                </Button>
              </Upload>

              <Upload
                v-if="activeTab === 'original'"
                :before-upload="handleUploadZip"
                :show-upload-list="false"
                accept=".zip"
              >
                <Button class="custom-btn">
                  上传图片压缩包
                </Button>
              </Upload>

              <Button @click="handleRefresh" class="custom-btn">刷新</Button>

              <Button
                v-if="activeTab === 'original'"
                danger
                class="custom-btn custom-btn-danger"
                :disabled="selectedImages.length === 0"
                @click="handleBatchDelete"
              >
                删除选中 ({{ selectedImages.length }})
              </Button>

              <Button
                v-if="activeTab === 'results'"
                danger
                class="custom-btn custom-btn-danger"
                :disabled="selectedImages.length === 0"
                @click="handleBatchDeleteInferenceResults"
              >
                删除选中图片 ({{ selectedImages.length }})
              </Button>

              <Button
                v-if="activeTab === 'results'"
                type="primary"
                danger
                class="custom-btn custom-btn-danger"
                :disabled="selectedBatches.length === 0"
                @click="handleBatchDeleteBatches"
              >
                删除选中批次 ({{ selectedBatches.length }})
              </Button>
            </Space>
            <div class="info-text">
              当前文件夹: {{ currentFolder || '根目录' }}
              <span v-if="filteredImages.length > 0">
                ({{ filteredImages.length }} 张图片)
              </span>
            </div>
          </div>

          <!-- 搜索栏 -->
          <div class="search-bar">
            <Space>
              <Input
                v-model:value="searchKeyword"
                placeholder="输入文件名进行搜索..."
                style="width: 300px"
                allowClear
                @input="handleSearch"
              >
                <template #prefix>
                  <span>🔍</span>
                </template>
              </Input>
              <Checkbox v-model:checked="exactMatch">精确匹配</Checkbox>
              <span v-if="searchKeyword" class="search-result-text">
                找到 {{ filteredImages.length }} 个匹配项
              </span>
            </Space>
          </div>

          <!-- 图片网格 -->
          <div class="image-grid-container">
            <div v-if="loading" class="loading-state">
              <Spin size="large" tip="加载中..." />
            </div>
            <div v-else-if="filteredImages.length === 0" class="empty-state">
              <Empty :description="searchKeyword ? '未找到匹配的图片' : '预览图片框'" />
            </div>
            <div v-else class="image-grid">
              <div
                v-for="image in filteredImages"
                :key="image.id"
                class="image-card"
                :class="{ selected: selectedImages.includes(image.id) }"
                @click="handleImageClick(image)"
              >
                <div class="image-thumbnail">
                  <img
                    :data-src="getImageUrl(image.path)"
                    :alt="image.filename"
                    class="lazy-image"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'%3E加载中...%3C/text%3E%3C/svg%3E"
                  />
                  <div class="image-overlay"></div>
                  <Checkbox
                    :checked="selectedImages.includes(image.id)"
                    class="image-checkbox"
                    @click.stop="handleCheckboxChange(image.id)"
                  />
                </div>
                <div class="image-info">
                  <div class="image-name" :title="image.filename">
                    {{ image.filename }}
                  </div>
                  <div class="image-meta">
                    <span v-if="image.width && image.height" class="meta-item">
                      {{ image.width }}x{{ image.height }}
                    </span>
                    <span v-if="activeTab === 'original'" class="meta-item">{{ formatFileSize(image.size) }}</span>
                    <!-- 推理结果额外信息 -->
                    <span v-if="activeTab === 'results' && image.detectionCount !== undefined" class="meta-item">
                      检测: {{ image.detectionCount }}
                    </span>
                    <span v-if="activeTab === 'results' && image.avgConfidence !== undefined" class="meta-item">
                      置信度: {{ (Number(image.avgConfidence) * 100).toFixed(1) }}%
                    </span>
                  </div>
                  <!-- 严重程度标签 -->
                  <div v-if="activeTab === 'results' && image.severityText" class="severity-badge" :style="{ background: image.severityColor }">
                    {{ image.severityText }} ({{ image.severityScore?.toFixed(1) }})
                  </div>
                  <div class="image-actions">
                    <Button
                      type="link"
                      size="small"
                      @click.stop="handleImagePreview(image)"
                    >
                      预览
                    </Button>
                    <Tooltip
                      v-if="activeTab === 'original'"
                      :title="image.hasInferenceResult ? '' : '该图片暂无推理结果'"
                    >
                      <Button
                        type="link"
                        size="small"
                        :disabled="!image.hasInferenceResult"
                        @click.stop="handleViewInferenceResult(image)"
                      >
                        查看推理结果
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      v-if="activeTab === 'original'"
                      title="确定要删除这张图片吗？"
                      ok-text="确定"
                      cancel-text="取消"
                      @confirm="handleDelete(image.id)"
                    >
                      <Button type="link" size="small" danger @click.stop>
                        删除
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      v-if="activeTab === 'results'"
                      title="确定要删除这条推理结果吗？将同时删除结果图片文件。"
                      ok-text="确定"
                      cancel-text="取消"
                      @confirm="handleDeleteInferenceResult(image.id)"
                    >
                      <Button type="link" size="small" danger @click.stop>
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- 图片预览对话框 -->
    <Modal
      v-model:open="previewVisible"
      :title="previewImage?.filename"
      :footer="null"
      width="80%"
      centered
      @cancel="handleClosePreview"
    >
      <div class="preview-container">
        <div
          ref="imageContainerRef"
          class="preview-image-wrapper"
          @wheel.prevent="handleImageWheel"
          @mousedown="handleImageMouseDown"
          @mousemove="handleImageMouseMove"
          @mouseup="handleImageMouseUp"
          @mouseleave="handleImageMouseUp"
        >
          <img
            v-if="previewImage"
            ref="previewImageRef"
            :src="getImageUrl(previewImage.path)"
            :alt="previewImage.filename"
            class="preview-image"
            :style="{
              transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }"
            @dragstart.prevent
          />
          <div class="zoom-indicator">{{ Math.round(imageTransform.scale * 100) }}%</div>
        </div>
        <div class="preview-info" :class="{ 'grid-layout': (previewImage as any)?.batchName }">
          <!-- 推理结果图片信息（网格布局） -->
          <template v-if="(previewImage as any)?.batchName">
            <!-- 第一行：文件名（独占一行） -->
            <div class="info-row full-width-row">
              <div class="info-item">
                <span class="info-label">文件名:</span>
                <span class="info-value">{{ previewImage?.filename }}</span>
              </div>
            </div>

            <!-- 第二行：创建时间 | 分辨率 -->
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">创建时间:</span>
                <span class="info-value">{{ previewImage?.uploadedAt }}</span>
              </div>
              <div v-if="previewImage?.width && previewImage?.height" class="info-item">
                <span class="info-label">分辨率:</span>
                <span class="info-value">{{ previewImage.width }}x{{ previewImage.height }}</span>
              </div>
            </div>

            <!-- 第三行：路径（独占一行） -->
            <div class="info-row full-width-row">
              <div class="info-item">
                <span class="info-label">路径:</span>
                <span class="info-value">{{ previewImage?.relativePath || previewImage?.path }}</span>
              </div>
            </div>

            <!-- 第四行：批次 | 检测数量 -->
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">批次:</span>
                <span class="info-value">{{ (previewImage as any).batchName }}</span>
              </div>
              <div v-if="(previewImage as any)?.detectionCount !== undefined" class="info-item">
                <span class="info-label">检测数量:</span>
                <span class="info-value">{{ (previewImage as any).detectionCount }}</span>
              </div>
            </div>

            <!-- 第五行：严重程度 | 平均置信度 -->
            <div class="info-row">
              <div v-if="(previewImage as any)?.severityText" class="info-item">
                <span class="info-label">严重程度:</span>
                <span class="info-value">
                  <span class="severity-tag" :style="{ background: (previewImage as any).severityColor }">
                    {{ (previewImage as any).severityText }} ({{ (previewImage as any).severityScore?.toFixed(1) }})
                  </span>
                </span>
              </div>
              <div v-if="(previewImage as any)?.avgConfidence !== undefined" class="info-item">
                <span class="info-label">平均置信度:</span>
                <span class="info-value">{{ (Number((previewImage as any).avgConfidence) * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </template>

          <!-- 原始图片信息（纵向布局） -->
          <template v-else>
            <div class="info-item">
              <span class="info-label">文件名:</span>
              <span class="info-value">{{ previewImage?.filename }}</span>
            </div>
            <div v-if="previewImage?.size" class="info-item">
              <span class="info-label">大小:</span>
              <span class="info-value">{{ formatFileSize(previewImage?.size || 0) }}</span>
            </div>
            <div v-if="previewImage?.width && previewImage?.height" class="info-item">
              <span class="info-label">分辨率:</span>
              <span class="info-value">{{ previewImage.width }}x{{ previewImage.height }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">路径:</span>
              <span class="info-value">{{ previewImage?.relativePath || previewImage?.path }}</span>
            </div>
            <div v-if="previewImage?.uploadedAt" class="info-item">
              <span class="info-label">上传时间:</span>
              <span class="info-value">{{ previewImage?.uploadedAt }}</span>
            </div>
          </template>
        </div>
      </div>
    </Modal>

    <!-- 上传路径选择对话框 -->
    <Modal
      v-model:open="uploadPathModalVisible"
      :title="uploadModalTitle"
      @ok="handleUploadConfirm"
      @cancel="handleUploadCancel"
    >
      <div style="margin: 20px 0">
        <label style="display: block; margin-bottom: 8px; font-weight: 500">
          存储路径（相对于图像数据库根目录）：
        </label>
        <Input
          v-model:value="uploadTargetPath"
          placeholder="例如: test2 或 val/images 或留空表示根目录"
          size="large"
        />
        <div style="margin-top: 8px; color: #666; font-size: 12px">
          提示：路径会自动创建，无需手动创建文件夹
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, nextTick } from 'vue';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Space,
  Spin,
  Upload,
  message,
  Modal,
  Tree,
  Input,
  Popconfirm,
  Tabs,
  TabPane,
  Tooltip,
} from 'ant-design-vue';
import { defectDetectionApi, type ImageDatabaseItem } from '#/api/system/defect-detection';
import { inferenceResultsApi, type BatchInfo } from '#/api/system/inference-results';

// 状态
const loading = ref(false);
const activeTab = ref<'original' | 'results'>('original'); // 标签页状态
const allImages = ref<ImageDatabaseItem[]>([]);
const treeData = ref<any[]>([]);
const currentFolder = ref<string>('');
const currentImages = ref<ImageDatabaseItem[]>([]);
const selectedImages = ref<(number | string)[]>([]);
const selectedTreeKeys = ref<string[]>([]); // 树的选中状态
const selectedBatches = ref<string[]>([]); // 选中的批次（用于批量删除）
const previewVisible = ref(false);
const previewImage = ref<ImageDatabaseItem | null>(null);

// 图片缩放和拖拽相关状态
const imageContainerRef = ref<HTMLElement | null>(null);
const previewImageRef = ref<HTMLImageElement | null>(null);
const imageTransform = ref({
  scale: 1,
  x: 0,
  y: 0,
});
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// 上传相关状态
const uploadPathModalVisible = ref(false);
const uploadTargetPath = ref('');
const uploadModalTitle = ref('');
const pendingUploadFile = ref<File | null>(null);
const uploadType = ref<'single' | 'zip'>('single');

// 搜索相关状态
const searchKeyword = ref('');
const exactMatch = ref(false);

// 推理结果相关状态
const inferenceBatches = ref<BatchInfo[]>([]);
const inferenceTreeData = ref<any[]>([]);
const inferenceResultImages = ref<any[]>([]); // 推理结果图片列表

// 数据缓存标记
const originalDataLoaded = ref(false); // 原始图片数据是否已加载
const inferenceDataLoaded = ref(false); // 推理结果数据是否已加载
const cachedOriginalTreeData = ref<any[]>([]); // 缓存的原始图片树数据
const cachedInferenceTreeData = ref<any[]>([]); // 缓存的推理结果树数据

// 过滤后的图片列表（根据搜索条件）
const filteredImages = computed(() => {
  // 始终使用 currentImages.value 作为数据源，无论是原始图片还是推理结果
  const sourceImages = currentImages.value;

  if (!searchKeyword.value.trim()) {
    return sourceImages;
  }

  const keyword = searchKeyword.value.trim();

  return sourceImages.filter(image => {
    const filename = image.filename.toLowerCase();
    const searchTerm = keyword.toLowerCase();

    if (exactMatch.value) {
      // 精确匹配：文件名完全相同（忽略大小写）
      return filename === searchTerm || filename === searchTerm + image.filename.slice(filename.lastIndexOf('.'));
    } else {
      // 模糊匹配：文件名包含关键词
      return filename.includes(searchTerm);
    }
  });
});

// 搜索处理
const handleSearch = () => {
  // 搜索时清空选中
  selectedImages.value = [];
};

// 获取图片URL（支持 MinIO 路径格式）
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

  // 2. 判断是否是推理结果图片（相对路径）
  const isInferenceResult = path.startsWith('img_results/') ||
                             path.startsWith('results/') ||
                             path.startsWith('predict');

  if (isInferenceResult) {
    // 推理结果图片：相对于 uploads 目录的路径
    return `/api/uploads/img_results/${path}`;
  } else if (path.startsWith('/uploads/')) {
    // 原始图片：HTTP 访问路径
    return `/api${path}`;
  } else {
    // 默认处理：假定为原始图片相对路径
    return `/api/uploads/images/${path}`;
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 递归提取所有图片
const extractAllImages = (nodes: ImageDatabaseItem[], result: ImageDatabaseItem[] = []) => {
  for (const node of nodes) {
    if (node.isFolder && node.children) {
      extractAllImages(node.children, result);
    } else if (!node.isFolder) {
      result.push(node);
    }
  }
  return result;
};

// 统一的数据库加载函数
const loadDatabase = async (forceRefresh = false) => {
  try {
    if (activeTab.value === 'original') {
      // 如果原始图片数据已加载且不是强制刷新，直接使用缓存数据
      if (originalDataLoaded.value && !forceRefresh && allImages.value.length > 0) {
        console.log('✅ 使用缓存的原始图片数据，共', allImages.value.length, '张');
        // 立即恢复树形结构和图片列表
        treeData.value = cachedOriginalTreeData.value;
        currentImages.value = allImages.value;
        // 立即设置懒加载
        nextTick(() => {
          setupLazyLoading();
        });
        return;
      }

      loading.value = true;
      // 加载原始图片
      const response = await defectDetectionApi.getImageDatabase();
      treeData.value = response;
      cachedOriginalTreeData.value = response; // 缓存树数据

      // 展平所有图片
      const flatImages: ImageDatabaseItem[] = [];
      extractAllImages(response, flatImages);

      allImages.value = flatImages;
      // 立即设置图片列表
      currentImages.value = flatImages;

      if (flatImages.length === 0) {
        message.info('数据库中暂无图片，请先上传图片');
      } else {
        // 批量查询所有图片的推理结果状态（只需一次请求）
        await checkInferenceResults(flatImages);
      }

      // 标记原始图片数据已加载
      originalDataLoaded.value = true;
      console.log(`✅ 加载了 ${flatImages.length} 张原始图片`);
    } else {
      // 如果推理结果数据已加载且不是强制刷新，直接使用缓存数据
      if (inferenceDataLoaded.value && !forceRefresh && inferenceResultImages.value.length > 0) {
        console.log('✅ 使用缓存的推理结果数据，共', inferenceResultImages.value.length, '张');
        // 立即恢复树形结构和图片列表
        treeData.value = cachedInferenceTreeData.value;
        currentImages.value = inferenceResultImages.value;
        // 立即设置懒加载
        nextTick(() => {
          setupLazyLoading();
        });
        return;
      }

      loading.value = true;
      // 加载推理结果
      const response = await inferenceResultsApi.getBatches();

      // 按批次名称递减排序（最新的在前面）
      const sortedBatches = response.batches.sort((a: BatchInfo, b: BatchInfo) => {
        return b.batchName.localeCompare(a.batchName);
      });

      inferenceBatches.value = sortedBatches;

      // 构建推理结果树形结构
      inferenceTreeData.value = sortedBatches.map((batch: BatchInfo, index: number) => ({
        id: `batch_${index}`,
        filename: `${batch.batchName} (${batch.imageCount}张)`,
        isFolder: true,
        batchName: batch.batchName,
        children: [],
      }));
      treeData.value = inferenceTreeData.value;
      cachedInferenceTreeData.value = inferenceTreeData.value; // 缓存树数据

      // 预加载所有批次的推理结果到 inferenceResultImages（用于全局数据）
      const allResults: any[] = [];
      for (const batch of response.batches) {
        const batchResults = await loadBatchResults(batch.batchName);
        allResults.push(...batchResults);
      }
      inferenceResultImages.value = allResults;
      // 立即设置图片列表
      currentImages.value = allResults;

      // 标记推理结果数据已加载
      inferenceDataLoaded.value = true;
      console.log(`✅ 加载了 ${response.batches.length} 个推理批次，共 ${allResults.length} 张推理结果图片`);
    }
  } catch (error: any) {
    console.error('加载数据库失败:', error);
    message.error(`加载失败: ${error.message || '未知错误'}`);
  } finally {
    loading.value = false;
    // 数据加载完成后设置懒加载
    setupLazyLoading();
  }
};

// 加载图像数据库（保留供其他地方调用）
const loadImageDatabase = () => {
  activeTab.value = 'original';
  loadDatabase();
};

// 加载推理批次（保留供其他地方调用）
const loadInferenceBatches = () => {
  activeTab.value = 'results';
  loadDatabase();
};

// 检查图片的推理结果（批量查询，一次性获取所有状态）
const checkInferenceResults = async (images: ImageDatabaseItem[]) => {
  try {
    // 批量查询所有图片的推理结果状态
    const response = await inferenceResultsApi.checkAllImages();
    const imageMap = response.imageMap;

    // 根据映射表设置每张图片的状态
    // 使用 fullPath 或 id（完整文件系统路径）作为键
    images.forEach((image) => {
      const imagePath = (image as any).fullPath || image.id;
      image.hasInferenceResult = imageMap[imagePath as string] || false;
      image.inferenceResultCount = image.hasInferenceResult ? 1 : 0;
    });

    console.log(`✅ 已检查 ${images.length} 张图片的推理结果，其中 ${response.total} 张有推理结果`);
  } catch (error) {
    console.error('批量查询推理结果失败:', error);
    // 出错时默认设置所有图片为无结果
    images.forEach((image) => {
      image.hasInferenceResult = false;
      image.inferenceResultCount = 0;
    });
  }
};

// 选择文件夹
const handleFolderSelect = async (selectedKeys: string[], info: any) => {
  const node = info.node;

  if (activeTab.value === 'original') {
    // 原始图片逻辑
    if (node.isFolder) {
      currentFolder.value = node.filename;
      const images: ImageDatabaseItem[] = [];
      extractAllImages(node.children || [], images);
      currentImages.value = images;
      setupLazyLoading();
    } else {
      const image = allImages.value.find(img => img.id === node.id);
      if (image) {
        handleImagePreview(image);
      }
    }
  } else {
    // 推理结果逻辑
    if (node.isFolder && node.batchName) {
      currentFolder.value = node.filename;
      loading.value = true;
      try {
        const results = await loadBatchResults(node.batchName);
        currentImages.value = results; // 只显示该批次的图片
        console.log(`✅ 选择批次 ${node.batchName}，显示 ${results.length} 张推理结果`);
      } finally {
        loading.value = false;
        setupLazyLoading();
      }
    } else {
      const image = inferenceResultImages.value.find(img => img.id === node.id);
      if (image) {
        handleImagePreview(image);
      }
    }
  }

  selectedImages.value = [];
};

// 图片卡片点击
const handleImageClick = (image: ImageDatabaseItem) => {
  handleImagePreview(image);
};

// 复选框变化
const handleCheckboxChange = (imageId: number | string) => {
  const index = selectedImages.value.indexOf(imageId);
  if (index > -1) {
    selectedImages.value.splice(index, 1);
  } else {
    selectedImages.value.push(imageId);
  }
};

// 预览图片
const handleImagePreview = (image: ImageDatabaseItem) => {
  console.log('🖼️ 预览图片对象:', image);
  console.log('📊 是否有 batchName:', (image as any)?.batchName);
  console.log('📊 检测数量:', (image as any)?.detectionCount);
  console.log('📊 平均置信度:', (image as any)?.avgConfidence);
  console.log('📊 严重程度:', (image as any)?.severityText);
  previewImage.value = image;
  previewVisible.value = true;
};

// 关闭预览
const handleClosePreview = () => {
  previewVisible.value = false;
  previewImage.value = null;
  // 重置缩放和位置
  imageTransform.value = { scale: 1, x: 0, y: 0 };
  isDragging.value = false;
};

// 鼠标滚轮缩放（以鼠标位置为中心）
const handleImageWheel = (e: WheelEvent) => {
  if (!imageContainerRef.value || !previewImageRef.value) return;

  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.min(Math.max(0.1, imageTransform.value.scale + delta), 5);

  // 获取鼠标相对于容器的位置
  const rect = imageContainerRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 获取图片中心点相对于容器的位置
  const imgCenterX = rect.width / 2 + imageTransform.value.x;
  const imgCenterY = rect.height / 2 + imageTransform.value.y;

  // 计算鼠标点相对于图片中心的偏移
  const offsetX = mouseX - imgCenterX;
  const offsetY = mouseY - imgCenterY;

  // 缩放比例变化
  const scaleRatio = newScale / imageTransform.value.scale;

  // 调整位置，使缩放以鼠标位置为中心
  imageTransform.value.x -= offsetX * (scaleRatio - 1);
  imageTransform.value.y -= offsetY * (scaleRatio - 1);
  imageTransform.value.scale = newScale;
};

// 开始拖拽
const handleImageMouseDown = (e: MouseEvent) => {
  if (imageTransform.value.scale <= 1) return; // 只有放大时才能拖拽
  isDragging.value = true;
  dragStart.value = {
    x: e.clientX - imageTransform.value.x,
    y: e.clientY - imageTransform.value.y,
  };
};

// 拖拽移动
const handleImageMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  imageTransform.value.x = e.clientX - dragStart.value.x;
  imageTransform.value.y = e.clientY - dragStart.value.y;
};

// 结束拖拽
const handleImageMouseUp = () => {
  isDragging.value = false;
};

// 删除单张图片
const handleDelete = async (imageId: string | number) => {
  try {
    await defectDetectionApi.deleteImageFile(imageId as string);
    message.success('删除成功');
    selectedImages.value = selectedImages.value.filter(id => id !== imageId);
    loadImageDatabase();
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedImages.value.length === 0) return;

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedImages.value.length} 张图片吗？此操作将同时删除相关的推理结果。`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await defectDetectionApi.batchDeleteImageFiles(selectedImages.value as string[]);
        message.success(`成功删除 ${selectedImages.value.length} 张图片`);
        selectedImages.value = [];
        loadImageDatabase();
      } catch (error: any) {
        message.error(error.message || '批量删除失败');
      }
    },
  });
};

// 查看推理结果
const handleViewInferenceResult = async (image: ImageDatabaseItem) => {
  try {
    // 使用 id 字段（完整文件系统路径）查询
    const imagePath = (image as any).fullPath || image.id;
    console.log('🔍 查询推理结果，图片路径:', imagePath);

    const result = await inferenceResultsApi.checkImageResult(imagePath as string);
    console.log('📦 后端返回的推理结果:', result);

    if (result.hasResult && result.results.length > 0) {
      const firstResult = result.results[0];
      console.log('📊 第一条推理结果数据:', firstResult);

      // 构造推理结果图片对象用于预览
      const inferenceResultImage = {
        id: firstResult.id,
        filename: firstResult.resultImageRel?.split('/').pop() || '推理结果',
        path: firstResult.resultImageRel,
        width: firstResult.imageWidth,
        height: firstResult.imageHeight,
        size: 0,
        uploadedAt: firstResult.createdAt,
        relativePath: firstResult.resultImageRel,
        detectionCount: firstResult.detectionCount,
        avgConfidence: firstResult.avgConfidence,
        severityLevel: firstResult.severityLevel,
        severityScore: firstResult.severityScore,
        severityText: firstResult.severityText,
        severityColor: firstResult.severityColor,
        batchName: firstResult.batchName,
      };

      console.log('🖼️ 构造的预览图片对象:', inferenceResultImage);

      // 直接预览推理结果图片
      previewImage.value = inferenceResultImage as any;
      previewVisible.value = true;
    } else {
      message.info('该图片暂无推理结果');
    }
  } catch (error: any) {
    console.error('查看推理结果失败:', error);
    message.error('查看推理结果失败');
  }
};

// 删除单个推理结果
const handleDeleteInferenceResult = async (resultId: number) => {
  try {
    loading.value = true;
    // deleteFiles = true 表示同时删除物理文件
    await inferenceResultsApi.deleteResult(resultId, true);
    message.success('删除成功');

    // 刷新推理结果列表
    loadDatabase();
  } catch (error: any) {
    console.error('删除推理结果失败:', error);
    message.error(error.message || '删除失败');
  } finally {
    loading.value = false;
  }
};

// 批量删除推理结果
const handleBatchDeleteInferenceResults = async () => {
  if (selectedImages.value.length === 0) return;

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedImages.value.length} 条推理结果吗？此操作将同时删除推理结果图片文件。`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        loading.value = true;

        // 逐个删除推理结果
        let successCount = 0;
        let failCount = 0;

        for (const resultId of selectedImages.value) {
          try {
            await inferenceResultsApi.deleteResult(resultId as number, true);
            successCount++;
          } catch (error) {
            console.error(`删除推理结果 ${resultId} 失败:`, error);
            failCount++;
          }
        }

        if (successCount > 0) {
          message.success(`成功删除 ${successCount} 条推理结果${failCount > 0 ? `，${failCount} 条删除失败` : ''}`);
        } else {
          message.error('删除失败');
        }

        selectedImages.value = [];
        loadDatabase();
      } catch (error: any) {
        message.error(error.message || '批量删除失败');
      } finally {
        loading.value = false;
      }
    },
  });
};

// 批次复选框变化事件
const handleBatchCheck = (checkedKeys: any) => {
  // checkedKeys 可能是数组或对象 {checked: [], halfChecked: []}
  if (Array.isArray(checkedKeys)) {
    selectedBatches.value = checkedKeys;
  } else {
    selectedBatches.value = checkedKeys.checked || [];
  }
};

// 批量删除批次
const handleBatchDeleteBatches = async () => {
  if (selectedBatches.value.length === 0) return;

  // 将选中的树节点 id（如 batch_0）转换为实际的 batchName（如 predict0）
  const batchNamesToDelete = selectedBatches.value
    .map((id: string) => {
      const node = inferenceTreeData.value.find((n: any) => n.id === id);
      return node ? node.batchName : null;
    })
    .filter((name: string | null) => name !== null) as string[];

  if (batchNamesToDelete.length === 0) return;

  Modal.confirm({
    title: '确认批量删除批次',
    content: `确定要删除选中的 ${batchNamesToDelete.length} 个批次吗？这将删除批次内的所有推理结果和图片文件，操作不可恢复！`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        loading.value = true;

        // 调用批量删除 API
        const response = await inferenceResultsApi.batchDeleteByBatches(
          batchNamesToDelete,
          true // 同时删除物理文件
        );

        const { deleted_records, deleted_files, failed_batches } = response as any;

        if (failed_batches && failed_batches.length > 0) {
          const failedNames = failed_batches.map((f: any) => f.batch_name).join(', ');
          message.warning(
            `成功删除 ${deleted_records} 条记录，${deleted_files} 个文件。失败批次: ${failedNames}`
          );
        } else {
          message.success(
            `成功删除 ${selectedBatches.value.length} 个批次，${deleted_records} 条记录，${deleted_files} 个文件`
          );
        }

        // 清空选择
        selectedBatches.value = [];
        selectedImages.value = [];

        // 重新加载数据
        await loadDatabase();
      } catch (error: any) {
        message.error(error.message || '批量删除批次失败');
      } finally {
        loading.value = false;
      }
    },
  });
};


// 加载指定批次的推理结果
const loadBatchResults = async (batchName: string): Promise<any[]> => {
  try {
    const response = await inferenceResultsApi.getBatchResults(batchName);

    // 将推理结果转换为图片项格式
    return response.results.map((result: any) => ({
      id: result.id,
      filename: result.resultImageRel?.split('/').pop() || `result_${result.id}.jpg`,
      path: result.resultImageRel, // 相对路径（相对于 uploads）
      relativePath: result.resultImageRel, // 相对路径
      url: `/api/uploads/${result.resultImageRel}`, // 完整URL
      size: 0, // 推理结果没有存储文件大小
      width: result.imageWidth,
      height: result.imageHeight,
      uploadedAt: result.createdAt, // 创建时间
      isFolder: false,
      batchName: result.batchName,
      detectionCount: result.detectionCount,
      avgConfidence: result.avgConfidence,
      severityLevel: result.severityLevel,
      severityScore: result.severityScore,
      severityText: result.severityText,
      severityColor: result.severityColor,
      originalImage: result.originalImageRel,
      resultImage: result.resultImageRel,
    }));
  } catch (error: any) {
    console.error(`加载批次 ${batchName} 的推理结果失败:`, error);
    return [];
  }
};

// 标签页切换
const handleTabChange = (key: string) => {
  // 立即更新 UI 状态,不等待数据加载
  activeTab.value = key;
  selectedImages.value = [];
  selectedTreeKeys.value = [];
  selectedBatches.value = []; // 清空批次选择
  currentFolder.value = '';
  searchKeyword.value = '';

  // 先清空图片列表,让标签页动画流畅执行
  currentImages.value = [];

  // 使用 nextTick 确保 UI 先更新
  nextTick(() => {
    // 延迟加载数据,让标签页切换动画先完成
    setTimeout(() => {
      loadDatabase();
    }, 100);
  });
};

const handleRefresh = () => {
  selectedImages.value = [];
  selectedTreeKeys.value = [];
  currentFolder.value = '';
  searchKeyword.value = '';
  // 强制刷新，清除当前标签页的缓存
  if (activeTab.value === 'original') {
    originalDataLoaded.value = false;
  } else {
    inferenceDataLoaded.value = false;
  }
  loadDatabase(true);
};

// 上传单张图片
const handleUploadSingle = async (file: File) => {
  uploadType.value = 'single';
  uploadModalTitle.value = '上传单张图片 - 选择存储路径';
  pendingUploadFile.value = file;
  uploadTargetPath.value = '';
  uploadPathModalVisible.value = true;
  return false;
};

// 上传压缩包
const handleUploadZip = async (file: File) => {
  uploadType.value = 'zip';
  uploadModalTitle.value = '上传图片压缩包 - 选择解压目标路径';
  pendingUploadFile.value = file;
  uploadTargetPath.value = '';
  uploadPathModalVisible.value = true;
  return false;
};

// 确认上传
const handleUploadConfirm = async () => {
  if (!pendingUploadFile.value) {
    message.error('没有待上传的文件');
    return;
  }

  const formData = new FormData();
  formData.append('file', pendingUploadFile.value);
  formData.append('folder', uploadTargetPath.value || '');

  try {
    loading.value = true;

    if (uploadType.value === 'single') {
      await defectDetectionApi.uploadToDatabase(formData);
      message.success('图片上传成功');
    } else {
      await defectDetectionApi.uploadZipToDatabase(formData);
      message.success('压缩包上传并解压成功');
    }

    uploadPathModalVisible.value = false;
    pendingUploadFile.value = null;
    uploadTargetPath.value = '';

    await loadImageDatabase();
  } catch (error: any) {
    message.error(`上传失败: ${error.message || '未知错误'}`);
    console.error('上传失败:', error);
  } finally {
    loading.value = false;
  }
};

// 取消上传
const handleUploadCancel = () => {
  uploadPathModalVisible.value = false;
  pendingUploadFile.value = null;
  uploadTargetPath.value = '';
};

// 懒加载观察器（全局保存，切换时可以清除）
let imageObserver: IntersectionObserver | null = null;

// 懒加载图片
const setupLazyLoading = () => {
  // 清除之前的观察器
  if (imageObserver) {
    imageObserver.disconnect();
    imageObserver = null;
  }

  // 等待 DOM 更新
  nextTick(() => {
    const lazyImages = document.querySelectorAll('.lazy-image');

    if (lazyImages.length === 0) {
      console.log('⚠️ 未找到需要懒加载的图片');
      return;
    }

    console.log(`🖼️ 开始设置懒加载，共 ${lazyImages.length} 张图片`);

    imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const dataSrc = img.getAttribute('data-src');

          if (dataSrc && dataSrc !== img.src) {
            console.log('📥 开始加载图片:', dataSrc);
            // 创建新图片对象预加载
            const tempImg = new Image();
            tempImg.onload = () => {
              img.src = dataSrc;
              img.classList.add('loaded');
              console.log('✅ 图片加载成功:', dataSrc);
            };
            tempImg.onerror = () => {
              img.classList.add('error');
              console.error('❌ 图片加载失败:', dataSrc);
            };
            tempImg.src = dataSrc;

            // 停止观察该图片
            observer.unobserve(img);
          }
        }
      });
    }, {
      root: null,
      rootMargin: '200px', // 提前200px开始加载，更流畅
      threshold: 0.01
    });

    // 立即开始观察所有图片
    lazyImages.forEach(img => {
      imageObserver!.observe(img);
    });

    console.log('✅ 懒加载观察器已启动');
  });
};

onMounted(() => {
  loadImageDatabase();
});
</script>

<style scoped lang="scss">
.image-database-container {
  padding: 16px;
  height: calc(100vh - 120px);
  overflow: hidden;

  .full-height-card {
    height: 100%;
    display: flex;
    flex-direction: column;

    :deep(.ant-card-body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      padding: 16px;
    }
  }

  .content-wrapper {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 16px;
    height: 100%;
    overflow: hidden;
  }

  .folder-tree-panel {
    display: flex;
    flex-direction: column;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
    height: 100%;

    .panel-title {
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #d9d9d9;
      font-weight: 500;
      font-size: 14px;
      flex-shrink: 0;
    }

    .tree-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      padding: 12px;
      min-height: 0;

      :deep(.ant-tree) {
        min-width: max-content;

        .ant-tree-treenode {
          white-space: nowrap;
        }

        .ant-tree-title {
          white-space: nowrap;
          overflow: visible;
        }
      }
    }
  }

  .image-content-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    overflow: hidden;

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 0;
      flex-shrink: 0;

      .custom-btn {
        min-width: 120px;
        height: 36px;
        padding: 0 16px;
        background: #ffffff;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        color: #333333;
        font-size: 14px;
        transition: all 0.3s ease;

        &:hover:not(:disabled) {
          border-color: #40a9ff;
          color: #40a9ff;
        }

        &:disabled {
          background: #f5f5f5;
          border-color: #d9d9d9;
          color: rgba(0, 0, 0, 0.25);
          cursor: not-allowed;
        }
      }

      .custom-btn-danger {
        &:hover:not(:disabled) {
          border-color: #ff4d4f;
          color: #ff4d4f;
        }
      }

      .info-text {
        font-size: 14px;
        color: #666;
      }
    }

    .search-bar {
      padding: 8px 0;
      flex-shrink: 0;
      border-bottom: 1px solid #f0f0f0;

      .search-result-text {
        font-size: 14px;
        color: #1890ff;
        font-weight: 500;
      }
    }

    .image-grid-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      background: #fff;
      padding: 16px;
      min-height: 0;

      .loading-state,
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 300px;
      }

      .image-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        justify-content: start;
        grid-auto-rows: min-content;
        align-content: start;
      }
    }
  }

  .image-card {
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;
    background: #fff;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    &.selected {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }

    .image-thumbnail {
      position: relative;
      width: 100%;
      padding-top: 100%; // 1:1 宽高比，保持正方形
      background: #f5f5f5;
      overflow: hidden;

      img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s ease;

        &.lazy-image {
          opacity: 0.5;

          &.loaded {
            opacity: 1;
          }

          &.error {
            opacity: 0.3;
          }
        }
      }

      .image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.2);
        opacity: 0;
        transition: opacity 0.3s;
      }

      &:hover .image-overlay {
        opacity: 1;
      }

      .image-checkbox {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
      }
    }

    .image-info {
      padding: 12px;

      .image-name {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .image-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
        color: #999;
        margin-bottom: 8px;

        .meta-item {
          &:not(:last-child)::after {
            content: '•';
            margin-left: 8px;
          }
        }
      }

      .severity-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #fff;
        font-weight: 500;
        margin-bottom: 8px;
        text-align: center;
      }

      .image-actions {
        display: flex;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid #f0f0f0;
        flex-wrap: wrap;
      }
    }
  }
}

// Tabs 样式
.image-tabs {
  margin-bottom: 16px;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}

.preview-container {
  .preview-image-wrapper {
    position: relative;
    width: 100%;
    height: 60vh;
    background: #fafafa;
    margin-bottom: 16px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      user-select: none;
      transition: transform 0.1s ease-out;
      transform-origin: center center;
    }

    .zoom-indicator {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      pointer-events: none;
      z-index: 10;
    }
  }

  .preview-info {
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;

    .info-item {
      display: flex;
      padding: 8px 0;
      font-size: 14px;

      .info-label {
        width: 100px;
        color: #666;
        font-weight: 500;
      }

      .info-value {
        flex: 1;
        color: #333;
        word-break: break-all;

        .severity-tag {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          color: #fff;
          font-weight: 500;
          font-size: 13px;
        }
      }
    }

    // 推理结果使用网格布局
    &.grid-layout {
      .info-row {
        display: flex;
        gap: 40px;

        // 默认两列布局
        .info-item {
          flex: 1;
          padding: 8px 0;

          .info-label {
            width: 90px;
          }
        }

        // 文件名和路径独占一行
        &.full-width-row {
          .info-item {
            flex: 1;

            .info-label {
              width: 90px;
            }
          }
        }
      }
    }
  }
}
</style>
