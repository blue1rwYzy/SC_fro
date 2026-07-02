<template>
  <div class="knowledge-graph-page p-4">
    <Card title="知识图谱模块" :bordered="false">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-4xl text-sm leading-6 text-gray-600">
          依据《高速公路异常巡检平台详细设计报告》，本模块覆盖图谱生成与图谱可视化两个核心子功能，
          并补充缺陷成因分析、养护措施推荐和自然语言问答能力。图谱数据仅写入本项目专属命名空间，
          不会影响 Neo4j 中其他项目的节点和关系。
        </div>
        <Space wrap>
          <Button type="primary" :loading="generating" @click="handleGenerate(false)">
            生成/同步图谱
          </Button>
          <Button danger :loading="generating" @click="handleGenerate(true)">
            强制重建图谱
          </Button>
          <Button :loading="pageLoading" @click="loadAll">刷新数据</Button>
        </Space>
      </div>

      <Row :gutter="16" class="mt-4">
        <Col v-for="item in summaryCards" :key="item.title" :span="6">
          <Card size="small">
            <Statistic :title="item.title" :value="item.value" />
          </Card>
        </Col>
      </Row>
    </Card>

    <Row :gutter="16" class="mt-4">
      <Col :span="16">
        <Card title="图谱可视化" :loading="graphLoading" :bordered="false">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <InputSearch
              v-model:value="graphFilters.keyword"
              allow-clear
              placeholder="按节点名称或别名搜索"
              style="width: 240px"
              @search="loadGraph"
            />
            <Select
              v-model:value="graphFilters.entityType"
              allow-clear
              placeholder="筛选实体类型"
              style="width: 180px"
              @change="loadGraph"
            >
              <SelectOption
                v-for="item in entityTypeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="graphFilters.defectType"
              allow-clear
              placeholder="聚焦缺陷类型"
              style="width: 180px"
              @change="loadGraph"
            >
              <SelectOption
                v-for="item in defectOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </SelectOption>
            </Select>
            <Input
              v-model:value="graphFilters.sectionName"
              allow-clear
              placeholder="按路段筛选"
              style="width: 180px"
              @pressEnter="loadGraph"
            />
            <Button @click="resetGraphFilters">重置筛选</Button>
          </div>

          <div class="rounded-lg border border-gray-100 bg-white p-2">
            <EchartsUI ref="graphRef" height="720px" />
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <Tag v-for="item in graphCategories" :key="item.name" color="blue">
              {{ item.name }}
            </Tag>
          </div>
        </Card>
      </Col>

      <Col :span="8">
        <Card title="养护推荐" :bordered="false">
          <Space direction="vertical" style="width: 100%">
            <Select
              v-model:value="recommendForm.defectType"
              placeholder="选择缺陷类型"
              style="width: 100%"
            >
              <SelectOption
                v-for="item in defectOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="recommendForm.severityLevel"
              placeholder="选择严重程度"
              style="width: 100%"
            >
              <SelectOption
                v-for="item in severityOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </SelectOption>
            </Select>
            <Button type="primary" :loading="recommendLoading" @click="handleRecommend">
              获取养护建议
            </Button>
          </Space>

          <template v-if="recommendation">
            <Descriptions :column="1" bordered class="mt-4" size="small">
              <DescriptionsItem label="缺陷类型">
                {{ recommendation.defectType }}
              </DescriptionsItem>
              <DescriptionsItem label="严重程度">
                {{ recommendation.severity.name }}（{{ recommendation.severity.priority }}）
              </DescriptionsItem>
              <DescriptionsItem label="处置时限">
                {{ recommendation.severity.timeline }}
              </DescriptionsItem>
              <DescriptionsItem label="处置动作">
                {{ recommendation.severity.action }}
              </DescriptionsItem>
            </Descriptions>

            <div class="mt-4">
              <div class="mb-2 font-medium">常见成因</div>
              <Space wrap>
                <Tag v-for="item in recommendation.causes" :key="item" color="orange">
                  {{ item }}
                </Tag>
              </Space>
            </div>

            <div class="mt-4">
              <div class="mb-2 font-medium">推荐措施</div>
              <Space wrap>
                <Tag v-for="item in recommendation.measures" :key="item" color="green">
                  {{ item }}
                </Tag>
              </Space>
            </div>

            <div class="mt-4">
              <div class="mb-2 font-medium">参考规范</div>
              <Space wrap>
                <Tag v-for="item in recommendation.standards" :key="item" color="blue">
                  {{ item }}
                </Tag>
              </Space>
            </div>

            <div class="mt-4">
              <div class="mb-2 font-medium">重点路段</div>
              <List
                :data-source="recommendation.roadSections"
                size="small"
                bordered
                :locale="{ emptyText: '暂无路段观测数据' }"
              >
                <template #renderItem="{ item }">
                  <ListItem>
                    <div class="w-full">
                      <div class="font-medium">{{ item.section_name }}</div>
                      <div class="text-xs text-gray-500">
                        关联次数：{{ item.count }}，平均置信度：{{ formatNumber(item.avg_confidence) }}，
                        平均严重度：{{ formatNumber(item.avg_severity_score) }}
                      </div>
                    </div>
                  </ListItem>
                </template>
              </List>
            </div>
          </template>
        </Card>

        <Card title="自然语言问答" class="mt-4" :bordered="false">
          <TextArea
            v-model:value="question"
            :rows="4"
            placeholder="例如：裂缝的常见成因有哪些？"
          />
          <div class="mt-3 flex justify-end">
            <Button type="primary" :loading="questionLoading" @click="handleAskQuestion">
              提交问题
            </Button>
          </div>

          <div class="mt-4 rounded-lg bg-gray-50 p-3 text-sm leading-6" v-if="questionResult">
            <div class="font-medium text-gray-900">回答</div>
            <div class="mt-2 whitespace-pre-wrap text-gray-700">
              {{ questionResult.answer }}
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <Tag color="purple" v-if="questionResult.matchedDefect">
                匹配缺陷：{{ questionResult.matchedDefect }}
              </Tag>
              <Tag color="cyan">意图：{{ questionResult.matchedIntent }}</Tag>
            </div>
          </div>

          <div class="mt-4">
            <div class="mb-2 font-medium">推荐问法</div>
            <ul class="m-0 list-disc pl-5 text-xs leading-6 text-gray-500">
              <li v-for="item in hintExamples" :key="item">{{ item }}</li>
            </ul>
          </div>
        </Card>

        <Card title="实体检索" class="mt-4" :bordered="false">
          <Space direction="vertical" style="width: 100%">
            <InputSearch
              v-model:value="entitySearch.keyword"
              allow-clear
              placeholder="搜索图谱实体"
              @search="handleSearchEntities"
            />
            <Select
              v-model:value="entitySearch.entityType"
              allow-clear
              placeholder="筛选实体类型"
              @change="handleSearchEntities"
            >
              <SelectOption
                v-for="item in entityTypeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </SelectOption>
            </Select>
          </Space>

          <List
            class="mt-4"
            :data-source="entityResults"
            :loading="entityLoading"
            bordered
            :locale="{ emptyText: '输入关键词后可检索图谱实体' }"
          >
            <template #renderItem="{ item }">
              <ListItem class="cursor-pointer" @click="focusEntity(item)">
                <div class="w-full">
                  <div class="flex items-center justify-between">
                    <div class="font-medium">{{ item.name }}</div>
                    <Tag>{{ entityTypeLabel(item.entityType) }}</Tag>
                  </div>
                  <div class="mt-1 text-xs text-gray-500">
                    {{ item.key }}
                  </div>
                </div>
              </ListItem>
            </template>
          </List>
        </Card>
      </Col>
    </Row>

    <Card title="图谱关系明细" class="mt-4" :bordered="false">
      <Table
        :columns="relationColumns"
        :data-source="relationRows"
        :pagination="{ pageSize: 8, showSizeChanger: false }"
        row-key="key"
        size="small"
      />
    </Card>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, reactive, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Input,
  List,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import {
  knowledgeGraphApi,
  type KnowledgeGraphData,
  type KnowledgeGraphEntitySearchItem,
  type KnowledgeGraphOverview,
  type KnowledgeGraphQuestionResult,
  type KnowledgeGraphRecommendation,
} from '#/api/system/knowledge-graph';

