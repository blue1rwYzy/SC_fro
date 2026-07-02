<template>
  <div class="p-4">
    <Card title="角色管理" :bordered="false">
      <!-- 搜索栏 -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Input
            v-model:value="searchForm.keyword"
            placeholder="搜索角色名称、编码"
            style="width: 300px"
            allowClear
            @pressEnter="handleSearch"
          >
            <template #prefix>
              🔍
            </template>
          </Input>
          <Select
            v-model:value="searchForm.status"
            placeholder="选择状态"
            style="width: 120px"
            allowClear
            @change="handleSearch"
          >
            <SelectOption :value="true">启用</SelectOption>
            <SelectOption :value="false">禁用</SelectOption>
          </Select>
          <Button type="primary" @click="handleSearch">
            搜索
          </Button>
          <Button @click="handleReset">重置</Button>
        </Space>
        <Button type="primary" @click="handleAdd">
          新增角色
        </Button>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status ? 'success' : 'error'">
              {{ record.status ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Button type="link" size="small" @click="handleViewUsers(record)">
                查看用户
              </Button>
              <Popconfirm
                title="确定要删除该角色吗？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑角色对话框 -->
    <Modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑角色' : '新增角色'"
      :width="600"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <Form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <FormItem label="角色名称" name="name">
          <Input v-model:value="formData.name" placeholder="请输入角色名称" />
        </FormItem>
        <FormItem label="角色编码" name="code">
          <Input
            v-model:value="formData.code"
            :disabled="isEdit"
            placeholder="请输入角色编码(大写字母+下划线)"
          />
        </FormItem>
        <FormItem label="描述" name="description">
          <Textarea
            v-model:value="formData.description"
            placeholder="请输入角色描述"
            :rows="3"
          />
        </FormItem>
        <FormItem label="排序" name="sort_order">
          <InputNumber
            v-model:value="formData.sort_order"
            :min="0"
            style="width: 100%"
          />
        </FormItem>
        <FormItem v-if="isEdit" label="状态" name="status">
          <Switch
            v-model:checked="formData.status"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </FormItem>
        <FormItem label="权限" name="permissions">
          <Textarea
            v-model:value="formData.permissions"
            placeholder="请输入权限配置(JSON格式)"
            :rows="8"
          />
          <div class="mt-2 text-xs text-gray-500">
            示例: {"system": ["user:view", "user:add"], "defect": ["detect:run"]}
          </div>
        </FormItem>
      </Form>
    </Modal>

    <!-- 查看用户对话框 -->
    <Modal
      v-model:open="usersModalVisible"
      :title="`角色【${currentRole?.name}】的用户列表`"
      :footer="null"
      width="800px"
    >
      <Table
        :columns="userColumns"
        :data-source="roleUsers"
        :loading="usersLoading"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status ? 'success' : 'error'">
              {{ record.status ? '启用' : '禁用' }}
            </Tag>
          </template>
        </template>
      </Table>
      <Empty v-if="roleUsers.length === 0" description="该角色暂无用户" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Select,
  SelectOption,
  Tag,
  Modal,
  Form,
  FormItem,
  Switch,
  Popconfirm,
  Empty,
  message,
} from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { systemApi } from '#/api/system/system-management';

const Textarea = Input.TextArea;

// 表格列定义
const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '角色编码', dataIndex: 'code', key: 'code', width: 150 },
  { title: '描述', dataIndex: 'description', key: 'description', width: 250 },
  { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
  },
  { title: '操作', key: 'action', width: 220, fixed: 'right' as const },
];

// 用户列表列定义
const userColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '真实姓名', dataIndex: 'real_name', key: 'real_name', width: 120 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '部门', dataIndex: 'department_name', key: 'department_name', width: 120 },
  { title: '状态', key: 'status', width: 80 },
];

// 状态
const loading = ref(false);
const tableData = ref<any[]>([]);
const modalVisible = ref(false);
const usersModalVisible = ref(false);
const usersLoading = ref(false);
const isEdit = ref(false);
const formRef = ref();
const currentRole = ref<any>(null);
const roleUsers = ref([]);

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: undefined,
});

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
});

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  description: '',
  permissions: '',
  sort_order: 0,
  status: true,
});

// 表单验证规则
const formRules: any = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    {
      pattern: /^[A-Z_]+$/,
      message: '角色编码只能包含大写字母和下划线',
      trigger: 'blur',
    },
  ],
};

// 加载角色列表
const loadRoles = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status,
    };

    const res = await systemApi.getRoles(params);
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error: any) {
    message.error('加载角色列表失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  loadRoles();
};

// 重置
const handleReset = () => {
  searchForm.keyword = '';
  searchForm.status = undefined;
  pagination.current = 1;
  loadRoles();
};

// 表格变化
const handleTableChange = (pag: any) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  loadRoles();
};

// 新增
const handleAdd = () => {
  isEdit.value = false;
  Object.assign(formData, {
    name: '',
    code: '',
    description: '',
    permissions: '',
    sort_order: 0,
    status: true,
  });
  modalVisible.value = true;
};

// 编辑
const handleEdit = (record: any) => {
  isEdit.value = true;
  currentRole.value = record;
  Object.assign(formData, {
    name: record.name,
    code: record.code,
    description: record.description,
    permissions: record.permissions || '',
    sort_order: record.sort_order,
    status: record.status,
  });
  modalVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    // 验证 permissions 是否为合法 JSON
    if (formData.permissions) {
      try {
        JSON.parse(formData.permissions);
      } catch (e) {
        message.error('权限配置必须是合法的JSON格式');
        return;
      }
    }

    // 清理空字符串,转为 null
    const cleanData = {
      ...formData,
      description: formData.description || undefined,
      permissions: formData.permissions || undefined,
    };

    if (isEdit.value) {
      // 更新
      await systemApi.updateRole(currentRole.value.id, cleanData);
      message.success('更新成功');
    } else {
      // 新增
      await systemApi.createRole(cleanData);
      message.success('新增成功');
    }

    modalVisible.value = false;
    loadRoles();
  } catch (error: any) {
    if (error.errorFields) {
      return;
    }
    message.error((isEdit.value ? '更新' : '新增') + '失败: ' + error.message);
  }
};

// 取消
const handleCancel = () => {
  modalVisible.value = false;
  formRef.value?.resetFields();
};

// 查看用户
const handleViewUsers = async (record: any) => {
  currentRole.value = record;
  usersModalVisible.value = true;
  usersLoading.value = true;

  try {
    const res = await systemApi.getRoleUsers(record.id);
    roleUsers.value = res;
  } catch (error: any) {
    message.error('加载用户列表失败: ' + error.message);
  } finally {
    usersLoading.value = false;
  }
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await systemApi.deleteRole(id);
    message.success('删除成功');
    loadRoles();
  } catch (error: any) {
    message.error('删除失败: ' + error.message);
  }
};

// 初始化
onMounted(() => {
  loadRoles();
});
</script>

<style scoped lang="scss">
:deep(.ant-table) {
  font-size: 13px;
}
</style>
