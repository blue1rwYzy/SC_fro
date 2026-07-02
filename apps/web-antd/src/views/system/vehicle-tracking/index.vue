<template>
  <div class="tracking-workbench">
    <div v-if="activeView === 'realtime'" class="hero">
      <div>
        <h1>高速公路车辆追踪工作台</h1>
        <p>实时追踪、事件分析、轨迹统计、报告导出统一在同一页完成。</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <span>任务</span>
          <strong>{{ trackingTaskId || '未启动' }}</strong>
        </div>
        <div class="hero-stat">
          <span>状态</span>
          <strong :class="statusClass">{{ statusText }}</strong>
        </div>
        <div class="hero-stat">
          <span>进度</span>
          <strong>{{ trackingProgress }}%</strong>
        </div>
      </div>
    </div>

    <Card v-if="activeView === 'realtime'" :bordered="false" class="control-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <Select
            v-if="activeView === 'realtime'"
            v-model:value="selectedModelId"
            placeholder="选择追踪模型"
            style="width: 320px"
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
          <div v-if="activeView === 'realtime'" class="analysis-switches">
            <Checkbox v-model:checked="enableLlmReport">启用 LLM 报告</Checkbox>
            <Checkbox v-model:checked="enableVlmCheck">启用 VLM 关键帧复核</Checkbox>
          </div>
        </div>
        <div v-if="activeView === 'realtime'" class="toolbar-right">
          <Upload :before-upload="handleUploadVideo" :show-upload-list="false" accept="video/*">
            <Button size="large">上传视频</Button>
          </Upload>
          <Button size="large">连接摄像头</Button>
          <Button size="large" @click="showVideoDatabaseModal = true">从视频库选择</Button>
          <Button size="large" type="primary" :disabled="!selectedModelId || !uploadedVideoPath || isTracking" :loading="isTracking" @click="handleStartTracking">
            {{ isTracking ? '追踪中...' : '开始追踪' }}
          </Button>
        </div>
      </div>
    </Card>

    <div v-if="activeView === 'realtime'" class="grid-two realtime-grid">
      <Card title="实时预览" :bordered="false" class="panel-card">
        <div class="frame-stage">
          <div v-if="isTracking" class="realtime-box">
            <canvas ref="realtimeCanvasRef" class="realtime-canvas"></canvas>
            <div class="overlay">
              <div class="overlay-row">
                <span>FPS</span>
                <strong>{{ realtimeFps.toFixed(2) }}</strong>
              </div>
              <div class="overlay-row">
                <span>帧</span>
                <strong>{{ realtimeFrameInfo?.current || 0 }}/{{ realtimeFrameInfo?.total || 0 }}</strong>
              </div>
              <Progress :percent="trackingProgress" :status="trackingProgress === 100 ? 'success' : 'active'" />
            </div>
          </div>
          <video
            v-else-if="resultVideoUrl"
            :src="resultVideoUrl"
            controls
            controlsList="nodownload"
            class="video-player"
          />
          <div v-else class="empty-state">
            <Empty description="上传视频并启动追踪后，这里会显示实时追踪结果" />
          </div>
        </div>
      </Card>

      <Card title="运行信息" :bordered="false" class="panel-card">
        <div class="summary-strip">
          <div>
            <span>当前任务</span>
            <strong>{{ trackingTaskId || '-' }}</strong>
          </div>
          <div>
            <span>结果状态</span>
            <strong>{{ statusText }}</strong>
          </div>
          <div>
            <span>结果视频</span>
            <strong>{{ resultVideoUrl ? '已生成' : '未生成' }}</strong>
          </div>
        </div>
        <Descriptions :column="1" size="small" bordered>
          <Descriptions.Item label="模型">{{ currentModelName }}</Descriptions.Item>
          <Descriptions.Item label="视频">{{ uploadedVideo?.name || '-' }}</Descriptions.Item>
          <Descriptions.Item label="结果视频">
            <a v-if="resultVideoUrl" :href="resultVideoUrl" target="_blank">打开</a>
            <span v-else>-</span>
          </Descriptions.Item>
          <Descriptions.Item label="分析视频">
            <a v-if="analysisArtifacts.analysis_video_url" :href="analysisArtifacts.analysis_video_url" target="_blank">打开</a>
            <span v-else>-</span>
          </Descriptions.Item>
          <Descriptions.Item label="事件 JSON">
            <a v-if="analysisArtifacts.events_json_url" :href="analysisArtifacts.events_json_url" target="_blank">打开</a>
            <span v-else>-</span>
          </Descriptions.Item>
          <Descriptions.Item label="HTML 报告">
            <a v-if="analysisArtifacts.report_html_url" :href="analysisArtifacts.report_html_url" target="_blank">打开</a>
            <span v-else>-</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>

    <div v-else-if="activeView === 'analysis'" class="grid-two">
      <Card title="轨迹与事件" :bordered="false" class="panel-card">
        <div class="metric-row">
          <div class="metric-card">
            <span>车辆数</span>
            <strong>{{ summary.vehicle_count ?? 0 }}</strong>
          </div>
          <div class="metric-card">
            <span>事件数</span>
            <strong>{{ summary.event_count ?? 0 }}</strong>
          </div>
          <div class="metric-card">
            <span>拥堵段</span>
            <strong>{{ summary.congestion_segments ?? 0 }}</strong>
          </div>
        </div>
        <div class="analysis-visual">
          <div class="analysis-visual-head">
            <span>事件密度</span>
            <span>轨迹状态</span>
          </div>
          <div class="analysis-visual-bars">
            <div
              v-for="eventType in eventTypeSummary"
              :key="eventType.name"
              class="analysis-bar"
            >
              <div class="analysis-bar-label">
                <span>{{ eventType.name }}</span>
                <strong>{{ eventType.count }}</strong>
              </div>
              <div class="analysis-bar-track">
                <div class="analysis-bar-fill" :style="{ width: `${eventType.ratio}%` }" />
              </div>
            </div>
          </div>
        </div>
        <Table :columns="trackColumns" :data-source="tracks" row-key="track_id" size="small" :pagination="{ pageSize: 6 }" />
      </Card>

      <Card title="事件列表" :bordered="false" class="panel-card">
        <div class="event-list">
          <div v-for="event in events" :key="event.event_id || `${event.type}-${event.track_id}-${event.frame_id}`" class="event-card">
            <div class="event-head">
              <Tag :color="eventColor(event.type)">{{ event.type }}</Tag>
              <span>#{{ event.track_id ?? '-' }}</span>
            </div>
            <p>{{ event.description || event.vlm_check?.explanation || '暂无描述' }}</p>
            <div class="event-meta">
              <span>时间 {{ event.start_time ?? event.time_s ?? event.frame_id ?? '-' }}</span>
              <span>置信度 {{ formatPercent(event.confidence) }}</span>
            </div>
            <a v-if="event.keyframe_path" :href="resolveArtifactUrl(event.keyframe_path)" target="_blank">关键帧</a>
          </div>
        </div>
        <Empty v-if="!events.length" description="当前任务没有事件工件" />
      </Card>
    </div>

    <div v-else-if="activeView === 'report'" class="grid-two">
      <Card title="报告中心" :bordered="false" class="panel-card">
        <div class="report-links">
          <a v-if="analysisArtifacts.report_html_url" class="link-btn primary" :href="analysisArtifacts.report_html_url" target="_blank">打开 HTML 报告</a>
          <a v-if="analysisArtifacts.report_md_url" class="link-btn" :href="analysisArtifacts.report_md_url" target="_blank">下载 Markdown</a>
          <a v-if="resultVideoUrl" class="link-btn" :href="resultVideoUrl" target="_blank">打开结果视频</a>
        </div>
        <div v-if="analysisArtifacts.report_html_url" class="report-preview">
          <iframe :src="analysisArtifacts.report_html_url" />
        </div>
        <Empty v-else-if="hasAnalysisArtifacts" description="当前任务没有 HTML 报告，仅保留结果视频与摘要数据" />
        <Empty v-else description="当前任务尚未生成分析工件，先查看结果视频" />
      </Card>

      <Card title="场景摘要" :bordered="false" class="panel-card">
        <pre class="json-box">{{ prettySummary }}</pre>
      </Card>
    </div>

    <div v-else class="report-records-page">
      <Card v-if="!selectedReport" title="报告记录" :bordered="false" class="panel-card report-list-card">
        <div class="report-record-actions">
          <Button :loading="reportsLoading" @click="loadReports">刷新报告</Button>
          <span>共 {{ reportTotal }} 条</span>
        </div>
        <Table
          :columns="reportColumns"
          :custom-row="customReportRow"
          :data-source="reportRecords"
          :loading="reportsLoading"
          :pagination="{ pageSize: 8 }"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'features'">
              <Tag :color="record.llm_enabled ? 'blue' : 'default'">LLM</Tag>
              <Tag :color="record.vlm_enabled ? 'green' : 'default'">VLM</Tag>
            </template>
            <template v-else-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <Button type="link" danger size="small" @click.stop="handleDeleteReport(asReportRecord(record))">删除</Button>
            </template>
          </template>
        </Table>
      </Card>

      <Card v-else :bordered="false" class="panel-card report-reader-card fullscreen-report-card">
        <div class="report-reader-toolbar">
          <div>
            <h2>{{ selectedReport.title || '报告内容' }}</h2>
            <div class="report-reader-meta">
              <span>任务 {{ selectedReport.task_id }}</span>
              <span>视频 {{ selectedReport.video_name || '-' }}</span>
              <span>{{ formatDateTime(selectedReport.created_at) }}</span>
            </div>
          </div>
          <div class="report-reader-actions">
            <Button @click="selectedReport = null">返回列表</Button>
            <a v-if="selectedReport.analysis_video_url" class="link-btn" :href="selectedReport.analysis_video_url" target="_blank">分析视频</a>
            <a v-if="selectedReport.events_json_url" class="link-btn" :href="selectedReport.events_json_url" target="_blank">事件 JSON</a>
            <Button danger @click="handleDeleteReport(selectedReport)">删除报告</Button>
          </div>
        </div>
        <div v-if="selectedReport?.html_path || selectedReport?.html_url" class="report-db-preview">
          <iframe :src="reportContentUrl" />
        </div>
        <div v-else-if="selectedReport?.md_path || selectedReport?.md_url" class="report-db-preview">
          <iframe :src="reportContentUrl" />
        </div>
        <Empty v-else description="选择左侧报告记录后，这里会读取数据库索引对应的报告文件内容" />
      </Card>
    </div>

    <VideoDatabaseModal
      v-model:open="showVideoDatabaseModal"
      @confirm="handleVideoFromDatabase"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Progress,
  Select,
  SelectOption,
  Table,
  Tag,
  Upload,
  message,
  Modal,
} from 'ant-design-vue';
import { vehicleTrackingApi, type AuditSample, type ModelInfo, type TrackingReportRecord, type TrackingTask, type VehicleEvent, type VehicleTrack } from '#/api/system/vehicle-tracking';
import type { VideoFile } from '#/api/system/video-database';
import VideoDatabaseModal from './components/VideoDatabaseModal.vue';

