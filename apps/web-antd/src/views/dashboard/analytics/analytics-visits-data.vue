<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { analyticsApi } from '#/api/dashboard/analytics';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(async () => {
  try {
    // 获取访客统计数据
    const data = await analyticsApi.getVisitorStatistics();
    const dailyTrends = data.daily_trends || [];

    // 提取最近7天数据
    const dates = dailyTrends.map((t) => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const visitCounts = dailyTrends.map((t) => t.count);

    // 计算最大值
    const maxValue = Math.max(...visitCounts, 10);

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
          areaStyle: {
            color: {
              colorStops: [
                { color: 'rgba(90, 177, 239, 0.4)', offset: 0 },
                { color: 'rgba(90, 177, 239, 0.1)', offset: 1 },
              ],
              type: 'linear',
              x: 0,
              x2: 0,
              y: 0,
              y2: 1,
            },
          },
          data: visitCounts,
          itemStyle: {
            color: '#5ab1ef',
          },
          lineStyle: {
            width: 3,
          },
          smooth: true,
          type: 'line',
        },
      ],
      tooltip: {
        formatter: (params: any) => {
          return `${params[0].name}<br/>访问量: ${params[0].value}`;
        },
        trigger: 'axis',
      },
      xAxis: {
        axisLabel: {
          interval: 0,
        },
        axisTick: {
          show: false,
        },
        boundaryGap: false,
        data: dates,
        type: 'category',
      },
      yAxis: {
        axisTick: {
          show: false,
        },
        max: Math.ceil(maxValue * 1.2),
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
        type: 'value',
      },
    });
  } catch (error) {
    console.error('加载访问数据失败:', error);
    // 显示空图表
    renderEcharts({
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
