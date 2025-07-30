import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export class VideoProcessor {
  private ffmpeg: FFmpeg
  private isLoaded = false
  
  constructor() {
    this.ffmpeg = new FFmpeg()
  }
  
  async initialize() {
    if (this.isLoaded) return
    
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
      })
      
      this.isLoaded = true
      console.log('FFmpeg loaded successfully')
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw error
    }
  }
  
  onProgress(callback: (progress: number) => void) {
    this.ffmpeg.on('progress', ({ progress }) => {
      callback(progress * 100)
    })
  }
  
  onLog(callback: (message: string) => void) {
    this.ffmpeg.on('log', ({ message }) => {
      callback(message)
    })
  }
  
  async extractVideoInfo(file: File) {
    if (!this.isLoaded) await this.initialize()
    
    const inputName = `input.${file.name.split('.').pop()}`
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))
    
    // Get video info using ffprobe
    await this.ffmpeg.exec([
      '-i', inputName,
      '-f', 'null',
      '-'
    ])
    
    // Parse duration from logs (this is a simplified approach)
    return {
      duration: 10, // TODO: Parse actual duration from ffmpeg logs
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitRate: 5000
    }
  }
  
  async generateThumbnail(file: File, timeSeconds: number = 1): Promise<string> {
    if (!this.isLoaded) await this.initialize()
    
    const inputName = `input.${file.name.split('.').pop()}`
    const outputName = 'thumbnail.jpg'
    
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))
    
    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', timeSeconds.toString(),
      '-vframes', '1',
      '-vf', 'scale=160:90',
      '-q:v', '2',
      outputName
    ])
    
    const data = await this.ffmpeg.readFile(outputName)
    const blob = new Blob([data], { type: 'image/jpeg' })
    return URL.createObjectURL(blob)
  }
  
  async trimVideo(file: File, startTime: number, endTime: number): Promise<Blob> {
    if (!this.isLoaded) await this.initialize()
    
    const inputName = `input.${file.name.split('.').pop()}`
    const outputName = 'output.mp4'
    
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))
    
    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', (endTime - startTime).toString(),
      '-c', 'copy',
      outputName
    ])
    
    const data = await this.ffmpeg.readFile(outputName)
    return new Blob([data], { type: 'video/mp4' })
  }
  
  async applyVideoFilter(file: File, filter: string): Promise<Blob> {
    if (!this.isLoaded) await this.initialize()
    
    const inputName = `input.${file.name.split('.').pop()}`
    const outputName = 'output.mp4'
    
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))
    
    await this.ffmpeg.exec([
      '-i', inputName,
      '-vf', filter,
      '-c:a', 'copy',
      outputName
    ])
    
    const data = await this.ffmpeg.readFile(outputName)
    return new Blob([data], { type: 'video/mp4' })
  }
  
  async mergeVideos(files: File[]): Promise<Blob> {
    if (!this.isLoaded) await this.initialize()
    
    const inputFiles: string[] = []
    const filterInputs: string[] = []
    
    // Write all input files
    for (let i = 0; i < files.length; i++) {
      const inputName = `input${i}.${files[i].name.split('.').pop()}`
      await this.ffmpeg.writeFile(inputName, await fetchFile(files[i]))
      inputFiles.push('-i', inputName)
      filterInputs.push(`[${i}:v][${i}:a]`)
    }
    
    const outputName = 'merged.mp4'
    const filterComplex = `${filterInputs.join('')}concat=n=${files.length}:v=1:a=1[outv][outa]`
    
    await this.ffmpeg.exec([
      ...inputFiles,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[outa]',
      outputName
    ])
    
    const data = await this.ffmpeg.readFile(outputName)
    return new Blob([data], { type: 'video/mp4' })
  }
  
  async addAudioToVideo(videoFile: File, audioFile: File): Promise<Blob> {
    if (!this.isLoaded) await this.initialize()
    
    const videoName = `video.${videoFile.name.split('.').pop()}`
    const audioName = `audio.${audioFile.name.split('.').pop()}`
    const outputName = 'output.mp4'
    
    await this.ffmpeg.writeFile(videoName, await fetchFile(videoFile))
    await this.ffmpeg.writeFile(audioName, await fetchFile(audioFile))
    
    await this.ffmpeg.exec([
      '-i', videoName,
      '-i', audioName,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental',
      outputName
    ])
    
    const data = await this.ffmpeg.readFile(outputName)
    return new Blob([data], { type: 'video/mp4' })
  }
  
  async convertToFormat(file: File, format: string, quality: string = 'medium'): Promise<Blob> {
    if (!this.isLoaded) await this.initialize()
    
    const inputName = `input.${file.name.split('.').pop()}`
    const outputName = `output.${format}`
    
    await this.ffmpeg.writeFile(inputName, await fetchFile(file))
    
    const qualitySettings = {
      low: ['-crf', '28', '-preset', 'fast'],
      medium: ['-crf', '23', '-preset', 'medium'],
      high: ['-crf', '18', '-preset', 'slow'],
      ultra: ['-crf', '15', '-preset', 'veryslow']
    }
    
    await this.ffmpeg.exec([
      '-i', inputName,
      ...qualitySettings[quality as keyof typeof qualitySettings],
      outputName
    ])
    
    const data = await this.ffmpeg.readFile(outputName)
    const mimeType = format === 'mp4' ? 'video/mp4' : format === 'webm' ? 'video/webm' : 'video/quicktime'
    return new Blob([data], { type: mimeType })
  }
  
  cleanup() {
    // Clean up any temporary files
    this.ffmpeg.terminate()
  }
}

// Singleton instance
export const videoProcessor = new VideoProcessor()