type TrackingView = 'analysis' | 'realtime' | 'records' | 'report';

const route = useRoute();
const activeView = computed<TrackingView>(() => {
  const view = route.meta.trackingView;
  return view === 'analysis' || view === 'report' || view === 'records' ? view : 'realtime';
});
const modelsLoading = ref(false);
const models = ref<ModelInfo[]>([]);
const selectedModelId = ref<number | undefined>();
const enableLlmReport = ref(false);
const enableVlmCheck = ref(false);
const uploadedVideo = ref<File | null>(null);
const uploadedVideoPath = ref('');
const originalVideoUrl = ref('');
const resultVideoUrl = ref('');
const trackingProgress = ref(0);
const trackingTaskId = ref('');
const isTracking = ref(false);
const showVideoDatabaseModal = ref(false);
const realtimeCanvasRef = ref<HTMLCanvasElement>();
const realtimeFps = ref(0);
const realtimeFrameInfo = ref<{ current: number; total: number } | null>(null);
const summary = ref<Record<string, any>>({});
const tracks = ref<VehicleTrack[]>([]);
const events = ref<VehicleEvent[]>([]);
const auditSamples = ref<AuditSample[]>([]);
const reportsLoading = ref(false);
const reportTotal = ref(0);
const reportRecords = ref<TrackingReportRecord[]>([]);
const selectedReport = ref<TrackingReportRecord | null>(null);
const analysisArtifacts = ref<Partial<TrackingTask> & {
  analysis_video_url?: string;
  events_json_url?: string;
  report_html_url?: string;
  report_md_url?: string;
}>({});
let websocket: WebSocket | null = null;
let progressInterval: number | null = null;

