<template>
  <div class="video-database-container">
    <Card title="视频数据库管理" :bordered="false">
      <div class="content-wrapper">
        <!-- 左侧: 文件夹树 -->
        <div class="folder-tree-panel">
          <div class="panel-title">📁 文件夹</div>
          <div class="tree-container">
            <Tree
              v-if="treeData.length > 0"
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
              <Button
                type="primary"
                danger
                :disabled="selectedVideos.length === 0"
                @click="handleBatchDelete"
              >
                删除选中 ({{ selectedVideos.length }})
              </Button>
              <Button @click="handleRefresh">刷新</Button>
            </Space>
            <div class="info-text">
              当前文件夹: {{ currentFolder || '根目录' }}
              <span v-if="currentVideos.length > 0">
                ({{ currentVideos.length }} 个视频)
              </span>
            </div>
          </div>

          <!-- 视频网格 -->
          <div class="video-grid-container">
            <div v-if="currentVideos.length === 0" class="empty-state">
              <Empty description="预览视频框" />
            </div>
            <div v-else class="video-grid">
              <div
                v-for="video in currentVideos"
                :key="video.id"
                class="video-card"
                :class="{ selected: selectedVideos.includes(video.fullPath) }"
                @click="handleVideoClick(video)"
              >
                <div class="video-thumbnail">
                  <video
                    :src="video.path"
                    class="thumbnail-video"
                    preload="metadata"
                  ></video>
                  <div class="video-overlay">
                    <span class="play-icon">▶</span>
                  </div>
                  <Checkbox
                    :checked="selectedVideos.includes(video.fullPath)"
                    class="video-checkbox"
                    @click.stop="handleCheckboxChange(video.fullPath)"
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
                    <Popconfirm
                      title="确定要删除这个视频吗？"
                      ok-text="确定"
                      cancel-text="取消"
                      @confirm="handleDelete(video.fullPath)"
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
          :src="previewVideo.path"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
} from 'ant-design-vue';
import { videoDatabaseApi, type VideoFile } from '#/api/system/video-database';

const treeData = ref<VideoFile[]>([]);
const currentFolder = ref('');
const currentVideos = ref<VideoFile[]>([]);
const selectedVideos = ref<string[]>([]);
const previewVisible = ref(false);
const previewVideo = ref<VideoFile | null>(null);

// 加载视频数据库
const loadVideoDatabase = async () => {
  try {
    const data = await videoDatabaseApi.getVideoDatabase();
    treeData.value = data;

    // 默认显示所有视频
    extractAllVideos(data);
  } catch (error: any) {
    message.error(error.message || '加载视频数据库失败');
  }
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

// 删除单个视频
const handleDelete = async (filePath: string) => {
  try {
    await videoDatabaseApi.deleteVideo(filePath);
    message.success('删除成功');
    loadVideoDatabase();
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedVideos.value.length === 0) return;

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedVideos.value.length} 个视频吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        const result = await videoDatabaseApi.batchDeleteVideos(selectedVideos.value);
        if (result.failed > 0) {
          message.warning(
            `成功删除 ${result.deleted} 个视频, ${result.failed} 个失败`,
          );
        } else {
          message.success(`成功删除 ${result.deleted} 个视频`);
        }
        selectedVideos.value = [];
        loadVideoDatabase();
      } catch (error: any) {
        message.error(error.message || '批量删除失败');
      }
    },
  });
};

// 刷新
const handleRefresh = () => {
  selectedVideos.value = [];
  loadVideoDatabase();
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

onMounted(() => {
  loadVideoDatabase();
});
</script>

<style scoped lang="scss">
.video-database-container {
  padding: 16px;
  height: calc(100vh - 200px);
  overflow: hidden;

  .content-wrapper {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 16px;
    height: calc(100vh - 250px);
    max-height: 800px;
  }

  .folder-tree-panel {
    display: flex;
    flex-direction: column;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;

    .panel-title {
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #d9d9d9;
      font-weight: 500;
      font-size: 14px;
    }

    .tree-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
  }

  .video-content-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 0;
      margin-bottom: 6px;

      .info-text {
        font-size: 14px;
        color: #666;
      }
    }

    .video-grid-container {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      background: #fff;
      padding: 16px;

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 300px;
      }

      .video-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, 240px);
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
      height: 135px;
      background: #000;
      overflow: hidden;

      .thumbnail-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
