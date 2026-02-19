/**
 * AudioWorklet processor for playing PCM audio.
 * Receives 24kHz 16-bit PCM chunks and outputs them to speakers.
 */
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._queue = []
    this._readIndex = 0

    this.port.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Convert int16 PCM to float32
        const int16 = new Int16Array(event.data)
        const float32 = new Float32Array(int16.length)
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 0x8000
        }
        this._queue.push(float32)
      }
    }
  }

  process(inputs, outputs) {
    const output = outputs[0]
    if (!output || !output[0]) return true

    const channelData = output[0]

    for (let i = 0; i < channelData.length; i++) {
      if (this._queue.length === 0) {
        channelData[i] = 0
        continue
      }

      const currentBuffer = this._queue[0]
      channelData[i] = currentBuffer[this._readIndex++]

      if (this._readIndex >= currentBuffer.length) {
        this._queue.shift()
        this._readIndex = 0
      }
    }

    return true
  }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor)
