export interface VideoClip {
  id: string
  name: string
  file: File
  duration: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  opacity: number
  volume: number
  track: number
  type: 'video' | 'audio' | 'image' | 'text'
  effects: Effect[]
  transitions: Transition[]
  thumbnail?: string
}

export interface AudioClip {
  id: string
  name: string
  file: File
  duration: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  volume: number
  track: number
  waveform?: number[]
  effects: AudioEffect[]
}

export interface TextClip {
  id: string
  text: string
  startTime: number
  endTime: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor?: string
  borderColor?: string
  borderWidth: number
  rotation: number
  opacity: number
  track: number
  effects: Effect[]
  animations: Animation[]
}

export interface Effect {
  id: string
  type: 'blur' | 'brightness' | 'contrast' | 'saturation' | 'hue' | 'sepia' | 'grayscale' | 'invert'
  intensity: number
  enabled: boolean
}

export interface AudioEffect {
  id: string
  type: 'lowpass' | 'highpass' | 'reverb' | 'echo' | 'compress' | 'normalize'
  parameters: Record<string, number>
  enabled: boolean
}

export interface Transition {
  id: string
  type: 'fade' | 'slide' | 'wipe' | 'dissolve' | 'zoom'
  duration: number
  direction?: 'left' | 'right' | 'up' | 'down'
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface Animation {
  id: string
  type: 'fade-in' | 'fade-out' | 'slide-in' | 'slide-out' | 'zoom-in' | 'zoom-out' | 'rotate'
  duration: number
  delay: number
  easing: string
  keyframes: Keyframe[]
}

export interface Keyframe {
  time: number
  properties: Record<string, any>
}

export interface Timeline {
  duration: number
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  zoom: number
  snapToGrid: boolean
  gridSize: number
  tracks: Track[]
}

export interface Track {
  id: string
  type: 'video' | 'audio' | 'text'
  name: string
  height: number
  muted: boolean
  locked: boolean
  visible: boolean
  clips: (VideoClip | AudioClip | TextClip)[]
}

export interface ProjectSettings {
  resolution: { width: number; height: number }
  frameRate: number
  aspectRatio: string
  backgroundColor: string
  audioSampleRate: number
  audioBitRate: number
  videoBitRate: number
  format: 'mp4' | 'webm' | 'mov' | 'avi'
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov' | 'avi' | 'gif'
  quality: 'low' | 'medium' | 'high' | 'ultra'
  resolution: { width: number; height: number }
  frameRate: number
  videoBitRate: number
  audioBitRate: number
  audioSampleRate: number
  startTime?: number
  endTime?: number
}

export interface EditorState {
  project: {
    id: string
    name: string
    settings: ProjectSettings
    timeline: Timeline
    selectedClips: string[]
    selectedTracks: string[]
    clipboard: (VideoClip | AudioClip | TextClip)[]
    history: EditorAction[]
    historyIndex: number
  }
  ui: {
    activePanel: 'timeline' | 'preview' | 'properties' | 'effects'
    sidebarWidth: number
    timelineHeight: number
    previewSize: { width: number; height: number }
    showGrid: boolean
    showSafeZones: boolean
    showRulers: boolean
  }
  playback: {
    isPlaying: boolean
    currentTime: number
    playbackRate: number
    loop: boolean
    volume: number
    muted: boolean
  }
  export: {
    isExporting: boolean
    progress: number
    settings: ExportSettings
  }
}

export interface EditorAction {
  type: string
  payload: any
  timestamp: number
  description: string
}