<template>
  <div class="department-management-container">
    <!-- 卡片容器（贴合现有缺陷检测页面风格） -->
    <Card title="部门管理" class="page-card">
      <!-- 顶部操作区 -->
      <div class="operation-bar">
        <!-- 搜索框 -->
        <Input
          v-model:value="searchParams.keyword"
          placeholder="部门名称/编码/负责人"
          style="width: 300px; margin-right: 16px"
          @pressEnter="handleSearch"
        />

        <!-- 功能按钮组 -->
        <Button type="primary" @click="handleAdd">新增部门</Button>
        <Button @click="handleImportClick">导入部门</Button>
        <Button @click="handleExport">导出部门</Button>
        <Button @click="handleRefresh">刷新</Button>
      </div>

      <!-- 视图切换区 -->
      <div class="view-switch-bar" style="margin: 16px 0">
        <Button
          :type="viewType === 'list' ? 'primary' : 'default'"
          @click="switchView('list')"
        >
          列表视图
        </Button>
        <Button
          :type="viewType === 'tree' ? 'primary' : 'default'"
          @click="switchView('tree')"
          style="margin-left: 8px"
        >
          树形视图
        </Button>
      </div>

      <!-- 批量操作区（列表视图显示） -->
      <div v-if="viewType === 'list'" class="batch-operation-bar" style="margin-bottom: 16px">
        <Button
          :disabled="selectedRowKeys.length === 0"
          @click="handleBatchDelete"
        >
          批量删除
        </Button>
        <Button
          :disabled="selectedRowKeys.length === 0"
          style="margin-left: 8px"
          @click="() => handleBatchStatus(1)"
        >
          批量启用
        </Button>
        <Button
          :disabled="selectedRowKeys.length === 0"
          style="margin-left: 8px"
          @click="() => handleBatchStatus(0)"
        >
          批量禁用
        </Button>
      </div>

      <!-- 核心内容区 -->
      <div class="content-area">
        <!-- 列表视图 -->
        <div v-if="viewType === 'list'">
          <Table
            :columns="listColumns"
            :data-source="deptList"
            :loading="loading"
            :pagination="paginationConfig"
            row-key="id"
            :scroll="{ x: 'max-content' }"
            :rowSelection="{
              type: 'checkbox',
              selectedRowKeys: selectedRowKeys,
              onChange: handleRowSelectChange,
            }"
            @change="handleTableChange"
          >
            <!-- 巡检类型列自定义渲染 -->
            <template #patrolType="{ text }">
              <Tag v-for="type in text" :key="type" color="blue" style="margin-right: 4px">
                {{ type }}
              </Tag>
            </template>

            <!-- 状态列自定义渲染（Switch） -->
            <template #status="{ record }">
              <Switch
                :checked="record.status === 1"
                @change="(checked) => handleStatusChange(record.id, checked ? 1 : 0)"
                :disabled="!hasEditPermission"
              />
            </template>

            <!-- 操作列 -->
            <template #operation="{ record }">
              <Space>
                <Button type="link" @click="handleEdit(record)">编辑</Button>
                <Button type="link" danger @click="handleDelete(record.id)">删除</Button>
                <Button type="link" @click="handleViewDetail(record)">详情</Button>
              </Space>
            </template>

            <!-- 层级缩进（部门名称） -->
            <template #deptName="{ record }">
              <span :style="{ paddingLeft: `${(record.level || 0) * 16}px` }">
                {{ record.deptName }}
              </span>
            </template>
          </Table>
        </div>

        <!-- 树形视图 -->
        <div v-else-if="viewType === 'tree'">
          <Tree
            :tree-data="deptTreeList"
            :loading="loading"
            :draggable="true"
            :field-names="{
              title: 'deptName',
              key: 'id',
              children: 'children',
            }"
            @drop="handleTreeDrop" 
            @rightClick="handleTreeRightClick"
          >
            <!-- 树形节点自定义渲染 -->
            <template #title="{ data }">
              <div
                class="tree-node-content"
                :title="`负责人：${data.leader} | 负责路段：${data.roadSection}`"
              >
                <span>{{ data.deptName }}({{ data.deptCode }})</span>
                <Tag
                  :color="data.status === 1 ? 'green' : 'red'"
                  style="margin-left: 8px; font-size: 12px"
                >
                  {{ data.status === 1 ? '启用' : '禁用' }}
                </Tag>
              </div>
            </template>
          </Tree>

          <!-- 树形视图右键菜单 -->
          <Dropdown
            v-model:open="treeMenuVisible"
            :trigger="['contextmenu']"
            :overlay="treeMenu"
            @open-change="handleTreeMenuOpenChange"
          >
            <div style="display: none" ref="treeMenuRef"></div>
          </Dropdown>
        </div>
      </div>

      <!-- 导入弹窗 -->
      <Modal
        v-model:open="importModalVisible"
        title="导入部门"
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
        <Button type="primary" style="margin-left: 8px" @click="handleImportSubmit">
          确认导入
        </Button>
      </Modal>

      <!-- 详情弹窗 -->
      <Modal
        v-model:open="detailModalVisible"
        title="部门详情"
        width="600px"
        @cancel="detailModalVisible = false"
      >
          <Descriptions :column="2" bordered :data="currentDeptDetail">
          <DescriptionsItem label="部门编码">{{ currentDeptDetail.deptCode }}</DescriptionsItem>
          <DescriptionsItem label="部门名称">{{ currentDeptDetail.deptName }}</DescriptionsItem>
          <DescriptionsItem label="上级部门">{{ currentDeptDetail.parentName || '无' }}</DescriptionsItem>
          <DescriptionsItem label="负责人">{{ currentDeptDetail.leader }}</DescriptionsItem>
          <DescriptionsItem label="联系电话">{{ currentDeptDetail.phone }}</DescriptionsItem>
          <DescriptionsItem label="负责路段">{{ currentDeptDetail.roadSection || '无' }}</DescriptionsItem>
          <DescriptionsItem label="巡检类型">
            <Tag v-for="type in currentDeptDetail.patrolType" :key="type" color="blue" style="margin-right: 4px">
              {{ type }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="状态">{{ currentDeptDetail.status === 1 ? '启用' : '禁用' }}</DescriptionsItem>
          <DescriptionsItem label="创建时间">{{ currentDeptDetail.createTime }}</DescriptionsItem>
          <DescriptionsItem label="部门描述" :span="2">{{ currentDeptDetail.description || '无' }}</DescriptionsItem>
          </Descriptions>
        </Modal>
      </Card>

    <!-- 新增/编辑弹窗 -->
    <DeptFormModal
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
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { message, Modal, Card, Table, Button, Space, Input, Tag, Switch, Dropdown, Tree, Upload, Descriptions, DescriptionsItem } from 'ant-design-vue';
import type { TableProps, TreeProps } from 'ant-design-vue';
import DeptFormModal from './components/DeptFormModal.vue';
import type {
  DeptItem,
  DeptQueryParams,
  DeptFormData,
} from '#/api/system-management/department-management';
import {
  getDeptList,
  addDept,
  editDept,
  deleteDept,
  batchDeleteDept,
  batchUpdateDeptStatus,
  importDept,
  exportDept,
  getDeptTree,
} from '#/api/system-management/department-management';

// 权限控制（简化，可替换为项目真实权限逻辑）
const hasEditPermission = ref(true);

// 搜索参数
const searchParams = reactive({
  keyword: '',
});

// 视图类型：list-列表 tree-树形
const viewType = ref<'list' | 'tree'>('list');

// 加载状态
const loading = ref(false);

// 部门列表数据
const deptList = ref<DeptItem[]>([]);

// 部门树形数据
const deptTreeList = ref<DeptItem[]>([]);

// 分页配置
const paginationConfig = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
});

