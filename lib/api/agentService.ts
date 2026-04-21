// 文件路径：lib/api/agentService.ts
// 描述：飞轮职业导航 Copilot 核心引擎 API 服务层 (Phase 2-6)

import { ResultBlock } from "../store/useChatStore";

const API_BASE_URL = '';

// ==========================================
// 1. 核心类型定义 (严丝合缝对齐后端 Pydantic 模型)
// ==========================================

// 文件路径：lib/api/agentService.ts (更新 UserProfile 接口)

export interface UserProfile {
  name?: string;
  education_level?: string;
  major?: string;
  grade?: string;
  location?: string;
  target_roles?: string[];
  current_skills?: string[];
  interests?: string[];
  
  // 🚀 新增：后端 Phase 2 高级提取维度
  certificates?: string[];
  soft_skills?: string[];
  innovation_potential?: string;
  competitiveness_score?: number; // 综合竞争力评分
}

export interface ProfileIntakeResponse {
  profile: UserProfile;
  is_complete: boolean;
  missing_fields: string[];
  next_questions: string[];
}

export interface GapItem {
  dimension: string;
  current_status: string;
  required_status: string;
  gap_degree: string;
  suggestion: string;
  // 🚀 已经去掉了这里的问号，并收紧了类型约束
  skill: string;
  status: 'acquired' | 'missing' | 'learning';
  importance: 'high' | 'medium' | 'low';
}

export interface RadarDimension {
  label: string;
  value: number;    // 用户当前得分 (0-100)
  benchmark: number; // 岗位标杆得分 (0-100)
}

export interface DimensionMapResponse {
  dimensions: RadarDimension[];
  overall_match: number;
}
export interface GapAnalysisResponse {
  target_role: string;
  overall_match_score: number;
  core_strengths: string[];
  gaps: GapItem[];
  immediate_next_steps: string[];
}

export interface RoadmapPhase {
  time_period: string;
  focus: string;
  action_items: string[];
  learning_resources: string[];
}

export interface LearningPathResponse {
  target_role: string;
  overall_timeline: string;
  roadmap: RoadmapPhase[];
}

export interface LearningPathRequest {
  profile: UserProfile;
  target_role: string;
  gaps: GapItem[];
}

export interface InterviewQuestion {
  id: number;
  question: string;
  dimension: string;
}

export interface InterviewQuestionsResponse {
  target_role: string;
  questions: InterviewQuestion[];
}

export interface MockAnswerRequest {
  target_role: string;
  question: string;
  user_answer: string;
  focus_area?: string;
}

export interface MockEvaluation {
  score: number;
  evaluation: string;
  improvement_suggestion: string;
  reference_answer: string;
}

export interface GapDimension {
  score: number;
  analysis: string;
  suggestions: string[];
}

export interface FullGapAnalysisResponse {
  target_role: string;
  overall_match_score: number;
  basic_matching: GapDimension;
  skill_matching: GapDimension;
  soft_skill_matching: GapDimension;
  potential_matching: GapDimension;
  immediate_next_steps: string[];
  roadmap_preview: string;
}

// 后端 Phase 6: 定向面试题模型
export interface TargetedInterviewQuestion {
  role: string;
  difficulty: string;
  question: string;
  focus_topic: string;
  background_context: string;
}

export interface TargetedInterviewWithAudioResponse {
  question_data: TargetedInterviewQuestion;
  audio_url: string | null;
}



// ==========================================
// 2. 基础请求类 (处理 Auth 与错误捕获)
// ==========================================

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // 注意：实际项目中建议从 Zustand authStore 或 cookies 中读取
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ==========================================
// 3. 业务接口封装层
// ==========================================

export interface RawGapItem {
  dimension?: string;
  skill?: string;
  current_status?: string;
  required_status?: string;
  gap_degree?: string;
  suggestion?: string;
}

export interface RawGapAnalysisResponse {
  target_role: string;
  overall_match_score: number;
  core_strengths?: string[];
  immediate_next_steps?: string[];
  gaps?: RawGapItem[];
  items?: RawGapItem[];
}



// ==========================================
// 补全: 语音与历史记录系统的强类型定义
// ==========================================

