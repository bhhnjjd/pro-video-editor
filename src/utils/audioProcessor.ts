export class AudioProcessor {
  private audioContext: AudioContext | OfflineAudioContext | null = null
  private sampleRate = 48000
  private bufferSize = 4096
  
  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext()
    }
  }
  
  async initialize() {
    if (!this.audioContext) {
      throw new Error('Audio context not supported')
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
  
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const arrayBuffer = await file.arrayBuffer()
    return await this.audioContext.decodeAudioData(arrayBuffer)
  }
  
  async extractWaveform(audioBuffer: AudioBuffer, width: number = 1000): Promise<number[]> {
    const channelData = audioBuffer.getChannelData(0) // Use first channel
    const samplesPerPixel = Math.floor(channelData.length / width)
    const waveform: number[] = []
    
    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel
      const end = start + samplesPerPixel
      let max = 0
      
      for (let j = start; j < end && j < channelData.length; j++) {
        max = Math.max(max, Math.abs(channelData[j]))
      }
      
      waveform.push(max)
    }
    
    return waveform
  }
  
  async trimAudio(audioBuffer: AudioBuffer, startTime: number, endTime: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const sampleRate = audioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const length = endSample - startSample
    
    const trimmedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    )
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const trimmedData = trimmedBuffer.getChannelData(channel)
      
      for (let i = 0; i < length; i++) {
        trimmedData[i] = originalData[startSample + i] || 0
      }
    }
    
    return trimmedBuffer
  }
  
  async applyFadeIn(audioBuffer: AudioBuffer, fadeDuration: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const sampleRate = audioBuffer.sampleRate
    const fadeSamples = Math.floor(fadeDuration * sampleRate)
    
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      sampleRate
    )
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const processedData = processedBuffer.getChannelData(channel)
      
      for (let i = 0; i < audioBuffer.length; i++) {
        let gain = 1
        if (i < fadeSamples) {
          gain = i / fadeSamples
        }
        processedData[i] = originalData[i] * gain
      }
    }
    
    return processedBuffer
  }
  
  async applyFadeOut(audioBuffer: AudioBuffer, fadeDuration: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const sampleRate = audioBuffer.sampleRate
    const fadeSamples = Math.floor(fadeDuration * sampleRate)
    const fadeStart = audioBuffer.length - fadeSamples
    
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      sampleRate
    )
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const processedData = processedBuffer.getChannelData(channel)
      
      for (let i = 0; i < audioBuffer.length; i++) {
        let gain = 1
        if (i >= fadeStart) {
          gain = (audioBuffer.length - i) / fadeSamples
        }
        processedData[i] = originalData[i] * gain
      }
    }
    
    return processedBuffer
  }
  
  async changeVolume(audioBuffer: AudioBuffer, volumeMultiplier: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const processedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const processedData = processedBuffer.getChannelData(channel)
      
      for (let i = 0; i < audioBuffer.length; i++) {
        processedData[i] = originalData[i] * volumeMultiplier
      }
    }
    
    return processedBuffer
  }
  
  async normalizeAudio(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    // Find peak level across all channels
    let peak = 0
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const data = audioBuffer.getChannelData(channel)
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]))
      }
    }
    
    if (peak === 0) return audioBuffer
    
    const normalizationGain = 0.95 / peak // Leave some headroom
    return await this.changeVolume(audioBuffer, normalizationGain)
  }
  
  async applyLowPassFilter(audioBuffer: AudioBuffer, frequency: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )
    
    const source = offlineContext.createBufferSource()
    const filter = offlineContext.createBiquadFilter()
    
    source.buffer = audioBuffer
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    
    source.connect(filter)
    filter.connect(offlineContext.destination)
    
    source.start()
    
    return await offlineContext.startRendering()
  }
  
  async applyHighPassFilter(audioBuffer: AudioBuffer, frequency: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )
    
    const source = offlineContext.createBufferSource()
    const filter = offlineContext.createBiquadFilter()
    
    source.buffer = audioBuffer
    filter.type = 'highpass'
    filter.frequency.value = frequency
    
    source.connect(filter)
    filter.connect(offlineContext.destination)
    
    source.start()
    
    return await offlineContext.startRendering()
  }
  
  async applyReverb(audioBuffer: AudioBuffer, reverbTime: number = 2, decay: number = 2): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )
    
    // Create impulse response for reverb
    const impulseLength = audioBuffer.sampleRate * reverbTime
    const impulse = offlineContext.createBuffer(2, impulseLength, audioBuffer.sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) {
        const n = impulseLength - i
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / impulseLength, decay)
      }
    }
    
    const source = offlineContext.createBufferSource()
    const convolver = offlineContext.createConvolver()
    const wetGain = offlineContext.createGain()
    const dryGain = offlineContext.createGain()
    const output = offlineContext.createGain()
    
    source.buffer = audioBuffer
    convolver.buffer = impulse
    wetGain.gain.value = 0.3
    dryGain.gain.value = 0.7
    
    source.connect(dryGain)
    source.connect(convolver)
    convolver.connect(wetGain)
    dryGain.connect(output)
    wetGain.connect(output)
    output.connect(offlineContext.destination)
    
    source.start()
    
    return await offlineContext.startRendering()
  }
  
  async mixAudioBuffers(buffers: { buffer: AudioBuffer; startTime: number; volume: number }[]): Promise<AudioBuffer> {
    if (!this.audioContext || buffers.length === 0) {
      throw new Error('Invalid audio context or no buffers provided')
    }
    
    // Calculate total length needed
    let totalLength = 0
    for (const { buffer, startTime } of buffers) {
      const endTime = startTime + buffer.duration
      totalLength = Math.max(totalLength, endTime)
    }
    
    const sampleRate = buffers[0].buffer.sampleRate
    const totalSamples = Math.floor(totalLength * sampleRate)
    const channels = Math.max(...buffers.map(b => b.buffer.numberOfChannels))
    
    const mixedBuffer = this.audioContext.createBuffer(channels, totalSamples, sampleRate)
    
    // Mix all buffers
    for (let channel = 0; channel < channels; channel++) {
      const mixedData = mixedBuffer.getChannelData(channel)
      
      for (const { buffer, startTime, volume } of buffers) {
        const startSample = Math.floor(startTime * sampleRate)
        const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1)
        const sourceData = buffer.getChannelData(sourceChannel)
        
        for (let i = 0; i < sourceData.length && startSample + i < mixedData.length; i++) {
          mixedData[startSample + i] += sourceData[i] * volume
        }
      }
    }
    
    return mixedBuffer
  }
  
  async exportToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(buffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Convert audio data
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' })
  }
  
  createWaveformVisualization(waveform: number[], width: number, height: number, color: string = '#7b68ee'): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    ctx.fillStyle = color
    const barWidth = width / waveform.length
    
    for (let i = 0; i < waveform.length; i++) {
      const barHeight = waveform[i] * height
      const x = i * barWidth
      const y = (height - barHeight) / 2
      
      ctx.fillRect(x, y, barWidth - 1, barHeight)
    }
    
    return canvas.toDataURL()
  }
  
  cleanup() {
    if (
      this.audioContext &&
      this.audioContext instanceof AudioContext &&
      this.audioContext.state !== 'closed'
    ) {
      this.audioContext.close()
    }
  }
}

export const audioProcessor = new AudioProcessor()