const InputSearch = Input.Search;
const TextArea = Input.TextArea;
const ListItem = List.Item;

const defectOptions = [
  { label: '裂缝类病害', value: '裂缝' },
  { label: '龟裂', value: '龟裂' },
  { label: '纵向裂缝', value: '纵向裂缝' },
  { label: '横向裂缝', value: '横向裂缝' },
  { label: '斜向裂缝', value: '斜向裂缝' },
  { label: '坑洞', value: '坑洞' },
  { label: '修补区域', value: '修补区域' },
];

const entityTypeOptions = [
  { label: '缺陷类型', value: 'DefectType' },
  { label: '缺陷家族', value: 'DefectFamily' },
  { label: '成因', value: 'Cause' },
  { label: '养护措施', value: 'Maintenance' },
  { label: '路段', value: 'RoadSection' },
  { label: '设备', value: 'Device' },
  { label: '规范', value: 'Standard' },
  { label: '严重程度', value: 'Severity' },
  { label: '检测批次', value: 'DetectionBatch' },
];

const severityOptions = [
  { label: '轻微（1）', value: 1 },
  { label: '较轻（2）', value: 2 },
  { label: '中等（3）', value: 3 },
  { label: '严重（4）', value: 4 },
  { label: '极严重（5）', value: 5 },
];

