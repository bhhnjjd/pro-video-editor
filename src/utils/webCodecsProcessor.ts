export class WebCodecsProcessor {
  private encoder: VideoEncoder | null = null
  private decoder: VideoDecoder | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d')
    }
  }
  
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'VideoEncoder' in window && 
           'VideoDecoder' in window &&
           'VideoFrame' in window
  }
  
  async initializeEncoder(config: VideoEncoderConfig) {
    if (!this.isSupported()) {
      throw new Error('WebCodecs is not supported in this browser')
    }
    
    const support = await VideoEncoder.isConfigSupported(config)
    if (!support.supported) {
      throw new Error('Video encoder configuration not supported')
    }
    
    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        // Handle encoded chunks
        console.log('Encoded chunk:', chunk.byteLength, 'bytes')
      },
      error: (error) => {
        console.error('Encoder error:', error)
      }
    })
    
    this.encoder.configure(config)
    return this.encoder
  }
  
  async initializeDecoder(config: VideoDecoderConfig) {
    if (!this.isSupported()) {
      throw new Error('WebCodecs is not supported in this browser')
    }
    
    const support = await VideoDecoder.isConfigSupported(config)
    if (!support.supported) {
      throw new Error('Video decoder configuration not supported')
    }
    
    this.decoder = new VideoDecoder({
      output: (frame) => {
        // Handle decoded frames
        this.renderFrame(frame)
        frame.close()
      },
      error: (error) => {
        console.error('Decoder error:', error)
      }
    })
    
    this.decoder.configure(config)
    return this.decoder
  }
  
  private renderFrame(frame: VideoFrame) {
    if (!this.canvas || !this.ctx) return
    
    this.canvas.width = frame.displayWidth
    this.canvas.height = frame.displayHeight
    
    this.ctx.drawImage(frame, 0, 0)
  }
  
  async processVideoFile(file: File, effects: any[] = []): Promise<ImageData[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const frames: ImageData[] = []
      
      video.onloadedmetadata = () => {
        if (!this.canvas || !this.ctx) {
          reject(new Error('Canvas not available'))
          return
        }
        
        this.canvas.width = video.videoWidth
        this.canvas.height = video.videoHeight
        
        const frameRate = 30 // Assume 30fps
        const duration = video.duration
        const totalFrames = Math.floor(duration * frameRate)
        
        let currentFrame = 0
        
        const processFrame = () => {
          if (currentFrame >= totalFrames) {
            resolve(frames)
            return
          }
          
          const time = currentFrame / frameRate
          video.currentTime = time
          
          video.onseeked = () => {
            if (!this.ctx || !this.canvas) return
            
            this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)
            
            // Apply effects
            let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            imageData = this.applyEffects(imageData, effects)
            
            frames.push(imageData)
            currentFrame++
            
            // Process next frame
            setTimeout(processFrame, 10)
          }
        }
        
        processFrame()
      }
      
      video.onerror = reject
      video.src = URL.createObjectURL(file)
    })
  }
  
  private applyEffects(imageData: ImageData, effects: any[]): ImageData {
    const data = imageData.data
    
    for (const effect of effects) {
      switch (effect.type) {
        case 'brightness':
          this.applyBrightness(data, effect.intensity)
          break
        case 'contrast':
          this.applyContrast(data, effect.intensity)
          break
        case 'saturation':
          this.applySaturation(data, effect.intensity)
          break
        case 'blur':
          // Blur requires more complex processing
          break
        case 'grayscale':
          this.applyGrayscale(data)
          break
        case 'sepia':
          this.applySepia(data)
          break
        case 'invert':
          this.applyInvert(data)
          break
      }
    }
    
    return imageData
  }
  
  private applyBrightness(data: Uint8ClampedArray, intensity: number) {
    const factor = intensity / 100
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] + (255 * factor))     // Red
      data[i + 1] = Math.min(255, data[i + 1] + (255 * factor)) // Green
      data[i + 2] = Math.min(255, data[i + 2] + (255 * factor)) // Blue
    }
  }
  
  private applyContrast(data: Uint8ClampedArray, intensity: number) {
    const factor = (259 * (intensity + 255)) / (255 * (259 - intensity))
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128))
    }
  }
  
  private applySaturation(data: Uint8ClampedArray, intensity: number) {
    const factor = intensity / 100
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]
      data[i] = Math.max(0, Math.min(255, gray + factor * (data[i] - gray)))
      data[i + 1] = Math.max(0, Math.min(255, gray + factor * (data[i + 1] - gray)))
      data[i + 2] = Math.max(0, Math.min(255, gray + factor * (data[i + 2] - gray)))
    }
  }
  
  private applyGrayscale(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }
  }
  
  private applySepia(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
    }
  }
  
  private applyInvert(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
  }
  
  async createVideoFromFrames(frames: ImageData[], frameRate: number = 30): Promise<Blob> {
    if (!this.encoder || !this.canvas || !this.ctx) {
      throw new Error('Encoder or canvas not initialized')
    }
    
    const chunks: Uint8Array[] = []
    let frameIndex = 0
    
    // Configure encoder to collect chunks
    this.encoder = new VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength)
        chunk.copyTo(data)
        chunks.push(data)
      },
      error: (error) => {
        console.error('Encoder error:', error)
      }
    })
    
    this.encoder.configure({
      codec: 'vp8',
      width: frames[0].width,
      height: frames[0].height,
      bitrate: 2000000,
      framerate: frameRate
    })
    
    for (const frameData of frames) {
      this.canvas.width = frameData.width
      this.canvas.height = frameData.height
      this.ctx.putImageData(frameData, 0, 0)
      
      const videoFrame = new VideoFrame(this.canvas, {
        timestamp: (frameIndex * 1000000) / frameRate
      })
      
      this.encoder.encode(videoFrame)
      videoFrame.close()
      frameIndex++
    }
    
    await this.encoder.flush()
    
    // Combine chunks into blob
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Uint8Array(totalSize)
    let offset = 0
    
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    
    return new Blob([combined], { type: 'video/webm' })
  }
  
  cleanup() {
    if (this.encoder && this.encoder.state !== 'closed') {
      this.encoder.close()
    }
    if (this.decoder && this.decoder.state !== 'closed') {
      this.decoder.close()
    }
  }
}

export const webCodecsProcessor = new WebCodecsProcessor()