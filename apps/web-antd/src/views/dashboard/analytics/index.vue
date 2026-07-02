<script lang="ts" setup>
// @ts-nocheck
import type { AnalysisOverviewItem } from '@vben/common-ui';
import type { TabOption } from '@vben/types';

import { ref, onMounted } from 'vue';
import {
  AnalysisChartCard,
  AnalysisChartsTabs,
  AnalysisOverview,
} from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';

import AnalyticsTrends from './analytics-trends.vue';
import AnalyticsVisitsData from './analytics-visits-data.vue';
import AnalyticsVisitsSales from './analytics-visits-sales.vue';
import AnalyticsVisitsSource from './analytics-visits-source.vue';
import AnalyticsVisits from './analytics-visits.vue';
import { analyticsApi, type DefectStatistics } from '#/api/dashboard/analytics';

const overviewItems = ref<AnalysisOverviewItem[]>([
  {
    icon: SvgCardIcon,
    title: '总检测次数',
    totalTitle: '累计检测图片',
    totalValue: 0,
    value: 0,
  },
  {
    icon: SvgCakeIcon,
    title: '总缺陷数量',
    totalTitle: '累计发现缺陷',
    totalValue: 0,
    value: 0,
  },
  {
    icon: SvgDownloadIcon,
    title: '平均置信度',
    totalTitle: '检测准确率',
    totalValue: 0,
    value: 0,
  },
  {
    icon: SvgBellIcon,
    title: '严重缺陷',
    totalTitle: '需优先处理',
    totalValue: 0,
    value: 0,
  },
]);

const chartTabs: TabOption[] = [
  {
    label: '检测趋势',
    value: 'trends',
  },
  {
    label: '缺陷分布',
    value: 'visits',
  },
];

const statistics = ref<DefectStatistics | null>(null);
const loading = ref(true);

// 加载统计数据
const loadStatistics = async () => {
  try {
    loading.value = true;
    const data = await analyticsApi.getDefectStatistics();
    statistics.value = data;

    // 更新概览卡片数据
    if (data.overview) {
      // 总检测次数
      overviewItems.value[0].totalValue = data.overview.total_inspections;
      overviewItems.value[0].value = data.overview.total_inspections;

      // 总缺陷数量
      overviewItems.value[1].totalValue = data.overview.total_defects;
      overviewItems.value[1].value = data.overview.total_defects;

      // 平均置信度
      overviewItems.value[2].totalValue = data.overview.avg_confidence;
      overviewItems.value[2].value = data.overview.avg_confidence;

      // 严重缺陷数量（等级4和5的缺陷）
      const severeCounts = data.severity_distribution
        .filter((s) => s.level >= 4)
        .reduce((sum, s) => sum + s.defect_count, 0);
      overviewItems.value[3].totalValue = severeCounts;
      overviewItems.value[3].value = severeCounts;
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStatistics();
});
</script>

<template>
  <div class="p-5">
    <AnalysisOverview :items="overviewItems" />
    <AnalysisChartsTabs
      :default-value="'visits'"
      :tabs="chartTabs"
      class="mt-5"
    >
      <template #trends>
        <AnalyticsTrends />
      </template>
      <template #visits>
        <AnalyticsVisits />
      </template>
    </AnalysisChartsTabs>

    <div class="mt-5 w-full md:flex">
      <AnalysisChartCard class="mt-5 md:mr-4 md:mt-0 md:w-1/2" title="访问趋势">
        <AnalyticsVisitsData />
      </AnalysisChartCard>
      <AnalysisChartCard class="mt-5 md:mt-0 md:w-1/2" title="访问省份排名">
        <AnalyticsVisitsSales />
      </AnalysisChartCard>
    </div>

    <!-- 世界地图 - 独立一行 -->
    <div class="mt-5 w-full">
      <AnalysisChartCard title="全球访问来源分布" style="height: 600px">
        <AnalyticsVisitsSource />
      </AnalysisChartCard>
    </div>
  </div>
</template>
