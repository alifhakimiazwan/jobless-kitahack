import { useState, useCallback, useRef, useEffect } from "react"
import { InterviewWebSocket } from "@/services/websocket"
import { startInterview, triggerEvaluation, getInterviewStatus } from "@/services/api"
import type {
  InterviewPhase,
  InterviewStatus,
  TranscriptEntry,
  StartInterviewRequest,
  WSMessage,
  WSTranscriptMessage,
  WSPhaseMessage,
  WSMetadataMessage,
} from "@/types/interview.types"

interface InterviewState {
  sessionId: string | null
  status: InterviewStatus | null
  phase: InterviewPhase
  transcript: TranscriptEntry[]
  currentQuestion: number
  totalQuestions: number
  isConnected: boolean
  isLoading: boolean
  error: string | null
}

interface UseInterviewReturn extends InterviewState {
  start: (request: StartInterviewRequest) => Promise<string>
  sendAudio: (pcmData: ArrayBuffer) => void
  sendText: (text: string) => void
  evaluate: () => Promise<void>
  disconnect: () => void
  pollStatus: () => Promise<InterviewStatus | null>
}

export function useInterview(): UseInterviewReturn {
  const [state, setState] = useState<InterviewState>({
    sessionId: null,
    status: null,
    phase: "greeting",
    transcript: [],
    currentQuestion: 0,
    totalQuestions: 0,
    isConnected: false,
    isLoading: false,
    error: null,
  })

  const wsRef = useRef<InterviewWebSocket | null>(null)

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case "transcript": {
        const msg = message as WSTranscriptMessage
        setState((prev) => ({
          ...prev,
          transcript: [
            ...prev.transcript,
            {
              role: msg.role,
              text: msg.text,
              is_final: msg.is_final,
              timestamp: Date.now(),
            },
          ],
        }))
        break
      }
      case "phase": {
        const msg = message as WSPhaseMessage
        setState((prev) => ({
          ...prev,
          phase: msg.phase,
          status: msg.phase === "complete" ? "completed" : prev.status,
        }))
        break
      }
      case "metadata": {
        const msg = message as WSMetadataMessage
        setState((prev) => ({
          ...prev,
          currentQuestion: msg.question_number,
          totalQuestions: msg.total_questions,
        }))
        break
      }
      case "interview_complete": {
        setState((prev) => ({
          ...prev,
          status: "completed",
          phase: "complete",
        }))
        break
      }
      case "error": {
        setState((prev) => ({
          ...prev,
          error: (message as WSMessage & { message: string }).message || "Unknown error",
        }))
        break
      }
    }
  }, [])

  const handleAudio = useCallback((_audioData: ArrayBuffer) => {
    // Audio is handled externally via the audio player hook
  }, [])

  const handleStatus = useCallback((connected: boolean) => {
    setState((prev) => ({ ...prev, isConnected: connected }))
  }, [])

  const start = useCallback(
    async (request: StartInterviewRequest): Promise<string> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        const response = await startInterview(request)
        const sessionId = response.session_id

        setState((prev) => ({
          ...prev,
          sessionId,
          status: "created",
          totalQuestions: response.questions_count,
          isLoading: false,
        }))

        // Connect WebSocket
        const ws = new InterviewWebSocket(
          sessionId,
          handleMessage,
          handleAudio,
          handleStatus
        )
        ws.connect()
        wsRef.current = ws

        return sessionId
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start interview"
        setState((prev) => ({ ...prev, isLoading: false, error: message }))
        throw err
      }
    },
    [handleMessage, handleAudio, handleStatus]
  )

  const sendAudio = useCallback((pcmData: ArrayBuffer) => {
    wsRef.current?.sendAudio(pcmData)
  }, [])

  const sendText = useCallback((text: string) => {
    wsRef.current?.sendText(text)
    // Add user message to transcript immediately
    setState((prev) => ({
      ...prev,
      transcript: [
        ...prev.transcript,
        { role: "user", text, is_final: true, timestamp: Date.now() },
      ],
    }))
  }, [])

  const evaluate = useCallback(async () => {
    if (!state.sessionId) return
    setState((prev) => ({ ...prev, status: "evaluating", isLoading: true }))
    try {
      await triggerEvaluation(state.sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to trigger evaluation"
      setState((prev) => ({ ...prev, error: message, isLoading: false }))
    }
  }, [state.sessionId])

  const pollStatus = useCallback(async (): Promise<InterviewStatus | null> => {
    if (!state.sessionId) return null
    try {
      const statusResponse = await getInterviewStatus(state.sessionId)
      setState((prev) => ({
        ...prev,
        status: statusResponse.status,
        phase: statusResponse.phase,
        currentQuestion: statusResponse.current_question,
        isLoading: statusResponse.status === "evaluating",
      }))
      return statusResponse.status
    } catch {
      return null
    }
  }, [state.sessionId])

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect()
    wsRef.current = null
    setState((prev) => ({ ...prev, isConnected: false }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.disconnect()
    }
  }, [])

  return {
    ...state,
    start,
    sendAudio,
    sendText,
    evaluate,
    disconnect,
    pollStatus,
  }
}
