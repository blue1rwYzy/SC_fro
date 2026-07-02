import { requestClient } from '#/api/request';

export interface KnowledgeGraphEntityCount {
  count: number;
  label: string;
}

export interface KnowledgeGraphOverview {
  entityCounts: Record<string, KnowledgeGraphEntityCount>;
  hintExamples: string[];
  inferenceResultCount: number;
  lastGeneratedAt: null | string;
  relationCounts: Array<{
    relation_count: number;
    relation_type: string;
  }>;
  topDefects: Array<{
    count: number;
    name: string;
  }>;
}

export interface KnowledgeGraphNode {
  category: string;
  id: string;
  labels: string[];
  name: string;
  properties: Record<string, any>;
  symbolSize: number;
}

export interface KnowledgeGraphLink {
  name: string;
  properties: Record<string, any>;
  relationType: string;
  source: string;
  target: string;
  value: number;
}

export interface KnowledgeGraphData {
  categories: Array<{ name: string }>;
  links: KnowledgeGraphLink[];
  nodes: KnowledgeGraphNode[];
}

export interface KnowledgeGraphEntitySearchItem {
  entityType: string;
  key: string;
  labels: string[];
  name: string;
  properties: Record<string, any>;
}

export interface KnowledgeGraphQuestionResult {
  answer: string;
  matchedDefect: null | string;
  matchedIntent: string;
  relatedEntities: Array<Record<string, any>>;
  suggestions: string[];
}

export interface KnowledgeGraphRecommendation {
  causes: string[];
  defectType: string;
  measures: string[];
  roadSections: Array<{
    avg_confidence: number;
    avg_severity_score: number;
    count: number;
    section_name: string;
  }>;
  severity: {
    action: string;
    level: number;
    name: string;
    priority: string;
    timeline: string;
  };
  standards: string[];
  summary: string;
}

export const knowledgeGraphApi = {
  askQuestion: (question: string) =>
    requestClient.post<KnowledgeGraphQuestionResult>('/knowledge-graph/question', {
      question,
    }),

  generateGraph: (forceRebuild: boolean) =>
    requestClient.post<{
      entityCounts: Record<string, number>;
      inferenceResultCount: number;
      relationCounts: Array<Record<string, any>>;
      success: boolean;
    }>('/knowledge-graph/generate', {
      force_rebuild: forceRebuild,
    }),

  getGraph: (params?: {
    defect_type?: string;
    entity_type?: string;
    keyword?: string;
    limit?: number;
    section_name?: string;
  }) => requestClient.get<KnowledgeGraphData>('/knowledge-graph/graph', { params }),

  getOverview: () =>
    requestClient.get<KnowledgeGraphOverview>('/knowledge-graph/overview'),

  getRecommendation: (params: {
    defect_type: string;
    severity_level?: number;
  }) =>
    requestClient.post<KnowledgeGraphRecommendation>(
      '/knowledge-graph/recommendation',
      params,
    ),

  searchEntities: (params: {
    entity_type?: string;
    keyword: string;
    limit?: number;
  }) => requestClient.get<KnowledgeGraphEntitySearchItem[]>('/knowledge-graph/entities', { params }),
};
