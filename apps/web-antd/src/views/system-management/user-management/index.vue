<template>
  <div class="user-management-container">
    <Card title="用户管理" class="page-card">
      <div class="operation-bar">
        <Input
          v-model:value="searchParams.keyword"
          placeholder="账号/姓名/手机号/邮箱"
          style="width: 320px; margin-right: 16px"
          @pressEnter="handleSearch"
        />
        <Button type="primary" @click="handleAdd">新增用户</Button>
        <Button @click="handleImportClick">导入用户</Button>
        <Button @click="handleExport">导出用户</Button>
        <Button @click="handleRefresh">刷新</Button>
      </div>

      <div class="batch-operation-bar" v-if="selectedRowKeys.length > 0">
        <Space>
          <Button @click="handleBatchDelete">批量删除</Button>
          <Button @click="() => handleBatchStatus(1)">批量启用</Button>
          <Button @click="() => handleBatchStatus(0)">批量禁用</Button>
        </Space>
      </div>

      <div class="content-area">
        <Table
          :columns="columns"
          :data-source="userList"
          :loading="loading"
          :pagination="paginationConfig"
          row-key="id"
          :scroll="{ x: 'max-content' }"
          :rowSelection="{
            type: 'checkbox',
            selectedRowKeys: selectedRowKeys,
            onChange: handleRowSelectChange
          }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'roles'">
              <Tag v-for="role in record.roles" :key="role" color="blue" style="margin-right: 4px">{{ role }}</Tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <Switch
                :checked="record.status === 1"
                @change="(checked) => handleStatusChange(record.id, checked ? 1 : 0)"
              />
            </template>
            <template v-else-if="column.key === 'operation'">
              <Space>
                <Button type="link" @click="handleEdit(record)">编辑</Button>
                <Button type="link" danger @click="handleDelete(record.id)">删除</Button>
              </Space>
            </template>
          </template>
        </Table>
      </div>
    </Card>

    <Modal
      v-model:open="importModalVisible"
      title="导入用户"
      width="500px"
      @cancel="importModalVisible = false"
    >
      <Upload
        :file-list="importFileList"
        :before-upload="beforeImportUpload"
        @remove="handleImportFileRemove"
        accept=".xlsx,.xls,.csv"
        style="margin-bottom: 16px"
      >
        <p class="ant-upload-text">点击或拖拽文件至此处上传</p>
        <p class="ant-upload-hint">仅支持.xlsx/.xls格式文件，大小不超过10MB</p>
      </Upload>
      <Button type="primary" @click="downloadImportTemplate">下载模板</Button>
      <Button type="primary" style="margin-left: 8px" @click="handleImportSubmit">确认导入</Button>
    </Modal>

    <UserFormModal
      v-if="formModalVisible"
      v-model:open="formModalVisible"
      :is-edit="isEdit"
      :form-data="formModalData"
      @on-submit="handleFormSubmit"
      @on-cancel="formModalVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Button, Card, Input, Modal, Space, Switch, Table, Tag, Upload, message } from 'ant-design-vue';
import type { TableProps } from 'ant-design-vue';
import UserFormModal from './components/UserFormModal.vue';
import type { UserItem, UserFormData, UserQueryParams } from '#/api/system-management/user-management';
import {
  getUserList,
  addUser,
  editUser,
  deleteUser,
  batchDeleteUser,
  batchUpdateUserStatus,
  importUser,
  exportUser,
} from '#/api/system-management/user-management';

const searchParams = reactive({
  keyword: '',
});

const loading = ref(false);
const userList = ref<UserItem[]>([]);

const paginationConfig = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
});

const selectedRowKeys = ref<number[]>([]);

const formModalVisible = ref(false);
const isEdit = ref(false);
const formModalData = reactive<UserFormData>({
  username: '',
  fullName: '',
  phone: '',
  email: '',
  deptId: null,
  roles: [],
  status: 1,
  description: '',
});

const importModalVisible = ref(false);
const importFileList = ref<any[]>([]);

