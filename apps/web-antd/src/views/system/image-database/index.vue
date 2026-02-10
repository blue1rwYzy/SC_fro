<template>
  <div class="image-database-container">
    <Card title="图像数据库管理" :bordered="false">
      <!-- 操作栏 -->
      <div class="action-bar">
        <Space :size="16">
          <Upload
            :before-upload="handleUploadSingle"
            :show-upload-list="false"
            accept="image/*"
          >
            <Button size="large" class="custom-btn">
              上传单张图片
            </Button>
          </Upload>

          <Upload
            :before-upload="handleUploadZip"
            :show-upload-list="false"
            accept=".zip"
          >
            <Button size="large" class="custom-btn">
              上传图片压缩包
            </Button>
          </Upload>

          <Button @click="refreshDatabase" :loading="loading" size="large" class="custom-btn">
            刷新
          </Button>

          <Button
            danger
            size="large"
            class="custom-btn custom-btn-danger"
            :disabled="currentImages.length === 0"
            @click="handleBatchDeleteChecked"
          >
            删除选中 ({{ currentImages.length }})
          </Button>
        </Space>

        <div class="stats">
          <span class="text-gray-600 font-medium">共 {{ totalImages }} 张图片</span>
        </div>
      </div>

      <!-- 文件夹树和图片网格 -->
      <div class="content-layout">
        <!-- 左侧文件夹树 -->
        <div class="folder-tree-panel">
          <div class="panel-header">
            <strong>图像数据库根目录</strong>
          </div>
          <Tree
            v-if="folderTree.length > 0"
            v-model:checkedKeys="checkedKeys"
            :tree-data="folderTree"
            :checkable="true"
            :selectable="false"
            :default-expand-all="false"
            :show-line="false"
            :show-icon="true"
            @check="handleTreeCheck"
          >
            <template #icon="{ isLeaf }">
              <span>{{ isLeaf ? '🖼️' : '📁' }}</span>
            </template>
            <template #title="{ title }">
              <span class="tree-node-title">{{ title }}</span>
            </template>
          </Tree>
          <Empty v-else description="暂无文件" />
        </div>

        <!-- 右侧图片网格 -->
        <div class="image-grid-panel">
          <div class="panel-header">
            <Checkbox
              v-if="currentImages.length > 0"
              :indeterminate="indeterminate"
              :checked="checkAll"
              @change="handleCheckAllChange"
            >
              全选
            </Checkbox>
            <span v-else class="text-gray-500">当前文件夹: {{ currentFolderDisplay }}</span>
          </div>

          <div v-if="loading" class="loading-container">
            <Spin size="large" tip="加载中..." />
          </div>

          <div v-else-if="currentImages.length === 0" class="empty-container">
            <Empty description="预览图片框" />
          </div>

          <div v-else class="image-grid">
            <div
              v-for="image in currentImages"
              :key="image.id"
              class="image-item"
              :class="{ selected: selectedImages.includes(image.id) }"
            >
              <Checkbox
                class="image-checkbox"
                :checked="selectedImages.includes(image.id)"
                @change="(e) => handleImageCheck(image.id, e.target.checked)"
              />

              <div class="image-wrapper" @click="handleImagePreview(image)">
                <img :src="getImageUrl(image.path)" :alt="image.filename" />
              </div>

              <div class="image-info">
                <Tooltip :title="image.filename">
                  <div class="image-name truncate">{{ image.filename }}</div>
                </Tooltip>
                <div class="image-size text-gray-500 text-xs">
                  {{ formatFileSize(image.size) }}
                </div>
              </div>

              <div class="image-actions">
                <Button
                  size="small"
                  block
                  class="delete-btn"
                  @click="handleDelete(image)"
                >
                  🗑️ 删除
                </Button>
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
    >
      <div class="preview-container">
        <img
          v-if="previewImage"
          :src="getImageUrl(previewImage.path)"
          :alt="previewImage.filename"
          class="preview-image"
        />
      </div>
      <div class="preview-info">
        <Descriptions :column="2" size="small">
          <DescriptionsItem label="文件名">{{ previewImage?.filename }}</DescriptionsItem>
          <DescriptionsItem label="大小">{{ formatFileSize(previewImage?.size || 0) }}</DescriptionsItem>
          <DescriptionsItem label="路径">{{ previewImage?.folder || '/' }}</DescriptionsItem>
          <DescriptionsItem label="上传时间">{{ previewImage?.uploadedAt }}</DescriptionsItem>
        </Descriptions>
      </div>
    </Modal>

    <!-- 上传路径选择对话框 -->
    <Modal
      v-model:open="uploadPathModalVisible"
      :title="uploadModalTitle"
      @ok="handleUploadConfirm"
      @cancel="handleUploadCancel"
    >
      <div style="margin: 20px 0;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">
          存储路径（相对于图像数据库根目录）：
        </label>
        <Input
          v-model:value="uploadTargetPath"
          placeholder="例如: test2 或 val/images 或留空表示根目录"
          size="large"
        />
        <div style="margin-top: 8px; color: #666; font-size: 12px;">
          提示：路径会自动创建，无需手动创建文件夹
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Space,
  Spin,
  Tooltip,
  Upload,
  message,
  Modal,
  Tree,
  Descriptions,
  Input
} from 'ant-design-vue';
import type { DescriptionsProps } from 'ant-design-vue';
import { defectDetectionApi, type ImageDatabaseItem } from '#/api/system/defect-detection';