// 列表选中行
const selectedRowKeys = ref<number[]>([]);

// 新增/编辑弹窗状态
const formModalVisible = ref(false);
const isEdit = ref(false);
const formModalData = reactive<DeptFormData>({
  deptCode: '',
  deptName: '',
  parentId: null,
  leader: '',
  phone: '',
  roadSection: '',
  patrolType: [],
  status: 1,
  description: '',
});

// 导入弹窗状态
const importModalVisible = ref(false);
const importFileList = ref<any[]>([]);

// 详情弹窗状态
const detailModalVisible = ref(false);
const currentDeptDetail = ref<DeptItem>({} as DeptItem);

// 树形视图右键菜单
const treeMenuVisible = ref(false);
const treeMenuRef = ref<HTMLDivElement>();
const currentTreeNode = ref<DeptItem>({} as DeptItem);

// 列表列配置
const listColumns = ref<TableProps['columns']>([
  {
    title: '部门编码',
    dataIndex: 'deptCode',
    key: 'deptCode',
    width: 120,
  },
  {
    title: '部门名称',
    dataIndex: 'deptName',
    key: 'deptName',
    width: 180,
    slots: { customRender: 'deptName' },
  },
  {
    title: '上级部门',
    dataIndex: 'parentName',
    key: 'parentName',
    width: 180,
  },
  {
    title: '负责人',
    dataIndex: 'leader',
    key: 'leader',
    width: 100,
  },
  {
    title: '联系电话',
    dataIndex: 'phone',
    key: 'phone',
    width: 120,
  },
  {
    title: '负责路段',
    dataIndex: 'roadSection',
    key: 'roadSection',
    ellipsis: true,
    width: 200,
  },
  {
    title: '巡检类型',
    dataIndex: 'patrolType',
    key: 'patrolType',
    slots: { customRender: 'patrolType' },
    width: 180,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    slots: { customRender: 'status' },
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 180,
  },
  {
    title: '操作',
    key: 'operation',
    slots: { customRender: 'operation' },
    width: 180,
  },
]);

