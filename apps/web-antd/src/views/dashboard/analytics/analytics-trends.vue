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
    const trends = data.trends || [];

    // 提取日期和数据
    const dates = trends.map((t) => {
      const date = new Date(t.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const inspectionCounts = trends.map((t) => t.inspection_count);
    const defectCounts = trends.map((t) => t.defect_count);

    // 计算最大值用于Y轴
    const maxValue = Math.max(
      ...inspectionCounts,
      ...defectCounts,
      10, // 最小值为10，避免图表太小
    );

    renderEcharts({
      grid: {
        bottom: '10%',
        containLabel: true,
        left: '3%',
        right: '3%',
        top: '10%',
      },
      legend: {
        data: ['检测次数', '缺陷数量'],
        top: '0%',
      },
      series: [
        {
          areaStyle: {
            color: {
              colorStops: [
                { color: 'rgba(90, 177, 239, 0.3)', offset: 0 },
                { color: 'rgba(90, 177, 239, 0.05)', offset: 1 },
              ],
              type: 'linear',
              x: 0,
              x2: 0,
              y: 0,
              y2: 1,
            },
          },
          data: inspectionCounts,
          itemStyle: {
            color: '#5ab1ef',
          },
          name: '检测次数',
          smooth: true,
          type: 'line',
        },
        {
          areaStyle: {
            color: {
              colorStops: [
                { color: 'rgba(1, 150, 128, 0.3)', offset: 0 },
                { color: 'rgba(1, 150, 128, 0.05)', offset: 1 },
              ],
              type: 'linear',
              x: 0,
              x2: 0,
              y: 0,
              y2: 1,
            },
          },
          data: defectCounts,
          itemStyle: {
            color: '#019680',
          },
          name: '缺陷数量',
          smooth: true,
          type: 'line',
        },
      ],
      tooltip: {
        axisPointer: {
          lineStyle: {
            color: '#019680',
            width: 1,
          },
        },
        trigger: 'axis',
      },
      xAxis: {
        axisTick: {
          show: false,
        },
        boundaryGap: false,
        data: dates,
        name: '日期',
        splitLine: {
          lineStyle: {
            type: 'dashed',
            width: 1,
          },
          show: true,
        },
        type: 'category',
      },
      yAxis: [
        {
          axisTick: {
            show: false,
          },
          max: Math.ceil(maxValue * 1.2), // Y轴最大值设为数据最大值的1.2倍
          name: '数量',
          splitArea: {
            show: true,
          },
          splitNumber: 4,
          type: 'value',
        },
      ],
    });
  } catch (error) {
    console.error('加载检测趋势数据失败:', error);
    // 显示空图表
    renderEcharts({
      grid: {
        bottom: '10%',
        containLabel: true,
        left: '3%',
        right: '3%',
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