const trackColumns = [
  { title: 'ID', dataIndex: 'track_id', key: 'track_id' },
  { title: '首次出现(s)', dataIndex: 'first_seen', key: 'first_seen' },
  { title: '最后出现(s)', dataIndex: 'last_seen', key: 'last_seen' },
  { title: '均速(km/h)', dataIndex: 'avg_speed_kmh', key: 'avg_speed_kmh' },
  { title: '最高速(km/h)', dataIndex: 'max_speed_kmh', key: 'max_speed_kmh' },
];

const reportColumns = [
  { title: '报告', dataIndex: 'title', key: 'title' },
  { title: '视频', dataIndex: 'video_name', key: 'video_name' },
  { title: '算法能力', key: 'features', width: 120 },
  { title: '生成时间', dataIndex: 'created_at', key: 'created_at', width: 170 },
  { title: '操作', key: 'actions', width: 90 },
];

const statusText = computed(() => {
  if (isTracking.value) return '正在追踪';
  if (resultVideoUrl.value) return '已完成';
  if (uploadedVideo.value) return '已准备';
  return '待上传';
});

const statusClass = computed(() => {
  if (isTracking.value) return 'running';
  if (resultVideoUrl.value) return 'success';
  return 'idle';
});

const currentModelName = computed(() => models.value.find((m) => m.id === selectedModelId.value)?.name || '-');
const prettySummary = computed(() => JSON.stringify(summary.value, null, 2));
const reportContentUrl = computed(() => {
  if (!selectedReport.value) return '';
  const format = selectedReport.value.html_path || selectedReport.value.html_url ? 'html' : 'md';
  return `/api/system/tracking/reports/${selectedReport.value.id}/content?format=${format}`;
});
const eventTypeSummary = computed(() => {
  const counts = new Map<string, number>();
  events.value.forEach((event) => {
    const key = event.type || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const total = Math.max(1, events.value.length);
  return Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
    ratio: Math.round((count / total) * 100),
  }));
});

