import { requestClient } from '../request';

export interface RoleItem {
  id: number;
  name: string;
  code: string;
  status: number;
  description: string;
  createdAt: string;
}

export interface RoleCreateDTO {
  name: string;
  code: string;
  status: number;
  description?: string;
}

export interface RoleUpdateDTO {
  name?: string;
  code?: string;
  status?: number;
  description?: string;
}

// 1. 列表
export function getRoleList() {
  return requestClient.get<RoleItem[]>('/system/roles');
}

// 2. 新增
export function createRole(data: RoleCreateDTO) {
  return requestClient.post<RoleItem>('/system/roles', data);
}

// 3. 修改
export function updateRole(id: number, data: RoleUpdateDTO) {
  return requestClient.put<RoleItem>(`/system/roles/${id}`, data);
}

// 4. 删除
export function deleteRole(id: number) {
  return requestClient.delete<boolean>(`/system/roles/${id}`);
}
