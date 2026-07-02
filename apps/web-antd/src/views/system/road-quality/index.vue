<template>
  <div class="road-quality-container p-4">
    <Card title="道路质量分析" :bordered="false">
      <!-- 统计概览 -->
      <div class="overview-section mb-4">
        <Row :gutter="16">
          <Col :span="6">
            <Card class="stat-card">
              <Statistic
                title="道路总数"
                :value="batches.length"
                suffix="条"
              />
            </Card>
          </Col>
          <Col :span="6">
            <Card class="stat-card">
              <Statistic
                title="总检测图片"
                :value="totalImages"
                suffix="张"
              />
            </Card>
          </Col>
          <Col :span="6">
            <Card class="stat-card">
              <Statistic
                title="平均置信度"
                :value="avgConfidence"
                :precision="2"
                suffix="%"
              />
            </Card>
          </Col>
          <Col :span="6">
            <Card class="stat-card">
              <Statistic
                title="平均严重程度"
                :value="avgSeverityScore"
                :precision="2"
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Divider />

      <!-- 道路列表 -->
      <div class="road-list-section">
        <div class="section-header mb-4">
          <h3 class="text-lg font-medium">道路列表</h3>
          <Button @click="loadBatches">刷新</Button>
        </div>

        <Table
          :columns="columns"
          :data-source="batches"
          :loading="loading"
          :row-key="(record) => record.batchName"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'batchName'">
              <span class="font-medium">{{ record.batchName }}</span>
            </template>

            <template v-else-if="column.key === 'avgSeverityScore'">
              <Tag :color="getSeverityColor(record.avgSeverityScore)">
                {{ record.avgSeverityScore.toFixed(2) }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'severityDistribution'">
              <div class="severity-distribution">
                <Tag v-if="record.severityDistribution['5']" color="purple">
                  极严重: {{ record.severityDistribution['5'] }}
                </Tag>
                <Tag v-if="record.severityDistribution['4']" color="red">
                  严重: {{ record.severityDistribution['4'] }}
                </Tag>
                <Tag v-if="record.severityDistribution['3']" color="orange">
                  中等: {{ record.severityDistribution['3'] }}
                </Tag>
                <Tag v-if="record.severityDistribution['2']" color="blue">
                  较轻: {{ record.severityDistribution['2'] }}
                </Tag>
                <Tag v-if="record.severityDistribution['1']" color="green">
                  轻微: {{ record.severityDistribution['1'] }}
                </Tag>
              </div>
            </template>

            <template v-else-if="column.key === 'recommendation'">
              <span :class="getRecommendationClass(record)">
                {{ getRecommendation(record) }}
              </span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="handleViewDetails(record)"
                >
                  查看详情
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </div>
    </Card>

    <!-- 详情对话框 -->
    <Modal
      v-model:open="detailVisible"
      :title="`道路详情 - ${currentBatch?.batchName}`"
      width="80%"
      @cancel="detailVisible = false"
    >
      <template #footer>
        <Button @click="detailVisible = false">关闭</Button>
      </template>

      <div v-if="currentBatch">
        <!-- 道路基本信息 -->
        <Descriptions :column="2" bordered class="mb-4">
          <DescriptionsItem label="道路编号">
            {{ currentBatch.batchName }}
          </DescriptionsItem>
          <DescriptionsItem label="检测图片数量">
            {{ currentBatch.imageCount }} 张
          </DescriptionsItem>
          <DescriptionsItem label="平均置信度">
            {{ (currentBatch.avgConfidence * 100).toFixed(2) }}%
          </DescriptionsItem>
          <DescriptionsItem label="平均严重程度">
            <Tag :color="getSeverityColor(currentBatch.avgSeverityScore)">
              {{ currentBatch.avgSeverityScore.toFixed(2) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="首次检测时间">
            {{ formatDate(currentBatch.firstCreated) }}
          </DescriptionsItem>
          <DescriptionsItem label="最近检测时间">
            {{ formatDate(currentBatch.lastCreated) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 严重程度分布图表 -->
        <div class="chart-section mb-4">
          <h4 class="text-md font-medium mb-2">严重程度分布</h4>
          <div class="severity-chart">
            <div
              v-for="(count, level) in currentBatch.severityDistribution"
              :key="level"
              class="chart-bar"
            >
              <div class="bar-label">{{ getSeverityText(Number(level)) }}</div>
              <div class="bar-container">
                <div
                  class="bar-fill"
                  :style="{
                    width: `${(count / currentBatch.imageCount) * 100}%`,
                    background: getSeverityBarColor(Number(level))
                  }"
                >
                  <span class="bar-value">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 养护建议 -->
        <Alert
          :message="getMaintenanceAdvice(currentBatch)"
          :type="getMaintenanceAlertType(currentBatch.avgSeverityScore)"
          show-icon
        />

        <!-- 详细图片列表 -->
        <div class="detail-images-section mt-4" v-if="batchResults.length > 0">
          <h4 class="text-md font-medium mb-2">检测详情</h4>
          <Table
            :columns="detailColumns"
            :data-source="batchResults"
            :row-key="(record) => record.id"
            :pagination="{ pageSize: 5 }"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'severityLevel'">
                <Tag :color="getSeverityLevelColor(record.severityLevel)">
                  {{ record.severityText }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'severityScore'">
                {{ record.severityScore.toFixed(2) }}
              </template>
            </template>
          </Table>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import {
  Card,
  Row,
  Col,
  Statistic,
  Divider,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Descriptions,
  DescriptionsItem,
  Alert,
  message,
} from 'ant-design-vue';
import { inferenceResultsApi, type BatchInfo, type InferenceResultDetail } from '#/api/system/inference-results';

// 状态
const loading = ref(false);
const batches = ref<BatchInfo[]>([]);
const detailVisible = ref(false);
const currentBatch = ref<BatchInfo | null>(null);
const batchResults = ref<InferenceResultDetail[]>([]);

// 统计数据
const totalImages = computed(() => {
  return batches.value.reduce((sum, batch) => sum + batch.imageCount, 0);
});

const avgConfidence = computed(() => {
  if (batches.value.length === 0) return 0;
  const total = batches.value.reduce((sum, batch) => sum + batch.avgConfidence, 0);
  return (total / batches.value.length) * 100; // 转换为百分比
});

const avgSeverityScore = computed(() => {
  if (batches.value.length === 0) return 0;
  const total = batches.value.reduce((sum, batch) => sum + batch.avgSeverityScore, 0);
  return total / batches.value.length;
});

// 表格列定义
const columns = [
  { title: '道路编号', dataIndex: 'batchName', key: 'batchName', width: 150 },
  { title: '检测图片', dataIndex: 'imageCount', key: 'imageCount', width: 100 },
  {
    title: '平均置信度',
    dataIndex: 'avgConfidence',
    key: 'avgConfidence',
    width: 120,
    customRender: ({ text }: { text: number }) => `${(text * 100).toFixed(2)}%`
  },
  { title: '严重程度得分', dataIndex: 'avgSeverityScore', key: 'avgSeverityScore', width: 120 },
  { title: '严重程度分布', key: 'severityDistribution', width: 300 },
  { title: '养护建议', key: 'recommendation', width: 150 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
];

const detailColumns = [
  { title: '图片名称', dataIndex: 'originalImageRel', key: 'originalImageRel' },
  { title: '检测数量', dataIndex: 'detectionCount', key: 'detectionCount', width: 100 },
  {
    title: '平均置信度',
    dataIndex: 'avgConfidence',
    key: 'avgConfidence',
    width: 120,
    customRender: ({ text }: { text: number }) => `${(text * 100).toFixed(2)}%`
  },
  { title: '严重等级', dataIndex: 'severityLevel', key: 'severityLevel', width: 100 },
  { title: '严重程度得分', dataIndex: 'severityScore', key: 'severityScore', width: 120 },
];

// 加载批次数据
const loadBatches = async () => {
  loading.value = true;
  try {
    const response = await inferenceResultsApi.getBatches();
    // 按道路编号（批次名称）递减排序
    batches.value = response.batches.sort((a: BatchInfo, b: BatchInfo) => {
      return b.batchName.localeCompare(a.batchName);
    });
  } catch (error: any) {
    message.error('加载道路数据失败');
  } finally {
    loading.value = false;
  }
};

// 查看详情
const handleViewDetails = async (batch: BatchInfo) => {
  currentBatch.value = batch;
  detailVisible.value = true;

  try {
    const response = await inferenceResultsApi.getBatchResults(batch.batchName);
    batchResults.value = response.results;
  } catch (error: any) {
    message.error('加载详情失败');
  }
};

// 获取严重程度颜色
const getSeverityColor = (score: number) => {
  if (score >= 70) return 'purple';
  if (score >= 50) return 'red';
  if (score >= 30) return 'orange';
  if (score >= 15) return 'blue';
  return 'green';
};

const getSeverityLevelColor = (level: number) => {
  const colors = ['', 'green', 'blue', 'orange', 'red', 'purple'];
  return colors[level] || 'default';
};

const getSeverityBarColor = (level: number) => {
  const colors = {
    1: '#52c41a',
    2: '#1890ff',
    3: '#fa8c16',
    4: '#f5222d',
    5: '#722ed1',
  };
  return colors[level] || '#d9d9d9';
};

const getSeverityText = (level: number) => {
  const texts = ['', '轻微', '较轻', '中等', '严重', '极严重'];
  return texts[level] || '未知';
};

// 获取养护建议（基于严重程度分布和平均分）
const getRecommendation = (batch: any) => {
  const dist = batch.severityDistribution || {};
  const avgScore = batch.avgSeverityScore || 0;

  // 严重等级：5=极严重, 4=严重, 3=中等, 2=较轻, 1=轻微

  // 如果有极严重的路段（等级5），立即紧急修复
  if ((dist['5'] || 0) > 0) {
    return '紧急修复';
  }

  // 如果有严重的路段（等级4），立即安排修补
  if ((dist['4'] || 0) > 0) {
    return '立即安排修补';
  }

  // 如果有中等严重的路段（等级3），根据数量和平均分判断
  if ((dist['3'] || 0) > 0) {
    const total = batch.imageCount || 1;
    const ratio = (dist['3'] || 0) / total;
    // 中等路段超过30%，1-3个月内修补
    if (ratio > 0.3 || avgScore >= 30) {
      return '1-3个月内修补';
    }
    return '3-6个月内修补';
  }

  // 如果有较轻的路段（等级2），定期维护
  if ((dist['2'] || 0) > 0) {
    return '3-6个月内修补';
  }

  // 如果有轻微的路段（等级1），定期观察
  if ((dist['1'] || 0) > 0) {
    return '定期观察';
  }

  // 没有任何数据，定期观察
  return '定期观察';
};

const getRecommendationClass = (batch: any) => {
  const dist = batch.severityDistribution || {};

  // 严重等级：5=极严重, 4=严重, 3=中等, 2=较轻, 1=轻微

  if ((dist['5'] || 0) > 0) {
    return 'text-purple-600 font-bold';
  }
  if ((dist['4'] || 0) > 0) {
    return 'text-red-600 font-semibold';
  }
  if ((dist['3'] || 0) > 0) {
    return 'text-orange-600';
  }
  if ((dist['2'] || 0) > 0) {
    return 'text-blue-600';
  }
  return 'text-green-600';
};

const getMaintenanceAdvice = (batch: BatchInfo) => {
  const score = batch.avgSeverityScore;
  if (score >= 70) {
    return `该道路存在极严重缺陷，建议立即封闭进行紧急修复。检测到 ${batch.severityDistribution['5'] || 0} 处极严重缺陷，${batch.severityDistribution['4'] || 0} 处严重缺陷。`;
  }
  if (score >= 50) {
    return `该道路缺陷较为严重，建议在1周内安排修补作业。重点关注 ${batch.severityDistribution['4'] || 0} 处严重缺陷区域。`;
  }
  if (score >= 30) {
    return `该道路存在中等程度缺陷，建议在1-3个月内安排修补。共检测到 ${batch.imageCount} 张图片，${batch.severityDistribution['3'] || 0} 处中等缺陷。`;
  }
  if (score >= 15) {
    return `该道路缺陷较轻，建议在3-6个月内进行例行维护。持续监控道路状况变化。`;
  }
  return `该道路状况良好，建议按年度计划进行常规巡检和保养即可。`;
};

const getMaintenanceAlertType = (score: number) => {
  if (score >= 70) return 'error';
  if (score >= 50) return 'warning';
  if (score >= 30) return 'info';
  return 'success';
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 初始化
onMounted(() => {
  loadBatches();
});
</script>

<style scoped lang="scss">
.road-quality-container {
  .stat-card {
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .severity-distribution {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .severity-chart {
    .chart-bar {
      display: flex;
      align-items: center;
      margin-bottom: 12px;

      .bar-label {
        width: 80px;
        font-size: 14px;
        font-weight: 500;
      }

      .bar-container {
        flex: 1;
        height: 30px;
        background: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
        position: relative;

        .bar-fill {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          transition: width 0.3s ease;

          .bar-value {
            color: #fff;
            font-weight: 600;
            font-size: 12px;
          }
        }
      }
    }
  }
}
</style>
