<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { analyticsApi } from '#/api/dashboard/analytics';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(async () => {
  try {
    // 获取统计数据
    const data = await analyticsApi.getDefectStatistics();
    const severityDist = data.severity_distribution || [];

    // 提取等级和数据
    const labels = severityDist.map((s) => s.text || `等级${s.level}`);
    const defectCounts = severityDist.map((s) => s.defect_count);

    // 根据严重程度设置颜色
    const colors = severityDist.map((s) => {
      if (s.level === 5) return '#ff4d4f'; // 严重 - 红色
      if (s.level === 4) return '#ff7a45'; // 较严重 - 橙红
      if (s.level === 3) return '#ffa940'; // 中等 - 橙色
      if (s.level === 2) return '#ffc53d'; // 轻微 - 黄色
      return '#52c41a'; // 正常/轻微 - 绿色
    });

    // 计算最大值
    const maxValue = Math.max(...defectCounts, 10);

    renderEcharts({
      grid: {
        bottom: '10%',
        containLabel: true,
        left: '5%',
        right: '5%',
        top: '10%',
      },
      series: [
        {
          barMaxWidth: 60,
          data: defectCounts.map((value, index) => ({
            itemStyle: {
              color: colors[index],
            },
            value,
          })),
          type: 'bar',
        },
      ],
      tooltip: {
        axisPointer: {
          lineStyle: {
            width: 1,
          },
        },
        formatter: (params: any) => {
          const item = params[0];
          return `${item.name}<br/>缺陷数量: ${item.value}`;
        },
        trigger: 'axis',
      },
      xAxis: {
        axisLabel: {
          interval: 0,
          rotate: 0,
        },
        data: labels,
        name: '严重程度',
        type: 'category',
      },
      yAxis: {
        max: Math.ceil(maxValue * 1.2),
        name: '缺陷数量',
        splitNumber: 4,
        type: 'value',
      },
    });
  } catch (error) {
    console.error('加载缺陷分布数据失败:', error);
    // 显示空图表
    renderEcharts({
      grid: {
        bottom: '10%',
        containLabel: true,
        left: '5%',
        right: '5%',
        top: '10%',
      },
      series: [],
      xAxis: { data: [], type: 'category' },
      yAxis: { type: 'value' },
    });
  }
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
