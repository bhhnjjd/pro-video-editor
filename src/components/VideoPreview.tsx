'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Maximize2, Play, Pause, RotateCcw, ZoomIn, ZoomOut, Grid, Eye } from 'lucide-react'
import { useEditorStore } from '../store/editorStore'
import { VideoClip, AudioClip, TextClip } from '../types/editor'

interface VideoPreviewProps {
  className?: string
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const {
    project,
    playback,
    ui,
    play,
    pause,
    toggleGrid,
    toggleSafeZones
  } = useEditorStore()
  
  const { resolution } = project.settings
  const canvasAspectRatio = resolution.width / resolution.height
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (!container) return
      
      const containerWidth = container.clientWidth - 32 // padding
      const containerHeight = container.clientHeight - 100 // controls height
      
      let scale = Math.min(
        containerWidth / resolution.width,
        containerHeight / resolution.height
      )
      
      scale = Math.min(scale * previewScale, 2) // Max 2x zoom
      
      canvas.style.width = `${resolution.width * scale}px`
      canvas.style.height = `${resolution.height * scale}px`
      canvas.width = resolution.width
      canvas.height = resolution.height
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [resolution, previewScale])
  
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas with background color
    ctx.fillStyle = project.settings.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Render clips in order
    const currentTime = playback.currentTime
    const visibleClips = project.timeline.tracks
      .filter(track => track.visible)
      .flatMap(track => track.clips)
      .filter(clip => 
        clip.startTime <= currentTime && 
        clip.endTime > currentTime
      )
      .sort((a, b) => a.startTime - b.startTime)
    
    visibleClips.forEach(clip => {
      renderClip(ctx, clip, currentTime)
    })
    
    // Render grid if enabled
    if (ui.showGrid) {
      renderGrid(ctx, canvas.width, canvas.height)
    }
    
    // Render safe zones if enabled
    if (ui.showSafeZones) {
      renderSafeZones(ctx, canvas.width, canvas.height)
    }
  }, [project, playback.currentTime, ui.showGrid, ui.showSafeZones])
  
  const renderClip = (ctx: CanvasRenderingContext2D, clip: VideoClip | AudioClip | TextClip, currentTime: number) => {
    const clipProgress = (currentTime - clip.startTime) / (clip.endTime - clip.startTime)
    
    ctx.save()
    
    // Apply clip transformations
    if ('position' in clip && 'size' in clip) {
      const { position, size, rotation, opacity } = clip
      
      ctx.globalAlpha = opacity
      ctx.translate(position.x + size.width / 2, position.y + size.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-size.width / 2, -size.height / 2)
      
      if (clip.type === 'video') {
        // Render video frame (placeholder for now)
        ctx.fillStyle = '#4a90e2'
        ctx.fillRect(0, 0, size.width, size.height)
        
        // Render thumbnail if available
        if ('thumbnail' in clip && clip.thumbnail) {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size.width, size.height)
          }
          img.src = clip.thumbnail
        }
      } else if (clip.type === 'text') {
        const textClip = clip as TextClip
        ctx.fillStyle = textClip.color
        ctx.font = `${textClip.fontSize}px ${textClip.fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Background
        if (textClip.backgroundColor) {
          ctx.fillStyle = textClip.backgroundColor
          ctx.fillRect(0, 0, size.width, size.height)
        }
        
        // Border
        if (textClip.borderColor && textClip.borderWidth > 0) {
          ctx.strokeStyle = textClip.borderColor
          ctx.lineWidth = textClip.borderWidth
          ctx.strokeRect(0, 0, size.width, size.height)
        }
        
        // Text
        ctx.fillStyle = textClip.color
        ctx.fillText(textClip.text, size.width / 2, size.height / 2)
      }
    }
    
    ctx.restore()
  }
  
  const renderGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    const gridSize = 50
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    ctx.restore()
  }
  
  const renderSafeZones = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    // Action safe (90%)
    const actionSafeMargin = 0.05
    const actionSafeX = width * actionSafeMargin
    const actionSafeY = height * actionSafeMargin
    const actionSafeWidth = width * (1 - 2 * actionSafeMargin)
    const actionSafeHeight = height * (1 - 2 * actionSafeMargin)
    
    ctx.strokeRect(actionSafeX, actionSafeY, actionSafeWidth, actionSafeHeight)
    
    // Title safe (80%)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    const titleSafeMargin = 0.1
    const titleSafeX = width * titleSafeMargin
    const titleSafeY = height * titleSafeMargin
    const titleSafeWidth = width * (1 - 2 * titleSafeMargin)
    const titleSafeHeight = height * (1 - 2 * titleSafeMargin)
    
    ctx.strokeRect(titleSafeX, titleSafeY, titleSafeWidth, titleSafeHeight)
    
    ctx.restore()
  }
  
  useEffect(() => {
    renderFrame()
  }, [renderFrame])
  
  // Animation loop for playback
  useEffect(() => {
    if (!playback.isPlaying) return
    
    let animationId: number
    const animate = () => {
      renderFrame()
      animationId = requestAnimationFrame(animate)
    }
    
    animationId = requestAnimationFrame(animate)
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [playback.isPlaying, renderFrame])
  
  const handleFullscreen = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    if (!isFullscreen && canvas.requestFullscreen) {
      canvas.requestFullscreen()
      setIsFullscreen(true)
    }
  }
  
  const resetView = () => {
    setPreviewScale(1)
  }
  
  const zoomIn = () => {
    setPreviewScale(prev => Math.min(prev * 1.2, 3))
  }
  
  const zoomOut = () => {
    setPreviewScale(prev => Math.max(prev / 1.2, 0.1))
  }
  
  return (
    <div className={`bg-editor-bg flex flex-col ${className}`}>
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-4 bg-panel-bg border-b border-border">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => playback.isPlaying ? pause() : play()}
            className="button-primary flex items-center space-x-2"
          >
            {playback.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{playback.isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          
          <div className="text-text-secondary text-sm">
            {Math.round(previewScale * 100)}%
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="button-secondary p-2"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          
          <button
            onClick={resetView}
            className="button-secondary p-2"
            title="Reset View"
          >
            <RotateCcw size={16} />
          </button>
          
          <button
            onClick={zoomIn}
            className="button-secondary p-2"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <button
            onClick={toggleGrid}
            className={`button-secondary p-2 ${ui.showGrid ? 'bg-accent text-white' : ''}`}
            title="Toggle Grid"
          >
            <Grid size={16} />
          </button>
          
          <button
            onClick={toggleSafeZones}
            className={`button-secondary p-2 ${ui.showSafeZones ? 'bg-accent text-white' : ''}`}
            title="Toggle Safe Zones"
          >
            <Eye size={16} />
          </button>
          
          <button
            onClick={handleFullscreen}
            className="button-secondary p-2"
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border border-border shadow-2xl"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              imageRendering: 'pixelated'
            }}
          />
          
          {/* Playback Overlay */}
          {!playback.isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <button
                onClick={play}
                className="w-16 h-16 rounded-full bg-accent/80 hover:bg-accent flex items-center justify-center transition-colors"
              >
                <Play size={24} className="ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Info */}
      <div className="p-2 bg-panel-bg border-t border-border">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            {resolution.width} × {resolution.height} • {project.settings.frameRate}fps
          </span>
          <span>
            {project.settings.aspectRatio} • {project.settings.format.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default VideoPreview