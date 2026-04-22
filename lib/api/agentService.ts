// 文件路径：lib/api/agentService.ts
// 描述：飞轮职业导航 Copilot 核心引擎 API 服务层 (Phase 2-6)

import { GeneralQuestionItem, ResultBlock } from "../store/useChatStore";

// 🚀 核心修复：指向云服务器后端实例
const API_BASE_URL = 'http://47.111.21.230:8000';

// ==========================================
// 1. 核心类型定义 (严丝合缝对齐后端 Pydantic 模型)
// ==========================================

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
  
  // 🚀 修复类型漏洞：补齐后端的实习经历字段
  internship_experience?: string; 
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
  skill: string;
  status: 'acquired' | 'missing' | 'learning';
  importance: 'high' | 'medium' | 'low';
}

export interface RadarDimension {
  label: string;
  value: number;
  benchmark: number;
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

export interface STTResponse {
  text?: string;
  error?: string;
}

export interface RoadmapHistoryItem {
  id: number;
  role_name: string;
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

export interface ResumeUploadResponse {
  status: string;
  message: string;
  data: UserProfile; 
}

export interface ChatApiResponse {
  session_id: string;
  reply: string;
  blocks?: ResultBlock[]; 
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface GeneralInterviewResponse {
  role: string;
  questions: GeneralQuestionItem[];
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

export const AuthAPI = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // 🚀 核心修复：加上了基地址前缀 API_BASE_URL
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    if (!res.ok) throw new Error('登录失败，请检查账号密码');
    return res.json();
  },
  register: async (username: string, password: string): Promise<{ status: string; message: string }> => {
    // 🚀 核心修复：加上了基地址前缀 API_BASE_URL
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('注册失败，用户名可能已存在');
    return res.json();
  }
};


export const AgentAPI = {
  getMe: async (): Promise<UserMeResponse> => {
    return fetchWithAuth<UserMeResponse>('/api/users/me', { method: 'GET' });
  },

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
  
  getMyProfile: async (): Promise<UserProfile> => {
    return fetchWithAuth<UserProfile>('/api/profile/me', {
      method: 'GET',
    });
  },

  transcribeAudio: async (audioFile: File): Promise<STTResponse> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const formData = new FormData();
    formData.append('file', audioFile);

    const headers = new Headers();
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

  getRoadmapHistory: async (): Promise<RoadmapHistoryResponse> => {
    return fetchWithAuth<RoadmapHistoryResponse>('/api/history/roadmaps', {
      method: 'GET',
    });
  },

  getInterviewHistory: async (): Promise<InterviewHistoryResponse> => {
    return fetchWithAuth<InterviewHistoryResponse>('/api/history/interviews', {
      method: 'GET',
    });
  },

  extractProfile: async (resumeText: string, sessionId?: string): Promise<ProfileIntakeResponse> => {
    return fetchWithAuth<ProfileIntakeResponse>('/api/user/profile/extract', {
      method: 'POST',
      body: JSON.stringify({ resume_text: resumeText, session_id: sessionId }),
    });
  },

  analyzeGap: async (targetRole: string): Promise<GapAnalysisResponse> => {
    const params = new URLSearchParams({ target_role: targetRole });
    
    const rawData = await fetchWithAuth<FullGapAnalysisResponse>(`/api/agent/gap-analysis?${params.toString()}`, {
      method: 'POST',
    });

    const mapDimensionToGap = (dimensionName: string, data: GapDimension): GapItem => ({
      dimension: dimensionName,
      skill: dimensionName,
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
      core_strengths: [], 
      immediate_next_steps: rawData.immediate_next_steps || [],
      gaps: [
        mapDimensionToGap('基础素质(学历/专业)', rawData.basic_matching),
        mapDimensionToGap('专业技能(工具/语言)', rawData.skill_matching),
        mapDimensionToGap('职业素养(沟通/协作)', rawData.soft_skill_matching),
        mapDimensionToGap('发展潜力(创新/学习)', rawData.potential_matching),
      ]
    };
  },

  generateLearningPath: async (targetRole: string): Promise<LearningPathResponse> => {
    const params = new URLSearchParams({ target_role: targetRole });
    return fetchWithAuth<LearningPathResponse>(`/api/agent/learning-path?${params.toString()}`, {
      method: 'POST',
    });
  },

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

  getGeneralQuestions: async (targetRole: string, focusTopics: string = "基础知识, 实战经验"): Promise<GeneralInterviewResponse> => {
    const params = new URLSearchParams({ target_role: targetRole, focus_topics: focusTopics });
    return fetchWithAuth<GeneralInterviewResponse>(`/api/interview/questions?${params.toString()}`, { method: 'GET' });
  },

  evaluateInterviewAnswer: async (request: MockAnswerRequest): Promise<MockEvaluation> => {
    return fetchWithAuth<MockEvaluation>('/api/agent/mock-interview/evaluate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
};