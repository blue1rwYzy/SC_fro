<template>
  <div class="p-4">
    <Card title="用户管理" :bordered="false">
      <!-- 搜索栏 -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Input
            v-model:value="searchForm.keyword"
            placeholder="搜索用户名、姓名、邮箱、手机号"
            style="width: 300px"
            allowClear
            @pressEnter="handleSearch"
          >
            <template #prefix>
              🔍
            </template>
          </Input>
          <Select
            v-model:value="searchForm.department_id"
            placeholder="选择部门"
            style="width: 200px"
            allowClear
            @change="handleSearch"
          >
            <SelectOption
              v-for="dept in allDepartments"
              :key="dept.id"
              :value="dept.id"
            >
              {{ dept.name }}
            </SelectOption>
          </Select>
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
          新增用户
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
          <template v-else-if="column.key === 'is_admin'">
            <Tag v-if="record.is_admin" color="red">超级管理员</Tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'roles'">
            <Tag v-for="role in record.roles" :key="role.id" color="blue">
              {{ role.name }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                @click="handleResetPassword(record)"
              >
                重置密码
              </Button>
              <Popconfirm
                v-if="!record.is_admin"
                title="确定要删除该用户吗？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑用户对话框 -->
    <Modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
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
        <FormItem label="用户名" name="username">
          <Input
            v-model:value="formData.username"
            :disabled="isEdit"
            placeholder="请输入用户名"
          />
        </FormItem>
        <FormItem v-if="!isEdit" label="密码" name="password">
          <InputPassword
            v-model:value="formData.password"
            placeholder="请输入密码"
          />
        </FormItem>
        <FormItem label="真实姓名" name="real_name">
          <Input v-model:value="formData.real_name" placeholder="请输入真实姓名" />
        </FormItem>
        <FormItem label="邮箱" name="email">
          <Input v-model:value="formData.email" placeholder="请输入邮箱" />
        </FormItem>
        <FormItem label="手机号" name="phone">
          <Input v-model:value="formData.phone" placeholder="请输入手机号" />
        </FormItem>
        <FormItem label="部门" name="department_id">
          <Select
            v-model:value="formData.department_id"
            placeholder="请选择部门"
            allowClear
          >
            <SelectOption
              v-for="dept in allDepartments"
              :key="dept.id"
              :value="dept.id"
            >
              {{ dept.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="职位" name="position">
          <Input v-model:value="formData.position" placeholder="请输入职位" />
        </FormItem>
        <FormItem label="角色" name="role_ids">
          <Select
            v-model:value="formData.role_ids"
            mode="multiple"
            placeholder="请选择角色"
            allowClear
          >
            <SelectOption v-for="role in allRoles" :key="role.id" :value="role.id">
              {{ role.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem v-if="isEdit" label="状态" name="status">
          <Switch
            v-model:checked="formData.status"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- 重置密码对话框 -->
    <Modal
      v-model:open="passwordModalVisible"
      title="重置密码"
      @ok="handlePasswordSubmit"
      @cancel="passwordModalVisible = false"
    >
      <Form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <FormItem label="用户">
          <span>{{ currentUser?.username }} ({{ currentUser?.real_name }})</span>
        </FormItem>
        <FormItem label="新密码" required>
          <InputPassword
            v-model:value="newPassword"
            placeholder="请输入新密码(至少6位)"
          />
        </FormItem>
      </Form>
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
  Select,
  SelectOption,
  Tag,
  Modal,
  Form,
  FormItem,
  Switch,
  Popconfirm,
  message,
} from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { systemApi } from '#/api/system/system-management';

const InputPassword = Input.Password;

// 表格列定义
const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '真实姓名', dataIndex: 'real_name', key: 'real_name', width: 120 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '部门', dataIndex: 'department_name', key: 'department_name', width: 120 },
  { title: '职位', dataIndex: 'position', key: 'position', width: 120 },
  { title: '角色', key: 'roles', width: 150 },
  { title: '状态', key: 'status', width: 80 },
  { title: '超管', key: 'is_admin', width: 100 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' as const },
];

// 状态
const loading = ref(false);
const tableData = ref<any[]>([]);
const allDepartments = ref<any[]>([]);
const allRoles = ref<any[]>([]);
const modalVisible = ref(false);
const passwordModalVisible = ref(false);
const isEdit = ref(false);
const formRef = ref();
const currentUser = ref<any>(null);
const newPassword = ref('');

// 搜索表单
const searchForm = reactive({
  keyword: '',
  department_id: undefined,
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
  username: '',
  password: '',
  real_name: '',
  email: '',
  phone: '',
  department_id: undefined,
  position: '',
  role_ids: [],
  status: true,
});

// 表单验证规则
const formRules: any = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }],
};

