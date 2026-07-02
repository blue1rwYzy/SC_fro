<template>
  <div class="model-management-container">
    <Card title="模型管理">
      <!-- 操作栏 -->
      <div class="action-bar">
        <Space>
          <Select
            v-model:value="filterType"
            placeholder="筛选模型类型"
            style="width: 150px"
            @change="loadModels"
          >
            <SelectOption value="">全部类型</SelectOption>
            <SelectOption value="detection">检测模型</SelectOption>
            <SelectOption value="tracking">追踪模型</SelectOption>
          </Select>
          <Button type="primary" @click="showAddModal">
            添加模型
          </Button>
        </Space>
      </div>

      <!-- 模型列表 -->
      <Table
        :columns="columns"
        :data-source="modelList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'model_type'">
            <Tag :color="record.model_type === 'detection' ? 'blue' : 'green'">
              {{ record.model_type === 'detection' ? '检测模型' : '追踪模型' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'path'">
            <Tooltip :title="record.path">
              <span class="path-text">{{ record.path }}</span>
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个模型吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 添加/编辑模型弹窗 -->
    <Modal
      v-model:open="modalVisible"
      :title="editingModel ? '编辑模型' : '添加模型'"
      :confirm-loading="submitting"
      @ok="handleSubmit"
      @cancel="handleCancel"
      width="600px"
    >
      <Form
        ref="formRef"
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <FormItem
          label="模型名称"
          name="name"
          :rules="[{ required: true, message: '请输入模型名称' }]"
        >
          <Input v-model:value="formData.name" placeholder="请输入模型名称" />
        </FormItem>

        <FormItem
          label="模型类型"
          name="model_type"
          :rules="[{ required: true, message: '请选择模型类型' }]"
        >
          <Select
            v-model:value="formData.model_type"
            placeholder="请选择模型类型"
            :disabled="!!editingModel"
          >
            <SelectOption value="detection">检测模型</SelectOption>
            <SelectOption value="tracking">追踪模型</SelectOption>
          </Select>
        </FormItem>

        <FormItem label="版本号" name="version">
          <Input
            v-model:value="formData.version"
            placeholder="请输入版本号，例如: v1.0"
          />
        </FormItem>

        <FormItem label="描述" name="description">
          <Textarea
            v-model:value="formData.description"
            placeholder="请输入模型描述"
            :rows="3"
          />
        </FormItem>

        <template v-if="!editingModel">
          <FormItem label="添加方式" name="addMethod">
            <RadioGroup v-model:value="addMethod">
              <Radio value="upload">上传模型文件</Radio>
              <Radio value="path">指定文件路径</Radio>
            </RadioGroup>
          </FormItem>

          <FormItem
            v-if="addMethod === 'upload'"
            label="模型文件"
            name="model_file"
            :rules="[{ required: true, message: '请上传模型文件' }]"
          >
            <Upload
              :file-list="fileList"
              :before-upload="beforeUpload"
              @remove="handleRemoveFile"
              accept=".pt,.pth,.onnx,.engine"
              :max-count="1"
            >
              <Button>选择文件</Button>
            </Upload>
            <div class="upload-hint">
              支持格式: .pt, .pth, .onnx, .engine
            </div>
          </FormItem>

          <FormItem
            v-if="addMethod === 'path'"
            label="模型路径"
            name="model_path"
            :rules="[{ required: true, message: '请输入模型文件路径' }]"
          >
            <Input
              v-model:value="formData.model_path"
              placeholder="请输入模型文件的完整路径"
            />
            <div class="path-hint">
              默认路径:<br />
              检测模型: G:\ShuangChuang\ShuangC\backend\uploads\model\JC<br />
              追踪模型: G:\ShuangChuang\ShuangC\backend\uploads\model\ZZ
            </div>
          </FormItem>
        </template>
      </Form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, reactive, onMounted } from 'vue';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  FormItem,
  Input,
  Textarea,
  Select,
  SelectOption,
  Tag,
  Tooltip,
  Popconfirm,
  Radio,
  RadioGroup,
  Upload,
  message,
} from 'ant-design-vue';
import { modelManagementApi, type ModelInfo } from '#/api/system/model-management';
import type { UploadFile } from 'ant-design-vue';

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '模型名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '类型', key: 'model_type', width: 120 },
  { title: '版本', dataIndex: 'version', key: 'version', width: 100 },
  { title: '模型路径', key: 'path', ellipsis: true },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '创建时间', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' },
];