const formatPercent = (value?: number) => `${Math.round((value || 0) * 100)}%`;
const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};
const eventColor = (type: string) => {
  const map: Record<string, string> = {
    speeding: 'red',
    abrupt_stop: 'orange',
    stationary: 'blue',
    lane_change: 'gold',
    congestion: 'green',
  };
  return map[type] || 'default';
};
const asReportRecord = (record: Record<string, any>) => record as TrackingReportRecord;
const resolveArtifactUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/')) return url;
  if (url.startsWith('/uploads/')) return `/api/system${url}`;
  return url;
};

const hasAnalysisArtifacts = computed(() => {
  return Boolean(
    analysisArtifacts.value.analysis_video_url ||
    analysisArtifacts.value.events_json_url ||
    analysisArtifacts.value.report_html_url ||
    analysisArtifacts.value.report_md_url ||
    (analysisArtifacts.value.analysis?.events?.length ?? 0) > 0 ||
    (analysisArtifacts.value.analysis?.tracks?.length ?? 0) > 0,
  );
});

const loadModels = async () => {
  modelsLoading.value = true;
  try {
    models.value = await vehicleTrackingApi.getModels();
    selectedModelId.value = models.value[0]?.id;
  } catch (error: any) {
    message.error(error.message || '加载模型失败');
  } finally {
    modelsLoading.value = false;
  }
};

