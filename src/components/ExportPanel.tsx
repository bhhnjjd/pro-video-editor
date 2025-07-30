'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Settings, Play, X, Check, AlertCircle } from 'lucide-react'
import { useEditorStore } from '../store/editorStore'
import { ExportSettings } from '../types/editor'
import { videoProcessor } from '../utils/videoProcessor'
import { webCodecsProcessor } from '../utils/webCodecsProcessor'
import { audioProcessor } from '../utils/audioProcessor'

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
}

const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose }) => {
  const { project, export: exportState } = useEditorStore()
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'high',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    videoBitRate: 5000,
    audioBitRate: 192,
    audioSampleRate: 48000
  })
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle')
  const [exportError, setExportError] = useState<string>('')
  
  const handleExport = async () => {
    try {
      setIsExporting(true)
      setExportStatus('processing')
      setExportProgress(0)
      setExportError('')
      
      await processTimelineExport()
      
      setExportStatus('completed')
      setExportProgress(100)
    } catch (error) {
      console.error('Export failed:', error)
      setExportStatus('error')
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }
  
  const processTimelineExport = async () => {
    // Initialize processors
    await videoProcessor.initialize()
    await audioProcessor.initialize()
    
    // Setup progress tracking
    videoProcessor.onProgress((progress) => {
      setExportProgress(Math.min(progress * 0.8, 80)) // Video processing is 80% of total
    })
    
    // Collect all clips from timeline
    const videoClips = project.timeline.tracks
      .filter(track => track.type === 'video' && track.visible)
      .flatMap(track => track.clips)
      .filter(clip => 'file' in clip)
      .sort((a, b) => a.startTime - b.startTime)
    
    const audioClips = project.timeline.tracks
      .filter(track => track.type === 'audio' && !track.muted)
      .flatMap(track => track.clips)
      .filter(clip => 'file' in clip)
      .sort((a, b) => a.startTime - b.startTime)
    
    if (videoClips.length === 0 && audioClips.length === 0) {
      throw new Error('No clips to export')
    }
    
    // Process video if available
    let finalVideoBlob: Blob | null = null
    if (videoClips.length > 0) {
      finalVideoBlob = await processVideoClips(videoClips as any[])
      setExportProgress(80)
    }
    
    // Process audio if available
    let finalAudioBlob: Blob | null = null
    if (audioClips.length > 0) {
      finalAudioBlob = await processAudioClips(audioClips as any[])
      setExportProgress(90)
    }
    
    // Combine video and audio if both exist
    let finalBlob: Blob
    if (finalVideoBlob && finalAudioBlob) {
      // Convert blobs to files for FFmpeg processing
      const videoFile = new File([finalVideoBlob], 'video.mp4', { type: 'video/mp4' })
      const audioFile = new File([finalAudioBlob], 'audio.wav', { type: 'audio/wav' })
      
      finalBlob = await videoProcessor.addAudioToVideo(videoFile, audioFile)
    } else if (finalVideoBlob) {
      finalBlob = finalVideoBlob
    } else if (finalAudioBlob) {
      finalBlob = finalAudioBlob
    } else {
      throw new Error('No valid output generated')
    }
    
    // Convert to desired format if needed
    if (exportSettings.format !== 'mp4' || exportSettings.quality !== 'high') {
      const tempFile = new File([finalBlob], 'temp.mp4', { type: 'video/mp4' })
      finalBlob = await videoProcessor.convertToFormat(tempFile, exportSettings.format, exportSettings.quality)
    }
    
    setExportProgress(95)
    
    // Download the final file
    downloadBlob(finalBlob, `${project.name}.${exportSettings.format}`)
    
    setExportProgress(100)
  }
  
  const processVideoClips = async (clips: any[]): Promise<Blob> => {
    const processedFiles: File[] = []
    
    for (const clip of clips) {
      let processedBlob = new Blob([await clip.file.arrayBuffer()], { type: clip.file.type })
      
      // Apply trimming if needed
      if (clip.trimStart > 0 || clip.trimEnd < clip.duration) {
        const trimmedBlob = await videoProcessor.trimVideo(
          new File([processedBlob], clip.file.name, { type: clip.file.type }),
          clip.trimStart,
          clip.trimEnd
        )
        processedBlob = trimmedBlob
      }
      
      // Apply effects
      if (clip.effects && clip.effects.length > 0) {
        for (const effect of clip.effects) {
          if (!effect.enabled) continue
          
          const filterString = getFFmpegFilterString(effect)
          if (filterString) {
            const effectBlob = await videoProcessor.applyVideoFilter(
              new File([processedBlob], clip.file.name, { type: clip.file.type }),
              filterString
            )
            processedBlob = effectBlob
          }
        }
      }
      
      processedFiles.push(new File([processedBlob], clip.file.name, { type: clip.file.type }))
    }
    
    // Merge all video clips
    if (processedFiles.length > 1) {
      return await videoProcessor.mergeVideos(processedFiles)
    } else {
      return new Blob([await processedFiles[0].arrayBuffer()], { type: processedFiles[0].type })
    }
  }
  
  const processAudioClips = async (clips: any[]): Promise<Blob> => {
    const audioBuffers: { buffer: AudioBuffer; startTime: number; volume: number }[] = []
    
    for (const clip of clips) {
      let audioBuffer = await audioProcessor.loadAudioFile(clip.file)
      
      // Apply trimming
      if (clip.trimStart > 0 || clip.trimEnd < clip.duration) {
        audioBuffer = await audioProcessor.trimAudio(audioBuffer, clip.trimStart, clip.trimEnd)
      }
      
      // Apply volume
      if (clip.volume !== 1) {
        audioBuffer = await audioProcessor.changeVolume(audioBuffer, clip.volume)
      }
      
      // Apply effects
      if (clip.effects) {
        for (const effect of clip.effects) {
          if (!effect.enabled) continue
          
          switch (effect.type) {
            case 'normalize':
              audioBuffer = await audioProcessor.normalizeAudio(audioBuffer)
              break
            case 'lowpass':
              audioBuffer = await audioProcessor.applyLowPassFilter(audioBuffer, effect.parameters?.frequency || 1000)
              break
            case 'highpass':
              audioBuffer = await audioProcessor.applyHighPassFilter(audioBuffer, effect.parameters?.frequency || 100)
              break
            case 'reverb':
              audioBuffer = await audioProcessor.applyReverb(audioBuffer, effect.parameters?.time || 2)
              break
          }
        }
      }
      
      audioBuffers.push({
        buffer: audioBuffer,
        startTime: clip.startTime,
        volume: clip.volume || 1
      })
    }
    
    // Mix all audio clips
    const mixedBuffer = await audioProcessor.mixAudioBuffers(audioBuffers)
    return await audioProcessor.exportToWav(mixedBuffer)
  }
  
  const getFFmpegFilterString = (effect: any): string => {
    switch (effect.type) {
      case 'brightness':
        return `eq=brightness=${(effect.intensity - 50) / 100}`
      case 'contrast':
        return `eq=contrast=${1 + (effect.intensity - 50) / 100}`
      case 'saturation':
        return `eq=saturation=${1 + (effect.intensity - 50) / 100}`
      case 'hue':
        return `hue=h=${effect.intensity * 3.6}` // Convert to degrees
      case 'blur':
        return `boxblur=${effect.intensity / 10}`
      case 'grayscale':
        return 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3'
      case 'sepia':
        return 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'
      case 'invert':
        return 'negate'
      default:
        return ''
    }
  }
  
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const updateExportSettings = (updates: Partial<ExportSettings>) => {
    setExportSettings(prev => ({ ...prev, ...updates }))
  }
  
  const presetConfigs = {
    '4K Ultra': { width: 3840, height: 2160, videoBitRate: 15000, quality: 'ultra' as const },
    '1080p High': { width: 1920, height: 1080, videoBitRate: 8000, quality: 'high' as const },
    '720p Medium': { width: 1280, height: 720, videoBitRate: 5000, quality: 'medium' as const },
    '480p Low': { width: 854, height: 480, videoBitRate: 2500, quality: 'low' as const },
    'Web Optimized': { width: 1920, height: 1080, videoBitRate: 3000, quality: 'medium' as const }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-panel-bg border border-border rounded-lg shadow-2xl w-full max-w-2xl mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Export Video</h2>
                <p className="text-text-secondary text-sm mt-1">
                  Configure export settings and render your project
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* Quick Presets */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-primary mb-3">Quick Presets</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(presetConfigs).map(([name, config]) => (
                    <button
                      key={name}
                      onClick={() => updateExportSettings({ 
                        resolution: { width: config.width, height: config.height },
                        videoBitRate: config.videoBitRate,
                        quality: config.quality
                      })}
                      className="p-3 text-left bg-timeline-bg hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-sm text-text-primary">{name}</div>
                      <div className="text-xs text-text-secondary">
                        {config.width}×{config.height}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Export Settings */}
              <div className="space-y-6">
                {/* Format & Quality */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Format</label>
                    <select
                      value={exportSettings.format}
                      onChange={(e) => updateExportSettings({ format: e.target.value as any })}
                      className="w-full bg-timeline-bg border border-border rounded-lg px-3 py-2 text-text-primary"
                    >
                      <option value="mp4">MP4 (H.264)</option>
                      <option value="webm">WebM (VP8)</option>
                      <option value="mov">MOV (QuickTime)</option>
                      <option value="avi">AVI</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Quality</label>
                    <select
                      value={exportSettings.quality}
                      onChange={(e) => updateExportSettings({ quality: e.target.value as any })}
                      className="w-full bg-timeline-bg border border-border rounded-lg px-3 py-2 text-text-primary"
                    >
                      <option value="ultra">Ultra (Highest quality)</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low (Smallest size)</option>
                    </select>
                  </div>
                </div>
                
                {/* Resolution */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Resolution</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        placeholder="Width"
                        value={exportSettings.resolution.width}
                        onChange={(e) => updateExportSettings({
                          resolution: { ...exportSettings.resolution, width: parseInt(e.target.value) }
                        })}
                        className="w-full bg-timeline-bg border border-border rounded-lg px-3 py-2 text-text-primary"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Height"
                        value={exportSettings.resolution.height}
                        onChange={(e) => updateExportSettings({
                          resolution: { ...exportSettings.resolution, height: parseInt(e.target.value) }
                        })}
                        className="w-full bg-timeline-bg border border-border rounded-lg px-3 py-2 text-text-primary"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Advanced Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Frame Rate</label>
                    <select
                      value={exportSettings.frameRate}
                      onChange={(e) => updateExportSettings({ frameRate: parseInt(e.target.value) })}
                      className="w-full bg-timeline-bg border border-border rounded-lg px-3 py-2 text-text-primary"
                    >
                      <option value="24">24 fps</option>
                      <option value="30">30 fps</option>
                      <option value="60">60 fps</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Video Bitrate (kbps)
                    </label>
                    <input
                      type="number"
                      value={exportSettings.videoBitRate}
                      onChange={(e) => updateExportSettings({ videoBitRate: parseInt(e.target.value) })}
                      className="w-full bg-timeline-bg border border-border rounded-lg px-3 py-2 text-text-primary"
                    />
                  </div>
                </div>
                
                {/* Export Progress */}
                {isExporting && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">
                        {exportStatus === 'processing' ? 'Exporting...' : 
                         exportStatus === 'completed' ? 'Export Complete!' :
                         exportStatus === 'error' ? 'Export Failed' : 'Preparing...'}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {Math.round(exportProgress)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-timeline-bg rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${exportProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    
                    {exportStatus === 'error' && exportError && (
                      <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        <span>{exportError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-border">
              <div className="text-sm text-text-secondary">
                Timeline duration: {Math.round(project.timeline.duration)}s
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="button-secondary"
                  disabled={isExporting}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleExport}
                  disabled={isExporting || exportStatus === 'completed'}
                  className="button-primary flex items-center space-x-2"
                >
                  {exportStatus === 'completed' ? (
                    <>
                      <Check size={16} />
                      <span>Exported</span>
                    </>
                  ) : isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Export</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ExportPanel