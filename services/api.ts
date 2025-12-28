export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ProblemQueryOptions {
  search?: string;
  difficulty?: string;
  problem_type?: string;
  limit?: number;
  offset?: number;
}

export const getProblem = async (problemId: number) => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE_URL}/problems/${problemId}`, { headers });
  if (!resp.ok) throw new Error('Failed to fetch problem');
  return resp.json();
};

export const getProblems = async (opts: ProblemQueryOptions = {}) => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.difficulty) params.set('difficulty', opts.difficulty);
  if (opts.problem_type) params.set('problem_type', opts.problem_type);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));

  const url = `${API_BASE_URL}/problems${params.toString() ? '?' + params.toString() : ''}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error('Failed to fetch problems');
  return resp.json();
};

export const submitProblem = async (problemId: number, code: string, token?: string, hintLevel?: number) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body: any = { code };
  if (hintLevel !== undefined) body.hint_level = hintLevel;

  const resp = await fetch(`${API_BASE_URL}/problems/${problemId}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!resp.ok) throw new Error('Submission failed');
  return resp.json();
};

// AI Learning Progress API

export const getStudentProgress = async (
  userId?: number,
  token?: string,
  historyPage: number = 1,
  historySize: number = 10,
  ptPage: number = 1,
  ptSize: number = 20
): Promise<any> => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId.toString());
  params.append('history_page', historyPage.toString());
  params.append('history_size', historySize.toString());
  params.append('pt_page', ptPage.toString());
  params.append('pt_size', ptSize.toString());

  const url = `${API_BASE_URL}/api/ai/progress?${params.toString()}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Progress fetch failed: ${response.statusText}`);
  }

  return response.json();
};

export const getMastery = async (token?: string): Promise<Array<{ topic: string; score: number; attempts: number }>> => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/mastery`, { headers });
  if (!response.ok) {
    throw new Error(`Mastery fetch failed: ${response.statusText}`);
  }
  return response.json();
};

export const getLearningPath = async (token?: string): Promise<Array<{ id: string; title: string; status: 'locked' | 'available' | 'completed' | 'current'; qValue: number; description: string }>> => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/path`, { headers });
  if (!response.ok) {
    throw new Error(`Learning path fetch failed: ${response.statusText}`);
  }
  return response.json();
};

export const getLearningReport = async (token?: string): Promise<{
  summary: {
    solved_sessions: number;
    avg_time_solved_seconds?: number | null;
    avg_hints_per_solved?: number | null;
    hint_helpful_rate?: number | null;
    avg_attempts_per_solved_problem?: number | null;
  };
  by_concept: Array<{
    concept: string;
    solved_sessions: number;
    avg_time_solved_seconds?: number | null;
    avg_hints_per_solved?: number | null;
    hint_helpful_rate?: number | null;
  }>;
}> => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/report`, { headers });
  if (!response.ok) {
    throw new Error(`Learning report fetch failed: ${response.statusText}`);
  }
  return response.json();
};

// Tutor API

export interface HintRequest {
  code: string;
  problem_id: string;
  problem_description: string;
  hint_level?: number;
  previous_hints?: string[];
  language?: string;
  use_llm?: boolean;
  session_id?: number;
}

export interface HintResponse {
  success: boolean;
  syntax_valid: boolean;
  error_type: string;
  error_message: string;
  hint: string;
  hint_level: number;
  next_level: number;
  follow_up_question: string;
  reference_similarity: number;
  reference_used: boolean;
  interaction_id?: number;
  concepts_to_review: string[];
  suggested_approach: string;
  student_intent: string;
  confidence: number;
  strategy: string;
}

export interface TutorChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    hint_level?: number;
    concepts?: string[];
    similarity?: number;
  };
}

export interface TutorChatRequest {
  code: string;
  problem_id: string;
  problem_description: string;
  message: string;
  conversation_history: TutorChatMessage[];
  language?: string;
}

export interface TutorChatResponse {
  response: string;
  follow_up_questions: string[];
  concepts_mentioned: string[];
  hint_level?: number;
}

// Lấy gợi ý thông minh từ Tutor dùng Qdrant RAG + LLM
export const getHintFromTutor = async (
  request: HintRequest,
  token?: string
): Promise<HintResponse> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/hint`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: request.code,
      problem_id: String(request.problem_id),
      problem_description: request.problem_description,
      hint_level: request.hint_level || 1,
      previous_hints: request.previous_hints || [],
      language: request.language || 'vi',
      use_llm: request.use_llm !== false
    })
  });

  if (!response.ok) {
    throw new Error(`Hint request failed: ${response.statusText}`);
  }

  return response.json();
};

export const submitHintFeedback = async (
  interactionId: number,
  wasHelpful: boolean,
  token?: string
): Promise<{ success: boolean }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE_URL}/api/ai/hint/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ interaction_id: interactionId, was_helpful: wasHelpful })
  });
  if (!resp.ok) throw new Error(`Submit feedback failed: ${resp.statusText}`);
  return resp.json();
};

export const startLearningSession = async (
  problemId?: number,
  token?: string
): Promise<{ success: boolean; session_id: number | null }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE_URL}/api/ai/session/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ problem_id: problemId ?? null })
  });
  if (!resp.ok) throw new Error(`Start session failed: ${resp.statusText}`);
  return resp.json();
};

export const endLearningSession = async (
  sessionId: number,
  outcome: 'solved' | 'abandoned' | 'unknown' = 'unknown',
  token?: string
): Promise<{ success: boolean }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE_URL}/api/ai/session/end`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: sessionId, outcome })
  });
  if (!resp.ok) throw new Error(`End session failed: ${resp.statusText}`);
  return resp.json();
};

// Chat với Tutor
export const chatWithTutor = async (
  request: TutorChatRequest,
  token?: string
): Promise<TutorChatResponse> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: request.code,
      problem_id: String(request.problem_id || 'default'),
      problem_description: request.problem_description,
      message: request.message,
      conversation_history: request.conversation_history,
      language: request.language || 'vi'
    })
  });

  if (!response.ok) {
    const legacyResponse = await fetch(`${API_BASE_URL}/api/ai/tutor/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!legacyResponse.ok) {
      throw new Error(`Tutor chat failed: ${legacyResponse.statusText}`);
    }
    return legacyResponse.json();
  }

  return response.json();
};
