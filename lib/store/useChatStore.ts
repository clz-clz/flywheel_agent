import { create } from 'zustand'

// ==========================================
// 1. 业务实体与 ACP 协议定义 (严格遵循 TDD 规范)
// ==========================================
export interface SkillNode {
  name: string;
  isMastered: boolean;
}
export interface PromotionLevel {
  id: string;
  level: string;
  title: string;
  status: 'acquired' | 'current' | 'locked';
  coreSkills: SkillNode[];
  salaryRange: string;
}
export type NodeStatus = 'acquired' | 'current' | 'locked';

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

export interface SkillNode {
  name: string;
  isMastered: boolean;
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
  dimension: string;
  current_status: string;
  required_status: string;
  gap_degree: string;
  suggestion: string;
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

// 🚀 [新增] 晋升图谱层级接口
export interface PromotionLevel {
  id: string;
  level: string;
  title: string;
  status: NodeStatus;
  coreSkills: SkillNode[];
  salaryRange: string;
}

// 1. 引入/定义后端的题目类型
export interface GeneralQuestionItem {
  id: number;
  topic: string;
  question: string;
  audio_url: string | null;
}

export type ResultBlock =
  | { type: 'text'; content: string }
  | { type: 'career_recommendations'; items: CareerRecommendation[] }
  | { type: 'gap_analysis'; items: GapAnalysisItem[] }
  | { type: 'action_plan'; plan: ActionPlanPhase[] }
  | { type: 'tool_status'; events: ToolEvent[] }
  | { type: 'mock_interview'; role: string; questions: GeneralQuestionItem[] }
  | { type: 'promotion_graph'; roleName: string; levels?: PromotionLevel[] }
  | { type: 'career_map'; data: { levels: PromotionLevel[] } }
  | { type: 'career_map'; data: { levels: PromotionLevel[] } };
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
  setIsGenerating: (val: boolean) => void; // 🚀 [新增] 防死锁控制
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

  initSession: (sessionId) => set({ 
    sessionId, 
    messages: [], 
    isAgentTyping: false, 
    userProfile: {} 
  }),

  addUserMessage: (text) => {
    const newMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
  },

  addAssistantPlaceholder: () => {
    const id = crypto.randomUUID();
    const placeholder: UIMessage = {
      id,
      role: 'assistant',
      status: 'thinking',
      blocks: [], 
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ 
      messages: [...state.messages, placeholder],
      isAgentTyping: true 
    }));
    return id;
  },

  // 🚀 [新增] 显式控制 Typing 状态，防止输入框死锁
  setIsGenerating: (val) => set({ isAgentTyping: val }),

  updateMessageStatus: (id, status) => {
    set((state) => ({
      messages: state.messages.map((msg) => 
        msg.id === id ? { ...msg, status } : msg
      ),
      isAgentTyping: status !== 'done' && status !== 'error' 
    }));
  },

  appendStreamChunk: (id, chunk) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== id) return msg;
        
        const newStatus = (msg.status === 'thinking' || msg.status === 'calling_tool') 
          ? 'rendering_result' 
          : msg.status;

        const currentBlocks = msg.blocks || [];
        const textBlockIndex = currentBlocks.findIndex(b => b.type === 'text');

        let nextBlocks: ResultBlock[];
        if (textBlockIndex > -1) {
          nextBlocks = [...currentBlocks];
          const oldBlock = nextBlocks[textBlockIndex] as { type: 'text'; content: string };
          nextBlocks[textBlockIndex] = { ...oldBlock, content: oldBlock.content + chunk };
        } else {
          nextBlocks = [...currentBlocks, { type: 'text', content: chunk }];
        }

        return { ...msg, status: newStatus, blocks: nextBlocks };
      })
    }));
  },

  addResultBlock: (id, block) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== id) return msg;
        let currentBlocks = msg.blocks || [];
        if (block.type === 'tool_status') {
           currentBlocks = currentBlocks.filter(b => b.type !== 'tool_status');
        }
        return { ...msg, blocks: [...currentBlocks, block] };
      })
    }));
  },

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

  updateProfile: (profileUpdate) => {
    set((state) => ({ 
      userProfile: { ...state.userProfile, ...profileUpdate } 
    }));
  }
}));