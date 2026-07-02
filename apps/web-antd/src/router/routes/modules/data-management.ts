import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:folder-tree',
      order: 15,
      title: $t('page.system.dataManagement'),
    },
    name: 'DataManagement',
    path: '/data-management',
    children: [
      {
        name: 'ImageDatabase',
        path: '/data-management/image-database',
        component: () => import('#/views/system/image-database/index.vue'),
        meta: {
          icon: 'lucide:image',
          title: $t('page.system.imageDatabase'),
        },
      },
      {
        name: 'VideoDatabase',
        path: '/data-management/video-database',
        component: () => import('#/views/system/video-database/index.vue'),
        meta: {
          icon: 'lucide:video',
          title: $t('page.system.videoDatabase'),
        },
      },
      {
        name: 'ModelManagement',
        path: '/data-management/model-management',
        component: () => import('#/views/system/model-management/index.vue'),
        meta: {
          icon: 'lucide:box',
          title: $t('page.system.modelManagement'),
        },
      },
    ],
  },
];

export default routes;
