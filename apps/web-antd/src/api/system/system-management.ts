/**
 * 系统管理API
 */
import { requestClient } from '#/api/request';

export interface UserData {
  id?: number;
  username?: string;
  password?: string;
  real_name?: string;
  email?: string;
  phone?: string;
  department_id?: number;
  position?: string;
  role_ids?: number[];
  status?: boolean;
}

export interface RoleData {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  permissions?: string;
  sort_order?: number;
  status?: boolean;
}

export interface DepartmentData {
  id?: number;
  name?: string;
  code?: string;
  parent_id?: number | null;
  leader?: string;
  phone?: string;
  email?: string;
  sort_order?: number;
  description?: string;
  status?: boolean;
}

export const systemApi = {
  // ============ 用户管理 ============

  /**
   * 获取用户列表(分页)
   */
  getUsers(params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
    department_id?: number;
    status?: boolean;
  }) {
    return requestClient.get('/system/users', { params });
  },

  /**
   * 获取用户详情
   */
  getUserDetail(id: number) {
    return requestClient.get(`/system/users/${id}`);
  },

  /**
   * 创建用户
   */
  createUser(data: UserData) {
    return requestClient.post('/system/users', data);
  },

  /**
   * 更新用户
   */
  updateUser(id: number, data: Partial<UserData>) {
    return requestClient.put(`/system/users/${id}`, data);
  },

  /**
   * 删除用户
   */
  deleteUser(id: number) {
    return requestClient.delete(`/system/users/${id}`);
  },

  /**
   * 重置用户密码
   */
  resetUserPassword(id: number, data: { new_password: string }) {
    return requestClient.put(`/system/users/${id}/password`, data);
  },

  // ============ 角色管理 ============

  /**
   * 获取角色列表
   * @param params 如果传page则分页,不传则返回所有
   */
  getRoles(params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
    status?: boolean;
  }) {
    return requestClient.get('/system/roles', { params });
  },

  /**
   * 获取角色详情
   */
  getRoleDetail(id: number) {
    return requestClient.get(`/system/roles/${id}`);
  },

  /**
   * 创建角色
   */
  createRole(data: RoleData) {
    return requestClient.post('/system/roles', data);
  },

  /**
   * 更新角色
   */
  updateRole(id: number, data: Partial<RoleData>) {
    return requestClient.put(`/system/roles/${id}`, data);
  },

  /**
   * 删除角色
   */
  deleteRole(id: number) {
    return requestClient.delete(`/system/roles/${id}`);
  },

  /**
   * 获取角色关联的用户
   */
  getRoleUsers(id: number) {
    return requestClient.get(`/system/roles/${id}/users`);
  },

  // ============ 部门管理 ============

  /**
   * 获取部门树形结构
   */
  getDepartmentTree(params?: { status?: boolean }) {
    return requestClient.get('/system/departments/tree', { params });
  },

  /**
   * 获取部门列表(平铺)
   * @param params 如果传page则分页,不传则返回所有
   */
  getDepartments(params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
    status?: boolean;
  }) {
    return requestClient.get('/system/departments', { params });
  },

  /**
   * 获取部门详情
   */
  getDepartmentDetail(id: number) {
    return requestClient.get(`/system/departments/${id}`);
  },

  /**
   * 创建部门
   */
  createDepartment(data: DepartmentData) {
    return requestClient.post('/system/departments', data);
  },

  /**
   * 更新部门
   */
  updateDepartment(id: number, data: Partial<DepartmentData>) {
    return requestClient.put(`/system/departments/${id}`, data);
  },

  /**
   * 删除部门
   */
  deleteDepartment(id: number) {
    return requestClient.delete(`/system/departments/${id}`);
  },

  /**
   * 获取部门下的用户
   */
  getDepartmentUsers(id: number, includeChildren: boolean = false) {
    return requestClient.get(`/system/departments/${id}/users`, {
      params: { include_children: includeChildren },
    });
  },
};
