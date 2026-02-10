<template>
  <div class="vehicle-tracking-container">
    <Card title="高速道路车辆追踪" :bordered="false">
      <!-- 操作栏 -->
      <div class="action-bar">
        <Space :size="16">
          <!-- 模型选择 -->
          <Select
            v-model:value="selectedModelId"
            placeholder="选择追踪模型"
            style="width: 250px"
            size="large"
            :loading="modelsLoading"
          >
            <SelectOption
              v-for="model in models"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }} ({{ model.version }})
            </SelectOption>
          </Select>

          <!-- 上传视频 -->
          <Upload
            :before-upload="handleUploadVideo"
            :show-upload-list="false"
            accept="video/*"
          >
            <Button size="large" class="custom-btn">
              📹 上传视频
            </Button>
          </Upload>

          <!-- 开始推理 -->
          <Button
            type="primary"
            size="large"
            :disabled="!selectedModelId || !uploadedVideo || isTracking"
            :loading="isTracking"
            @click="handleStartTracking"
          >
            {{ isTracking ? '追踪中...' : '开始追踪' }}
          </Button>

          <!-- 下载结果 -->
          <Button
            size="large"
            class="custom-btn"
            :disabled="!resultVideoUrl"
            @click="handleDownloadResult"
          >
            💾 下载结果视频
          </Button>
        </Space>

        <div class="status-info">
          <span class="status-text" :class="statusClass">{{ statusText }}</span>
        </div>
      </div>

      <!-- 视频预览区域 -->
      <div class="video-container">
        <!-- 左侧：原始视频 -->
        <div class="video-panel">
          <div class="panel-header">
            <span class="panel-title">📹 原始视频</span>
            <span v-if="uploadedVideo" class="video-info">
              {{ uploadedVideo.name }} ({{ formatFileSize(uploadedVideo.size) }})
            </span>
          </div>
          <div class="video-content">
            <div v-if="!originalVideoUrl" class="empty-video">
              <Empty description="请上传视频文件">
                <Upload
                  :before-upload="handleUploadVideo"
                  :show-upload-list="false"
                  accept="video/*"
                >
                  <Button type="primary">选择视频</Button>
                </Upload>
              </Empty>
            </div>
            <video
              v-else
              ref="originalVideoRef"
              :src="originalVideoUrl"
              controls
              controlsList="nodownload"
              preload="auto"
              playsinline
              class="video-player"
              @error="handleVideoError"
              @loadedmetadata="handleVideoLoaded"
              @canplay="handleCanPlay"
            >
              <source :src="originalVideoUrl" type="video/mp4" />
              您的浏览器不支持视频播放
            </video>
          </div>
        </div>

        <!-- 右侧：追踪结果视频 -->
        <div class="video-panel">
          <div class="panel-header">
            <span class="panel-title">🎯 追踪结果</span>
            <span v-if="trackingProgress > 0 && trackingProgress < 100" class="progress-text">
              进度: {{ trackingProgress }}%
            </span>
          </div>
          <div class="video-content">
            <!-- 实时推理显示 -->
            <div v-if="isTracking" class="realtime-tracking">
              <canvas ref="realtimeCanvasRef" class="realtime-canvas"></canvas>
              <div class="tracking-overlay">
                <div class="tracking-stats">
                  <div class="stat-item">
                    <span class="stat-label">进度:</span>
                    <span class="stat-value">{{ trackingProgress }}%</span>
                  </div>
                  <div class="stat-item" v-if="realtimeFps > 0">
                    <span class="stat-label">处理速度:</span>
                    <span class="stat-value">{{ realtimeFps }} FPS</span>
                  </div>
                  <div class="stat-item" v-if="realtimeFrameInfo">
                    <span class="stat-label">帧数:</span>
                    <span class="stat-value">
                      {{ realtimeFrameInfo.current }}/{{ realtimeFrameInfo.total }}
                    </span>
                  </div>
                </div>
                <Progress
                  :percent="trackingProgress"
                  :status="trackingProgress === 100 ? 'success' : 'active'"
                  class="progress-bar"
                />
              </div>
            </div>
            <!-- 结果视频 -->
            <div v-else-if="!resultVideoUrl" class="empty-video">
              <Empty description="开始追踪后将显示实时推理过程" />
            </div>
            <video
              v-else
              ref="resultVideoRef"
              :src="resultVideoUrl"
              controls
              controlsList="nodownload"
              preload="auto"
              playsinline
              class="video-player"
              @error="handleVideoError"
              @loadedmetadata="handleVideoLoaded"
              @canplay="handleCanPlay"
            >
              <source :src="resultVideoUrl" type="video/mp4" />
              您的浏览器不支持视频播放
            </video>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Button,
  Card,
  Empty,
  Progress,
  Select,
  SelectOption,
  Space,
  Spin,
  Upload,
  message,
} from 'ant-design-vue';
import { vehicleTrackingApi, type ModelInfo } from '#/api/system/vehicle-tracking';

