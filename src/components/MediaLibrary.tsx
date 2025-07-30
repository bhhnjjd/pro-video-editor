'use client'

import React, { useCallback, useState, useRef } from 'react'
import { useDrop } from 'react-dnd'
import { Upload, Video, Music, Type, Image as ImageIcon, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditorStore } from '../store/editorStore'
import { VideoClip, AudioClip } from '../types/editor'
import { videoProcessor } from '../utils/videoProcessor'

interface MediaLibraryProps {
  className?: string
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ className = '' }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  
  const { addClip } = useEditorStore()
  
  const [{ isOver }, drop] = useDrop({
    accept: ['__NATIVE_FILE__'],
    drop: (item: any, monitor) => {
      const files = monitor.getItem().files
      if (files) {
        handleFileUpload(Array.from(files))
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })
  
  const handleFileUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/')) {
        try {
          // Generate thumbnail and extract metadata
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
          
          if (file.type.startsWith('video/')) {
            // Initialize video processor if needed
            if (!videoProcessor['isLoaded']) {
              await videoProcessor.initialize()
            }
            
            // Generate thumbnail
            const thumbnail = await videoProcessor.generateThumbnail(file)
            
            // Extract video info (simplified)
            const videoInfo = await videoProcessor.extractVideoInfo(file)
            
            const videoClip: VideoClip = {
              id: `video-${Date.now()}-${Math.random()}`,
              name: file.name,
              file,
              duration: videoInfo.duration,
              startTime: 0,
              endTime: videoInfo.duration,
              trimStart: 0,
              trimEnd: videoInfo.duration,
              position: { x: 0, y: 0 },
              size: { width: videoInfo.width, height: videoInfo.height },
              rotation: 0,
              opacity: 1,
              volume: 1,
              track: 0,
              type: 'video',
              effects: [],
              transitions: [],
              thumbnail
            }
            
            setMediaFiles(prev => [...prev, file])
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
          } else if (file.type.startsWith('audio/')) {
            const audioClip: AudioClip = {
              id: `audio-${Date.now()}-${Math.random()}`,
              name: file.name,
              file,
              duration: 10, // TODO: Extract actual duration
              startTime: 0,
              endTime: 10,
              trimStart: 0,
              trimEnd: 10,
              volume: 1,
              track: 1,
              effects: [],
              type: 'audio'
            }
            
            setMediaFiles(prev => [...prev, file])
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
          }
        } catch (error) {
          console.error('Error processing file:', error)
          setUploadProgress(prev => ({ ...prev, [file.name]: -1 })) // Error state
        }
      }
    }
  }, [])
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFileUpload(Array.from(files))
    }
  }
  
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return <Video size={20} />
    if (file.type.startsWith('audio/')) return <Music size={20} />
    if (file.type.startsWith('image/')) return <ImageIcon size={20} />
    return <FileText size={20} />
  }
  
  const getFileColor = (file: File) => {
    if (file.type.startsWith('video/')) return 'text-blue-400'
    if (file.type.startsWith('audio/')) return 'text-green-400'
    if (file.type.startsWith('image/')) return 'text-purple-400'
    return 'text-gray-400'
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const dropRef = useRef<HTMLDivElement>(null)
  drop(dropRef)

  return (
    <div className={`bg-panel-bg border-r border-border flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Media Library</h3>
        <p className="text-sm text-text-secondary mt-1">
          Drag and drop files or click to upload
        </p>
      </div>
      
      {/* Upload Area */}
        <div
          ref={dropRef}
          className={`relative m-4 border-2 border-dashed rounded-lg transition-colors ${
            dragActive || isOver
              ? 'border-accent bg-accent/10'
              : 'border-border hover:border-accent/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="p-8 text-center">
          <Upload size={32} className="mx-auto text-text-secondary mb-4" />
          <p className="text-text-primary font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-text-secondary">
            Supports MP4, MOV, AVI, MP3, WAV, JPG, PNG
          </p>
        </div>
        
        <AnimatePresence>
          {(dragActive || isOver) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-accent/20 flex items-center justify-center rounded-lg"
            >
              <div className="text-center">
                <Upload size={48} className="mx-auto text-accent mb-2" />
                <p className="text-accent font-medium">Drop files here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-2">
          <AnimatePresence>
            {mediaFiles.map((file, index) => (
              <MediaFileItem
                key={`${file.name}-${index}`}
                file={file}
                progress={uploadProgress[file.name]}
                icon={getFileIcon(file)}
                iconColor={getFileColor(file)}
                onAddToTimeline={() => {
                  // TODO: Add to timeline logic
                  console.log('Add to timeline:', file.name)
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button className="w-full button-secondary flex items-center justify-center space-x-2">
          <Type size={16} />
          <span>Add Text</span>
        </button>
        <button className="w-full button-secondary flex items-center justify-center space-x-2">
          <ImageIcon size={16} />
          <span>Generate Image</span>
        </button>
      </div>
    </div>
  )
}

interface MediaFileItemProps {
  file: File
  progress?: number
  icon: React.ReactNode
  iconColor: string
  onAddToTimeline: () => void
}

const MediaFileItem: React.FC<MediaFileItemProps> = ({
  file,
  progress = 100,
  icon,
  iconColor,
  onAddToTimeline
}) => {
  const [thumbnail, setThumbnail] = useState<string>('')
  
  React.useEffect(() => {
    if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      
      if (file.type.startsWith('image/')) {
        setThumbnail(url)
      } else {
        // Generate video thumbnail
        const video = document.createElement('video')
        video.src = url
        video.currentTime = 1
        video.onloadeddata = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 80
          canvas.height = 45
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, 80, 45)
            setThumbnail(canvas.toDataURL())
          }
        }
      }
      
      return () => URL.revokeObjectURL(url)
    }
  }, [file])
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-timeline-bg rounded-lg p-3 hover:bg-white/5 transition-colors group cursor-pointer"
      onClick={onAddToTimeline}
    >
      <div className="flex items-center space-x-3">
        {/* Thumbnail or Icon */}
        <div className="w-12 h-12 rounded bg-black/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt={file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={iconColor}>{icon}</div>
          )}
        </div>
        
        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium truncate">
            {file.name}
          </p>
          <p className="text-text-secondary text-xs">
            {formatFileSize(file.size)}
          </p>
          
          {/* Progress Bar */}
          {progress !== undefined && progress < 100 && progress >= 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div
                  className="bg-accent h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {progress === -1 && (
            <p className="text-red-400 text-xs mt-1">Upload failed</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-text-secondary hover:text-accent p-1">
            ⋮
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default MediaLibrary