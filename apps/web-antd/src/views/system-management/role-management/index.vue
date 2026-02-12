<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import type { RoleCreateReq, RoleItem, RoleUpdateReq } from '#/api/system/role-management';
import { createRole, deleteRole, getRoleList, updateRole } from '#/api/system/role-management';

const loading = ref(false);
const dataSource = ref<RoleItem[]>([]);

const query = reactive({
  keyword: '',
  status: 'all' as 'all' | '1' | '0',
});

const visible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref();

const formState = reactive<RoleCreateReq>({
  name: '',
  code: '',
  status: 1,
  description: '',
});

const columns = [
  { title: '角色名称', dataIndex: 'name', key: 'name' },
  { title: '角色编码', dataIndex: 'code', key: 'code' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
];

const filteredData = computed(() => {
  const kw = query.keyword.trim().toLowerCase();
  return dataSource.value.filter((r) => {
    const hitKw =
      !kw || r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw);
    const hitStatus = query.status === 'all' || String(r.status) === query.status;
    return hitKw && hitStatus;
  });
});

async function fetchList() {
  loading.value = true;
  try {
    const data = await getRoleList(); // requestClient responseReturn:'data' => 直接数组
    dataSource.value = data;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formState.name = '';
  formState.code = '';
  formState.status = 1;
  formState.description = '';
}

function onCreate() {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  visible.value = true;
}

function onEdit(record: RoleItem) {
  isEdit.value = true;
  editingId.value = record.id;
  formState.name = record.name;
  formState.code = record.code;
  formState.status = record.status;
  formState.description = record.description ?? '';
  visible.value = true;
}

async function onDelete(record: RoleItem) {
  try {
    await deleteRole(record.id);
    message.success('删除成功');
    await fetchList();
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || '删除失败');
  }
}

async function onOk() {
  try {
    await formRef.value?.validate();

    const payload: RoleCreateReq = {
      name: formState.name.trim(),
      code: formState.code.trim(),
      status: formState.status,
      description: formState.description?.trim() ?? '',
    };

    if (isEdit.value && editingId.value != null) {
      const update: RoleUpdateReq = payload;
      await updateRole(editingId.value, update);
      message.success('更新成功');
    } else {
      await createRole(payload);
      message.success('创建成功');
    }

    visible.value = false;
    await fetchList();
  } catch (e: any) {
    if (e?.errorFields) return; // 表单校验错误不弹 toast
    message.error(e?.response?.data?.message || e?.response?.data?.detail || e?.message || '保存失败');
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="p-4">
    <Card title="角色管理" :bordered="false">
      <div class="mb-3 flex items-center justify-between">
        <Space>
          <Input
            v-model:value="query.keyword"
            placeholder="搜索：名称/编码"
            allow-clear
            style="width: 240px"
          />
          <Select v-model:value="query.status" style="width: 140px">
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="1">启用</Select.Option>
            <Select.Option value="0">禁用</Select.Option>
          </Select>
          <Button @click="fetchList">刷新</Button>
        </Space>
        <Button type="primary" @click="onCreate">新增角色</Button>
      </div>

      <Table
        row-key="id"
        :columns="columns"
        :data-source="filteredData"
        :loading="loading"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag v-if="record.status === 1" color="green">启用</Tag>
            <Tag v-else color="red">禁用</Tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <Space>
              <Button size="small" type="link" @click="onEdit(record)">编辑</Button>
              <Popconfirm title="确定删除该角色吗？" @confirm="onDelete(record)">
                <Button size="small" danger type="link">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>

      <Modal
        v-model:open="visible"
        :title="isEdit ? '编辑角色' : '新增角色'"
        :destroy-on-close="true"
        @ok="onOk"
      >
        <Form ref="formRef" :model="formState" layout="vertical">
          <Form.Item
            label="角色名称"
            name="name"
            :rules="[{ required: true, message: '请输入角色名称' }]"
          >
            <Input v-model:value="formState.name" placeholder="例如：管理员" />
          </Form.Item>

          <Form.Item
            label="角色编码"
            name="code"
            :rules="[{ required: true, message: '请输入角色编码' }]"
          >
            <Input v-model:value="formState.code" placeholder="例如：admin2" />
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Switch
              :checked="formState.status === 1"
              checked-children="启用"
              un-checked-children="禁用"
              @change="(v:boolean) => (formState.status = v ? 1 : 0)"
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea v-model:value="formState.description" :rows="3" placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  </div>
</template>
