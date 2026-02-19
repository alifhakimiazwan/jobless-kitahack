import { useRef, useCallback } from "react"

interface UseAudioPlayerReturn {
  playAudio: (pcmData: ArrayBuffer) => void
  stopPlayback: () => void
  initPlayer: () => Promise<void>
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const initPlayer = useCallback(async () => {
    try {
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      await audioContext.audioWorklet.addModule(
        new URL("@/lib/audio/pcm-player-processor.js", import.meta.url).href
      )

      const workletNode = new AudioWorkletNode(audioContext, "pcm-player-processor")
      workletNodeRef.current = workletNode
      workletNode.connect(audioContext.destination)
    } catch (err) {
      console.error("Failed to init audio player:", err)
    }
  }, [])

  const playAudio = useCallback((pcmData: ArrayBuffer) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage(pcmData, [pcmData])
    }
  }, [])

  const stopPlayback = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  return { playAudio, stopPlayback, initPlayer }
}