const loadReports = async () => {
  reportsLoading.value = true;
  try {
    const response = await vehicleTrackingApi.getTrackingReports({ limit: 100, offset: 0 });
    reportRecords.value = response.reports;
    reportTotal.value = response.total;
    if (selectedReport.value) {
      selectedReport.value = response.reports.find((report) => report.id === selectedReport.value?.id) ?? null;
    }
  } catch (error: any) {
    message.error(error.message || '加载报告记录失败');
  } finally {
    reportsLoading.value = false;
  }
};

const customReportRow = (record: TrackingReportRecord) => ({
  onClick: () => {
    selectedReport.value = record;
  },
});

const handleDeleteReport = (record: TrackingReportRecord) => {
  Modal.confirm({
    title: '删除报告',
    content: `确认删除报告「${record.title || record.task_id}」？该操作会同时清理对应的报告文件、事件 JSON 和分析视频。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await vehicleTrackingApi.deleteTrackingReport(record.id);
        message.success('报告已删除');
        if (selectedReport.value?.id === record.id) {
          selectedReport.value = null;
        }
        await loadReports();
      } catch (error: any) {
        message.error(error.message || '删除报告失败');
      }
    },
  });
};

const handleUploadVideo = async (file: File) => {
  if (!file.type.startsWith('video/')) {
    message.error('请上传视频文件');
    return false;
  }
  try {
    const loading = message.loading('上传中...', 0);
    const response = await vehicleTrackingApi.uploadVideo(file);
    loading();
    uploadedVideo.value = file;
    uploadedVideoPath.value = response.video_path;
    originalVideoUrl.value = response.video_url;
    resultVideoUrl.value = '';
    trackingProgress.value = 0;
    message.success('视频已上传');
  } catch (error: any) {
    message.error(error.message || '视频上传失败');
  }
  return false;
};

const handleVideoFromDatabase = async (video: VideoFile) => {
  uploadedVideo.value = new File([], video.filename, { type: 'video/mp4' });
  Object.defineProperty(uploadedVideo.value, 'size', { value: video.size, writable: false });
  uploadedVideoPath.value = video.path;
  originalVideoUrl.value = video.path.startsWith('minio://')
    ? resolveArtifactUrl(`/api/system/uploads/videos/${video.path.replace('minio://videos/', '')}`)
    : video.path.startsWith('/uploads')
      ? `/api/system${video.path}`
      : video.path;
  resultVideoUrl.value = '';
  trackingProgress.value = 0;
  message.success(`已选择视频: ${video.filename}`);
};

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
    summary.value = {};
    tracks.value = [];
    events.value = [];
    auditSamples.value = [];
    analysisArtifacts.value = {};

    const response = await vehicleTrackingApi.startTracking(uploadedVideoPath.value, selectedModelId.value, {
      enableLlmReport: enableLlmReport.value,
      enableVlmCheck: enableVlmCheck.value,
    });
    trackingTaskId.value = response.task_id;
    connectWebSocket(response.task_id);
    startProgressPolling();
  } catch (error: any) {
    isTracking.value = false;
    message.error(error.message || '启动追踪失败');
  }
};

const connectWebSocket = (taskId: string) => {
  websocket?.close();
  websocket = vehicleTrackingApi.connectRealtimeTracking(taskId);
  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'frame') {
      drawFrame(data.frame);
      realtimeFps.value = data.fps || 0;
      realtimeFrameInfo.value = { current: data.frame_number, total: data.total_frames };
      trackingProgress.value = data.progress || trackingProgress.value;
    } else if (data.type === 'complete') {
      resultVideoUrl.value = data.result_url;
      isTracking.value = false;
      websocket?.close();
      loadArtifacts(taskId);
    } else if (data.type === 'error') {
      isTracking.value = false;
      message.error(data.error || '追踪失败');
      websocket?.close();
    }
  };
};

const drawFrame = (frameBase64: string) => {
  const canvas = realtimeCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };
  img.src = `data:image/jpeg;base64,${frameBase64}`;
};

const loadArtifacts = async (taskId: string) => {
  try {
    const response = await vehicleTrackingApi.getTrackingArtifacts(taskId);
    const data = response as TrackingTask & {
      analysis_video_url?: string;
      events_json_url?: string;
      report_html_url?: string;
      report_md_url?: string;
      summary?: Record<string, any>;
      tracks?: VehicleTrack[];
      events?: VehicleEvent[];
      audit_samples?: AuditSample[];
    };
    analysisArtifacts.value = data;
    summary.value = data.analysis?.summary || data.summary || {};
    tracks.value = data.analysis?.tracks || data.tracks || [];
    events.value = data.analysis?.events || data.events || [];
    auditSamples.value = data.analysis?.audit_samples || data.audit_samples || [];
    if (data.result_video_url) {
      resultVideoUrl.value = data.result_video_url;
    }
    await loadReports();
  } catch (error: any) {
    analysisArtifacts.value = { result_video_url: resultVideoUrl.value };
    summary.value = {};
    tracks.value = [];
    events.value = [];
    auditSamples.value = [];
    if (!resultVideoUrl.value) {
      message.error(error.message || '加载分析工件失败');
    }
  }
};

const startProgressPolling = () => {
  stopProgressPolling();
  progressInterval = window.setInterval(async () => {
    if (!trackingTaskId.value) return;
    try {
      const status = await vehicleTrackingApi.getTrackingStatus(trackingTaskId.value);
      trackingProgress.value = status.progress;
      if (status.status === 'completed') {
        isTracking.value = false;
        resultVideoUrl.value = status.result_video_url || resultVideoUrl.value;
        await loadArtifacts(trackingTaskId.value);
        stopProgressPolling();
      } else if (status.status === 'failed') {
        isTracking.value = false;
        message.error(status.error || '追踪失败');
        stopProgressPolling();
      }
    } catch {
      // ignore transient polling errors
    }
  }, 2000);
};

const stopProgressPolling = () => {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

onMounted(() => {
  loadModels();
  loadReports();
});

watch(activeView, (view) => {
  if (view === 'records') {
    loadReports();
  }
}, { immediate: true });

onUnmounted(() => {
  stopProgressPolling();
  websocket?.close();
});
</script>

<style scoped lang="scss">
.tracking-workbench {
  padding: 12px 16px 20px;
  background: #f5f7fb;
  min-height: 100%;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #fff;
  color: #1f2d3d;
  margin-bottom: 12px;
  border: 1px solid #e8edf3;
  align-items: center;
}

.eyebrow {
  color: #7fb8ff;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 12px;
  margin-bottom: 10px;
}

.hero h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.hero p {
  margin: 4px 0 0;
  color: #6b7c93;
  font-size: 12px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  gap: 8px;
}

.hero-stat {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f9fc;
  border: 1px solid #e8edf3;
}

.hero-stat span {
  display: block;
  font-size: 12px;
  color: #6b7c93;
  margin-bottom: 2px;
}

.hero-stat strong {
  font-size: 14px;
}

.hero-stat strong.running {
  color: #1677ff;
}

.hero-stat strong.success {
  color: #52c41a;
}

.control-card,
.panel-card {
  border-radius: 8px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.analysis-switches {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f7f9fc;
  border: 1px solid #e8edf3;
  color: #1f2d3d;
}

.grid-two {
  display: grid;
  grid-template-columns: 1.25fr 0.95fr;
  gap: 18px;
  margin-top: 18px;
}

.realtime-grid {
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
  margin-top: 12px;
}

.frame-stage,
.realtime-box,
.empty-state,
.video-player,
.report-preview iframe {
  width: 100%;
  min-height: 420px;
}

.realtime-grid .frame-stage,
.realtime-grid .realtime-box,
.realtime-grid .empty-state,
.realtime-grid .video-player {
  min-height: min(72vh, 760px);
}

.frame-stage {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  border: 1px solid #e8edf3;
}

.realtime-box {
  position: relative;
}

.realtime-canvas,
.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.overlay {
  position: absolute;
  left: 10px;
  right: auto;
  bottom: 10px;
  width: 240px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  color: #1f2d3d;
  border: 1px solid rgba(232, 237, 243, 0.9);
}

.overlay-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.metric-card {
  padding: 14px;
  border-radius: 16px;
  background: #f4f7fb;
}

.metric-card span {
  display: block;
  font-size: 12px;
  color: #5c6b7a;
}

.metric-card strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.analysis-visual {
  margin: 12px 0 16px;
  padding: 16px;
  border-radius: 16px;
  background: #f7f9fc;
  color: #1f2d3d;
  border: 1px solid #e8edf3;
}

.analysis-visual-head,
.analysis-bar-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.analysis-visual-head {
  margin-bottom: 12px;
  font-size: 12px;
  color: #6b7c93;
}

.analysis-visual-bars {
  display: grid;
  gap: 10px;
}

.analysis-bar {
  display: grid;
  gap: 8px;
}

.analysis-bar-label span {
  color: #1f2d3d;
}

.analysis-bar-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.analysis-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4cc9f0 0%, #1677ff 100%);
}

.summary-strip {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.summary-strip > div {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f4f7fb;
  border: 1px solid #e8edf3;
}

.summary-strip span {
  display: block;
  font-size: 12px;
  color: #5c6b7a;
  margin-bottom: 6px;
}

.summary-strip strong {
  font-size: 16px;
}

.event-list {
  display: grid;
  gap: 12px;
}

.event-card {
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
}

.event-head,
.event-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.report-links {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 2px;
  border: 1px solid #9aa7b5;
  color: #263746;
  background: #fff;
  text-decoration: none;
}

.link-btn.primary {
  background: #2f4f66;
  color: #fff;
  border-color: #2f4f66;
}

.report-preview iframe {
  border: 1px solid #d8dee6;
  border-radius: 2px;
  background: #fff;
}

.report-records-page {
  margin-top: 12px;
}

.report-record-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  color: #596675;
  font-size: 13px;
}

.report-list-card,
.report-reader-card {
  border: 1px solid #d8dee6;
}

.report-list-card :deep(.ant-table-row) {
  cursor: pointer;
}

.report-list-card :deep(.ant-card-head),
.report-reader-card :deep(.ant-card-head) {
  min-height: 42px;
  border-bottom-color: #d8dee6;
}

.report-list-card :deep(.ant-card-head-title),
.report-reader-card :deep(.ant-card-head-title) {
  color: #1f2933;
  font-size: 15px;
  font-weight: 600;
}

.report-list-card :deep(.ant-table-thead > tr > th) {
  background: #eef2f6;
  color: #344556;
  font-weight: 600;
}

.report-list-card :deep(.ant-table-tbody > tr > td) {
  color: #1f2933;
}

.report-list-card :deep(.ant-tag) {
  border-radius: 2px;
  margin-inline-end: 4px;
}

.report-reader-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #d8dee6;
}

.report-reader-toolbar h2 {
  margin: 0 0 8px;
  color: #1f2933;
  font-size: 18px;
  font-weight: 600;
}

.report-reader-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.report-reader-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 10px;
  color: #596675;
  font-size: 12px;
}

.report-reader-meta span,
.report-reader-meta a {
  padding: 4px 8px;
  border-radius: 2px;
  background: #f5f7f9;
  border: 1px solid #d8dee6;
}

.report-db-preview iframe {
  width: 100%;
  min-height: calc(100vh - 230px);
  border: 1px solid #d8dee6;
  border-radius: 2px;
  background: #fff;
}

.fullscreen-report-card :deep(.ant-card-body) {
  padding: 14px;
}

.json-box {
  background: #f7f9fc;
  color: #1f2d3d;
  border-radius: 16px;
  padding: 16px;
  min-height: 420px;
  overflow: auto;
  border: 1px solid #e8edf3;
}

@media (max-width: 1100px) {
  .hero,
  .grid-two {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .realtime-grid {
    grid-template-columns: 1fr;
  }

  .report-reader-toolbar {
    flex-direction: column;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