// 树形菜单配置
const treeMenu = ref([
  {
    key: 'add',
    label: '新增子部门',
    onClick: () => handleTreeAddChild(),
  },
  {
    key: 'edit',
    label: '编辑',
    onClick: () => handleTreeEdit(),
  },
  {
    key: 'delete',
    label: '删除',
    onClick: () => handleTreeDelete(),
  },
  {
    key: 'status',
    label: computed(() => currentTreeNode.value.status === 1 ? '禁用' : '启用'),
    onClick: () => handleTreeStatusChange(),
  },
]);

// 构建查询参数
const buildQueryParams = (): DeptQueryParams => {
  return {
    pageNum: paginationConfig.current,
    pageSize: paginationConfig.pageSize,
    deptName: searchParams.keyword || undefined,
    deptCode: searchParams.keyword || undefined,
    leader: searchParams.keyword || undefined,
    status: undefined,
    viewType: viewType.value,
  };
};

// 加载部门数据
const loadDeptData = async () => {
  try {
    loading.value = true;
    const params = buildQueryParams();
    const res = await getDeptList(params);
    if (viewType.value === 'list') {
      deptList.value = res.list;
      paginationConfig.total = res.total;
    } else {
      // 树形视图直接加载树形结构
      const treeRes = await getDeptTree();
      deptTreeList.value = treeRes;
    }
  } catch (err) {
    message.error('加载部门数据失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  paginationConfig.current = 1;
  loadDeptData();
};

// 刷新
const handleRefresh = () => {
  searchParams.keyword = '';
  paginationConfig.current = 1;
  loadDeptData();
};

// 切换视图
const switchView = (type: 'list' | 'tree') => {
  viewType.value = type;
  loadDeptData();
};

// 表格分页/排序/筛选变化
const handleTableChange: TableProps['onChange'] = (pagination, _filters, _sorter) => {
  paginationConfig.current = pagination.current!;
  paginationConfig.pageSize = pagination.pageSize!;
  loadDeptData();
};

// 行选择变化
const handleRowSelectChange = (keys: (string | number)[], _rows: DeptItem[]) => {
  selectedRowKeys.value = keys.map((k) => (typeof k === 'string' ? Number(k) : k));
};

// 新增部门
const handleAdd = () => {
  isEdit.value = false;
  // 重置表单数据
  Object.assign(formModalData, {
    deptCode: '',
    deptName: '',
    parentId: null,
    leader: '',
    phone: '',
    roadSection: '',
    patrolType: [],
    status: 1,
    description: '',
  });
  formModalVisible.value = true;
};

// 编辑部门
const handleEdit = (record: DeptItem) => {
  isEdit.value = true;
  // 回显数据
  Object.assign(formModalData, {
    id: record.id,
    deptCode: record.deptCode,
    deptName: record.deptName,
    parentId: record.parentId,
    leader: record.leader,
    phone: record.phone,
    roadSection: record.roadSection,
    patrolType: record.patrolType,
    status: record.status,
    description: record.description,
  });
  formModalVisible.value = true;
};

// 删除部门
const handleDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '删除部门后，关联的用户/角色将解除归属，是否确认？',
    onOk: async () => {
      try {
        await deleteDept(id);
        message.success('删除成功');
        loadDeptData();
      } catch (err) {
        message.error('删除失败：' + (err as Error).message);
        console.error(err);
      }
    },
  });
};

