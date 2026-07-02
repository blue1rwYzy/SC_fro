<script lang="ts" setup>
import { onMounted, ref, onUnmounted, computed, watch } from 'vue';
import { usePreferences } from '@vben/preferences';
import { analyticsApi } from '#/api/dashboard/analytics';

const mapContainer = ref<HTMLDivElement>();
let map: any = null;
let AMap: any = null;
let markers: any[] = []; // 存储所有标记,用于主题切换时重新渲染

// 高德地图API密钥
const AMAP_KEY = 'be8291ff689aa062931f30bb99aad37a';
const AMAP_SECURITY_KEY = 'c11c58449fcbc53f2b609c5db547e4cf';

// 获取系统主题
const preferences = usePreferences();
const isDark = computed(() => preferences.theme.value === 'dark');

// 根据主题获取地图样式
const getMapStyle = () => {
  return isDark.value ? 'amap://styles/dark' : 'amap://styles/normal';
};

// 根据主题获取文字颜色
const getTextColor = () => {
  return isDark.value ? '#fff' : '#333';
};

// 根据主题获取背景色
const getBackgroundColor = () => {
  return isDark.value ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)';
};

// 动态加载高德地图脚本
const loadAMapScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      AMap = window.AMap;
      resolve();
      return;
    }

    // 设置安全密钥
    (window as any)._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_KEY,
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    script.async = true;

    script.onload = () => {
      AMap = window.AMap;
      console.log('✅ 高德地图加载成功');
      resolve();
    };

    script.onerror = (error) => {
      console.error('❌ 高德地图加载失败:', error);
      reject(new Error('高德地图加载失败'));
    };

    document.head.appendChild(script);
  });
};

