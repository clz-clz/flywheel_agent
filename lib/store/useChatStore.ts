import { create } from 'zustand'

// ==========================================
// 1. 业务实体与 ACP 协议定义 (严格遵循 TDD 规范)
// ==========================================

export interface UserProfile {
  educationLevel?: string;
  major?: string;
  grade?: string;
  location?: string;
  targetRoles?: string[];
  currentSkills?: string[];
  interests?: string[];
  experienceSummary?: string;
  workPreference?: string[];
  salaryExpectation?: string;
  competitiveness_score?: number;
}

export type UIMessageStatus = 
  | 'idle' 
  | 'sending' 
  | 'thinking' 
  | 'calling_tool' 
  | 'rendering_result' 
  | 'done' 
  | 'error'

export interface CareerRecommendation {
  role?: string;
  matchScore?: number;
  reason?: string;
  title?: string;
  company?: string;
  salary_range?: string;
  location?: string;
}

export interface GapAnalysisItem {
  skill: string;
  status: 'acquired' | 'missing' | 'learning';
  importance: 'high' | 'medium' | 'low';
}

export interface ActionPlanPhase {
  phase: string;
  objective: string;
  tasks: string[];
  resources?: string[];
}

export interface ToolEvent {
  step: string;
  status: 'pending' | 'success' | 'error';
}

export type ResultBlock =
  | { type: 'text'; content: string }
  | { type: 'career_recommendations'; items: CareerRecommendation[] }
  | { type: 'gap_analysis'; items: GapAnalysisItem[] }
  | { type: 'action_plan'; plan: ActionPlanPhase[] }
  | { type: 'tool_status'; events: ToolEvent[] }

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  status?: UIMessageStatus;
  blocks?: ResultBlock[];
  createdAt: string;
}

// ==========================================
// 2. 状态机 Store 接口定义
// ==========================================
interface ChatState {
  sessionId: string | null;
  messages: UIMessage[];
  isAgentTyping: boolean;
  userProfile: Partial<UserProfile>;
  
  // Actions
  initSession: (sessionId: string) => void;
  addUserMessage: (text: string) => void;
  addAssistantPlaceholder: () => string; 
  updateMessageStatus: (id: string, status: UIMessageStatus) => void;
  appendStreamChunk: (id: string, chunk: string) => void;
  addResultBlock: (id: string, block: ResultBlock) => void;
  setError: (id: string, errorMsg: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

// ==========================================
// 3. Zustand 状态机全量实现
// ==========================================
export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  messages: [],
  isAgentTyping: false,
  userProfile: {},

  // 初始化会话，清空历史
  initSession: (sessionId) => set({ 
    sessionId, 
    messages: [], 
    isAgentTyping: false, 
    userProfile: {} 
  }),

  // 同步插入用户消息
  addUserMessage: (text) => {
    const newMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
  },

  // 为 Assistant 创建占位符，返回 ID 供后续更新
  addAssistantPlaceholder: () => {
    const id = crypto.randomUUID();
    const placeholder: UIMessage = {
      id,
      role: 'assistant',
      status: 'thinking',
      blocks: [], // 初始为空积木池
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ 
      messages: [...state.messages, placeholder],
      isAgentTyping: true 
    }));
    return id;
  },

  // 精准更新消息状态
  updateMessageStatus: (id, status) => {
    set((state) => ({
      messages: state.messages.map((msg) => 
        msg.id === id ? { ...msg, status } : msg
      ),
      isAgentTyping: status !== 'done' && status !== 'error' 
    }));
  },

  // 处理 SSE 文本流：自动维护 text 类型的 ResultBlock
  appendStreamChunk: (id, chunk) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== id) return msg;
        
        // 自动状态跃迁：收到文本即进入渲染态
        const newStatus = (msg.status === 'thinking' || msg.status === 'calling_tool') 
          ? 'rendering_result' 
          : msg.status;

        const currentBlocks = msg.blocks || [];
        const textBlockIndex = currentBlocks.findIndex(b => b.type === 'text');

        let nextBlocks: ResultBlock[];
        if (textBlockIndex > -1) {
          // 在现有文本块后追加
          nextBlocks = [...currentBlocks];
          const oldBlock = nextBlocks[textBlockIndex] as { type: 'text'; content: string };
          nextBlocks[textBlockIndex] = { ...oldBlock, content: oldBlock.content + chunk };
        } else {
          // 创建首个文本块
          nextBlocks = [...currentBlocks, { type: 'text', content: chunk }];
        }

        return { ...msg, status: newStatus, blocks: nextBlocks };
      })
    }));
  },

  // 接收结构化卡片数据 (如 ACP 协议中的结构化 Block)
  addResultBlock: (id, block) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== id) return msg;
        
        let currentBlocks = msg.blocks || [];
        
        // 策略处理：如果新 block 是工具状态，则替换掉旧的工具状态块以保持 UI 简洁
        if (block.type === 'tool_status') {
           currentBlocks = currentBlocks.filter(b => b.type !== 'tool_status');
        }
        
        return { ...msg, blocks: [...currentBlocks, block] };
      })
    }));
  },

  // 统一错误处理
  setError: (id, errorMsg) => {
    set((state) => ({
      messages: state.messages.map((msg) => 
        msg.id === id ? { 
          ...msg, 
          status: 'error', 
          blocks: [...(msg.blocks || []), { type: 'text', content: `[Error]: ${errorMsg}` }] 
        } : msg
      ),
      isAgentTyping: false
    }));
  },

  // TDD 14.1: 实时更新并维护用户画像摘要
  updateProfile: (profileUpdate) => {
    set((state) => ({ 
      userProfile: { ...state.userProfile, ...profileUpdate } 
    }));
  }
}));