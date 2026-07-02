<template>
  <div class="p-4">
    <Card title="部门管理" :bordered="false">
      <!-- 操作栏 -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Button type="primary" @click="loadDepartmentTree">
            刷新
          </Button>
        </Space>
        <Button type="primary" @click="handleAdd(null)">
          新增顶级部门
        </Button>
      </div>

      <!-- 树形表格 -->
      <Table
        :columns="columns"
        :data-source="treeData"
        :loading="loading"
        :pagination="false"
        row-key="id"
        :defaultExpandAllRows="true"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <Space>
              <span>{{ record.children && record.children.length > 0 ? '📁' : '📄' }}</span>
              <span>{{ record.name }}</span>
            </Space>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status ? 'success' : 'error'">
              {{ record.status ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleAdd(record)">
                添加子部门
              </Button>
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Button type="link" size="small" @click="handleViewUsers(record)">
                查看用户
              </Button>
              <Popconfirm
                title="确定要删除该部门吗？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑部门对话框 -->
    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
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
        <FormItem label="上级部门">
          <span>{{ parentDeptName || '无(顶级部门)' }}</span>
        </FormItem>
        <FormItem label="部门名称" name="name">
          <Input v-model:value="formData.name" placeholder="请输入部门名称" />
        </FormItem>
        <FormItem label="部门编码" name="code">
          <Input
            v-model:value="formData.code"
            :disabled="isEdit"
            placeholder="请输入部门编码(大写字母+下划线)"
          />
        </FormItem>
        <FormItem label="负责人" name="leader">
          <Input v-model:value="formData.leader" placeholder="请输入负责人" />
        </FormItem>
        <FormItem label="联系电话" name="phone">
          <Input v-model:value="formData.phone" placeholder="请输入联系电话" />
        </FormItem>
        <FormItem label="邮箱" name="email">
          <Input v-model:value="formData.email" placeholder="请输入邮箱" />
        </FormItem>
        <FormItem label="排序" name="sort_order">
          <InputNumber
            v-model:value="formData.sort_order"
            :min="0"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="描述" name="description">
          <Textarea
            v-model:value="formData.description"
            placeholder="请输入部门描述"
            :rows="3"
          />
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

    <!-- 查看用户对话框 -->
    <Modal
      v-model:open="usersModalVisible"
      :title="`部门【${currentDept?.name}】的用户列表`"
      :footer="null"
      width="800px"
    >
      <div class="mb-4">
        <Checkbox v-model:checked="includeChildren" @change="loadDeptUsers">
          包含子部门用户
        </Checkbox>
      </div>
      <Table
        :columns="userColumns"
        :data-source="deptUsers"
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
      <Empty v-if="deptUsers.length === 0" description="该部门暂无用户" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Tag,
  Modal,
  Form,
  FormItem,
  Switch,
  Checkbox,
  Popconfirm,
  Empty,
  message,
} from 'ant-design-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { systemApi } from '#/api/system/system-management';

const Textarea = Input.TextArea;

// 表格列定义
const columns: TableColumnsType = [
  { title: '部门名称', key: 'name', width: 250 },
  { title: '部门编码', dataIndex: 'code', key: 'code', width: 150 },
  { title: '负责人', dataIndex: 'leader', key: 'leader', width: 120 },
  { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
  { title: '用户数', dataIndex: 'user_count', key: 'user_count', width: 80 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 300, fixed: 'right' as const },
];

// 用户列表列定义
const userColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '真实姓名', dataIndex: 'real_name', key: 'real_name', width: 120 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '职位', dataIndex: 'position', key: 'position', width: 120 },
  { title: '状态', key: 'status', width: 80 },
];

// 状态
const loading = ref(false);
const treeData = ref<any[]>([]);
const modalVisible = ref(false);
const usersModalVisible = ref(false);
const usersLoading = ref(false);
const isEdit = ref(false);
const formRef = ref();
const currentDept = ref<any>(null);
const parentDept = ref<any>(null);
const deptUsers = ref<any[]>([]);
const includeChildren = ref(false);

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  parent_id: null as number | null,
  leader: '',
  phone: '',
  email: '',
  sort_order: 0,
  description: '',
  status: true,
});

// 计算属性
const modalTitle = computed(() => {
  if (isEdit.value) {
    return '编辑部门';
  }
  return parentDept.value ? '新增子部门' : '新增顶级部门';
});

const parentDeptName = computed(() => {
  return parentDept.value ? parentDept.value.name : '';
});

// 表单验证规则
const formRules: any = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    {
      pattern: /^[A-Z_]+$/,
      message: '部门编码只能包含大写字母和下划线',
      trigger: 'blur',
    },
  ],
};

// 加载部门树
const loadDepartmentTree = async () => {
  loading.value = true;
  try {
    const res = await systemApi.getDepartmentTree();
    treeData.value = res;
  } catch (error: any) {
    message.error('加载部门树失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 新增
const handleAdd = (parentRecord: any) => {
  isEdit.value = false;
  parentDept.value = parentRecord;
  Object.assign(formData, {
    name: '',
    code: '',
    parent_id: parentRecord ? parentRecord.id : null,
    leader: '',
    phone: '',
    email: '',
    sort_order: 0,
    description: '',
    status: true,
  });
  modalVisible.value = true;
};

// 编辑
const handleEdit = (record: any) => {
  isEdit.value = true;
  currentDept.value = record;
  parentDept.value = null; // 编辑时不显示父部门选择
  Object.assign(formData, {
    name: record.name,
    code: record.code,
    parent_id: record.parent_id,
    leader: record.leader,
    phone: record.phone,
    email: record.email,
    sort_order: record.sort_order,
    description: record.description,
    status: record.status,
  });
  modalVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    // 清理空字符串,转为 undefined，避免和接口类型冲突
    const cleanData = {
      ...formData,
      leader: formData.leader || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      description: formData.description || undefined,
    };

    if (isEdit.value) {
      // 更新
      await systemApi.updateDepartment(currentDept.value.id, cleanData);
      message.success('更新成功');
    } else {
      // 新增
      await systemApi.createDepartment(cleanData);
      message.success('新增成功');
    }

    modalVisible.value = false;
    loadDepartmentTree();
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
const handleViewUsers = (record: any) => {
  currentDept.value = record;
  includeChildren.value = false;
  usersModalVisible.value = true;
  loadDeptUsers();
};

// 加载部门用户
const loadDeptUsers = async () => {
  if (!currentDept.value) return;

  usersLoading.value = true;
  try {
    const res = await systemApi.getDepartmentUsers(
      currentDept.value.id,
      includeChildren.value
    );
    deptUsers.value = res;
  } catch (error: any) {
    message.error('加载用户列表失败: ' + error.message);
  } finally {
    usersLoading.value = false;
  }
};

// 删除
const handleDelete = async (id: number) => {
  try {
    await systemApi.deleteDepartment(id);
    message.success('删除成功');
    loadDepartmentTree();
  } catch (error: any) {
    message.error('删除失败: ' + error.message);
  }
};

// 初始化
onMounted(() => {
  loadDepartmentTree();
});
</script>

<style scoped lang="scss">
:deep(.ant-table) {
  font-size: 13px;
}
</style>