// 状态
const modelsLoading = ref(false);
const models = ref<ModelInfo[]>([]);
const selectedModelId = ref<number | undefined>();
const uploadedVideo = ref<File | null>(null);
const uploadedVideoPath = ref(''); // 服务器上的视频路径
const originalVideoUrl = ref('');
const resultVideoUrl = ref('');
const isTracking = ref(false);
const trackingProgress = ref(0);
const trackingTaskId = ref('');
const originalVideoRef = ref<HTMLVideoElement>();
const resultVideoRef = ref<HTMLVideoElement>();

// 实时推理相关
const realtimeCanvasRef = ref<HTMLCanvasElement>();
const realtimeFps = ref(0);
const realtimeFrameInfo = ref<{ current: number; total: number } | null>(null);
let websocket: WebSocket | null = null;

// 轮询定时器
let progressInterval: number | null = null;

// 状态文本和样式
const statusText = computed(() => {
  if (isTracking.value) return '正在追踪处理...';
  if (resultVideoUrl.value) return '追踪完成';
  if (uploadedVideo.value) return '已上传视频，请选择模型并开始追踪';
  return '请上传视频文件';
});

const statusClass = computed(() => {
  if (isTracking.value) return 'status-processing';
  if (resultVideoUrl.value) return 'status-success';
  return 'status-idle';
});

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 加载模型列表
const loadModels = async () => {
  modelsLoading.value = true;
  try {
    models.value = await vehicleTrackingApi.getModels();
    if (models.value.length > 0) {
      selectedModelId.value = models.value[0].id;
    }
  } catch (error: any) {
    message.error(`加载模型列表失败: ${error.message || '未知错误'}`);
    console.error('加载模型失败:', error);
  } finally {
    modelsLoading.value = false;
  }
};

// 上传视频
const handleUploadVideo = async (file: File) => {
  // 验证文件类型
  if (!file.type.startsWith('video/')) {
    message.error('请上传视频文件');
    return false;
  }

  // 验证文件大小（最大500MB）
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    message.error('视频文件大小不能超过500MB');
    return false;
  }

  try {
    const loadingMsg = message.loading('正在上传并转换视频格式...', 0);

    // 上传视频到服务器
    const response = await vehicleTrackingApi.uploadVideo(file);

    loadingMsg();
    message.success(`视频上传成功: ${file.name}`);

    // 保存视频信息
    uploadedVideo.value = file;
    uploadedVideoPath.value = response.video_path;
    originalVideoUrl.value = response.video_url; // 使用服务器返回的 URL
    resultVideoUrl.value = '';
    trackingProgress.value = 0;
  } catch (error: any) {
    message.error(error.message || '视频上传失败');
  }

  return false; // 阻止自动上传
};

