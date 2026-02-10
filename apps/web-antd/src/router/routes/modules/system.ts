import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 10,
      title: $t('page.system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'DefectDetection',
        path: '/system/defect-detection',
        component: () => import('#/views/system/defect-detection/index.vue'),
        meta: {
          icon: 'lucide:scan-search',
          title: $t('page.system.defectDetection'),
        },
      },
      {
        name: 'ImageDatabase',
        path: '/system/image-database',
        component: () => import('#/views/system/image-database/index.vue'),
        meta: {
          icon: 'lucide:database',
          title: $t('page.system.imageDatabase'),
        },
      },
      {
        name: 'VehicleTracking',
        path: '/system/vehicle-tracking',
        component: () => import('#/views/system/vehicle-tracking/index.vue'),
        meta: {
          icon: 'lucide:car',
          title: $t('page.system.vehicleTracking'),
        },
      },
      {
        name: 'ModelManagement',
        path: '/system/model-management',
        component: () => import('#/views/system/model-management/index.vue'),
        meta: {
          icon: 'lucide:box',
          title: $t('page.system.modelManagement'),
        },
      },
      {
        name: 'VideoDatabase',
        path: '/system/video-database',
        component: () => import('#/views/system/video-database/index.vue'),
        meta: {
          icon: 'lucide:video',
          title: $t('page.system.videoDatabase'),
        },
      },
    ],
  },
];

export default routes;
