import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    name: 'SystemManagement',
    path: '/system-management',
    component: BasicLayout,
    meta: {
      icon: 'ant-design:setting-outlined',
      order: 50,
      title: '系统管理',
    },
    children: [
      {
        name: 'SystemUserManagement',
        path: '/system-management/user',
        component: () => import('#/views/system-management/user-management/index.vue'),
        meta: {
          title: '用户管理',
        },
      },
      {
        name: 'SystemRoleManagement',
        path: '/system-management/role',
        component: () => import('#/views/system-management/role-management/index.vue'),
        meta: {
          title: '角色管理',
        },
      },
      {
        name: 'SystemDeptManagement',
        path: '/system-management/dept',
        component: () => import('#/views/system-management/dept-management/index.vue'),
        meta: {
          title: '部门管理',
        },
      },
    ],
  },
];

export default routes;
