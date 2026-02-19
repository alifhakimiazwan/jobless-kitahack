import axios from "axios"
import type {
  StartInterviewRequest,
  StartInterviewResponse,
  InterviewStatusResponse,
  FeedbackReport,
} from "@/types/interview.types"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
})

export async function startInterview(
  request: StartInterviewRequest
): Promise<StartInterviewResponse> {
  const { data } = await api.post<StartInterviewResponse>("/interviews/start", request)
  return data
}

export async function getInterviewStatus(
  sessionId: string
): Promise<InterviewStatusResponse> {
  const { data } = await api.get<InterviewStatusResponse>(
    `/interviews/${sessionId}/status`
  )
  return data
}

export async function triggerEvaluation(
  sessionId: string
): Promise<{ session_id: string; status: string; message: string }> {
  const { data } = await api.post(`/interviews/${sessionId}/evaluate`)
  return data
}

export async function getFeedback(
  sessionId: string
): Promise<FeedbackReport> {
  const { data } = await api.get<FeedbackReport>(
    `/interviews/${sessionId}/feedback`
  )
  return data
}

export async function getCompanies(): Promise<string[]> {
  const { data } = await api.get<{ companies: string[] }>("/questions/companies")
  return data.companies
}

export async function getPositions(company?: string): Promise<string[]> {
  const params = company ? { company } : {}
  const { data } = await api.get<{ positions: string[] }>("/questions/positions", { params })
  return data.positions
}

export async function checkHealth(): Promise<{ status: string }> {
  const { data } = await api.get("/status")
  return data
}