// 加载用户列表
const loadUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      department_id: searchForm.department_id,
      status: searchForm.status,
    };

    const res = await systemApi.getUsers(params);
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error: any) {
    message.error('加载用户列表失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 加载部门列表
const loadDepartments = async () => {
  try {
    const res = await systemApi.getDepartments();
    allDepartments.value = res;
  } catch (error) {
    console.error('加载部门列表失败:', error);
  }
};

// 加载角色列表
const loadRoles = async () => {
  try {
    const res = await systemApi.getRoles();
    allRoles.value = res;
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  loadUsers();
};

// 重置
const handleReset = () => {
  searchForm.keyword = '';
  searchForm.department_id = undefined;
  searchForm.status = undefined;
  pagination.current = 1;
  loadUsers();
};

// 表格变化
const handleTableChange = (pag: any) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  loadUsers();
};

// 新增
const handleAdd = () => {
  isEdit.value = false;
  Object.assign(formData, {
    username: '',
    password: '',
    real_name: '',
    email: '',
    phone: '',
    department_id: undefined,
    position: '',
    role_ids: [],
    status: true,
  });
  modalVisible.value = true;
};

// 编辑
const handleEdit = (record: any) => {
  isEdit.value = true;
  currentUser.value = record;
  Object.assign(formData, {
    username: record.username,
    real_name: record.real_name,
    email: record.email || '',
    phone: record.phone || '',
    department_id: record.department_id,
    position: record.position || '',
    role_ids: record.roles ? record.roles.map((r: any) => r.id) : [],
    status: record.status,
  });
  modalVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    // 清理空字符串,转为 undefined，避免接口类型冲突
    const cleanData = {
      ...formData,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      position: formData.position || undefined,
      department_id: formData.department_id || undefined,
    };

    if (isEdit.value) {
      // 更新
      await systemApi.updateUser(currentUser.value.id, {
        real_name: cleanData.real_name,
        email: cleanData.email,
        phone: cleanData.phone,
        department_id: cleanData.department_id,
        position: cleanData.position,
        role_ids: cleanData.role_ids,
        status: cleanData.status,
      });
      message.success('更新成功');
    } else {
      // 新增
      await systemApi.createUser(cleanData);
      message.success('新增成功');
    }

    modalVisible.value = false;
    loadUsers();
  } catch (error: any) {
    if (error.errorFields) {
      // 表单验证错误
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

// 重置密码
const handleResetPassword = (record: any) => {
  currentUser.value = record;
  newPassword.value = '';
  passwordModalVisible.value = true;
};

// 提交密码重置
const handlePasswordSubmit = async () => {
  if (!newPassword.value || newPassword.value.length < 6) {
    message.error('密码至少6位');
    return;
  }

  try {
    await systemApi.resetUserPassword(currentUser.value.id, {
      new_password: newPassword.value,
    });
    message.success('密码重置成功');
    passwordModalVisible.value = false;
  } catch (error: any) {
    message.error('密码重置失败: ' + error.message);
  }
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await systemApi.deleteUser(id);
    message.success('删除成功');
    loadUsers();
  } catch (error: any) {
    message.error('删除失败: ' + error.message);
  }
};

// 初始化
onMounted(() => {
  loadUsers();
  loadDepartments();
  loadRoles();
});
</script>

<style scoped lang="scss">
:deep(.ant-table) {
  font-size: 13px;
}
</style>
