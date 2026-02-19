export type QuestionType = "behavioral" | "technical" | "situational" | "system_design" | "product"

export type InterviewPhase = "greeting" | "questions" | "closing" | "complete"

export type InterviewStatus =
  | "created"
  | "in_progress"
  | "completed"
  | "evaluating"
  | "evaluated"
  | "failed"

export interface StartInterviewRequest {
  candidate_name: string
  company: string
  position: string
  question_types: QuestionType[]
  question_count: number
}

export interface StartInterviewResponse {
  session_id: string
  questions_count: number
  status: string
  message: string
}

export interface InterviewStatusResponse {
  session_id: string
  status: InterviewStatus
  phase: InterviewPhase
  current_question: number
  total_questions: number
  progress_percent: number
}

export interface TranscriptEntry {
  role: "user" | "agent"
  text: string
  is_final: boolean
  timestamp?: number
}

export interface WSMessage {
  type: "transcript" | "phase" | "metadata" | "interview_complete" | "error"
  [key: string]: unknown
}

export interface WSTranscriptMessage extends WSMessage {
  type: "transcript"
  role: "user" | "agent"
  text: string
  is_final: boolean
}

export interface WSPhaseMessage extends WSMessage {
  type: "phase"
  phase: InterviewPhase
}

export interface WSMetadataMessage extends WSMessage {
  type: "metadata"
  question_number: number
  total_questions: number
}

export interface AnswerScore {
  score: number
  justification: string
}

export interface QuestionEvaluation {
  question_id: string
  question_text: string
  answer_summary: string
  relevance: AnswerScore
  depth: AnswerScore
  structure: AnswerScore
  communication: AnswerScore
  overall_score: number
  strengths: string[]
  improvements: string[]
}

export interface ActionItem {
  area: string
  suggestion: string
  example?: string
}

export interface FeedbackReport {
  session_id: string
  candidate_name: string
  company: string
  position: string
  overall_score: number
  overall_grade: string
  summary: string
  top_strengths: string[]
  key_improvements: string[]
  per_question_feedback: QuestionEvaluation[]
  action_items: ActionItem[]
  encouragement: string
}
