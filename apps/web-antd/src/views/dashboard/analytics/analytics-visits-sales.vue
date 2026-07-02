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
    const provinceStats = data.province_stats || [];

    // 取Top10省份
    const top10 = provinceStats.slice(0, 10);

    const chartData = top10.map((item) => ({
      name: item.province,
      value: item.count,
    }));

    renderEcharts({
      series: [
        {
          animationDelay() {
            return Math.random() * 400;
          },
          animationEasing: 'exponentialInOut',
          animationType: 'scale',
          center: ['50%', '50%'],
          color: ['#5ab1ef', '#b6a2de', '#67e0e3', '#2ec7c9', '#ffa940'],
          data: chartData.toSorted((a, b) => {
            return a.value - b.value;
          }),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              shadowOffsetX: 0,
            },
          },
          itemStyle: {
            borderRadius: 8,
          },
          label: {
            fontSize: 11,
            show: true,
          },
          name: '访问省份',
          radius: ['30%', '75%'],
          roseType: 'radius',
          type: 'pie',
        },
      ],

      tooltip: {
        formatter: '{a} <br/>{b}: {c} ({d}%)',
        trigger: 'item',
      },
    });
  } catch (error) {
    console.error('加载省份统计数据失败:', error);
    // 显示空图表
    renderEcharts({
      series: [
        {
          data: [],
          radius: ['30%', '75%'],
          roseType: 'radius',
          type: 'pie',
        },
      ],
    });
  }
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