// 查看详情
const handleViewDetail = (record: DeptItem) => {
  currentDeptDetail.value = record;
  detailModalVisible.value = true;
};

// 状态切换
const handleStatusChange = async (id: number, status: number) => {
  try {
    await batchUpdateDeptStatus([id], status);
    message.success(status === 1 ? '启用成功' : '禁用成功');
    loadDeptData();
  } catch (err) {
    message.error(status === 1 ? '启用失败' : '禁用失败');
    console.error(err);
    // 回滚状态
    loadDeptData();
  }
};

// 批量删除
const handleBatchDelete = () => {
  Modal.confirm({
    title: '批量删除',
    content: `确认删除选中的${selectedRowKeys.value.length}个部门？删除后关联用户/角色将解除归属`,
    onOk: async () => {
      try {
        await batchDeleteDept(selectedRowKeys.value);
        message.success('批量删除成功');
        selectedRowKeys.value = [];
        loadDeptData();
      } catch (err) {
        message.error('批量删除失败');
        console.error(err);
      }
    },
  });
};

// 批量修改状态
const handleBatchStatus = async (status: number) => {
  try {
    await batchUpdateDeptStatus(selectedRowKeys.value, status);
    message.success(status === 1 ? '批量启用成功' : '批量禁用成功');
    selectedRowKeys.value = [];
    loadDeptData();
  } catch (err) {
    message.error(status === 1 ? '批量启用失败' : '批量禁用失败');
    console.error(err);
  }
};

// 表单提交（新增/编辑）
const handleFormSubmit = async (data: DeptFormData) => {
  try {
    if (isEdit.value) {
      await editDept(data);
      message.success('编辑部门成功');
    } else {
      await addDept(data);
      message.success('新增部门成功');
    }
    formModalVisible.value = false;
    loadDeptData();
  } catch (err) {
    message.error(isEdit.value ? '编辑失败' : '新增失败');
    console.error(err);
  }
};

// 导入弹窗打开
const handleImportClick = () => {
  importModalVisible.value = true;
  importFileList.value = [];
};

// 导入文件前置校验
const beforeImportUpload = (file: File) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel';
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
  return false; // 手动控制上传
};

// 移除导入文件
const handleImportFileRemove = () => {
  importFileList.value = [];
};

