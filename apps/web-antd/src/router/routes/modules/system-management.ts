import type { RouteRecordRaw } from 'vue-router';

const systemManagementRoutes: RouteRecordRaw[] = [
  {
    path: '/system-management',
    name: 'SystemManagement',
    meta: {
      title: '系统管理',
      icon: 'lucide:settings',
      requiresAuth: true, // 需要权限验证
    },
    children: [
      {
        path: 'department-management',
        name: 'DepartmentManagement',
        component: () => import('#/views/system-management/department-management/index.vue'),
        meta: {
          title: '部门管理',
          icon: 'lucide:building-2',
          keepAlive: true,
        },
      },
      {
        path: 'user-management',
        name: 'UserManagement',
        component: () => import('#/views/system-management/user-management/index.vue'),
        meta: {
          title: '用户管理',
          icon: 'lucide:users',
          keepAlive: true,
        },
      },
    ],
  },
];

export default systemManagementRoutes;
