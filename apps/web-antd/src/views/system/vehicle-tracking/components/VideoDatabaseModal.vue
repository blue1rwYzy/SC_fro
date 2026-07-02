<template>
  <Modal
    v-model:open="visible"
    title="从视频库选择"
    width="900px"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="video-database-modal">
      <Row :gutter="16">
        <!-- 左侧文件树 -->
        <Col :span="8">
          <Card :bordered="false" class="tree-container">
            <Tree
              v-model:selectedKeys="selectedKeys"
              :tree-data="treeData"
              :default-expand-all="false"
              :show-icon="false"
              @select="handleTreeSelect"
              :field-names="{ title: 'title', key: 'key', children: 'children' }"
            >
              <template #title="{ title }">
                <span :title="title" class="tree-node-title">{{ title }}</span>
              </template>
            </Tree>
          </Card>
        </Col>

        <!-- 右侧视频预览 -->
        <Col :span="16">
          <Card :bordered="false" class="preview-container">
            <!-- 视频预览 -->
            <div v-if="selectedVideo" class="preview-content">
              <video
                :src="getVideoUrl(selectedVideo.path)"
                controls
                controlsList="nodownload"
                preload="metadata"
                class="preview-video"
                @error="handleVideoError"
              >
                <source :src="getVideoUrl(selectedVideo.path)" type="video/mp4" />
                您的浏览器不支持视频播放
              </video>
              <Descriptions :column="1" size="small" class="mt-4">
                <DescriptionsItem label="文件名">
                  {{ selectedVideo.filename }}
                </DescriptionsItem>
                <DescriptionsItem label="大小">
                  {{ formatFileSize(selectedVideo.size) }}
                </DescriptionsItem>
                <DescriptionsItem v-if="selectedVideo.duration" label="时长">
                  {{ formatDuration(selectedVideo.duration) }}
                </DescriptionsItem>
                <DescriptionsItem v-if="selectedVideo.width && selectedVideo.height" label="分辨率">
                  {{ selectedVideo.width }} x {{ selectedVideo.height }}
                </DescriptionsItem>
                <DescriptionsItem label="上传时间">
                  {{ formatDate(selectedVideo.uploadedAt) }}
                </DescriptionsItem>
              </Descriptions>
            </div>

            <Empty v-else description="请选择视频" />
          </Card>
        </Col>
      </Row>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Empty,
  Modal,
  Row,
  Tree,
  message,
} from 'ant-design-vue';
import type { Key } from 'ant-design-vue/es/_util/type';
import type { TreeProps } from 'ant-design-vue';
import { videoDatabaseApi, type VideoFile } from '#/api/system/video-database';

interface Props {
  open: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', data: VideoFile): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const treeData = ref<NonNullable<TreeProps['treeData']>>([]);
const selectedKeys = ref<Key[]>([]);
const selectedVideo = ref<VideoFile | null>(null);
const videoMap = ref<Map<string, VideoFile>>(new Map());

// 加载视频数据库
const loadDatabase = async () => {
  try {
    const data = await videoDatabaseApi.getVideoDatabase();
    console.log('后端返回的视频数据:', data);
    const { tree, map } = buildTree(data);
    console.log('构建的树:', tree);
    console.log('视频映射:', map);
    treeData.value = tree;
    videoMap.value = map;
  } catch (error) {
    console.error('加载视频库失败:', error);
    message.error('加载视频库失败');
  }
};

// 构建树形结构
const buildTree = (items: VideoFile[]) => {
  const map = new Map<string, VideoFile>();

  const buildTreeNode = (data: VideoFile[]): NonNullable<TreeProps['treeData']> => {
    return data.map((item) => {
      if (item.isFolder && item.children) {
        // 文件夹节点
        return {
          key: item.id,
          title: item.filename,
          isLeaf: false,
          selectable: true,
          children: buildTreeNode(item.children),
        };
      } else {
        // 视频文件节点
        map.set(String(item.id), item);
        return {
          key: item.id,
          title: item.filename,
          isLeaf: true,
          selectable: true,
          dataRef: item,
        };
      }
    });
  };

  const tree = buildTreeNode(items);
  return { tree, map };
};

// 选择树节点
const handleTreeSelect = (keys: Key[]) => {
  if (keys.length > 0) {
    const key = keys[0];
    const item = videoMap.value.get(String(key));
    if (item && !item.isFolder) {
      selectedVideo.value = item;
    }
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// 格式化时长
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
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
        return `/api/system/uploads/videos/${objectName}`;
      } else if (bucket === 'vid-results') {
        return `/api/system/uploads/vid_results/${objectName}`;
      }
    }
  }

  // 2. 处理 HTTP 路径
  if (path.startsWith('/uploads')) {
    return `/api/system${path}`;
  }

  // 3. 默认处理为视频相对路径
  return `/api/system/uploads/videos/${path}`;
};

// 处理视频加载错误
const handleVideoError = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.error('视频预览加载失败:', video.error);
};

// 确认选择
const handleConfirm = () => {
  if (!selectedVideo.value) {
    message.warning('请选择视频');
    return;
  }

  emit('confirm', selectedVideo.value);
  visible.value = false;
};

// 取消
const handleCancel = () => {
  visible.value = false;
};

// 监听打开状态，加载数据
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      loadDatabase();
      selectedKeys.value = [];
      selectedVideo.value = null;
    }
  }
);
</script>

<style scoped lang="scss">
.video-database-modal {
  .tree-container {
    height: 500px;
    overflow-x: auto;
    overflow-y: auto;

    :deep(.ant-tree) {
      min-width: max-content;

      .ant-tree-treenode {
        white-space: nowrap;
      }

      .ant-tree-node-content-wrapper {
        white-space: nowrap;
        overflow: visible;
      }

      .ant-tree-title {
        white-space: nowrap;
        overflow: visible;
      }
    }
  }

  .tree-node-title {
    display: inline-block;
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    vertical-align: middle;
  }

  .preview-container {
    height: 500px;
    overflow-y: auto;
  }

  .preview-content {
    .preview-video {
      width: 100%;
      max-height: 350px;
      background: #000;
      border-radius: 4px;
    }
  }
}
</style>