// 下载导入模板
const downloadImportTemplate = () => {
  const headers = [
    '部门编码',
    '部门名称',
    '上级部门编码',
    '负责人',
    '联系电话',
    '负责路段',
    '巡检类型',
    '状态',
    '部门描述',
  ];
  const sample = [
    'SX-01-01',
    '示例巡检大队',
    'SX-01-00',
    '张三',
    '13800000000',
    'G65包茂高速K1200-K1250段',
    '日常巡检,应急巡检',
    '启用',
    '示例描述',
  ];
  const csvContent = [headers.join(','), sample.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '部门导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// 提交导入
const handleImportSubmit = async () => {
  if (importFileList.value.length === 0) {
    message.error('请选择要导入的Excel文件');
    return;
  }
  const formData = new FormData();
  formData.append('file', importFileList.value[0]);
  try {
    loading.value = true;
    const res = await importDept(formData);
    message.success(`${res.msg}（成功：${res.success}条，失败：${res.fail}条）`);
    if (res.failMsg) {
      Modal.info({
        title: '导入失败详情',
        content: res.failMsg,
      });
    }
    importModalVisible.value = false;
    loadDeptData();
  } catch (err) {
    message.error('导入失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// 导出部门
const handleExport = async () => {
  try {
    loading.value = true;
    const params = buildQueryParams();
    const res = await exportDept(params);
    // 处理Blob流下载
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `部门列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
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

// 树形视图右键菜单打开
const handleTreeRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
  event.preventDefault();
  currentTreeNode.value = node as unknown as DeptItem;
  treeMenuVisible.value = true;
  // 定位菜单到点击位置
  if (treeMenuRef.value) {
    treeMenuRef.value.style.position = 'absolute';
    treeMenuRef.value.style.left = `${event.clientX}px`;
    treeMenuRef.value.style.top = `${event.clientY}px`;
  }
};

// 树形菜单显示状态变化
const handleTreeMenuOpenChange = (open: boolean) => {
  if (!open) {
    treeMenuVisible.value = false;
  }
};

// 树形新增子部门
const handleTreeAddChild = () => {
  isEdit.value = false;
  Object.assign(formModalData, {
    deptCode: '',
    deptName: '',
    parentId: currentTreeNode.value.id,
    leader: '',
    phone: '',
    roadSection: '',
    patrolType: [],
    status: 1,
    description: '',
  });
  formModalVisible.value = true;
  treeMenuVisible.value = false;
};

// 树形编辑
const handleTreeEdit = () => {
  handleEdit(currentTreeNode.value);
  treeMenuVisible.value = false;
};

// 树形删除
const handleTreeDelete = () => {
  handleDelete(currentTreeNode.value.id);
  treeMenuVisible.value = false;
};

// 树形状态切换
const handleTreeStatusChange = () => {
  const newStatus = currentTreeNode.value.status === 1 ? 0 : 1;
  handleStatusChange(currentTreeNode.value.id, newStatus);
  treeMenuVisible.value = false;
};

// 树形拖拽调整层级
const handleTreeDrop: TreeProps['onDrop'] = async ({ dragNode, node, dropPosition }) => {
  try {
    // 简化实现：实际需调用后端接口修改parentId
    const dragDept = dragNode as unknown as DeptItem;
    const dropDept = node as unknown as DeptItem;
    await editDept({
      ...dragDept,
      parentId: dropPosition === 0 ? dropDept.id : dropDept.parentId, // 0-内部（子节点），1-上方，2-下方
    });
    message.success('调整部门层级成功');
    loadDeptData();
  } catch (err) {
    message.error('调整层级失败');
    console.error(err);
  }
};

// 初始化加载数据
onMounted(() => {
  loadDeptData();
});

// 监听视图类型变化，重新加载数据
watch(viewType, loadDeptData);
</script>

<style scoped>
.department-management-container {
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

.view-switch-bar {
  display: flex;
  align-items: center;
}

.tree-node-content {
  display: flex;
  align-items: center;
}

.batch-operation-bar {
  display: flex;
  align-items: center;
}
</style>
