import type { WSMessage } from "@/types/interview.types"

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000"

export type WSEventHandler = (message: WSMessage) => void
export type WSAudioHandler = (audioData: ArrayBuffer) => void
export type WSStatusHandler = (connected: boolean) => void

export class InterviewWebSocket {
  private ws: WebSocket | null = null
  private sessionId: string
  private onMessage: WSEventHandler
  private onAudio: WSAudioHandler
  private onStatus: WSStatusHandler
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  constructor(
    sessionId: string,
    onMessage: WSEventHandler,
    onAudio: WSAudioHandler,
    onStatus: WSStatusHandler
  ) {
    this.sessionId = sessionId
    this.onMessage = onMessage
    this.onAudio = onAudio
    this.onStatus = onStatus
  }

  connect(): void {
    const url = `${WS_BASE_URL}/ws/interview/${this.sessionId}`
    this.ws = new WebSocket(url)
    this.ws.binaryType = "arraybuffer"

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.onStatus(true)
    }

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary audio data from agent
        this.onAudio(event.data)
      } else {
        // JSON control message
        try {
          const message: WSMessage = JSON.parse(event.data)
          this.onMessage(message)
        } catch {
          console.error("Failed to parse WebSocket message:", event.data)
        }
      }
    }

    this.ws.onclose = (event) => {
      this.onStatus(false)
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`)
        setTimeout(() => this.connect(), 2000 * this.reconnectAttempts)
      }
    }

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }
  }

  sendAudio(pcmData: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcmData)
    }
  }

  sendText(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text_input", text }))
    }
  }

  /** Send a control message (e.g. end_of_turn after 7s silence). */
  sendMessage(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0 // Prevent reconnection
    if (this.ws) {
      this.ws.close(1000, "Client disconnected")
      this.ws = null
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