const DescriptionsItem = Descriptions.Item;

// 状态
const loading = ref(false);
const allImages = ref<ImageDatabaseItem[]>([]);
const folderTree = ref<any[]>([]);
const checkedKeys = ref<string[]>([]); // 勾选的节点key
const currentFolder = ref<string>('/');
const selectedImages = ref<(number | string)[]>([]);
const previewVisible = ref(false);
const previewImage = ref<ImageDatabaseItem | null>(null);

// 上传相关状态
const uploadPathModalVisible = ref(false);
const uploadTargetPath = ref('');
const uploadModalTitle = ref('');
const pendingUploadFile = ref<File | null>(null);
const uploadType = ref<'single' | 'zip'>('single');

// 计算属性 - 只显示勾选的图片
const currentImages = computed(() => {
  if (checkedKeys.value.length === 0) {
    return [];
  }

  // 过滤出勾选的图片
  return allImages.value.filter(img => {
    // 图片的key是它的id(完整文件路径)
    return checkedKeys.value.includes(img.id);
  });
});

const totalImages = computed(() => allImages.value.length);

const currentFolderDisplay = computed(() => {
  return currentFolder.value === '/' ? '根目录' : currentFolder.value;
});

const checkAll = computed(() => {
  return currentImages.value.length > 0 &&
    selectedImages.value.length === currentImages.value.length;
});

const indeterminate = computed(() => {
  return selectedImages.value.length > 0 &&
    selectedImages.value.length < currentImages.value.length;
});

