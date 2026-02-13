<template>
  <a-modal
    :open="open"
    @update:open="handleOpenChange"
    :maskClosable="false"
    :destroyOnClose="true"
    :title="isEdit ? '编辑部门' : '新增部门'"
    width="600px"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :confirmLoading="submitLoading"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <!-- 部门编码 -->
      <a-form-item
        label="部门编码"
        name="deptCode"
        tooltip="格式示例：SX-01-01（省份-分中心-大队）"
      >
        <a-input
          v-model:value="formData.deptCode"
          placeholder="请输入部门编码（如SX-01-01）"
          maxlength="20"
          :disabled="isEdit && !canEditCode" 
        />
      </a-form-item>

      <!-- 部门名称 -->
      <a-form-item label="部门名称" name="deptName">
        <a-input
          v-model:value="formData.deptName"
          placeholder="请输入部门名称"
          maxlength="50"
        />
      </a-form-item>

      <!-- 上级部门 -->
      <a-form-item label="上级部门" name="parentId">
        <a-tree-select
          v-model:value="formData.parentId"
          :tree-data="deptTreeData"
          placeholder="请选择上级部门（无则不选）"
          tree-default-expand-all
          :field-names="{
            label: 'deptName',
            value: 'id',
            children: 'children',
          }"
          @select="handleParentSelect"
        />
      </a-form-item>

      <!-- 负责人 -->
      <a-form-item label="负责人" name="leader">
        <a-select
          v-model:value="formData.leader"
          :options="leaderOptions"
          show-search
          allow-clear
          :filter-option="filterLeaderOption"
          placeholder="请选择部门负责人"
        />
      </a-form-item>

      <!-- 联系电话 -->
      <a-form-item label="联系电话" name="phone">
        <a-input
          v-model:value="formData.phone"
          placeholder="请输入联系电话（手机号/座机）"
          maxlength="20"
        />
      </a-form-item>

      <!-- 负责路段 -->
      <a-form-item label="负责路段" name="roadSection" tooltip="巡检类部门建议填写">
        <a-input
          v-model:value="formData.roadSection"
          placeholder="如G65包茂高速K1200-K1250段"
          maxlength="100"
        />
      </a-form-item>

      <!-- 巡检类型 -->
      <a-form-item label="巡检类型" name="patrolType">
        <a-checkbox-group
          v-model:value="formData.patrolType"
          :options="patrolTypeOptions"
        />
      </a-form-item>

      <!-- 状态 -->
      <a-form-item label="状态" name="status">
        <a-radio-group v-model:value="formData.status">
          <a-radio :value="1">启用</a-radio>
          <a-radio :value="0">禁用</a-radio>
        </a-radio-group>
      </a-form-item>

      <!-- 部门描述 -->
      <a-form-item label="部门描述" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入部门描述（选填）"
          rows="4"
          maxlength="200"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
type FormRules = Record<string, unknown[]>;
import { getDeptTree } from '#/api/system-management/department-management';
import type { DeptFormData, DeptItem } from '#/api/system-management/department-management';

type DeptTreeNode = DeptItem & { children?: DeptTreeNode[] };

// Props
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  formData: {
    type: Object as () => DeptFormData,
    default: () => ({
      deptCode: '',
      deptName: '',
      parentId: null,
      leader: '',
      phone: '',
      roadSection: '',
      patrolType: [],
      status: 1,
      description: '',
    }),
  },
});

// Emits
const emit = defineEmits(['update:open', 'onSubmit', 'onCancel']);

// 表单Ref
const formRef = ref<FormInstance>();

// 提交加载状态
const submitLoading = ref(false);

// 巡检类型选项
const patrolTypeOptions = ref([
  { label: '日常巡检', value: '日常巡检' },
  { label: '应急巡检', value: '应急巡检' },
  { label: '养护巡检', value: '养护巡检' },
  { label: '综合管理', value: '综合管理' },
]);

const leaderOptions = ref<{ label: string; value: string }[]>([]);

// 部门树形数据（上级选择器）
const deptTreeData = ref<DeptTreeNode[]>([]);

// 编辑时编码是否可改（默认不可改）
const canEditCode = ref(false);
// 绑定到模板使用的本地引用
const isEdit = computed(() => props.isEdit);
const formData = props.formData;

// 表单校验规则
const formRules = reactive<FormRules>({
  deptCode: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9-]{2,20}$/,
      message: '编码仅支持字母、数字、横线,长度2-20位',
      trigger: 'blur',
    },
  ],
  deptName: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度2-50位', trigger: 'blur' },
  ],
  leader: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    {
      pattern: /^(1[3-9]\d{9})$|^(\d{3,4}-\d{7,8})$/,
      message: '请输入正确的手机号(11位)或座机(如029-88888888)',
      trigger: 'blur',
    },
  ],
  patrolType: [{ required: true, message: '请选择巡检类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
});

// 加载部门树形数据
const loadDeptTree = async () => {
  try {
    const res = await getDeptTree();
    // 处理树形结构（递归生成children）
    const buildTree = (list: DeptItem[], parentId: number | null = null):DeptTreeNode[]=> {
      return list
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(list, item.id),
        }));
    };
    deptTreeData.value = buildTree(res);
    const leaders = Array.from(
      new Set(
        res
          .map((i) => i.leader)
          .filter((v): v is string => typeof v === 'string' && v.length > 0),
      ),
    );
    leaderOptions.value = leaders.map((l) => ({ label: l, value: l }));
    if (props.formData.leader && !leaders.includes(props.formData.leader)) {
      leaderOptions.value.unshift({
        label: props.formData.leader,
        value: props.formData.leader,
      });
    }
  } catch (err) {
    message.error('加载部门树形数据失败');
    console.error(err);
  }
};

const filterLeaderOption = (input: string, option: { label: string; value: string }) => {
  return option.label.toLowerCase().includes(input.toLowerCase());
};
const handleOpenChange = (open: boolean) => {
  emit('update:open', open);
  if (open) {
    loadDeptTree();
    if (props.isEdit && formRef.value) {
      formRef.value.clearValidate();
    }
  } else {
    if (formRef.value) {
      formRef.value.resetFields();
    }
    emit('onCancel');
  }
};

// 监听弹窗显示状态，加载数据
watch(
  () => props.open,
  (val) => {
    if (val) {
      loadDeptTree();
      // 编辑时重置表单校验
      if (props.isEdit && formRef.value) {
        formRef.value.clearValidate();
      }
    }
  },
  { immediate: true }
);

// 提交表单
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

// 取消弹窗
const handleCancel = () => {
  emit('update:open', false);
  emit('onCancel');
  // 重置表单
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 选择上级部门回调
const handleParentSelect = (value: number) => {
  // 校验：不能选择自身作为上级（编辑场景）
  if (props.isEdit && props.formData.id === value) {
    message.error('不能选择自身作为上级部门');
    props.formData.parentId = null;
  }
};

onMounted(() => {
  if (props.open) {
    loadDeptTree();
  }
});
</script>

<style scoped>
.ant-tree-select {
  width: 100%;
}
</style>