const relationColumns = [
  {
    title: '源实体',
    dataIndex: 'sourceName',
    key: 'sourceName',
    width: 220,
  },
  {
    title: '关系',
    dataIndex: 'relationType',
    key: 'relationType',
    width: 180,
  },
  {
    title: '目标实体',
    dataIndex: 'targetName',
    key: 'targetName',
    width: 220,
  },
  {
    title: '关系属性',
    dataIndex: 'relationSummary',
    key: 'relationSummary',
  },
];

const graphRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(graphRef);

const generating = ref(false);
const graphLoading = ref(false);
const pageLoading = ref(false);
const entityLoading = ref(false);
const questionLoading = ref(false);
const recommendLoading = ref(false);

const overview = ref<KnowledgeGraphOverview | null>(null);
const graphData = ref<KnowledgeGraphData>({
  categories: [],
  links: [],
  nodes: [],
});
const entityResults = ref<KnowledgeGraphEntitySearchItem[]>([]);
const questionResult = ref<KnowledgeGraphQuestionResult | null>(null);
const recommendation = ref<KnowledgeGraphRecommendation | null>(null);
const hintExamples = ref<string[]>([]);

const graphFilters = reactive({
  defectType: '',
  entityType: '',
  keyword: '',
  limit: 90,
  sectionName: '',
});

const entitySearch = reactive({
  entityType: '',
  keyword: '',
});

const recommendForm = reactive({
  defectType: '裂缝',
  severityLevel: 3,
});

const question = ref('裂缝的常见成因有哪些？');

const summaryCards = computed(() => {
  const entityCounts = overview.value?.entityCounts || {};
  return [
    {
      title: '图谱实体总数',
      value: Object.values(entityCounts).reduce((sum, item) => sum + item.count, 0),
    },
    {
      title: '图谱关系总数',
      value:
        overview.value?.relationCounts.reduce(
          (sum, item) => sum + item.relation_count,
          0,
        ) || 0,
    },
    {
      title: '关联检测结果数',
      value: overview.value?.inferenceResultCount || 0,
    },
    {
      title: '图谱最后生成时间',
      value: overview.value?.lastGeneratedAt
        ? new Date(overview.value.lastGeneratedAt).toLocaleString()
        : '未生成',
    },
  ];
});

const graphCategories = computed(() => graphData.value.categories || []);

const relationRows = computed(() => {
  const nodeNameMap = new Map(
    graphData.value.nodes.map((item) => [item.id, item.name]),
  );
  return graphData.value.links.map((item, index) => ({
    key: `${item.source}-${item.target}-${index}`,
    relationSummary: formatRelationProperties(item.properties),
    relationType: item.relationType,
    sourceName: nodeNameMap.get(item.source) || item.source,
    targetName: nodeNameMap.get(item.target) || item.target,
  }));
});

function entityTypeLabel(entityType?: string) {
  return (
    entityTypeOptions.find((item) => item.value === entityType)?.label ||
    entityType ||
    '未知实体'
  );
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return value;
  }
  return Number(value || 0).toFixed(2);
}