// 获取图片URL
const getImageUrl = (path: string) => {
  // path 已经是完整的访问路径,如 /uploads/images/xxx.jpg
  // 直接添加 /api/system 前缀
  return `/api/system${path}`;
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 构建文件夹树(直接使用后端返回的树形结构)
const buildFolderTree = (data: ImageDatabaseItem[]): any[] => {
  return data.map(item => {
    if (item.isFolder && item.children) {
      // 文件夹节点,递归构建子树
      return {
        title: item.filename,
        key: item.id, // 使用后端返回的id
        isLeaf: false,
        checkable: true,
        children: buildFolderTree(item.children) // 递归构建子节点
      };
    } else {
      // 图片文件节点
      return {
        title: item.filename,
        key: item.id, // 使用后端返回的id(文件路径)
        isLeaf: true,
        checkable: true,
      };
    }
  });
};

// 加载数据库
const loadDatabase = async () => {
  loading.value = true;
  try {
    console.log('正在加载图像数据库...');
    const response = await defectDetectionApi.getImageDatabase();
    console.log('API 响应:', response);

    // 保存原始数据结构(用于构建文件夹树)
    const rawData = response;

    // 展平数据结构(用于图片显示)
    const flatImages: ImageDatabaseItem[] = [];
    const flattenImages = (items: ImageDatabaseItem[]) => {
      items.forEach(item => {
        if (item.isFolder && item.children) {
          flattenImages(item.children);
        } else if (!item.isFolder) {
          flatImages.push(item);
        }
      });
    };

    flattenImages(response);
    allImages.value = flatImages;
    console.log('图片总数:', flatImages.length);

    // 使用原始数据构建文件夹树
    folderTree.value = buildFolderTree(rawData);
    console.log('文件夹树:', folderTree.value);

    if (flatImages.length === 0) {
      message.info('数据库中暂无图片，请先上传图片');
    }
  } catch (error: any) {
    console.error('加载图像数据库失败:', error);
    message.error(`加载图像数据库失败: ${error.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
};

// 刷新数据库
const refreshDatabase = () => {
  selectedImages.value = [];
  checkedKeys.value = [];
  loadDatabase();
};

// 树节点勾选事件
const handleTreeCheck = (checkedKeysValue: string[] | { checked: string[]; halfChecked: string[] }) => {
  console.log('勾选的节点:', checkedKeysValue);
  // checkedKeysValue 可能是数组或对象,统一处理
  if (Array.isArray(checkedKeysValue)) {
    checkedKeys.value = checkedKeysValue;
  } else {
    checkedKeys.value = checkedKeysValue.checked;
  }
};

// 图片选择
const handleImageCheck = (imageId: number | string, checked: boolean) => {
  if (checked) {
    selectedImages.value.push(imageId);
  } else {
    selectedImages.value = selectedImages.value.filter(id => id !== imageId);
  }
};

// 全选
const handleCheckAllChange = (e: any) => {
  if (e.target.checked) {
    selectedImages.value = currentImages.value.map(img => img.id);
  } else {
    selectedImages.value = [];
  }
};

// 上传单张图片
const handleUploadSingle = async (file: File) => {
  // 显示路径选择对话框
  uploadType.value = 'single';
  uploadModalTitle.value = '上传单张图片 - 选择存储路径';
  pendingUploadFile.value = file;
  uploadTargetPath.value = '';
  uploadPathModalVisible.value = true;

  return false; // 阻止自动上传
};

// 上传压缩包
const handleUploadZip = async (file: File) => {
  // 显示路径选择对话框
  uploadType.value = 'zip';
  uploadModalTitle.value = '上传图片压缩包 - 选择解压目标路径';
  pendingUploadFile.value = file;
  uploadTargetPath.value = '';
  uploadPathModalVisible.value = true;

  return false; // 阻止自动上传
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
      // 上传单张图片
      await defectDetectionApi.uploadToDatabase(formData);
      message.success('图片上传成功');
    } else {
      // 上传压缩包
      await defectDetectionApi.uploadZipToDatabase(formData);
      message.success('压缩包上传并解压成功');
    }

    // 关闭对话框
    uploadPathModalVisible.value = false;
    pendingUploadFile.value = null;
    uploadTargetPath.value = '';

    // 刷新数据库
    await loadDatabase();
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

// 删除图片
const handleDelete = (image: ImageDatabaseItem) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除图片 "${image.filename}" 吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 使用文件系统路径删除
        await defectDetectionApi.deleteImageFile(image.id as string);
        message.success('删除成功');
        // 从勾选列表中移除
        checkedKeys.value = checkedKeys.value.filter(key => key !== image.id);
        selectedImages.value = selectedImages.value.filter(id => id !== image.id);
        await loadDatabase();
      } catch (error) {
        message.error('删除失败');
        console.error(error);
      }
    },
  });
};

// 批量删除
const handleBatchDelete = () => {
  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除选中的 ${selectedImages.value.length} 张图片吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 使用文件系统路径批量删除
        await defectDetectionApi.batchDeleteImageFiles(selectedImages.value as string[]);
        message.success('批量删除成功');
        // 从勾选列表中移除
        checkedKeys.value = checkedKeys.value.filter(key => !selectedImages.value.includes(key));
        selectedImages.value = [];
        await loadDatabase();
      } catch (error) {
        message.error('批量删除失败');
        console.error(error);
      }
    },
  });
};

// 批量删除勾选的图片（基于左侧树勾选）
const handleBatchDeleteChecked = () => {
  if (currentImages.value.length === 0) {
    message.warning('请先勾选要删除的图片');
    return;
  }

  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除勾选的 ${currentImages.value.length} 张图片吗？此操作不可恢复！`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 收集所有要删除的图片路径
        const filePaths = currentImages.value.map(img => img.id as string);

        // 调用批量删除接口
        await defectDetectionApi.batchDeleteImageFiles(filePaths);
        message.success(`成功删除 ${filePaths.length} 张图片`);

        // 清空勾选状态和选中状态
        checkedKeys.value = [];
        selectedImages.value = [];

        // 重新加载数据库
        await loadDatabase();
      } catch (error: any) {
        message.error(`批量删除失败: ${error.message || '未知错误'}`);
        console.error('批量删除失败:', error);
      }
    },
  });
};

// 图片预览
const handleImagePreview = (image: ImageDatabaseItem) => {
  previewImage.value = image;
  previewVisible.value = true;
};

// 初始化
onMounted(() => {
  loadDatabase();
});
</script>

