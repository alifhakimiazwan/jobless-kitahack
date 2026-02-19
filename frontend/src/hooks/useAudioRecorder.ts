import { useState, useRef, useCallback } from "react"

interface UseAudioRecorderReturn {
  isRecording: boolean
  startRecording: (onAudioChunk: (data: ArrayBuffer) => void) => Promise<void>
  stopRecording: () => void
  error: string | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(
    async (onAudioChunk: (data: ArrayBuffer) => void) => {
      try {
        setError(null)

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
        streamRef.current = stream

        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext

        await audioContext.audioWorklet.addModule(
          new URL("@/lib/audio/pcm-recorder-processor.js", import.meta.url).href
        )

        const source = audioContext.createMediaStreamSource(stream)
        const workletNode = new AudioWorkletNode(audioContext, "pcm-recorder-processor")
        workletNodeRef.current = workletNode

        workletNode.port.onmessage = (event: MessageEvent) => {
          if (event.data instanceof ArrayBuffer) {
            onAudioChunk(event.data)
          }
        }

        source.connect(workletNode)
        workletNode.connect(audioContext.destination)

        setIsRecording(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start recording"
        setError(message)
        console.error("Recording error:", err)
      }
    },
    []
  )

  const stopRecording = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }, [])

  return { isRecording, startRecording, stopRecording, error }
}
