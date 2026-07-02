<template>
  <Modal
    v-model:open="visible"
    :title="$t('page.system.selectFromDatabase')"
    width="900px"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="image-database-modal">
      <Row :gutter="16">
        <!-- 左侧文件树 -->
        <Col :span="8">
          <Card :bordered="false" class="tree-container">
            <Tree
              v-model:selectedKeys="selectedKeys"
              v-model:checkedKeys="checkedKeys"
              :tree-data="treeData"
              :checkable="allowMultiple"
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

        <!-- 右侧图片预览 -->
        <Col :span="16">
          <Card :bordered="false" class="preview-container">
            <!-- 单张图片预览 -->
            <div v-if="!props.allowMultiple && selectedImage" class="preview-content">
              <img
                :src="getImageUrl(selectedImage.path)"
                :alt="selectedImage.filename"
                class="preview-image"
              />
              <Descriptions :column="1" size="small" class="mt-4">
                <DescriptionsItem label="文件名">
                  {{ selectedImage.filename }}
                </DescriptionsItem>
                <DescriptionsItem label="大小">
                  {{ formatFileSize(selectedImage.size) }}
                </DescriptionsItem>
                <DescriptionsItem label="上传时间">
                  {{ formatDate(selectedImage.uploadedAt) }}
                </DescriptionsItem>
              </Descriptions>
            </div>

            <!-- 多张图片预览 -->
            <div v-else-if="props.allowMultiple && checkedImages.length > 0" class="multi-preview-content">
              <div class="mb-2 text-sm text-gray-600">
                已选择 {{ checkedImages.length }} 张图片
              </div>
              <div class="preview-grid">
                <div
                  v-for="image in checkedImages"
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

            <Empty v-else description="请选择图片" />
          </Card>
        </Col>
      </Row>
    </div>
  </Modal>
</template>

<script setup lang="ts">
// @ts-nocheck
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
} from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';
import { defectDetectionApi, type ImageDatabaseItem } from '#/api/system/defect-detection';
import { message } from 'ant-design-vue';

interface Props {
  open: boolean;
  allowMultiple?: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', data: ImageDatabaseItem[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  allowMultiple: false,
});

const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const treeData = ref<TreeProps['treeData']>([]);
const selectedKeys = ref<string[]>([]);
const checkedKeys = ref<string[]>([]);
const selectedImage = ref<ImageDatabaseItem | null>(null);
const imageMap = ref<Map<string, ImageDatabaseItem>>(new Map());

// 已勾选的图片列表（用于多选预览）
const checkedImages = computed(() => {
  const images: ImageDatabaseItem[] = [];
  if (Array.isArray(checkedKeys.value)) {
    checkedKeys.value.forEach((key) => {
      const item = imageMap.value.get(String(key));
      if (item && !item.isFolder) {
        images.push(item);
      }
    });
  }
  return images;
});

// 加载图片数据库
const loadDatabase = async () => {
  try {
    const data = await defectDetectionApi.getImageDatabase();
    console.log('后端返回的数据:', data);
    const { tree, map } = buildTree(data);
    console.log('构建的树:', tree);
    console.log('图片映射:', map);
    treeData.value = tree;
    imageMap.value = map;
  } catch (error) {
    console.error('加载图片库失败:', error);
    message.error('加载图片库失败');
  }
};

// 构建树形结构(递归处理后端返回的树形数据)
const buildTree = (items: ImageDatabaseItem[]) => {
  const map = new Map<string, ImageDatabaseItem>();

  const buildTreeNode = (data: ImageDatabaseItem[]): TreeProps['treeData'] => {
    return data.map((item) => {
      if (item.isFolder && item.children) {
        // 文件夹节点,递归构建子树
        return {
          key: item.id,
          title: item.filename,
          isLeaf: false,
          selectable: true,
          children: buildTreeNode(item.children) // 递归
        };
      } else {
        // 图片文件节点
        map.set(String(item.id), item);
        return {
          key: item.id,
          title: item.filename,
          isLeaf: true,
          selectable: true,
          dataRef: item
        };
      }
    });
  };

  const tree = buildTreeNode(items);
  return { tree, map };
};

// 选择树节点
const handleTreeSelect = (keys: string[], info: any) => {
  if (keys.length > 0) {
    const key = keys[0];
    // 从 map 中获取图片数据
    const item = imageMap.value.get(String(key));
    if (item && !item.isFolder) {
      selectedImage.value = item;
    }
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 获取图片URL（支持 MinIO 路径格式）
const getImageUrl = (path: string) => {
  if (!path) return '';

  // 1. 处理 MinIO 格式: minio://images/xxx
  if (path.startsWith('minio://')) {
    const minioPath = path.replace('minio://', '');
    const firstSlash = minioPath.indexOf('/');
    if (firstSlash > 0) {
      const bucket = minioPath.substring(0, firstSlash);
      const objectName = minioPath.substring(firstSlash + 1);

      if (bucket === 'images') {
        return `/api/uploads/images/${objectName}`;
      } else if (bucket === 'img-results') {
        return `/api/uploads/img_results/${objectName}`;
      }
    }
  }

  // 2. 处理 HTTP 路径
  if (path.startsWith('/uploads')) {
    return `/api${path}`;
  }

  // 3. 默认处理为原始图片相对路径
  return `/api/uploads/images/${path}`;
};

// 确认选择
const handleConfirm = () => {
  const selectedItems: ImageDatabaseItem[] = [];

  if (props.allowMultiple) {
    // 多选模式
    checkedKeys.value.forEach((key) => {
      const item = imageMap.value.get(String(key));
      if (item && !item.isFolder) {
        // 确保传递 fullPath（完整文件系统路径）
        selectedItems.push({
          ...item,
          id: item.fullPath || item.id  // 使用 fullPath 作为 id
        });
      }
    });
  } else {
    // 单选模式
    if (selectedImage.value) {
      selectedItems.push({
        ...selectedImage.value,
        id: selectedImage.value.fullPath || selectedImage.value.id
      });
    }
  }

  if (selectedItems.length === 0) {
    message.warning('请选择图片');
    return;
  }

  emit('confirm', selectedItems);
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
      checkedKeys.value = [];
      selectedImage.value = null;
    }
  }
);
</script>

<style scoped lang="scss">
.image-database-modal {
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
    .preview-image {
      width: 100%;
      max-height: 350px;
      object-fit: contain;
    }
  }

  .multi-preview-content {
    max-height: 100%;
    overflow-y: auto;

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
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
