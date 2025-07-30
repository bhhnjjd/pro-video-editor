import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { EditorState, VideoClip, AudioClip, TextClip, Track, ProjectSettings } from '../types/editor'

const defaultProjectSettings: ProjectSettings = {
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  aspectRatio: '16:9',
  backgroundColor: '#000000',
  audioSampleRate: 48000,
  audioBitRate: 192,
  videoBitRate: 5000,
  format: 'mp4'
}

const defaultState: EditorState = {
  project: {
    id: 'default-project',
    name: 'Untitled Project',
    settings: defaultProjectSettings,
    timeline: {
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
      zoom: 1,
      snapToGrid: true,
      gridSize: 1,
      tracks: [
        {
          id: 'video-track-1',
          type: 'video',
          name: 'Video Track 1',
          height: 80,
          muted: false,
          locked: false,
          visible: true,
          clips: []
        },
        {
          id: 'audio-track-1',
          type: 'audio',
          name: 'Audio Track 1',
          height: 60,
          muted: false,
          locked: false,
          visible: true,
          clips: []
        }
      ]
    },
    selectedClips: [],
    selectedTracks: [],
    clipboard: [],
    history: [],
    historyIndex: -1
  },
  ui: {
    activePanel: 'timeline',
    sidebarWidth: 300,
    timelineHeight: 200,
    previewSize: { width: 640, height: 360 },
    showGrid: true,
    showSafeZones: false,
    showRulers: true
  },
  playback: {
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    loop: false,
    volume: 1,
    muted: false
  },
  export: {
    isExporting: false,
    progress: 0,
    settings: {
      format: 'mp4',
      quality: 'high',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      videoBitRate: 5000,
      audioBitRate: 192,
      audioSampleRate: 48000
    }
  }
}

