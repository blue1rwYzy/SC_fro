import { requestClient } from '#/api/request';

// 部门类型定义
export interface DeptItem {
  id: number;
  deptCode: string;
  deptName: string;
  parentId: number | null;
  parentName: string;
  leader: string;
  phone: string;
  roadSection: string;
  patrolType: string[]; // 巡检类型：['日常巡检','应急巡检','养护巡检','综合管理']
  status: number; // 1-启用 0-禁用
  createTime: string;
  leaderPhone?: string; // 兼容字段
  description?: string;
}

// 分页查询参数
export interface DeptQueryParams {
  pageNum: number;
  pageSize: number;
  deptName?: string;
  deptCode?: string;
  leader?: string;
  status?: number;
  viewType: 'list' | 'tree'; // 视图类型
}

// 分页返回结果
export interface PageResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

// 新增/编辑部门参数
export interface DeptFormData {
  id?: number;
  deptCode: string;
  deptName: string;
  parentId: number | null;
  leader: string;
  phone: string;
  roadSection: string;
  patrolType: string[];
  status: number;
  description?: string;
}

// 获取部门列表（分页/树形）
export const getDeptList = (params: DeptQueryParams) => {
  return requestClient.get<PageResult<DeptItem>>('/api/dept/list',{params});
};

// 新增部门
export const addDept = (data: DeptFormData) => {
  return requestClient.post<{ msg: string; data: DeptItem }>('/api/dept/add',{data});
};

// 编辑部门
export const editDept = (data: DeptFormData) => {
  return requestClient.put<{ msg: string }>('/api/dept/edit',{data});
};

// 删除部门
export const deleteDept = (id: number) => {
  return requestClient.delete<{ msg: string }>(`/api/dept/delete/${id}`);
};

// 批量删除部门
export const batchDeleteDept = (ids: number[]) => {
  return requestClient.delete<{ msg: string }>('/api/dept/batch-delete',{data:{ ids }});
};

// 批量修改部门状态
export const batchUpdateDeptStatus = (ids: number[], status: number) => {
  return requestClient.put<{ msg: string }>('/api/dept/batch-status',{data:{ ids, status }});
};

// 导入部门（上传Excel）
export const importDept = (formData: FormData) => {
  return requestClient.post<{ msg: string; success: number; fail: number; failMsg: string }>('/api/dept/import',{data: formData},{headers: { 'Content-Type': 'multipart/form-data' }});
};

// 导出部门
export const exportDept = (params: Omit<DeptQueryParams, 'pageNum' | 'pageSize'>) => {
  return requestClient.get('/api/dept/export',{params,responseType:'blob'} );
};

// 获取部门树形结构（用于上级部门选择器）
export const getDeptTree = () => {
  return requestClient.get<DeptItem[]>('/api/dept/tree');
};