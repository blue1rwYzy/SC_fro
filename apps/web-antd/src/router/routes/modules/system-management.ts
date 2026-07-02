import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:shield-check',
      order: 100,
      title: $t('page.systemManagement.title'),
    },
    name: 'SystemManagement',
    path: '/system-management',
    children: [
      {
        name: 'UserManagement',
        path: '/system-management/users',
        component: () => import('#/views/system-management/users/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.systemManagement.users'),
        },
      },
      {
        name: 'RoleManagement',
        path: '/system-management/roles',
        component: () => import('#/views/system-management/roles/index.vue'),
        meta: {
          icon: 'lucide:shield',
          title: $t('page.systemManagement.roles'),
        },
      },
      {
        name: 'DepartmentManagement',
        path: '/system-management/departments',
        component: () => import('#/views/system-management/departments/index.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: $t('page.systemManagement.departments'),
        },
      },
    ],
  },
];

export default routes;