export const useEditorStore = create<EditorState & {
  // Timeline actions
  setCurrentTime: (time: number) => void
  play: () => void
  pause: () => void
  stop: () => void
  setPlaybackRate: (rate: number) => void
  setZoom: (zoom: number) => void
  
  // Clip actions
  addClip: (trackId: string, clip: VideoClip | AudioClip | TextClip) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<VideoClip | AudioClip | TextClip>) => void
  selectClip: (clipId: string, multiSelect?: boolean) => void
  clearSelection: () => void
  copyClips: () => void
  pasteClips: (trackId: string, time: number) => void
  
  // Track actions
  addTrack: (type: Track['type'], name?: string) => void
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<Track>) => void
  reorderTracks: (trackIds: string[]) => void
  
  // Project actions
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void
  newProject: () => void
  
  // History actions
  undo: () => void
  redo: () => void
  addToHistory: (action: { type: string; payload: any; description: string }) => void
  
  // UI actions
  setActivePanel: (panel: EditorState['ui']['activePanel']) => void
  setSidebarWidth: (width: number) => void
  setTimelineHeight: (height: number) => void
  toggleGrid: () => void
  toggleSafeZones: () => void
  toggleRulers: () => void
}>()(
  immer((set, get) => ({
    ...defaultState,
    
    // Timeline actions
    setCurrentTime: (time: number) => set(state => {
      state.playback.currentTime = Math.max(0, Math.min(time, state.project.timeline.duration))
      state.project.timeline.currentTime = state.playback.currentTime
    }),
    
    play: () => set(state => {
      state.playback.isPlaying = true
      state.project.timeline.isPlaying = true
    }),
    
    pause: () => set(state => {
      state.playback.isPlaying = false
      state.project.timeline.isPlaying = false
    }),
    
    stop: () => set(state => {
      state.playback.isPlaying = false
      state.playback.currentTime = 0
      state.project.timeline.isPlaying = false
      state.project.timeline.currentTime = 0
    }),
    
    setPlaybackRate: (rate: number) => set(state => {
      state.playback.playbackRate = rate
      state.project.timeline.playbackRate = rate
    }),
    
    setZoom: (zoom: number) => set(state => {
      state.project.timeline.zoom = Math.max(0.1, Math.min(zoom, 10))
    }),
    
    // Clip actions
    addClip: (trackId: string, clip: VideoClip | AudioClip | TextClip) => set(state => {
      const track = state.project.timeline.tracks.find(t => t.id === trackId)
      if (track) {
        track.clips.push(clip)
        const clipEnd = clip.startTime + (clip.endTime - clip.startTime)
        if (clipEnd > state.project.timeline.duration) {
          state.project.timeline.duration = clipEnd
        }
      }
    }),
    
    removeClip: (clipId: string) => set(state => {
      state.project.timeline.tracks.forEach(track => {
        track.clips = track.clips.filter(clip => clip.id !== clipId)
      })
      state.project.selectedClips = state.project.selectedClips.filter(id => id !== clipId)
    }),
    
    updateClip: (clipId: string, updates: Partial<VideoClip | AudioClip | TextClip>) => set(state => {
      state.project.timeline.tracks.forEach(track => {
        const clipIndex = track.clips.findIndex(clip => clip.id === clipId)
        if (clipIndex !== -1) {
          Object.assign(track.clips[clipIndex], updates)
        }
      })
    }),
    
    selectClip: (clipId: string, multiSelect = false) => set(state => {
      if (multiSelect) {
        if (!state.project.selectedClips.includes(clipId)) {
          state.project.selectedClips.push(clipId)
        }
      } else {
        state.project.selectedClips = [clipId]
      }
    }),
    
    clearSelection: () => set(state => {
      state.project.selectedClips = []
      state.project.selectedTracks = []
    }),
    
    copyClips: () => set(state => {
      const selectedClips = state.project.timeline.tracks
        .flatMap(track => track.clips)
        .filter(clip => state.project.selectedClips.includes(clip.id))
      state.project.clipboard = [...selectedClips]
    }),
    
    pasteClips: (trackId: string, time: number) => set(state => {
      const track = state.project.timeline.tracks.find(t => t.id === trackId)
      if (track && state.project.clipboard.length > 0) {
        state.project.clipboard.forEach(clip => {
          const newClip = {
            ...clip,
            id: `${clip.id}-copy-${Date.now()}`,
            startTime: time,
            endTime: time + (clip.endTime - clip.startTime)
          }
          track.clips.push(newClip)
        })
      }
    }),
    
    // Track actions
    addTrack: (type: Track['type'], name?: string) => set(state => {
      const trackCount = state.project.timeline.tracks.filter(t => t.type === type).length
      const newTrack: Track = {
        id: `${type}-track-${trackCount + 1}`,
        type,
        name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${trackCount + 1}`,
        height: type === 'video' ? 80 : 60,
        muted: false,
        locked: false,
        visible: true,
        clips: []
      }
      state.project.timeline.tracks.push(newTrack)
    }),
    
    removeTrack: (trackId: string) => set(state => {
      state.project.timeline.tracks = state.project.timeline.tracks.filter(t => t.id !== trackId)
      state.project.selectedTracks = state.project.selectedTracks.filter(id => id !== trackId)
    }),
    
    updateTrack: (trackId: string, updates: Partial<Track>) => set(state => {
      const trackIndex = state.project.timeline.tracks.findIndex(t => t.id === trackId)
      if (trackIndex !== -1) {
        Object.assign(state.project.timeline.tracks[trackIndex], updates)
      }
    }),
    
    reorderTracks: (trackIds: string[]) => set(state => {
      const reorderedTracks = trackIds
        .map(id => state.project.timeline.tracks.find(t => t.id === id))
        .filter(Boolean) as Track[]
      state.project.timeline.tracks = reorderedTracks
    }),
    
    // Project actions
    updateProjectSettings: (settings: Partial<ProjectSettings>) => set(state => {
      Object.assign(state.project.settings, settings)
    }),
    
    newProject: () => set(() => ({ ...defaultState })),
    
    // History actions
    undo: () => set(state => {
      if (state.project.historyIndex > 0) {
        state.project.historyIndex--
      }
    }),
    
    redo: () => set(state => {
      if (state.project.historyIndex < state.project.history.length - 1) {
        state.project.historyIndex++
      }
    }),
    
    addToHistory: (action: { type: string; payload: any; description: string }) => set(state => {
      const historyAction = {
        ...action,
        timestamp: Date.now()
      }
      state.project.history.splice(state.project.historyIndex + 1)
      state.project.history.push(historyAction)
      state.project.historyIndex = state.project.history.length - 1
    }),
    
    // UI actions
    setActivePanel: (panel: EditorState['ui']['activePanel']) => set(state => {
      state.ui.activePanel = panel
    }),
    
    setSidebarWidth: (width: number) => set(state => {
      state.ui.sidebarWidth = Math.max(200, Math.min(width, 600))
    }),
    
    setTimelineHeight: (height: number) => set(state => {
      state.ui.timelineHeight = Math.max(150, Math.min(height, 400))
    }),
    
    toggleGrid: () => set(state => {
      state.ui.showGrid = !state.ui.showGrid
    }),
    
    toggleSafeZones: () => set(state => {
      state.ui.showSafeZones = !state.ui.showSafeZones
    }),
    
    toggleRulers: () => set(state => {
      state.ui.showRulers = !state.ui.showRulers
    })
  }))
)