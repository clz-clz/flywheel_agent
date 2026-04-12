import { create } from 'zustand'

// ==========================================
// 1. 业务实体与 ACP 协议定义 (Zero 'any' Policy)
// ==========================================

export interface UserProfile {
  educationLevel?: string
  major?: string
  grade?: string
  targetRoles?: string[]
  currentSkills?: string[]
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
  role: string
  matchScore: number
  reason: string
}

export interface GapAnalysisItem {
  skill: string
  status: 'acquired' | 'missing' | 'learning'
  importance: 'high' | 'medium' | 'low'
}

export interface ActionPlanPhase {
  phase: string // 例如 "0-30天"
  objective: string
  tasks: string[]
}

export interface ToolEvent {
  step: string
  status: 'pending' | 'success' | 'error'
}

// 核心：标准化的结构结果块 (ResultBlock)
export type ResultBlock =
  | { type: 'text'; content: string }
  | { type: 'career_recommendations'; items: CareerRecommendation[] }
  | { type: 'gap_analysis'; items: GapAnalysisItem[] }
  | { type: 'action_plan'; plan: ActionPlanPhase[] }
  | { type: 'tool_status'; events: ToolEvent[] }

export interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text?: string
  status?: UIMessageStatus
  blocks?: ResultBlock[]
  createdAt: string
}

// ==========================================
// 2. 状态机 Store 接口定义 (State & Actions)
// ==========================================
interface ChatState {
  sessionId: string | null
  messages: UIMessage[]
  isAgentTyping: boolean
  userProfile: Partial<UserProfile> // TDD 14.1: 维护 profile 摘要
  
  // Actions
  initSession: (sessionId: string) => void
  addUserMessage: (text: string) => void
  addAssistantPlaceholder: () => string 
  updateMessageStatus: (id: string, status: UIMessageStatus) => void
  appendStreamChunk: (id: string, chunk: string) => void
  addResultBlock: (id: string, block: ResultBlock) => void
  setError: (id: string, errorMsg: string) => void
  updateProfile: (profile: Partial<UserProfile>) => void
}

// ==========================================
// 3. Zustand 状态机实现 (驱动全站的引擎)
// ==========================================
export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  messages: [],
  isAgentTyping: false,
  userProfile: {},

  initSession: (sessionId) => set({ sessionId, messages: [], isAgentTyping: false, userProfile: {} }),

  addUserMessage: (text) => {
    const newMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ messages: [...state.messages, newMessage] }))
  },

  addAssistantPlaceholder: () => {
    const id = crypto.randomUUID()
    const placeholder: UIMessage = {
      id,
      role: 'assistant',
      status: 'thinking',
      blocks: [],
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ 
      messages: [...state.messages, placeholder],
      isAgentTyping: true 
    }))
    return id
  },

  updateMessageStatus: (id, status) => {
    set((state) => ({
      messages: state.messages.map((msg) => 
        msg.id === id ? { ...msg, status } : msg
      ),
      // 只要不是 done 或 error，就认为 Agent 还在忙
      isAgentTyping: status !== 'done' && status !== 'error' 
    }))
  },

  // 处理真实的 SSE 文本流拼接
  appendStreamChunk: (id, chunk) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== id) return msg
        
        // 收到文本块，自动切换到渲染结果状态
        const newStatus = (msg.status === 'thinking' || msg.status === 'calling_tool') 
          ? 'rendering_result' 
          : msg.status

        const textBlock = msg.blocks?.find(b => b.type === 'text') as { type: 'text', content: string } | undefined
        const otherBlocks = msg.blocks?.filter(b => b.type !== 'text') || []

        const newTextBlock: ResultBlock = textBlock 
          ? { type: 'text', content: textBlock.content + chunk } // 拼接到现有文本
          : { type: 'text', content: chunk } // 创建新文本块

        return { ...msg, status: newStatus, blocks: [...otherBlocks, newTextBlock] }
      })
    }))
  },

  // 接收后端的结构化卡片数据 (如 MCP 查库结果)
  addResultBlock: (id, block) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id !== id) return msg
        
        // 如果是工具调用状态，替换现有的 tool_status，保持 UI 清洁
        let currentBlocks = msg.blocks || []
        if (block.type === 'tool_status') {
           currentBlocks = currentBlocks.filter(b => b.type !== 'tool_status')
        }
        
        return { ...msg, blocks: [...currentBlocks, block] }
      })
    }))
  },

  setError: (id, errorMsg) => {
    set((state) => ({
      messages: state.messages.map((msg) => 
        msg.id === id ? { ...msg, status: 'error', blocks: [...(msg.blocks || []), { type: 'text', content: errorMsg }] } : msg
      ),
      isAgentTyping: false
    }))
  },

  updateProfile: (profileUpdate) => {
    set((state) => ({ userProfile: { ...state.userProfile, ...profileUpdate } }))
  }
}))