const columns = ref<TableProps['columns']>([
  { title: '账号', dataIndex: 'username', key: 'username', width: 160 },
  { title: '姓名', dataIndex: 'fullName', key: 'fullName', width: 140 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
  { title: '部门', dataIndex: 'deptName', key: 'deptName', width: 180 },
  { title: '角色', dataIndex: 'roles', key: 'roles', width: 220 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '操作', key: 'operation', width: 160 },
]);

const buildQueryParams = (): UserQueryParams => {
  return {
    pageNum: paginationConfig.current,
    pageSize: paginationConfig.pageSize,
    keyword: searchParams.keyword || undefined,
  };
};

const loadUserData = async () => {
  try {
    loading.value = true;
    const params = buildQueryParams();
    const res = await getUserList(params);
    userList.value = res.list;
    paginationConfig.total = res.total;
  } catch (err) {
    message.error('加载用户数据失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  paginationConfig.current = 1;
  loadUserData();
};

const handleRefresh = () => {
  searchParams.keyword = '';
  paginationConfig.current = 1;
  loadUserData();
};

const handleTableChange: TableProps['onChange'] = (pagination) => {
  paginationConfig.current = pagination.current!;
  paginationConfig.pageSize = pagination.pageSize!;
  loadUserData();
};

const handleRowSelectChange = (keys: (string | number)[]) => {
  selectedRowKeys.value = keys.map((k) => (typeof k === 'string' ? Number(k) : k));
};

const handleAdd = () => {
  isEdit.value = false;
  Object.assign(formModalData, {
    username: '',
    fullName: '',
    phone: '',
    email: '',
    deptId: null,
    roles: [],
    status: 1,
    description: '',
  });
  formModalVisible.value = true;
};

const handleEdit = (record: UserItem) => {
  isEdit.value = true;
  Object.assign(formModalData, {
    id: record.id,
    username: record.username,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    deptId: record.deptId,
    roles: record.roles,
    status: record.status,
    description: record.description,
  });
  formModalVisible.value = true;
};

const handleDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '删除后该用户将无法登录系统，是否确认？',
    onOk: async () => {
      try {
        await deleteUser(id);
        message.success('删除成功');
        loadUserData();
      } catch (err) {
        message.error('删除失败');
        console.error(err);
      }
    },
  });
};

const handleStatusChange = async (id: number, status: number) => {
  try {
    await batchUpdateUserStatus([id], status);
    message.success(status === 1 ? '启用成功' : '禁用成功');
    loadUserData();
  } catch (err) {
    message.error(status === 1 ? '启用失败' : '禁用失败');
    console.error(err);
  }
};

const handleBatchDelete = () => {
  Modal.confirm({
    title: '批量删除',
    content: `确认删除选中的${selectedRowKeys.value.length}个用户？`,
    onOk: async () => {
      try {
        await batchDeleteUser(selectedRowKeys.value);
        message.success('批量删除成功');
        selectedRowKeys.value = [];
        loadUserData();
      } catch (err) {
        message.error('批量删除失败');
        console.error(err);
      }
    },
  });
};

const handleBatchStatus = async (status: number) => {
  try {
    await batchUpdateUserStatus(selectedRowKeys.value, status);
    message.success(status === 1 ? '批量启用成功' : '批量禁用成功');
    selectedRowKeys.value = [];
    loadUserData();
  } catch (err) {
    message.error(status === 1 ? '批量启用失败' : '批量禁用失败');
    console.error(err);
  }
};

const handleFormSubmit = async (data: UserFormData) => {
  try {
    if (isEdit.value) {
      await editUser(data);
      message.success('编辑用户成功');
    } else {
      await addUser(data);
      message.success('新增用户成功');
    }
    formModalVisible.value = false;
    loadUserData();
  } catch (err) {
    message.error(isEdit.value ? '编辑失败' : '新增失败');
    console.error(err);
  }
};

const handleImportClick = () => {
  importModalVisible.value = true;
  importFileList.value = [];
};

const beforeImportUpload = (file: File) => {
  const isExcel =
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel';
  if (!isExcel) {
    message.error('仅支持上传Excel文件（.xlsx/.xls）');
    return false;
  }
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('文件大小不能超过10MB');
    return false;
  }
  importFileList.value = [file];
  return false;
};

const handleImportFileRemove = () => {
  importFileList.value = [];
};

const downloadImportTemplate = () => {
  const headers = ['账号', '姓名', '手机号', '邮箱', '部门编码', '角色(逗号分隔)', '状态', '备注'];
  const sample = ['admin', '管理员', '13800000000', 'admin@example.com', 'SX-01-01', '系统管理员,运维', '启用', ''];
  const csvContent = [headers.join(','), sample.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '用户导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const handleImportSubmit = async () => {
  if (importFileList.value.length === 0) {
    message.error('请选择要导入的Excel文件');
    return;
  }
  const formData = new FormData();
  formData.append('file', importFileList.value[0]);
  try {
    loading.value = true;
    const res = await importUser(formData);
    message.success(`${res.msg}（成功：${res.success}条，失败：${res.fail}条）`);
    if (res.failMsg) {
      Modal.info({
        title: '导入失败详情',
        content: res.failMsg,
      });
    }
    importModalVisible.value = false;
    loadUserData();
  } catch (err) {
    message.error('导入失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  try {
    loading.value = true;
    const params = buildQueryParams();
    const res = await exportUser(params);
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `用户列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('导出成功');
  } catch (err) {
    message.error('导出失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUserData();
});
</script>

<style scoped>
.user-management-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}
.page-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
}
.operation-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.batch-operation-bar {
  margin-bottom: 16px;
}
</style>