function formatRelationProperties(properties: Record<string, any>) {
  const entries = Object.entries(properties || {});
  if (entries.length === 0) {
    return '-';
  }
  return entries
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? formatNumber(value) : value}`)
    .join('；');
}

function resetGraphFilters() {
  graphFilters.defectType = '';
  graphFilters.entityType = '';
  graphFilters.keyword = '';
  graphFilters.sectionName = '';
  loadGraph();
}

function renderGraphChart() {
  const categoryIndexMap = new Map(
    graphData.value.categories.map((item, index) => [item.name, index]),
  );

  renderEcharts({
    animation: true,
    animationDuration: 900,
    animationDurationUpdate: 900,
    animationEasing: 'quarticOut',
    animationEasingUpdate: 'quarticOut',
    legend: {
      top: 0,
      type: 'scroll',
    },
    series: [
      {
        categories: graphData.value.categories,
        data: graphData.value.nodes.map((item) => ({
          category: categoryIndexMap.get(item.category) ?? 0,
          draggable: true,
          id: item.id,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1.5,
          },
          label: {
            fontSize: 11,
            formatter: '{b}',
            overflow: 'truncate',
            position: 'right',
            show: item.symbolSize >= 24,
            width: 120,
          },
          name: item.name,
          symbolSize: Math.max(18, Math.min(item.symbolSize, 48)),
          tooltip: {
            formatter: () => {
              const detailLines = Object.entries(item.properties || {})
                .slice(0, 6)
                .map(([key, value]) => `${key}: ${value}`);
              return [
                `<strong>${item.name}</strong>`,
                `类型：${item.category}`,
                ...detailLines,
              ].join('<br/>');
            },
          },
          value: item.properties.total_count || item.properties.observation_count || 1,
        })),
        edgeLabel: {
          formatter: '{c}',
          show: false,
        },
        emphasis: {
          focus: 'adjacency',
          label: {
            show: true,
          },
        },
        force: {
          edgeLength: [130, 210],
          gravity: 0.08,
          initLayout: 'circular',
          layoutAnimation: true,
          repulsion: [260, 420],
        },
        labelLayout: {
          hideOverlap: true,
        },
        layout: 'force',
        links: graphData.value.links.map((item) => ({
          lineStyle: {
            curveness: 0.08,
            opacity: 0.65,
            width: item.value > 1 ? 2 : 1,
          },
          name: item.relationType,
          source: item.source,
          target: item.target,
          value: item.relationType,
        })),
        roam: true,
        type: 'graph',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>关系：${params.data.value}`;
        }
        return params.data.tooltip?.formatter?.() || params.name;
      },
    },
  });
}

async function loadOverview() {
  overview.value = await knowledgeGraphApi.getOverview();
  hintExamples.value = overview.value?.hintExamples || [];
}

async function loadGraph() {
  graphLoading.value = true;
  try {
    graphData.value = await knowledgeGraphApi.getGraph({
      defect_type: graphFilters.defectType || undefined,
      entity_type: graphFilters.entityType || undefined,
      keyword: graphFilters.keyword || undefined,
      limit: graphFilters.limit,
      section_name: graphFilters.sectionName || undefined,
    });
    renderGraphChart();
  } catch (error: any) {
    message.error(error.message || '加载知识图谱失败');
  } finally {
    graphLoading.value = false;
  }
}

async function loadAll() {
  pageLoading.value = true;
  try {
    await loadOverview();
    await loadGraph();
  } finally {
    pageLoading.value = false;
  }
}

async function handleGenerate(forceRebuild: boolean) {
  generating.value = true;
  try {
    await knowledgeGraphApi.generateGraph(forceRebuild);
    message.success(forceRebuild ? '知识图谱已重建' : '知识图谱已同步');
    await loadAll();
  } catch (error: any) {
    message.error(error.message || '图谱生成失败');
  } finally {
    generating.value = false;
  }
}

async function handleSearchEntities() {
  if (!entitySearch.keyword.trim()) {
    entityResults.value = [];
    return;
  }
  entityLoading.value = true;
  try {
    entityResults.value = await knowledgeGraphApi.searchEntities({
      entity_type: entitySearch.entityType || undefined,
      keyword: entitySearch.keyword,
      limit: 20,
    });
  } catch (error: any) {
    message.error(error.message || '实体检索失败');
  } finally {
    entityLoading.value = false;
  }
}

function focusEntity(item: KnowledgeGraphEntitySearchItem) {
  graphFilters.keyword = item.name;
  graphFilters.entityType = item.entityType || '';
  loadGraph();
}

async function handleAskQuestion() {
  if (!question.value.trim()) {
    message.error('请输入问题');
    return;
  }
  questionLoading.value = true;
  try {
    questionResult.value = await knowledgeGraphApi.askQuestion(question.value);
  } catch (error: any) {
    message.error(error.message || '知识问答失败');
  } finally {
    questionLoading.value = false;
  }
}

async function handleRecommend() {
  if (!recommendForm.defectType) {
    message.error('请选择缺陷类型');
    return;
  }
  recommendLoading.value = true;
  try {
    recommendation.value = await knowledgeGraphApi.getRecommendation({
      defect_type: recommendForm.defectType,
      severity_level: recommendForm.severityLevel,
    });
  } catch (error: any) {
    message.error(error.message || '获取推荐失败');
  } finally {
    recommendLoading.value = false;
  }
}

onMounted(() => {
  loadAll();
  handleRecommend();
  handleSearchEntities();
});
</script>

<style scoped>
.knowledge-graph-page :deep(.ant-statistic-content) {
  font-size: 20px;
}

.knowledge-graph-page :deep(.ant-list-item) {
  align-items: flex-start;
}
</style>
