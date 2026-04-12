// 文件路径：lib/api/agentService.ts
// 描述：飞轮职业导航 Copilot 核心引擎 API 服务层 (Phase 2-6)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ==========================================
// 1. 核心类型定义 (严丝合缝对齐后端 Pydantic 模型)
// ==========================================

export interface UserProfile {
  education_level: string;
  major: string;
  grade: string;
  location: string;
  target_roles: string[];
  current_skills: string[];
  interests: string[];
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

export const AgentAPI = {
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
   * Phase 4: 能力差距分析 (自动调取后端数据库档案)
   * POST /api/agent/gap-analysis?target_role=...
   */
  analyzeGap: async (targetRole: string): Promise<GapAnalysisResponse> => {
    // 后端接口要求 target_role 作为 Query 参数传递，而非 Body
    const params = new URLSearchParams({ target_role: targetRole });
    return fetchWithAuth<GapAnalysisResponse>(`/api/agent/gap-analysis?${params.toString()}`, {
      method: 'POST',
    });
  },

  /**
   * Phase 5: 生成 90 天学习路线图
   * POST /api/agent/learning-path
   */
  generateLearningPath: async (request: LearningPathRequest): Promise<LearningPathResponse> => {
    return fetchWithAuth<LearningPathResponse>('/api/agent/learning-path', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Phase 6-1: 获取定制化面试题
   * GET /api/interview/questions?target_role=...
   */
  getInterviewQuestions: async (targetRole: string): Promise<InterviewQuestionsResponse> => {
    const params = new URLSearchParams({ target_role: targetRole });
    return fetchWithAuth<InterviewQuestionsResponse>(`/api/interview/questions?${params.toString()}`, {
      method: 'GET',
    });
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