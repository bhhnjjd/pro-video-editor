'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { motion } from 'framer-motion'
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Settings } from 'lucide-react'
import { useEditorStore } from '../store/editorStore'
import { VideoClip, AudioClip, TextClip } from '../types/editor'

interface TimelineProps {
  className?: string
}

const Timeline: React.FC<TimelineProps> = ({ className = '' }) => {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState(0)
  
  const {
    project,
    playback,
    ui,
    setCurrentTime,
    play,
    pause,
    stop,
    setZoom,
    addTrack,
    selectClip,
    clearSelection
  } = useEditorStore()
  
  const pixelsPerSecond = 50 * project.timeline.zoom
  const timelineWidth = project.timeline.duration * pixelsPerSecond
  
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = x / pixelsPerSecond
    setCurrentTime(Math.max(0, Math.min(time, project.timeline.duration)))
  }, [pixelsPerSecond, project.timeline.duration, setCurrentTime])
  
  const handlePlayheadDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return
      
      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const time = Math.max(0, Math.min(x / pixelsPerSecond, project.timeline.duration))
      setDragPosition(x)
      setCurrentTime(time)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [pixelsPerSecond, project.timeline.duration, setCurrentTime])
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 30)
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }
  
  return (
    <div className={`bg-timeline-bg border-t border-border ${className}`}>
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-4 bg-panel-bg border-b border-border">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => playback.isPlaying ? pause() : play()}
            className="button-primary"
          >
            {playback.isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={stop} className="button-secondary">
            <Square size={16} />
          </button>
          <button className="button-secondary">
            <SkipBack size={16} />
          </button>
          <button className="button-secondary">
            <SkipForward size={16} />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-text-secondary font-mono text-sm">
            {formatTime(playback.currentTime)} / {formatTime(project.timeline.duration)}
          </span>
          
          <div className="flex items-center space-x-2">
            <Volume2 size={16} className="text-text-secondary" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playback.volume}
              className="w-20"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-text-secondary text-sm">Zoom:</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={project.timeline.zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
        </div>
      </div>
      
      {/* Timeline Container */}
      <div className="flex h-full">
        {/* Track Headers */}
        <div className="w-48 bg-panel-bg border-r border-border">
          <div className="h-10 border-b border-border flex items-center px-4">
            <span className="text-text-secondary text-sm font-medium">Tracks</span>
          </div>
          
          {project.timeline.tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              height={track.height}
            />
          ))}
          
          <div className="p-2">
            <button
              onClick={() => addTrack('video')}
              className="w-full button-secondary text-sm"
            >
              + Video Track
            </button>
            <button
              onClick={() => addTrack('audio')}
              className="w-full button-secondary text-sm mt-1"
            >
              + Audio Track
            </button>
          </div>
        </div>
        
        {/* Timeline Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Time Ruler */}
          <TimeRuler
            duration={project.timeline.duration}
            zoom={project.timeline.zoom}
            pixelsPerSecond={pixelsPerSecond}
          />
          
          {/* Timeline Content */}
          <div
            ref={timelineRef}
            className="relative h-full overflow-auto scrollbar-thin"
            style={{ width: Math.max(timelineWidth, '100%') }}
            onClick={handleTimelineClick}
          >
            {/* Grid Lines */}
            {ui.showGrid && (
              <GridLines
                duration={project.timeline.duration}
                pixelsPerSecond={pixelsPerSecond}
                gridSize={project.timeline.gridSize}
              />
            )}
            
            {/* Tracks */}
            {project.timeline.tracks.map((track, index) => (
              <TimelineTrack
                key={track.id}
                track={track}
                index={index}
                pixelsPerSecond={pixelsPerSecond}
                onClipSelect={selectClip}
              />
            ))}
            
            {/* Playhead */}
            <Playhead
              currentTime={playback.currentTime}
              pixelsPerSecond={pixelsPerSecond}
              onDrag={handlePlayheadDrag}
              isDragging={isDragging}
              dragPosition={dragPosition}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface TrackHeaderProps {
  track: any
  height: number
}

const TrackHeader: React.FC<TrackHeaderProps> = ({ track, height }) => {
  const { updateTrack } = useEditorStore()
  
  return (
    <div
      className="border-b border-border flex items-center px-4 bg-panel-bg"
      style={{ height }}
    >
      <div className="flex items-center space-x-2 flex-1">
        <div className={`w-3 h-3 rounded-full ${
          track.type === 'video' ? 'bg-blue-500' : 
          track.type === 'audio' ? 'bg-green-500' : 'bg-purple-500'
        }`} />
        <span className="text-text-primary text-sm font-medium truncate">
          {track.name}
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => updateTrack(track.id, { visible: !track.visible })}
          className={`p-1 rounded ${track.visible ? 'text-text-primary' : 'text-text-secondary'}`}
        >
          👁
        </button>
        <button
          onClick={() => updateTrack(track.id, { muted: !track.muted })}
          className={`p-1 rounded ${track.muted ? 'text-red-500' : 'text-text-primary'}`}
        >
          🔊
        </button>
        <button
          onClick={() => updateTrack(track.id, { locked: !track.locked })}
          className={`p-1 rounded ${track.locked ? 'text-yellow-500' : 'text-text-secondary'}`}
        >
          🔒
        </button>
      </div>
    </div>
  )
}

interface TimeRulerProps {
  duration: number
  zoom: number
  pixelsPerSecond: number
}