export interface STTResponse {
  text?: string;
  error?: string;
}

export interface RoadmapHistoryItem {
  id: number;
  role_name: string;
  // 为了彻底避免 any，这里使用 Record，或者复用前面的 LearningPathResponse 结构
  roadmap_detail: Record<string, unknown>; 
}

export interface RoadmapHistoryResponse {
  status: string;
  count: number;
  data: RoadmapHistoryItem[];
}

export interface InterviewHistoryItem {
  id: number;
  question: string;
  user_answer: string;
  score: number;
  evaluation: string;
  improvement_suggestion: string;
  reference_answer: string;
}

export interface InterviewHistoryResponse {
  status: string;
  count: number;
  data: InterviewHistoryItem[];
}

export interface UserMeResponse {
  status: string;
  data: {
    account: {
      id: number;
      username: string;
      created_at: string | null;
    };
    profile: {
      name: string;
      major: string | null;
      education_level: string | null;
      has_profile: boolean;
    };
  };
}

// --- 定义增量更新的特定结构 ---
export interface ProfileDetectedUpdates {
  current_skills: string[];
  certificates: string[];
  internship_experience: string;
}

export interface ProfileSyncResponse {
  status: string;
  message: string;
  new_score: number;
  detected_updates: ProfileDetectedUpdates;
}

// 针对 /api/user/profile/upload-resume 的响应
export interface ResumeUploadResponse {
  status: string;
  message: string;
  data: UserProfile; // 复用已有的 UserProfile 接口
}

// 针对 /api/chat 的完整响应协议
export interface ChatApiResponse {
  session_id: string;
  reply: string;
  blocks?: ResultBlock[]; // 这里的 ResultBlock 复用 useChatStore 中的定义
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// lib/api/agentService.ts 


// --- 2. 在 AgentAPI 中补全方法 ---

export const AuthAPI = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // 🚀 2. 删掉前面的域名，直接请求相对路径
    const res = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    if (!res.ok) throw new Error('登录失败，请检查账号密码');
    return res.json();
  },
  register: async (username: string, password: string): Promise<{ status: string; message: string }> => {
    // 🚀 3. 删掉前面的域名，直接请求相对路径
    const res = await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('注册失败，用户名可能已存在');
    return res.json();
  }
};


