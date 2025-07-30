'use client'

import React, { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { motion } from 'framer-motion'
import { 
  Menu, 
  Save, 
  Download, 
  Undo, 
  Redo, 
  Play, 
  Pause, 
  Settings,
  FileVideo,
  Layers,
  Sparkles
} from 'lucide-react'

import Timeline from '../components/Timeline'
import VideoPreview from '../components/VideoPreview'
import MediaLibrary from '../components/MediaLibrary'
import EffectsPanel from '../components/EffectsPanel'
import ExportPanel from '../components/ExportPanel'
import { useEditorStore } from '../store/editorStore'

export default function VideoEditor() {
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  
  const {
    project,
    playback,
    ui,
    play,
    pause,
    undo,
    redo,
    newProject,
    setSidebarWidth,
    setTimelineHeight
  } = useEditorStore()
  
  useEffect(() => {
    // Initialize processors on component mount
    const initializeProcessors = async () => {
      try {
        const { videoProcessor } = await import('../utils/videoProcessor')
        const { audioProcessor } = await import('../utils/audioProcessor')
        
        // Initialize in background
        Promise.all([
          videoProcessor.initialize().catch(console.error),
          audioProcessor.initialize().catch(console.error)
        ])
      } catch (error) {
        console.error('Failed to initialize processors:', error)
      }
    }
    
    initializeProcessors()
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return
      
      switch (e.key) {
        case ' ':
          e.preventDefault()
          playback.isPlaying ? pause() : play()
          break
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            // TODO: Implement save project
            console.log('Save project')
          }
          break
        case 'e':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setShowExportPanel(true)
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playback.isPlaying, play, pause, undo, redo])
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen bg-editor-bg text-text-primary flex flex-col overflow-hidden">
        {/* Top Menu Bar */}
        <div className="h-14 bg-panel-bg border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileVideo size={24} className="text-accent" />
              <span className="font-bold text-lg">ProVideoEditor</span>
            </div>
            
            <div className="h-6 w-px bg-border" />
            
            <div className="flex items-center space-x-2">
              <button
                onClick={newProject}
                className="button-secondary text-sm"
              >
                New
              </button>
              <button className="button-secondary text-sm">
                <Save size={16} className="mr-1" />
                Save
              </button>
              <button
                onClick={() => setShowExportPanel(true)}
                className="button-primary text-sm"
              >
                <Download size={16} className="mr-1" />
                Export
              </button>
            </div>
            
            <div className="h-6 w-px bg-border" />
            
            <div className="flex items-center space-x-1">
              <button
                onClick={undo}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={redo}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo size={16} />
              </button>
            </div>
          </div>
          
          {/* Center Section */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-text-secondary">
              {project.name}
            </span>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded hover:bg-white/10 transition-colors"
              title="Toggle Media Library"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="p-2 rounded hover:bg-white/10 transition-colors"
              title="Toggle Effects Panel"
            >
              <Sparkles size={16} />
            </button>
            <button className="p-2 rounded hover:bg-white/10 transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Media Library */}
          <motion.div
            initial={false}
            animate={{ 
              width: sidebarCollapsed ? 0 : ui.sidebarWidth,
              opacity: sidebarCollapsed ? 0 : 1 
            }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <MediaLibrary className="h-full" />
          </motion.div>
          
          {/* Center Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Area */}
            <div className="flex-1 min-h-0">
              <VideoPreview className="h-full" />
            </div>
            
            {/* Timeline Area */}
            <motion.div
              style={{ height: ui.timelineHeight }}
              className="flex-shrink-0 border-t border-border relative"
            >
              {/* Resize Handle */}
              <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-accent/50 transition-colors z-10"
                onMouseDown={(e) => {
                  e.preventDefault()
                  const startY = e.clientY
                  const startHeight = ui.timelineHeight
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaY = startY - e.clientY
                    const newHeight = Math.max(150, Math.min(startHeight + deltaY, 400))
                    setTimelineHeight(newHeight)
                  }
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              />
              
              <Timeline className="h-full" />
            </motion.div>
          </div>
          
          {/* Right Sidebar - Effects Panel */}
          <motion.div
            initial={false}
            animate={{ 
              width: rightPanelCollapsed ? 0 : 350,
              opacity: rightPanelCollapsed ? 0 : 1 
            }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <EffectsPanel className="h-full" />
          </motion.div>
        </div>
        
        {/* Export Panel */}
        <ExportPanel
          isOpen={showExportPanel}
          onClose={() => setShowExportPanel(false)}
        />
        
        {/* Loading Indicator */}
        {playback.isPlaying && (
          <div className="fixed top-20 right-4 z-40">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-panel-bg border border-border rounded-lg px-3 py-2 flex items-center space-x-2 shadow-lg"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Playing</span>
            </motion.div>
          </div>
        )}
        
        {/* Keyboard Shortcuts Help */}
        <div className="fixed bottom-4 left-4 text-xs text-text-secondary">
          <div>Space: Play/Pause | Ctrl+Z: Undo | Ctrl+S: Save | Ctrl+E: Export</div>
        </div>
      </div>
    </DndProvider>
  )
}