// 渲染地图标记
const renderMarkers = async () => {
  if (!map) return;

  // 清除旧标记
  markers.forEach((marker) => {
    map.remove(marker);
  });
  markers = [];

  // 获取访客统计数据
  const data = await analyticsApi.getVisitorStatistics();
  const mapData = data.map_data || [];

  if (mapData.length === 0) {
    // 如果没有数据,显示提示
    const text = new AMap.Text({
      text: '暂无访问数据',
      position: map.getCenter(),
      style: {
        'font-size': '18px',
        'color': getTextColor(),
        'background-color': getBackgroundColor(),
        'border': `1px solid ${isDark.value ? '#4a7ba7' : '#d9d9d9'}`,
        'padding': '15px 30px',
        'border-radius': '5px',
      },
    });
    map.add(text);
    markers.push(text);
    return;
  }

  // 计算访问量范围
  const visitCounts = mapData.map((d: any) => d.visit_count);
  const maxVisits = Math.max(...visitCounts, 1);
  const minVisits = Math.min(...visitCounts, 1);

  // 存储所有标记的位置,用于自动调整视野
  const positions: any[] = [];

  // 创建标记点
  mapData.forEach((item: any) => {
    const { longitude, latitude, visit_count, city, province, country } = item;

    if (!longitude || !latitude) return;

    const position = [longitude, latitude];
    positions.push(position);

    // 根据访问量计算标记大小和颜色
    const ratio = (visit_count - minVisits) / (maxVisits - minVisits || 1);

    // 根据访问量设置颜色
    let color = '#52c41a'; // 绿色
    if (ratio > 0.7) color = '#ff4d4f'; // 红色
    else if (ratio > 0.4) color = '#ff7a45'; // 橙色
    else if (ratio > 0.2) color = '#ffa940'; // 黄色

    // 计算圆点大小
    const radius = 8 + ratio * 25; // 8-33 像素

    // 创建圆形标记
    const circle = new AMap.CircleMarker({
      center: position,
      radius: radius,
      fillColor: color,
      fillOpacity: 0.7,
      strokeColor: color,
      strokeWeight: 2,
      strokeOpacity: 0.9,
      zIndex: 10,
    });

    // 创建外圈(光晕效果)
    const outerCircle = new AMap.CircleMarker({
      center: position,
      radius: radius * 1.5,
      fillColor: color,
      fillOpacity: 0.2,
      strokeColor: color,
      strokeWeight: 1,
      strokeOpacity: 0.5,
      zIndex: 9,
    });

    // 添加到地图
    map.add([circle, outerCircle]);
    markers.push(circle, outerCircle);

    // 创建文字标记
    const marker = new AMap.Marker({
      position: position,
      content: `<div style="
        color: ${getTextColor()};
        font-size: 12px;
        padding: 2px 6px;
        background: ${getBackgroundColor()};
        border-radius: 3px;
        white-space: nowrap;
        border: 1px solid ${color};
      ">${city || province || country || '未知'}</div>`,
      offset: new AMap.Pixel(-50, -radius - 25),
      zIndex: 11,
    });
    map.add(marker);
    markers.push(marker);

    // 添加点击事件
    circle.on('click', () => {
      const infoWindow = new AMap.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 150px;">
            <h4 style="margin: 0 0 10px 0; color: #1890ff; font-size: 16px;">${city || province || country || '未知'}</h4>
            <p style="margin: 5px 0; color: #333; font-size: 14px;">
              <strong>访问量:</strong> <span style="color: #ff4d4f; font-weight: bold;">${visit_count}</span> 次
            </p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">
              ${country || ''}${province ? ' · ' + province : ''}${city ? ' · ' + city : ''}
            </p>
          </div>
        `,
        offset: new AMap.Pixel(0, -radius - 5),
      });
      infoWindow.open(map, position);
    });

    // 鼠标悬停效果
    circle.on('mouseover', () => {
      circle.setOptions({
        fillOpacity: 0.9,
        strokeWeight: 3,
      });
    });

    circle.on('mouseout', () => {
      circle.setOptions({
        fillOpacity: 0.7,
        strokeWeight: 2,
      });
    });
  });

  // 自动调整地图视野以显示所有标记
  if (positions.length > 0 && markers.length > 0) {
    map.setFitView(null, false, [50, 50, 50, 50]);
  }
};

// 初始化地图
const initMap = async () => {
  try {
    // 加载高德地图脚本
    await loadAMapScript();

    // 创建地图实例
    map = new AMap.Map(mapContainer.value, {
      zoom: 4,
      center: [105, 35], // 中国中心
      viewMode: '2D',
      mapStyle: getMapStyle(),
    });

    // 渲染标记
    await renderMarkers();

    // 添加地图控件
    AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], () => {
      map.addControl(new AMap.Scale());
      map.addControl(new AMap.ToolBar({
        position: {
          top: '20px',
          right: '20px',
        },
      }));
    });

  } catch (error: any) {
    console.error('初始化地图失败:', error);

    // 显示错误提示
    if (mapContainer.value) {
      let errorMessage = '请检查网络连接或刷新重试';

      // 检查是否是API密钥错误
      if (error.message && error.message.includes('INVALID_USER_KEY')) {
        errorMessage = '高德地图API密钥无效或未配置域名白名单<br/>请前往 <a href="https://console.amap.com" target="_blank" style="color: #1890ff;">高德开放平台</a> 配置';
      }

      const bgColor = isDark.value ? '#0a1e3a' : '#f0f2f5';
      const textColor = isDark.value ? '#fff' : '#333';

      mapContainer.value.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: ${textColor};
          background: ${bgColor};
          flex-direction: column;
        ">
          <h3 style="margin-bottom: 15px; font-size: 20px;">地图加载失败</h3>
          <p style="color: ${isDark.value ? '#8bb7e8' : '#666'}; text-align: center; line-height: 1.6;">${errorMessage}</p>
        </div>
      `;
    }
  }
};

// 监听主题变化
watch(isDark, async () => {
  if (map) {
    // 切换地图样式
    map.setMapStyle(getMapStyle());
    // 重新渲染标记
    await renderMarkers();
  }
});

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.destroy();
    map = null;
  }
  markers = [];
});
</script>

<template>
  <div ref="mapContainer" :class="['amap-container', { 'dark': isDark }]"></div>
</template>

<style scoped>
.amap-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: #f0f2f5;
  transition: background-color 0.3s ease;
}

.amap-container.dark {
  background: #0a1e3a;
}

/* 隐藏高德地图logo */
:deep(.amap-logo) {
  display: none !important;
}

/* 调整版权信息样式 */
:deep(.amap-copyright) {
  opacity: 0.3;
}

/* 调整控件样式 */
:deep(.amap-toolbar) {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid #d9d9d9 !important;
  transition: all 0.3s ease;
}

.dark :deep(.amap-toolbar) {
  background: rgba(0, 0, 0, 0.7) !important;
  border: 1px solid #4a7ba7 !important;
}
</style>