// 开始追踪
const handleStartTracking = async () => {
  if (!selectedModelId.value || !uploadedVideoPath.value) {
    message.error('请选择模型并上传视频');
    return;
  }

  try {
    isTracking.value = true;
    trackingProgress.value = 0;
    resultVideoUrl.value = '';
    realtimeFps.value = 0;
    realtimeFrameInfo.value = null;

    const response = await vehicleTrackingApi.startTracking(
      uploadedVideoPath.value,
      selectedModelId.value,
    );
    trackingTaskId.value = response.task_id;

    message.success('追踪任务已启动,正在实时显示推理过程...');

    // 连接 WebSocket 接收实时帧
    connectWebSocket(trackingTaskId.value);
  } catch (error: any) {
    message.error(`启动追踪失败: ${error.message || '未知错误'}`);
    console.error('启动追踪失败:', error);
    isTracking.value = false;
  }
};

// 连接 WebSocket
const connectWebSocket = (taskId: string) => {
  if (websocket) {
    websocket.close();
  }

  websocket = vehicleTrackingApi.connectRealtimeTracking(taskId);

  websocket.onopen = () => {
    console.log('WebSocket 连接成功');
  };

  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'frame') {
      // 接收到新帧,绘制到 Canvas
      drawFrame(data.frame);
      realtimeFps.value = data.fps;
      realtimeFrameInfo.value = {
        current: data.frame_number,
        total: data.total_frames,
      };
      trackingProgress.value = data.progress;
    } else if (data.type === 'complete') {
      // 追踪完成
      message.success('车辆追踪完成！');
      isTracking.value = false;
      resultVideoUrl.value = data.result_url;
      websocket?.close();
    } else if (data.type === 'error') {
      // 错误
      message.error(`追踪失败: ${data.error}`);
      isTracking.value = false;
      websocket?.close();
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket 错误:', error);
    message.error('实时连接失败');
  };

  websocket.onclose = () => {
    console.log('WebSocket 连接关闭');
  };
};

// 绘制帧到 Canvas
const drawFrame = (frameBase64: string) => {
  const canvas = realtimeCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.onload = () => {
    // 设置 Canvas 尺寸
    canvas.width = img.width;
    canvas.height = img.height;
    // 绘制图像
    ctx.drawImage(img, 0, 0);
  };
  img.src = `data:image/jpeg;base64,${frameBase64}`;
};

// 轮询任务进度
const startProgressPolling = () => {
  progressInterval = window.setInterval(async () => {
    if (!trackingTaskId.value) return;

    try {
      const status = await vehicleTrackingApi.getTrackingStatus(trackingTaskId.value);

      trackingProgress.value = status.progress;

      if (status.status === 'completed') {
        // 追踪完成
        isTracking.value = false;
        // 确保视频 URL 是完整路径
        const videoUrl = status.result_video_url;
        // 如果是相对路径,添加开发环境的代理前缀
        resultVideoUrl.value = videoUrl.startsWith('http') ? videoUrl : videoUrl;
        message.success('车辆追踪完成！');
        stopProgressPolling();
      } else if (status.status === 'failed') {
        // 追踪失败
        isTracking.value = false;
        message.error(`追踪失败: ${status.error || '未知错误'}`);
        stopProgressPolling();
      }
    } catch (error) {
      console.error('获取追踪进度失败:', error);
    }
  }, 2000); // 每2秒轮询一次
};

// 停止轮询
const stopProgressPolling = () => {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

// 下载结果视频
const handleDownloadResult = () => {
  if (!resultVideoUrl.value) return;

  const link = document.createElement('a');
  link.href = resultVideoUrl.value;
  link.download = `tracking_result_${Date.now()}.mp4`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  message.success('开始下载结果视频');
};

// 处理视频加载错误
const handleVideoError = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.error('视频加载失败:', video.error);
  console.error('视频 URL:', video.src);

  if (video.error) {
    let errorMessage = '视频加载失败';
    switch (video.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        errorMessage = '视频加载被中止';
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        errorMessage = '网络错误,无法加载视频';
        break;
      case MediaError.MEDIA_ERR_DECODE:
        errorMessage = '视频解码失败,可能格式不支持';
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = '视频格式不支持或文件不存在';
        break;
    }
    message.error(errorMessage);
  }
};

