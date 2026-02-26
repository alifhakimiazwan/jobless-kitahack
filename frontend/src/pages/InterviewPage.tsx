import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"
import { InterviewWebSocket } from "@/services/websocket"
import type { TranscriptEntry, WSMessage, WSTranscriptMessage, WSPhaseMessage, WSMetadataMessage } from "@/types/interview.types"
import {
  Mic,
  MicOff,
  Send,
  Phone,
  PhoneOff,
  MessageSquare,
  Loader2,
} from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resumeSessionId = searchParams.get("resume")

  // Interview state
  const [phase, setPhase] = useState<string>("greeting")
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [resumeQuestions, setResumeQuestions] = useState<any[]>([])
  const [includeResumeQuestions, setIncludeResumeQuestions] = useState(false)

  // UI state
  const [textMode, setTextMode] = useState(false)
  const [textInput, setTextInput] = useState("")
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // 7s silence detection: after 7s of quiet audio, tell backend "user finished turn" so AI can reply
  const SILENCE_THRESHOLD = 400 // RMS below this = silence (tune if needed)
  const SILENCE_DURATION_MS = 7000
  const lastLoudTimeRef = useRef<number>(Date.now())
  const sentEndOfTurnRef = useRef<boolean>(false)

  // Audio hooks
  const { isRecording, startRecording, stopRecording, error: recorderError } = useAudioRecorder()
  const { playAudio, stopPlayback, initPlayer } = useAudioPlayer()

  // Load resume questions preview on component mount (only when ?resume= param is present)
  useEffect(() => {
    if (!resumeSessionId) return
    const loadResumeQuestions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/resume/questions/${resumeSessionId}`)
        if (response.ok) {
          const data = await response.json()
          setResumeQuestions(data.questions || [])
        }
      } catch (error) {
        console.error("Failed to load resume questions:", error)
      }
    }
    loadResumeQuestions()
  }, [resumeSessionId])

  // WebSocket ref
  const wsRef = useRef<InterviewWebSocket | null>(null)

  // Connect WebSocket on mount
  useEffect(() => {
    if (!sessionId) return

    const ws = new InterviewWebSocket(
      sessionId,
      // Handle JSON messages
      (message: WSMessage) => {
        switch (message.type) {
          case "transcript": {
            const msg = message as WSTranscriptMessage
            setTranscript((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.role === msg.role && !last.is_final) {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...last,
                  // Final event has complete text → replace; partial → append
                  text: msg.is_final ? msg.text : last.text + msg.text,
                  is_final: msg.is_final,
                }
                return updated
              }
              return [
                ...prev,
                { role: msg.role, text: msg.text, is_final: msg.is_final, timestamp: Date.now() },
              ]
            })
            break
          }
          case "phase": {
            const msg = message as WSPhaseMessage
            setPhase(msg.phase)
            if (msg.phase === "complete") {
              setIsComplete(true)
            }
            break
          }
          case "metadata": {
            const msg = message as WSMetadataMessage
            setCurrentQuestion(msg.question_number)
            setTotalQuestions(msg.total_questions)
            break
          }
          case "interview_complete":
            setIsComplete(true)
            break
          case "error": {
            const errMsg = (message as { message?: string }).message ?? "Connection lost"
            setConnectionError(errMsg)
            setIsConnected(false)
            break
          }
        }
      },
      // Handle audio data
      (audioData: ArrayBuffer) => {
        playAudio(audioData)
      },
      // Handle connection status
      (connected: boolean) => {
        setIsConnected(connected)
      }
    )

    setConnectionError(null)
    ws.connect()
    wsRef.current = ws
    initPlayer()

    return () => {
      ws.disconnect()
      stopPlayback()
      stopRecording()
    }
  }, [sessionId])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  // Stream audio in real time. After 7s of silence we send end_of_turn so the AI knows it can reply.
  const toggleMic = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      lastLoudTimeRef.current = Date.now()
      sentEndOfTurnRef.current = false
      await startRecording((audioData) => {
        wsRef.current?.sendAudio(audioData)
        // Simple silence detection: RMS of 16-bit PCM
        const samples = new Int16Array(audioData)
        let sumSq = 0
        for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i]
        const rms = Math.sqrt(sumSq / samples.length)
        const now = Date.now()
        if (rms >= SILENCE_THRESHOLD) {
          lastLoudTimeRef.current = now
          sentEndOfTurnRef.current = false
        } else if (!sentEndOfTurnRef.current && now - lastLoudTimeRef.current >= SILENCE_DURATION_MS) {
          wsRef.current?.sendMessage({ type: "end_of_turn" })
          sentEndOfTurnRef.current = true
        }
      })
    }
  }

  // Handle text send
  const handleSendText = () => {
    if (!textInput.trim()) return
    wsRef.current?.sendText(textInput.trim())
    setTranscript((prev) => [
      ...prev,
      { role: "user", text: textInput.trim(), is_final: true, timestamp: Date.now() },
    ])
    setTextInput("")
  }

  // Handle end interview
  const handleEndInterview = () => {
    stopRecording()
    stopPlayback()
    wsRef.current?.disconnect()
    if (sessionId) {
      navigate(`/feedback/${sessionId}`)
    }
  }

  const progress = totalQuestions > 0
    ? Math.round((currentQuestion / totalQuestions) * 100)
    : 0

  const phaseLabel = {
    greeting: "Introduction",
    questions: `Question ${currentQuestion} of ${totalQuestions}`,
    closing: "Wrapping Up",
    complete: "Interview Complete",
  }[phase] || phase

  return (
    <div className="container max-w-3xl py-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <Badge variant="secondary">{phaseLabel}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTextMode(!textMode)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            {textMode ? "Voice" : "Text"}
          </Button>
          {isComplete ? (
            <Button onClick={handleEndInterview} size="sm">
              View Feedback
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={handleEndInterview}>
              <PhoneOff className="h-4 w-4 mr-1" />
              End
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {totalQuestions > 0 && (
        <Progress value={progress} className="mb-6" />
      )}

      {/* Resume Questions Section */}
      {resumeQuestions.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resume-Based Questions Available</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Include in interview:</label>
                <input
                  type="checkbox"
                  checked={includeResumeQuestions}
                  onChange={(e) => setIncludeResumeQuestions(e.target.checked)}
                  className="w-4 h-4"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resumeQuestions.map((question, index) => (
                <div key={question.id} className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {question.type} • {question.difficulty}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Q{index + 1}
                    </Badge>
                  </div>
                  <p className="text-sm">{question.question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card className="mb-6">
        <CardContent className="p-4 h-[400px] overflow-y-auto">
          {transcript.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center px-4">
              {!isConnected ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin mb-3" />
                  <p className="font-medium">Connecting to interviewer...</p>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">You’re live with the interviewer.</p>
                  <p className="text-sm max-w-sm">
                    Listen to the question, then click the mic to respond. Click again when you’re done speaking.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      entry.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {entry.role === "user" ? "You" : "Interviewer"}
                    </p>
                    {entry.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Area */}
      {!isComplete && (
        <div className="flex items-center gap-3">
          {textMode ? (
            <>
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your answer..."
                onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                className="flex-1"
              />
              <Button onClick={handleSendText} disabled={!textInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={toggleMic}
                disabled={!isConnected}
              >
                {isRecording ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {isRecording ? "Speaking… click again when done" : "Click to speak"}
              </p>
            </div>
          )}
        </div>
      )}

      {connectionError && (
        <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-center">
          <p className="text-destructive font-medium">{connectionError}</p>
          <p className="text-muted-foreground mt-1">Start a new interview from the home page to try again.</p>
        </div>
      )}

      {recorderError && (
        <p className="text-sm text-destructive mt-2 text-center">{recorderError}</p>
      )}

      {!isConnected && !isComplete && !connectionError && (
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Trying to reconnect...
        </p>
      )}
    </div>
  )
}
