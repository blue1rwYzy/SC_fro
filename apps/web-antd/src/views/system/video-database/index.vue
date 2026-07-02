<template>
  <div class="video-database-container">
    <Card title="视频数据库管理" :bordered="false" class="full-height-card">
      <!-- 标签页切换 -->
      <Tabs v-model:activeKey="activeTab" @change="handleTabChange" class="video-tabs">
        <TabPane key="original" tab="原始视频">
        </TabPane>
        <TabPane key="results" tab="推理结果">
        </TabPane>
      </Tabs>

      <div class="content-wrapper">
        <!-- 左侧: 文件夹树 -->
        <div class="folder-tree-panel">
          <div class="panel-title">📁 文件夹</div>
          <div class="tree-container">
            <Tree
              v-if="treeData.length > 0"
              v-model:selectedKeys="selectedTreeKeys"
              :tree-data="treeData"
              :default-expand-all="false"
              :field-names="{ children: 'children', title: 'filename', key: 'id' }"
              @select="handleFolderSelect"
            >
              <template #title="{ filename, isFolder }">
                <span>
                  {{ isFolder ? '📁' : '🎬' }} {{ filename }}
                </span>
              </template>
            </Tree>
            <Empty v-else description="暂无视频" />
          </div>
        </div>

        <!-- 右侧: 视频列表和预览 -->
        <div class="video-content-panel">
          <!-- 操作栏 -->
          <div class="action-bar">
            <Space>
              <Upload
                v-if="activeTab === 'original'"
                :before-upload="handleUploadSingle"
                :show-upload-list="false"
                accept="video/*"
              >
                <Button class="custom-btn">
                  上传单个视频
                </Button>
              </Upload>

              <Upload
                v-if="activeTab === 'original'"
                :before-upload="handleUploadZip"
                :show-upload-list="false"
                accept=".zip"
              >
                <Button class="custom-btn">
                  上传视频压缩包
                </Button>
              </Upload>

              <Button @click="handleRefresh" class="custom-btn">刷新</Button>

              <Button
                danger
                class="custom-btn custom-btn-danger"
                :disabled="selectedVideos.length === 0"
                @click="handleBatchDelete"
              >
                删除选中 ({{ selectedVideos.length }})
              </Button>
            </Space>
            <div class="info-text">
              当前文件夹: {{ currentFolder || '根目录' }}
              <span v-if="filteredVideos.length > 0">
                ({{ filteredVideos.length }} 个视频)
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
                找到 {{ filteredVideos.length }} 个匹配项
              </span>
            </Space>
          </div>

          <!-- 视频网格 -->
          <div class="video-grid-container">
            <div v-if="filteredVideos.length === 0" class="empty-state">
              <Empty :description="searchKeyword ? '未找到匹配的视频' : '预览视频框'" />
            </div>
            <div v-else class="video-grid">
              <div
                v-for="video in filteredVideos"
                :key="video.id"
                class="video-card"
                :class="{ selected: selectedVideos.includes(video.path) }"
                @click="handleVideoClick(video)"
              >
                <div class="video-thumbnail">
                  <video
                    :data-src="getVideoUrl(video.path)"
                    class="thumbnail-video lazy-video"
                    preload="none"
                  ></video>
                  <div class="video-overlay">
                    <span class="play-icon">▶</span>
                  </div>
                  <div class="video-placeholder">
                    <span class="placeholder-text">加载中...</span>
                  </div>
                  <Checkbox
                    :checked="selectedVideos.includes(video.path)"
                    class="video-checkbox"
                    @click.stop="handleCheckboxChange(video.path)"
                  />
                  <div v-if="video.duration" class="video-duration">
                    {{ formatDuration(video.duration) }}
                  </div>
                </div>
                <div class="video-info">
                  <div class="video-name" :title="video.filename">
                    {{ video.filename }}
                  </div>
                  <div class="video-meta">
                    <span v-if="video.width && video.height" class="meta-item">
                      {{ video.width }}x{{ video.height }}
                    </span>
                    <span class="meta-item">{{ formatFileSize(video.size) }}</span>
                  </div>
                  <div class="video-actions">
                    <Button
                      type="link"
                      size="small"
                      @click.stop="handlePreview(video)"
                    >
                      预览
                    </Button>
                    <Tooltip
                      v-if="activeTab === 'original'"
                      :title="hasResult(video.fullPath) ? '' : '该视频暂无推理结果'"
                    >
                      <Button
                        type="link"
                        size="small"
                        :disabled="!hasResult(video.fullPath)"
                        @click.stop="handleFindResult(video)"
                      >
                        查看推理结果
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="确定要删除这个视频吗？"
                      ok-text="确定"
                      cancel-text="取消"
                      @confirm="handleDelete(video.path)"
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

    <!-- 视频预览弹窗 -->
    <Modal
      v-model:open="previewVisible"
      title="视频预览"
      width="80%"
      :footer="null"
      @cancel="handleClosePreview"
    >
      <div class="preview-container">
        <video
          v-if="previewVideo"
          :src="getVideoUrl(previewVideo.path)"
          controls
          autoplay
          class="preview-video"
        ></video>
        <div v-if="previewVideo" class="preview-info">
          <div class="info-item">
            <span class="info-label">文件名:</span>
            <span class="info-value">{{ previewVideo.filename }}</span>
          </div>
          <div class="info-item" v-if="previewVideo.width && previewVideo.height">
            <span class="info-label">分辨率:</span>
            <span class="info-value">
              {{ previewVideo.width }} x {{ previewVideo.height }}
            </span>
          </div>
          <div class="info-item" v-if="previewVideo.duration">
            <span class="info-label">时长:</span>
            <span class="info-value">{{ formatDuration(previewVideo.duration) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">文件大小:</span>
            <span class="info-value">{{ formatFileSize(previewVideo.size) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">上传时间:</span>
            <span class="info-value">
              {{ new Date(previewVideo.uploadedAt).toLocaleString('zh-CN') }}
            </span>
          </div>
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
          存储路径（相对于视频数据库根目录）：
        </label>
        <Input
          v-model:value="uploadTargetPath"
          placeholder="例如: test2 或 train/videos 或留空表示根目录"
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
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import {
  Card,
  Tree,
  Button,
  Space,
  Empty,
  Checkbox,
  Popconfirm,
  Modal,
  message,
  Upload,
  Input,
  Tabs,
  TabPane,
  Badge,
  Tooltip,
} from 'ant-design-vue';
import { videoDatabaseApi, type VideoFile } from '#/api/system/video-database';

const activeTab = ref('original'); // 当前标签页：original 或 results
const treeData = ref<VideoFile[]>([]);
const currentFolder = ref('');
const loading = ref(false);
const currentVideos = ref<VideoFile[]>([]);
const selectedVideos = ref<string[]>([]);
const selectedTreeKeys = ref<string[]>([]); // 树的选中状态
const previewVisible = ref(false);
const previewVideo = ref<VideoFile | null>(null);
const videoResultsMap = ref<Map<string, boolean>>(new Map()); // 存储每个视频是否有推理结果

// 上传相关状态
const uploadPathModalVisible = ref(false);
const uploadTargetPath = ref('');
const uploadModalTitle = ref('');
const pendingUploadFile = ref<File | null>(null);
const uploadType = ref<'single' | 'zip'>('single');

// 搜索相关状态
const searchKeyword = ref('');
const exactMatch = ref(false);

// 数据缓存标记
const originalDataLoaded = ref(false); // 原始视频数据是否已加载
const inferenceDataLoaded = ref(false); // 推理结果数据是否已加载
const cachedOriginalTreeData = ref<VideoFile[]>([]); // 缓存的原始视频树数据
const cachedOriginalVideos = ref<VideoFile[]>([]); // 缓存的原始视频列表
const cachedInferenceTreeData = ref<VideoFile[]>([]); // 缓存的推理结果树数据
const cachedInferenceVideos = ref<VideoFile[]>([]); // 缓存的推理结果视频列表

// 过滤后的视频列表（根据搜索条件）
const filteredVideos = computed(() => {
  if (!searchKeyword.value.trim()) {
    return currentVideos.value;
  }

  const keyword = searchKeyword.value.trim();

  return currentVideos.value.filter(video => {
    const filename = video.filename.toLowerCase();
    const searchTerm = keyword.toLowerCase();

    if (exactMatch.value) {
      // 精确匹配：文件名完全相同（忽略大小写）
      return filename === searchTerm || filename === searchTerm + video.filename.slice(filename.lastIndexOf('.'));
    } else {
      // 模糊匹配：文件名包含关键词
      return filename.includes(searchTerm);
    }
  });
});

// 搜索处理
const handleSearch = () => {
  // 搜索时清空选中
  selectedVideos.value = [];
};

// 加载视频数据库
const loadVideoDatabase = async (forceRefresh = false) => {
  try {
    // 根据当前标签页检查是否已加载数据
    if (activeTab.value === 'original') {
      // 如果原始视频数据已加载且不是强制刷新，直接使用缓存数据
      if (originalDataLoaded.value && !forceRefresh && cachedOriginalVideos.value.length > 0) {
        console.log('✅ 使用缓存的原始视频数据，共', cachedOriginalVideos.value.length, '个视频');
        // 立即恢复树形结构
        treeData.value = cachedOriginalTreeData.value;
        // 延迟恢复视频列表,让标签页动画先完成
        setTimeout(() => {
          currentVideos.value = cachedOriginalVideos.value;
          nextTick(() => {
            setupLazyLoading();
          });
        }, 150);
        return;
      }
    } else {
      // 如果推理结果数据已加载且不是强制刷新，直接使用缓存数据
      if (inferenceDataLoaded.value && !forceRefresh && cachedInferenceVideos.value.length > 0) {
        console.log('✅ 使用缓存的推理结果数据，共', cachedInferenceVideos.value.length, '个视频');
        // 立即恢复树形结构
        treeData.value = cachedInferenceTreeData.value;
        // 延迟恢复视频列表,让标签页动画先完成
        setTimeout(() => {
          currentVideos.value = cachedInferenceVideos.value;
          nextTick(() => {
            setupLazyLoading();
          });
        }, 150);
        return;
      }
    }

    let data;
    if (activeTab.value === 'original') {
      data = await videoDatabaseApi.getVideoDatabase();
      cachedOriginalTreeData.value = data; // 缓存树数据
      originalDataLoaded.value = true; // 标记原始视频数据已加载
    } else {
      data = await videoDatabaseApi.getVideoResultsDatabase();
      cachedInferenceTreeData.value = data; // 缓存树数据
      inferenceDataLoaded.value = true; // 标记推理结果数据已加载
    }

    treeData.value = data;

    // 默认显示所有视频
    extractAllVideos(data);

    // 延迟显示视频,先让标签页动画完成
    setTimeout(() => {
      // 缓存视频列表
      if (activeTab.value === 'original') {
        cachedOriginalVideos.value = currentVideos.value;
        // 异步检查推理结果
        checkVideoResults().then(() => {
          setupLazyLoading();
        });
      } else {
        cachedInferenceVideos.value = currentVideos.value;
        setupLazyLoading();
      }
    }, 150);
  } catch (error: any) {
    message.error(error.message || '加载视频数据库失败');
  }
};

// 检查视频是否有推理结果
const checkVideoResults = async () => {
  videoResultsMap.value.clear();

  // 批量检查所有视频是否有推理结果
  const checkPromises = currentVideos.value.map(async (video) => {
    try {
      const result = await videoDatabaseApi.findResultVideo(video.fullPath);
      videoResultsMap.value.set(video.fullPath, !!result);
    } catch (error) {
      videoResultsMap.value.set(video.fullPath, false);
    }
  });

  await Promise.all(checkPromises);
};

// 检查视频是否有推理结果
const hasResult = (videoPath: string) => {
  return videoResultsMap.value.get(videoPath) || false;
};

// 标签页切换处理
const handleTabChange = (key: string) => {
  // 立即更新 UI 状态,不等待数据加载
  activeTab.value = key;
  selectedVideos.value = [];
  selectedTreeKeys.value = [];
  currentFolder.value = '';
  searchKeyword.value = '';

  // 先清空视频列表,让标签页动画流畅执行
  currentVideos.value = [];

  // 使用 nextTick 确保 UI 先更新
  nextTick(() => {
    // 延迟加载数据,让标签页切换动画先完成
    setTimeout(() => {
      loadVideoDatabase();
    }, 100);
  });
};

// 提取所有视频文件
const extractAllVideos = (nodes: VideoFile[], result: VideoFile[] = []) => {
  for (const node of nodes) {
    if (node.isFolder && node.children) {
      extractAllVideos(node.children, result);
    } else if (!node.isFolder) {
      result.push(node);
    }
  }
  currentVideos.value = result;
  return result;
};

// 选择文件夹
const handleFolderSelect = (selectedKeys: string[], info: any) => {
  const node = info.node;
  if (node.isFolder) {
    currentFolder.value = node.filename;
    // 提取该文件夹下的所有视频
    const videos: VideoFile[] = [];
    extractAllVideos(node.children || [], videos);
    currentVideos.value = videos;
    // 设置懒加载
    setupLazyLoading();
  } else {
    // 点击视频文件,预览
    handlePreview(node);
  }
  selectedVideos.value = [];
};

// 视频卡片点击
const handleVideoClick = (video: VideoFile) => {
  handlePreview(video);
};

// 复选框变化
const handleCheckboxChange = (fullPath: string) => {
  const index = selectedVideos.value.indexOf(fullPath);
  if (index > -1) {
    selectedVideos.value.splice(index, 1);
  } else {
    selectedVideos.value.push(fullPath);
  }
};

// 预览视频
const handlePreview = (video: VideoFile) => {
  previewVideo.value = video;
  previewVisible.value = true;
};

// 关闭预览
const handleClosePreview = () => {
  previewVisible.value = false;
  previewVideo.value = null;
};

// 查找推理结果
const handleFindResult = async (video: VideoFile) => {
  try {
    loading.value = true;
    const result = await videoDatabaseApi.findResultVideo(video.fullPath);

    if (result) {
      // 如果找到结果，切换到推理结果标签页并预览
      if (Array.isArray(result)) {
        // 找到多个结果，显示最新的
        message.success(`找到 ${result.length} 个推理结果，显示最新的`);
        previewVideo.value = result[0];
      } else {
        // 找到单个结果
        message.success('找到推理结果');
        previewVideo.value = result;
      }
      previewVisible.value = true;
    } else {
      message.info('未找到该视频的推理结果');
    }
  } catch (error: any) {
    message.error(error.message || '查询推理结果失败');
  } finally {
    loading.value = false;
  }
};

// 删除单个视频
const handleDelete = async (filePath: string) => {
  try {
    // 关闭预览模态框（如果正在预览该视频）
    if (previewVisible.value && currentPreviewVideo.value?.path === filePath) {
      previewVisible.value = false;
      currentPreviewVideo.value = null;
      // 等待一小段时间，确保视频元素被清理
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    await videoDatabaseApi.deleteVideo(filePath);
    message.success('删除成功');

    // 立即从本地状态移除，无需等待重新加载
    currentVideos.value = currentVideos.value.filter(v => v.path !== filePath);
    // 同步清除缓存
    if (activeTab.value === 'original') {
      cachedOriginalVideos.value = cachedOriginalVideos.value.filter(v => v.path !== filePath);
    } else {
      cachedInferenceVideos.value = cachedInferenceVideos.value.filter(v => v.path !== filePath);
    }
  } catch (error: any) {
    const errorMsg = error.message || '删除失败';
    if (errorMsg.includes('文件被占用') || errorMsg.includes('PermissionError')) {
      message.error('文件被占用，请关闭正在播放该视频的页面后重试');
    } else {
      message.error(errorMsg);
    }
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedVideos.value.length === 0) return;

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedVideos.value.length} 个视频吗？删除前请确保没有正在播放这些视频。`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 关闭预览模态框（如果正在预览选中的视频）
        if (previewVisible.value && currentPreviewVideo.value?.path &&
            selectedVideos.value.includes(currentPreviewVideo.value.path)) {
          previewVisible.value = false;
          currentPreviewVideo.value = null;
          // 等待一小段时间，确保视频元素被清理
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        const result = await videoDatabaseApi.batchDeleteVideos(selectedVideos.value);
        if (result.failed > 0) {
          message.warning(
            `成功删除 ${result.deleted} 个视频, ${result.failed} 个失败。失败原因可能是文件被占用。`,
          );
        } else {
          message.success(`成功删除 ${result.deleted} 个视频`);
        }
        // 立即从本地状态移除已删除的视频
        const deletedPaths = new Set(selectedVideos.value);
        currentVideos.value = currentVideos.value.filter(v => !deletedPaths.has(v.path));
        if (activeTab.value === 'original') {
          cachedOriginalVideos.value = cachedOriginalVideos.value.filter(v => !deletedPaths.has(v.path));
        } else {
          cachedInferenceVideos.value = cachedInferenceVideos.value.filter(v => !deletedPaths.has(v.path));
        }
        selectedVideos.value = [];
      } catch (error: any) {
        message.error(error.message || '批量删除失败');
      }
    },
  });
};

// 刷新
const handleRefresh = () => {
  selectedVideos.value = [];
  selectedTreeKeys.value = []; // 清空树的选中状态
  currentFolder.value = '';
  // 强制刷新，清除当前标签页的缓存
  if (activeTab.value === 'original') {
    originalDataLoaded.value = false;
  } else {
    inferenceDataLoaded.value = false;
  }
  loadVideoDatabase(true);
};

// 上传单个视频
const handleUploadSingle = async (file: File) => {
  uploadType.value = 'single';
  uploadModalTitle.value = '上传单个视频 - 选择存储路径';
  pendingUploadFile.value = file;
  uploadTargetPath.value = '';
  uploadPathModalVisible.value = true;
  return false;
};

// 上传视频压缩包
const handleUploadZip = async (file: File) => {
  uploadType.value = 'zip';
  uploadModalTitle.value = '上传视频压缩包 - 选择解压目标路径';
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
      await videoDatabaseApi.uploadVideo(formData);
      message.success('视频上传成功');
    } else {
      const result = await videoDatabaseApi.uploadVideoZip(formData);
      message.success(`成功解压 ${result.extracted_count} 个视频文件`);
    }

    uploadPathModalVisible.value = false;
    pendingUploadFile.value = null;
    uploadTargetPath.value = '';

    await loadVideoDatabase();
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

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 格式化时长
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 获取视频URL（支持 MinIO 路径格式）
const getVideoUrl = (path: string) => {
  if (!path) return '';

  // 1. 处理 MinIO 格式: minio://videos/xxx 或 minio://vid-results/xxx
  if (path.startsWith('minio://')) {
    const minioPath = path.replace('minio://', '');
    const firstSlash = minioPath.indexOf('/');
    if (firstSlash > 0) {
      const bucket = minioPath.substring(0, firstSlash);
      const objectName = minioPath.substring(firstSlash + 1);

      if (bucket === 'videos') {
        return `/api/uploads/videos/${objectName}`;
      } else if (bucket === 'vid-results') {
        return `/api/uploads/vid_results/${objectName}`;
      }
    }
  }

  // 2. 处理 HTTP 路径
  if (path.startsWith('/uploads')) {
    return `/api${path}`;
  }

  // 3. 默认处理为视频相对路径
  return `/api/uploads/videos/${path}`;
};

// 懒加载视频
const setupLazyLoading = () => {
  // 等待 DOM 更新
  setTimeout(() => {
    const lazyVideos = document.querySelectorAll('.lazy-video');

    const videoObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target as HTMLVideoElement;
          const dataSrc = video.getAttribute('data-src');

          if (dataSrc && !video.src) {
            video.src = dataSrc;
            video.preload = 'metadata';

            // 加载元数据后隐藏占位符
            video.addEventListener('loadedmetadata', () => {
              video.classList.add('loaded');
              const placeholder = video.parentElement?.querySelector('.video-placeholder');
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'none';
              }
            });

            video.addEventListener('error', () => {
              video.classList.add('error');
              console.error('视频加载失败:', dataSrc);
            });

            // 停止观察该视频
            observer.unobserve(video);
          }
        }
      });
    }, {
      root: null,
      rootMargin: '50px', // 提前50px开始加载
      threshold: 0.01
    });

    lazyVideos.forEach(video => {
      videoObserver.observe(video);
    });
  }, 100);
};

onMounted(() => {
  loadVideoDatabase();
});
</script>

<style scoped lang="scss">
.video-database-container {
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

  .video-tabs {
    margin-bottom: 16px;

    :deep(.ant-tabs-nav) {
      margin-bottom: 0;
    }

    :deep(.ant-tabs-tab) {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
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

  .video-content-panel {
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

    .video-grid-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      background: #fff;
      padding: 16px;
      min-height: 0;

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 300px;
      }

      .video-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        justify-content: start;
        grid-auto-rows: min-content;
        align-content: start;
      }
    }
  }

  .video-card {
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

    .video-thumbnail {
      position: relative;
      width: 100%;
      padding-top: 75%; // 4:3 宽高比，适合视频
      background: #000;
      overflow: hidden;

      .thumbnail-video {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s ease;

        &.lazy-video {
          opacity: 0;

          &.loaded {
            opacity: 1;
          }

          &.error {
            opacity: 0.3;
          }
        }
      }

      .video-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1a1a1a;
        color: #666;
        z-index: 1;

        .placeholder-text {
          font-size: 13px;
        }
      }

      .video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;

        .play-icon {
          font-size: 48px;
          color: #fff;
        }
      }

      &:hover .video-overlay {
        opacity: 1;
      }

      .video-checkbox {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
      }

      .video-duration {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }
    }

    .video-info {
      padding: 12px;

      .video-name {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .video-meta {
        display: flex;
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

      .video-actions {
        display: flex;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid #f0f0f0;
      }
    }
  }
}

.preview-container {
  .preview-video {
    width: 100%;
    max-height: 70vh;
    background: #000;
  }

  .preview-info {
    margin-top: 16px;
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
      }
    }
  }
}
</style>