// 处理视频加载完成
const handleVideoLoaded = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.log('视频元数据加载成功:', {
    duration: video.duration,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    src: video.src,
  });
};

// 处理视频可以播放
const handleCanPlay = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.log('视频可以播放:', {
    duration: video.duration,
    buffered: video.buffered.length > 0 ? video.buffered.end(0) : 0,
    seekable: video.seekable.length > 0,
    readyState: video.readyState,
  });

  // 确保视频支持随机访问
  if (video.seekable.length > 0) {
    console.log('视频支持拖拽,可seek范围:', {
      start: video.seekable.start(0),
      end: video.seekable.end(0),
    });
  } else {
    console.warn('视频不支持拖拽(不可seek)');
  }
};

// 生命周期
onMounted(() => {
  loadModels();
});

onUnmounted(() => {
  stopProgressPolling();

  // 关闭 WebSocket
  if (websocket) {
    websocket.close();
    websocket = null;
  }

  // 释放视频URL
  if (originalVideoUrl.value) {
    URL.revokeObjectURL(originalVideoUrl.value);
  }
});
</script>

<style scoped lang="scss">
.vehicle-tracking-container {
  padding: 16px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;

  :deep(.ant-space) {
    flex-wrap: wrap;
  }

  :deep(.ant-space-item) {
    margin-right: 16px !important;
  }

  .custom-btn {
    min-width: 120px;
    height: 40px;
    padding: 0 24px;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    color: #333333;
    font-size: 14px;
    font-weight: 400;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      border-color: #40a9ff;
      color: #40a9ff;
      box-shadow: 0 2px 4px rgba(64, 169, 255, 0.2);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: rgba(0, 0, 0, 0.25);
      cursor: not-allowed;
    }
  }
}

.status-info {
  .status-text {
    font-size: 14px;
    font-weight: 500;
    padding: 6px 16px;
    border-radius: 6px;

    &.status-idle {
      color: #666;
      background: #f5f5f5;
    }

    &.status-processing {
      color: #1890ff;
      background: #e6f7ff;
    }

    &.status-success {
      color: #52c41a;
      background: #f6ffed;
    }
  }
}

.video-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: calc(100vh - 280px);
  max-height: 800px;
}

.video-panel {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.panel-header {
  padding: 12px 16px;
  background: linear-gradient(to right, #f8f9fa, #ffffff);
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .panel-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .video-info,
  .progress-text {
    font-size: 13px;
    color: #666;
  }
}

.video-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  outline: none;

  // 确保视频控制条可见
  &::-webkit-media-controls {
    display: flex !important;
  }

  &::-webkit-media-controls-panel {
    display: flex !important;
  }

  // 确保进度条可拖拽
  &::-webkit-media-controls-timeline {
    cursor: pointer;
  }

  // 播放/暂停按钮
  &::-webkit-media-controls-play-button {
    cursor: pointer;
  }

  // 音量控制
  &::-webkit-media-controls-volume-slider {
    cursor: pointer;
  }

  // 全屏按钮
  &::-webkit-media-controls-fullscreen-button {
    cursor: pointer;
  }
}

.empty-video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.tracking-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  background: #fafafa;

  .progress-bar {
    width: 300px;
  }
}

.realtime-tracking {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;

  .realtime-canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .tracking-overlay {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    border-radius: 8px;
    padding: 16px 24px;
    min-width: 400px;

    .tracking-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
      color: #fff;
      font-size: 14px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .stat-label {
          opacity: 0.7;
        }

        .stat-value {
          font-weight: 600;
          color: #52c41a;
        }
      }
    }

    .progress-bar {
      width: 100%;

      :deep(.ant-progress-text) {
        color: #fff;
      }
    }
  }
}
</style>