<style scoped lang="less">
.image-database-container {
  padding: 16px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 2px 0;

  :deep(.ant-space) {
    flex-wrap: wrap;
  }

  :deep(.ant-space-item) {
    margin-right: 16px !important;
  }

  .custom-btn {
    min-width: 120px;
    height: 40px;
    padding: 0 24px;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    color: #333333;
    font-size: 14px;
    font-weight: 400;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      border-color: #40a9ff;
      color: #40a9ff;
      box-shadow: 0 2px 4px rgba(64, 169, 255, 0.2);
    }

    &:active:not(:disabled) {
      border-color: #096dd9;
      color: #096dd9;
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
      box-shadow: 0 2px 4px rgba(255, 77, 79, 0.2);
    }

    &:active:not(:disabled) {
      border-color: #cf1322;
      color: #cf1322;
    }
  }

  // 移除默认的按钮样式
  :deep(.ant-btn-primary) {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #333333;

    &:hover:not(:disabled) {
      background: #ffffff;
      border-color: #40a9ff;
      color: #40a9ff;
    }
  }

  :deep(.ant-btn-dangerous) {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #333333;

    &:hover:not(:disabled) {
      background: #ffffff;
      border-color: #ff4d4f;
      color: #ff4d4f;
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: rgba(0, 0, 0, 0.25);
    }
  }
}

.stats {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: #f0f5ff;
  border-radius: 6px;
  border: 1px solid #d6e4ff;

  .text-gray-600 {
    color: #595959;
    font-size: 14px;
  }

  .font-medium {
    font-weight: 500;
  }
}

.content-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 250px);  // 固定高度，不使用 min-height
  max-height: 800px;             // 最大高度限制
}

.folder-tree-panel {
  width: 350px;
  height: calc(100vh - 250px);  // 固定高度，根据视窗高度计算
  max-height: 800px;             // 最大高度限制
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow-x: auto;
  overflow-y: auto;

  :deep(.ant-tree) {
    padding: 8px;
    background: transparent;
    font-size: 13px;
    min-width: max-content;

    .ant-tree-treenode {
      padding: 2px 0;
      white-space: nowrap;
    }

    .ant-tree-node-content-wrapper {
      padding: 4px 8px;
      border-radius: 2px;
      transition: background 0.1s;
      white-space: nowrap;
      overflow: visible;

      &:hover {
        background: #e5f3ff;
      }

      &.ant-tree-node-selected {
        background: #cce8ff !important;
      }
    }

    .ant-tree-switcher {
      width: 20px;
      line-height: 24px;
      flex-shrink: 0;
    }

    .ant-tree-iconEle {
      width: 20px;
      line-height: 24px;
      font-size: 16px;
      flex-shrink: 0;
    }

    .tree-node-title {
      color: #000;
      font-size: 13px;
      white-space: nowrap;
      overflow: visible;
    }

    .ant-tree-checkbox {
      flex-shrink: 0;
    }
  }
}

.panel-header {
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.image-grid-panel {
  flex: 1;
  height: calc(100vh - 250px);  // 固定高度，与左侧树保持一致
  max-height: 800px;             // 最大高度限制
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-container,
.empty-container {
  flex: 1;                    // 占据剩余空间
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;          // 减小最小高度
}

.image-grid {
  flex: 1;                    // 占据剩余空间
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, 220px);  // 固定每列宽度为 220px
  grid-auto-rows: min-content;  // 行高自适应内容，不拉伸
  gap: 16px;
  overflow-y: auto;           // 垂直滚动
  overflow-x: hidden;         // 隐藏水平滚动
  justify-content: start;     // 左对齐，避免拉伸
  align-content: start;       // 内容顶部对齐
}

.image-item {
  position: relative;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px;
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: fit-content;        // 高度自适应内容

  &:hover {
    border-color: #1890ff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    border-color: #1890ff;
    background: #e6f7ff;
  }
}

.image-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.image-wrapper {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  background: #f5f5f5;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.image-info {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-name {
  font-size: 14px;
}

.image-size {
  font-size: 12px;
}

.image-actions {
  margin-top: 8px;
  display: flex;
  justify-content: center;

  .delete-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #333333;
    font-weight: 400;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;

    &:hover {
      border-color: #40a9ff;
      color: #40a9ff;
      box-shadow: 0 2px 4px rgba(64, 169, 255, 0.2);
    }

    &:active {
      border-color: #096dd9;
      color: #096dd9;
    }
  }
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 16px;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.preview-info {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