export const AgentAPI = {

  /**
   * 获取用户信息 (Auth)
   * GET /api/users/me
   */
  getMe: async (): Promise<UserMeResponse> => {
    return fetchWithAuth<UserMeResponse>('/api/users/me', { method: 'GET' });
  },

  /**
   * 上传 PDF 简历
   * POST /api/user/profile/upload-resume
   */
  uploadResumePDF: async (file: File): Promise<ResumeUploadResponse> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const formData = new FormData();
    formData.append('file', file);

    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/api/user/profile/upload-resume`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(errorData.detail || '简历解析失败');
    }
    return response.json() as Promise<ResumeUploadResponse>;
  },
  
  syncProfileFromChat: async (): Promise<ProfileSyncResponse> => {
    return fetchWithAuth<ProfileSyncResponse>('/api/user/profile/sync-from-chat', {
      method: 'POST',
    });
  },
  
  /**
   * [补全 1] 获取当前用户画像 (用于页面刷新后的状态恢复)
   * GET /api/profile/me
   */
  getMyProfile: async (): Promise<UserProfile> => {
    return fetchWithAuth<UserProfile>('/api/profile/me', {
      method: 'GET',
    });
  },

  /**
   * [补全 2] 语音转文字 (STT) (支持大模型语音解析)
   * POST /api/audio/stt
   */
  transcribeAudio: async (audioFile: File): Promise<STTResponse> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const formData = new FormData();
    formData.append('file', audioFile);

    const headers = new Headers();
    // 注意：上传文件时不要手动设置 Content-Type，让浏览器自动识别边界 boundary
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/api/audio/stt`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `STT error! status: ${response.status}`);
    }
    return response.json() as Promise<STTResponse>;
  },

  /**
   * [补全 3] 获取历史职业规划图列表
   * GET /api/history/roadmaps
   */
  getRoadmapHistory: async (): Promise<RoadmapHistoryResponse> => {
    return fetchWithAuth<RoadmapHistoryResponse>('/api/history/roadmaps', {
      method: 'GET',
    });
  },

  /**
   * [补全 4] 获取历史面试与打分复盘记录
   * GET /api/history/interviews
   */
  getInterviewHistory: async (): Promise<InterviewHistoryResponse> => {
    return fetchWithAuth<InterviewHistoryResponse>('/api/history/interviews', {
      method: 'GET',
    });
  },
  /**
   * Phase 2: 从简历/介绍中提取画像并持久化
   * POST /api/user/profile/extract
   */
  extractProfile: async (resumeText: string, sessionId?: string): Promise<ProfileIntakeResponse> => {
    return fetchWithAuth<ProfileIntakeResponse>('/api/user/profile/extract', {
      method: 'POST',
      body: JSON.stringify({ resume_text: resumeText, session_id: sessionId }),
    });
  },

  /**
   * 从聊天记录同步画像
   * POST /api/user/profile/sync-from-chat
   */


  /**
   * Phase 4: 能力差距分析 (自动调取后端数据库档案)
   * POST /api/agent/gap-analysis?target_role=...
   */
  analyzeGap: async (targetRole: string): Promise<GapAnalysisResponse> => {
    const params = new URLSearchParams({ target_role: targetRole });
    
    // 坚守 0 any：使用精确的后端 Schema 泛型
    const rawData = await fetchWithAuth<FullGapAnalysisResponse>(`/api/agent/gap-analysis?${params.toString()}`, {
      method: 'POST',
    });

    // 严格类型参数
    const mapDimensionToGap = (dimensionName: string, data: GapDimension): GapItem => ({
      dimension: dimensionName,
      skill: dimensionName, // 兼容 TDD
      current_status: '详见分析', 
      required_status: '岗位要求标准',
      gap_degree: data.score >= 80 ? '小差距' : (data.score >= 60 ? '中差距' : '大差距'),
      suggestion: data.analysis,
      status: 'learning',
      importance: data.score < 60 ? 'high' : 'medium'
    });

    return {
      target_role: rawData.target_role,
      overall_match_score: rawData.overall_match_score,
      core_strengths: [], // 默认值兜底
      immediate_next_steps: rawData.immediate_next_steps || [],
      gaps: [
        mapDimensionToGap('基础素质(学历/专业)', rawData.basic_matching),
        mapDimensionToGap('专业技能(工具/语言)', rawData.skill_matching),
        mapDimensionToGap('职业素养(沟通/协作)', rawData.soft_skill_matching),
        mapDimensionToGap('发展潜力(创新/学习)', rawData.potential_matching),
      ]
    };
  },

  /**
   * Phase 5: 生成 90 天学习路线图
   * POST /api/agent/learning-path
   */
  generateLearningPath: async (targetRole: string): Promise<LearningPathResponse> => {
    const params = new URLSearchParams({ target_role: targetRole });
    return fetchWithAuth<LearningPathResponse>(`/api/agent/learning-path?${params.toString()}`, {
      method: 'POST',
    });
  },

  /**
   * Phase 6-1: 获取定制化面试题
   * GET /api/interview/questions?target_role=...
   */
  generateTargetedInterview: async (targetRole: string): Promise<TargetedInterviewWithAudioResponse> => {
    const params = new URLSearchParams({ target_role: targetRole });
    return fetchWithAuth<TargetedInterviewWithAudioResponse>(`/api/interview/generate-targeted?${params.toString()}`, {
      method: 'GET',
    });
  },
  exportReport: async (targetRole: string): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const params = new URLSearchParams({ target_role: targetRole });
    const response = await fetch(`${API_BASE_URL}/api/report/export?${params.toString()}`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('导出失败');
    return response.blob();
  },

  /**
   * Phase 6-2: 评估面试回答并打分
   * POST /api/agent/mock-interview/evaluate
   */
  evaluateInterviewAnswer: async (request: MockAnswerRequest): Promise<MockEvaluation> => {
    return fetchWithAuth<MockEvaluation>('/api/agent/mock-interview/evaluate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  
};





