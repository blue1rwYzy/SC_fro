<template>
  <a-modal
    :open="open"
    @update:open="handleOpenChange"
    :title="isEdit ? '编辑用户' : '新增用户'"
    width="620px"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :confirmLoading="submitLoading"
    :maskClosable="false"
    :destroyOnClose="true"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="账号" name="username">
        <a-input v-model:value="formData.username" placeholder="请输入账号" maxlength="50" />
      </a-form-item>
      <a-form-item label="姓名" name="fullName">
        <a-input v-model:value="formData.fullName" placeholder="请输入姓名" maxlength="50" />
      </a-form-item>
      <a-form-item label="手机号" name="phone">
        <a-input v-model:value="formData.phone" placeholder="请输入手机号" maxlength="20" />
      </a-form-item>
      <a-form-item label="邮箱" name="email">
        <a-input v-model:value="formData.email" placeholder="请输入邮箱" maxlength="100" />
      </a-form-item>
      <a-form-item label="所属部门" name="deptId">
        <a-tree-select
          v-model:value="formData.deptId"
          :tree-data="deptTreeData"
          placeholder="请选择部门（可选）"
          tree-default-expand-all
          :field-names="{ label: 'deptName', value: 'id', children: 'children' }"
        />
      </a-form-item>
      <a-form-item label="角色" name="roles">
        <a-select
          v-model:value="formData.roles"
          :options="roleOptions"
          mode="multiple"
          placeholder="请选择角色"
          show-search
          allow-clear
        />
      </a-form-item>
      <a-form-item label="状态" name="status">
        <a-radio-group v-model:value="formData.status">
          <a-radio :value="1">启用</a-radio>
          <a-radio :value="0">禁用</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="备注" name="description">
        <a-textarea v-model:value="formData.description" rows="4" placeholder="请输入备注（选填）" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import type { FormInstance } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { getDeptTree } from '#/api/system-management/department-management';
import { getAllRoles } from '#/api/system-management/user-management';
import type { UserFormData } from '#/api/system-management/user-management';
import type { DeptItem } from '#/api/system-management/department-management';

type DeptTreeNode = DeptItem & { children?: DeptTreeNode[] };
type FormRules = Record<string, unknown[]>;

const props = defineProps({
  open: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  formData: {
    type: Object as () => UserFormData,
    default: () => ({
      username: '',
      fullName: '',
      phone: '',
      email: '',
      deptId: null,
      roles: [],
      status: 1,
      description: '',
    }),
  },
});

const emit = defineEmits(['update:open', 'onSubmit', 'onCancel']);

const formRef = ref<FormInstance>();
const submitLoading = ref(false);
const deptTreeData = ref<DeptTreeNode[]>([]);
const roleOptions = ref<{ label: string; value: string }[]>([]);

const formRules = reactive<FormRules>({
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  fullName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式错误', trigger: 'blur' },
  ],
  roles: [{ required: true, message: '请选择角色', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
});

const loadDeptTree = async () => {
  try {
    const res = await getDeptTree();
    const buildTree = (list: DeptItem[], parentId: number | null = null): DeptTreeNode[] => {
      return list.filter((i) => i.parentId === parentId).map((i) => ({ ...i, children: buildTree(list, i.id) }));
    };
    deptTreeData.value = buildTree(res);
  } catch (err) {
    message.error('加载部门数据失败');
    console.error(err);
  }
};

const loadRoles = async () => {
  try {
    const res = await getAllRoles();
    roleOptions.value = (res || []).map((r) => ({ label: r, value: r }));
  } catch {
    roleOptions.value = [
      { label: '系统管理员', value: '系统管理员' },
      { label: '运维', value: '运维' },
      { label: '巡检员', value: '巡检员' },
    ];
  }
};

const handleOpenChange = (open: boolean) => {
  emit('update:open', open);
  if (open) {
    if (formRef.value) formRef.value.clearValidate();
    loadDeptTree();
    loadRoles();
  } else {
    if (formRef.value) formRef.value.resetFields();
    emit('onCancel');
  }
};

watch(
  () => props.open,
  (val) => {
    if (val) {
      if (formRef.value) formRef.value.clearValidate();
      loadDeptTree();
      loadRoles();
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    submitLoading.value = true;
    emit('onSubmit', { ...props.formData });
  } catch (err) {
    message.error('表单校验失败，请检查必填项');
    console.error(err);
  } finally {
    submitLoading.value = false;
  }
};

const handleCancel = () => {
  emit('update:open', false);
  emit('onCancel');
  if (formRef.value) formRef.value.resetFields();
};

onMounted(() => {
  if (props.open) {
    loadDeptTree();
    loadRoles();
  }
});
</script>

<style scoped>
.ant-tree-select {
  width: 100%;
}
</style>