const modelList = ref<ModelInfo[]>([]);
const loading = ref(false);
const filterType = ref('');
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
});

// 弹窗相关
const modalVisible = ref(false);
const submitting = ref(false);
const editingModel = ref<ModelInfo | null>(null);
const formRef = ref();
const addMethod = ref('upload');
const fileList = ref<UploadFile[]>([]);

const formData = reactive({
  name: '',
  version: 'v1.0',
  description: '',
  model_type: 'detection' as 'detection' | 'tracking',
  model_path: '',
  model_file: null as File | null,
});

// 加载模型列表
const loadModels = async () => {
  loading.value = true;
  try {
    const response = await modelManagementApi.getModels(
      filterType.value as 'detection' | 'tracking' | undefined,
    );
    modelList.value = response;
    pagination.total = response.length;
  } catch (error: any) {
    message.error(error.message || '加载模型列表失败');
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 表格变化
const handleTableChange = (paginationConfig: any) => {
  pagination.current = paginationConfig.current;
  pagination.pageSize = paginationConfig.pageSize;
};

// 显示添加弹窗
const showAddModal = () => {
  editingModel.value = null;
  resetForm();
  modalVisible.value = true;
};

// 编辑模型
const handleEdit = (record: ModelInfo) => {
  editingModel.value = record;
  formData.name = record.name;
  formData.version = record.version;
  formData.description = record.description || '';
  formData.model_type = record.model_type;
  modalVisible.value = true;
};

// 删除模型
const handleDelete = async (id: number) => {
  try {
    await modelManagementApi.deleteModel(id);
    message.success('删除成功');
    loadModels();
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
};

// 上传前处理
const beforeUpload = (file: File) => {
  fileList.value = [file as any];
  formData.model_file = file; // 更新 formData，触发表单验证
  return false;
};

// 移除文件
const handleRemoveFile = () => {
  fileList.value = [];
  formData.model_file = null; // 清空 formData
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();

    const formDataToSubmit = new FormData();
    formDataToSubmit.append('name', formData.name);
    formDataToSubmit.append('version', formData.version);
    formDataToSubmit.append('model_type', formData.model_type);
    if (formData.description) {
      formDataToSubmit.append('description', formData.description);
    }

    submitting.value = true;

    if (editingModel.value) {
      // 更新模型
      await modelManagementApi.updateModel(editingModel.value.id, formDataToSubmit);
      message.success('更新成功');
    } else {
      // 添加模型
      if (addMethod.value === 'upload') {
        if (!formData.model_file) {
          message.error('请选择模型文件');
          submitting.value = false;
          return;
        }
        // 使用原始 File 对象，而不是 UploadFile 对象
        formDataToSubmit.append('model_file', formData.model_file);
      } else {
        if (!formData.model_path) {
          message.error('请输入模型路径');
          submitting.value = false;
          return;
        }
        formDataToSubmit.append('model_path', formData.model_path);
      }

      await modelManagementApi.createModel(formDataToSubmit);
      message.success('添加成功');
    }

    modalVisible.value = false;
    loadModels();
  } catch (error: any) {
    if (error.errorFields) {
      // 表单验证错误
      return;
    }
    message.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

// 取消
const handleCancel = () => {
  modalVisible.value = false;
  resetForm();
};

// 重置表单
const resetForm = () => {
  formData.name = '';
  formData.version = 'v1.0';
  formData.description = '';
  formData.model_type = 'detection';
  formData.model_path = '';
  formData.model_file = null;
  addMethod.value = 'upload';
  fileList.value = [];
  formRef.value?.resetFields();
};

onMounted(() => {
  loadModels();
});
</script>

<style scoped lang="less">
.model-management-container {
  padding: 16px;
  height: 100%;
  overflow-y: auto;

  .action-bar {
    margin-bottom: 16px;
  }

  .path-text {
    display: inline-block;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upload-hint,
  .path-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
    line-height: 1.5;
  }
}
</style>
