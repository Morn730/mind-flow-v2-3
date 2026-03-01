
export type DataSourceTag = '竞品研究' | '用户反馈' | '需求灵感' | '深度思考' | '系统向导' | '随手记';
export type SourceType = 'extension' | 'url' | 'file' | 'manual' | 'report';

export interface User {
  username: string;
  password?: string; // In a real app, never store plain text passwords. This is for local simulation.
  createdAt: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  url?: string;
  productName?: string;
  tag: DataSourceTag;
  sourceType: SourceType;
  content: string; 
  rawContent?: string; // 新增：存储原文快照
  timestamp: string;
  summary?: string;
  metadata?: {
    metrics?: string[]; 
  };
  isLoading?: boolean;
  error?: string; // 新增：记录解析错误信息
}

export interface Project {
  id: string;
  name: string;
  knowledgeBase: KnowledgeItem[];
  updatedAt: number;
}

export interface AppState {
  currentTab: 'knowledge' | 'reports';
  selectedProjectId: string | null;
  projects: Project[];
  isAnalyzing: boolean;
  isAnalysisModalOpen: boolean;
  selectedProductNames: string[];
  viewingItemId: string | null;
  knowledgeFilter: 'all' | 'competitors' | 'others' | 'memos';
  selectedBrand: string | null;
}

export type ModalType = 'create' | 'rename' | 'delete' | 'none';