const TimeRuler: React.FC<TimeRulerProps> = ({ duration, pixelsPerSecond }) => {
  const marks = Math.floor(duration)
  
  return (
    <div className="h-10 bg-panel-bg border-b border-border relative overflow-hidden">
      {Array.from({ length: marks + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 h-full border-l border-border/50"
          style={{ left: i * pixelsPerSecond }}
        >
          <span className="absolute top-1 left-1 text-xs text-text-secondary">
            {i}s
          </span>
        </div>
      ))}
    </div>
  )
}

interface GridLinesProps {
  duration: number
  pixelsPerSecond: number
  gridSize: number
}

const GridLines: React.FC<GridLinesProps> = ({ duration, pixelsPerSecond, gridSize }) => {
  const lines = Math.floor(duration / gridSize)
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: lines + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-white/5"
          style={{ left: i * gridSize * pixelsPerSecond }}
        />
      ))}
    </div>
  )
}

interface TimelineTrackProps {
  track: any
  index: number
  pixelsPerSecond: number
  onClipSelect: (clipId: string, multiSelect?: boolean) => void
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({ 
  track, 
  index, 
  pixelsPerSecond, 
  onClipSelect 
}) => {
  const [, drop] = useDrop({
    accept: 'MEDIA_FILE',
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset()
      if (offset) {
        // Handle drop logic here
        console.log('Dropped on track:', track.id, 'at position:', offset)
      }
    }
  })
  
  return (
    <div
      ref={drop}
      className="border-b border-border relative"
      style={{ height: track.height }}
    >
      {track.clips.map((clip: VideoClip | AudioClip | TextClip) => (
        <TimelineClip
          key={clip.id}
          clip={clip}
          pixelsPerSecond={pixelsPerSecond}
          onSelect={onClipSelect}
        />
      ))}
    </div>
  )
}

interface TimelineClipProps {
  clip: VideoClip | AudioClip | TextClip
  pixelsPerSecond: number
  onSelect: (clipId: string, multiSelect?: boolean) => void
}

const TimelineClip: React.FC<TimelineClipProps> = ({ clip, pixelsPerSecond, onSelect }) => {
  const { project, updateClip } = useEditorStore()
  const [isDragging, setIsDragging] = useState(false)
  
  const [{ isDragging: dragState }, drag] = useDrag({
    type: 'TIMELINE_CLIP',
    item: { id: clip.id, type: 'clip' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })
  
  const clipWidth = (clip.endTime - clip.startTime) * pixelsPerSecond
  const clipLeft = clip.startTime * pixelsPerSecond
  const isSelected = project.selectedClips.includes(clip.id)
  
  const getClipStyle = () => {
    const baseStyle = {
      left: clipLeft,
      width: clipWidth,
      top: 4,
      bottom: 4
    }
    
    if (clip.type === 'video') {
      return { ...baseStyle, backgroundColor: '#4a90e2' }
    } else if (clip.type === 'audio') {
      return { ...baseStyle, backgroundColor: '#7b68ee' }
    } else {
      return { ...baseStyle, backgroundColor: '#ff6b35' }
    }
  }
  
  const handleClipClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(clip.id, e.ctrlKey || e.metaKey)
  }
  
  const handleResizeStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation()
    setIsDragging(true)
    
    const startX = e.clientX
    const startTime = clip.startTime
    const endTime = clip.endTime
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaTime = deltaX / pixelsPerSecond
      
      if (side === 'left') {
        const newStartTime = Math.max(0, startTime + deltaTime)
        if (newStartTime < endTime) {
          updateClip(clip.id, { startTime: newStartTime })
        }
      } else {
        const newEndTime = Math.max(startTime, endTime + deltaTime)
        updateClip(clip.id, { endTime: newEndTime })
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  return (
    <motion.div
      ref={drag}
      className={`timeline-clip absolute ${isSelected ? 'selected' : ''}`}
      style={getClipStyle()}
      onClick={handleClipClick}
      whileHover={{ y: -1 }}
      whileDrag={{ scale: 1.02, zIndex: 1000 }}
    >
      {/* Resize Handles */}
      <div
        className="drag-handle absolute left-0 top-0 bottom-0"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      <div
        className="drag-handle absolute right-0 top-0 bottom-0"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      
      {/* Clip Content */}
      <div className="px-2 py-1 h-full flex items-center">
        {'thumbnail' in clip && clip.thumbnail && (
          <img
            src={clip.thumbnail}
            alt="Thumbnail"
            className="w-8 h-6 rounded mr-2 object-cover"
          />
        )}
        <span className="text-white text-xs font-medium truncate">
          {clip.name || `${clip.type} clip`}
        </span>
      </div>
      
      {/* Waveform for audio clips */}
      {'waveform' in clip && clip.waveform && (
        <div className="absolute inset-x-0 bottom-0 h-4 opacity-50">
          {/* Render waveform visualization */}
        </div>
      )}
    </motion.div>
  )
}

interface PlayheadProps {
  currentTime: number
  pixelsPerSecond: number
  onDrag: (e: React.MouseEvent) => void
  isDragging: boolean
  dragPosition: number
}

const Playhead: React.FC<PlayheadProps> = ({ 
  currentTime, 
  pixelsPerSecond, 
  onDrag, 
  isDragging,
  dragPosition 
}) => {
  const left = isDragging ? dragPosition : currentTime * pixelsPerSecond
  
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-50"
      style={{ left }}
    >
      <div
        className="w-0.5 h-full bg-accent shadow-lg pointer-events-auto cursor-ew-resize"
        onMouseDown={onDrag}
      />
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-accent rounded-full shadow-lg pointer-events-auto cursor-ew-resize"
           onMouseDown={onDrag} />
    </div>
  )
}

export default Timeline