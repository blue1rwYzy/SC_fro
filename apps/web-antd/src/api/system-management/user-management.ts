import { requestClient } from '#/api/request';

export interface UserItem {
  id: number;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  deptId: number | null;
  deptName?: string;
  roles: string[];
  status: number;
  createTime: string;
  description?: string;
}

export interface UserQueryParams {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  deptId?: number;
  status?: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

export interface UserFormData {
  id?: number;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  deptId: number | null;
  roles: string[];
  status: number;
  description?: string;
}

export const getUserList = (params: UserQueryParams) => {
  return requestClient.get<PageResult<UserItem>>('/api/user/list', { params });
};

export const addUser = (data: UserFormData) => {
  return requestClient.post<{ msg: string; data: UserItem }>('/api/user/add', { data });
};

export const editUser = (data: UserFormData) => {
  return requestClient.put<{ msg: string; data: UserItem }>(`/api/user/${data.id}`, { data });
};

export const deleteUser = (id: number) => {
  return requestClient.delete<{ msg: string }>(`/api/user/${id}`);
};

export const batchDeleteUser = (ids: number[]) => {
  return requestClient.post<{ msg: string }>(`/api/user/batch/delete`, { data: { ids } });
};

export const batchUpdateUserStatus = (ids: number[], status: number) => {
  return requestClient.post<{ msg: string }>(`/api/user/batch/status`, { data: { ids, status } });
};

export const importUser = (formData: FormData) => {
  return requestClient.post<{ msg: string; success: number; fail: number; failMsg?: string }>(
    '/api/user/import',
    { data: formData },
  );
};

export const exportUser = (params: UserQueryParams) => {
  return requestClient.get<ArrayBuffer>('/api/user/export', { params, responseType: 'blob' });
};

export const getAllRoles = () => {
  return requestClient.get<string[]>('/api/role/all');
};
