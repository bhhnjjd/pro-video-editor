'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sliders, 
  Palette, 
  Sparkles, 
  Volume2, 
  Eye, 
  RotateCcw,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useEditorStore } from '../store/editorStore'
import { Effect, AudioEffect, Transition } from '../types/editor'

interface EffectsPanel {
  className?: string
}

const EffectsPanel: React.FC<EffectsPanel> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'transitions'>('video')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'color']))
  
  const { project, updateClip } = useEditorStore()
  const selectedClip = project.timeline.tracks
    .flatMap(track => track.clips)
    .find(clip => project.selectedClips.includes(clip.id))
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }
  
  const addEffect = (type: Effect['type']) => {
    if (!selectedClip) return
    
    const newEffect: Effect = {
      id: `effect-${Date.now()}`,
      type,
      intensity: 50,
      enabled: true
    }
    
    const updatedEffects = [...(selectedClip as any).effects || [], newEffect]
    updateClip(selectedClip.id, { effects: updatedEffects as any })
  }
  
  const updateEffect = (effectId: string, updates: Partial<Effect>) => {
    if (!selectedClip || !('effects' in selectedClip)) return
    
    const updatedEffects = (selectedClip as any).effects.map((effect: any) =>
      effect.id === effectId ? { ...effect, ...updates } : effect
    )
    updateClip(selectedClip.id, { effects: updatedEffects as any })
  }
  
  const removeEffect = (effectId: string) => {
    if (!selectedClip || !('effects' in selectedClip)) return
    
    const updatedEffects = (selectedClip as any).effects.filter((effect: any) => effect.id !== effectId)
    updateClip(selectedClip.id, { effects: updatedEffects as any })
  }
  
  if (!selectedClip) {
    return (
      <div className={`bg-panel-bg border-l border-border flex flex-col items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <Sparkles size={48} className="mx-auto text-text-secondary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Clip Selected</h3>
          <p className="text-text-secondary">
            Select a clip from the timeline to edit its effects and properties
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`bg-panel-bg border-l border-border flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Effects & Properties</h3>
        
        {/* Tabs */}
        <div className="flex bg-timeline-bg rounded-lg p-1">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'video'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Palette size={16} className="inline mr-2" />
            Video
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'audio'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Volume2 size={16} className="inline mr-2" />
            Audio
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'transitions'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles size={16} className="inline mr-2" />
            Transitions
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {activeTab === 'video' && (
            <VideoEffectsPanel
              key="video"
              clip={selectedClip}
              onAddEffect={addEffect}
              onUpdateEffect={updateEffect}
              onRemoveEffect={removeEffect}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          )}
          {activeTab === 'audio' && (
            <AudioEffectsPanel
              key="audio"
              clip={selectedClip}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          )}
          {activeTab === 'transitions' && (
            <TransitionsPanel
              key="transitions"
              clip={selectedClip}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface VideoEffectsPanelProps {
  clip: any
  onAddEffect: (type: Effect['type']) => void
  onUpdateEffect: (effectId: string, updates: Partial<Effect>) => void
  onRemoveEffect: (effectId: string) => void
  expandedSections: Set<string>
  onToggleSection: (section: string) => void
}

const VideoEffectsPanel: React.FC<VideoEffectsPanelProps> = ({
  clip,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  expandedSections,
  onToggleSection
}) => {
  const { updateClip } = useEditorStore()
  
  const effectGroups = {
    basic: {
      title: 'Basic Adjustments',
      effects: ['brightness', 'contrast'] as Effect['type'][]
    },
    color: {
      title: 'Color Effects',
      effects: ['saturation', 'hue', 'sepia', 'grayscale'] as Effect['type'][]
    },
    filters: {
      title: 'Filters',
      effects: ['blur', 'invert'] as Effect['type'][]
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-4"
    >
      {/* Transform Controls */}
      {('position' in clip) && (
        <EffectSection
          title="Transform"
          isExpanded={expandedSections.has('transform')}
          onToggle={() => onToggleSection('transform')}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">X Position</label>
                <input
                  type="number"
                  value={clip.position?.x || 0}
                  onChange={(e) => updateClip(clip.id, {
                    position: { ...clip.position, x: parseInt(e.target.value) }
                  })}
                  className="w-full bg-timeline-bg border border-border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Y Position</label>
                <input
                  type="number"
                  value={clip.position?.y || 0}
                  onChange={(e) => updateClip(clip.id, {
                    position: { ...clip.position, y: parseInt(e.target.value) }
                  })}
                  className="w-full bg-timeline-bg border border-border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Width</label>
                <input
                  type="number"
                  value={clip.size?.width || 0}
                  onChange={(e) => updateClip(clip.id, {
                    size: { ...clip.size, width: parseInt(e.target.value) }
                  })}
                  className="w-full bg-timeline-bg border border-border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Height</label>
                <input
                  type="number"
                  value={clip.size?.height || 0}
                  onChange={(e) => updateClip(clip.id, {
                    size: { ...clip.size, height: parseInt(e.target.value) }
                  })}
                  className="w-full bg-timeline-bg border border-border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-text-secondary mb-1">Rotation</label>
              <input
                type="range"
                min="-180"
                max="180"
                value={clip.rotation || 0}
                onChange={(e) => updateClip(clip.id, { rotation: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-text-secondary text-center">{clip.rotation || 0}°</div>
            </div>
            
            <div>
              <label className="block text-xs text-text-secondary mb-1">Opacity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={clip.opacity || 1}
                onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-text-secondary text-center">
                {Math.round((clip.opacity || 1) * 100)}%
              </div>
            </div>
          </div>
        </EffectSection>
      )}
      
      {/* Effects */}
      {Object.entries(effectGroups).map(([key, group]) => (
        <EffectSection
          key={key}
          title={group.title}
          isExpanded={expandedSections.has(key)}
          onToggle={() => onToggleSection(key)}
        >
          <div className="space-y-2">
            {group.effects.map(effectType => (
              <button
                key={effectType}
                onClick={() => onAddEffect(effectType)}
                className="w-full text-left px-3 py-2 bg-timeline-bg hover:bg-white/5 rounded text-sm transition-colors flex items-center justify-between"
              >
                <span className="capitalize">{effectType}</span>
                <Plus size={14} />
              </button>
            ))}
          </div>
        </EffectSection>
      ))}
      
      {/* Applied Effects */}
      {clip.effects && clip.effects.length > 0 && (
        <EffectSection
          title="Applied Effects"
          isExpanded={expandedSections.has('applied')}
          onToggle={() => onToggleSection('applied')}
        >
          <div className="space-y-3">
            {clip.effects.map((effect: Effect) => (
              <div key={effect.id} className="bg-timeline-bg rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{effect.type}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateEffect(effect.id, { enabled: !effect.enabled })}
                      className={`p-1 rounded ${effect.enabled ? 'text-green-400' : 'text-text-secondary'}`}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onRemoveEffect(effect.id)}
                      className="p-1 rounded text-red-400 hover:bg-red-400/20"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Intensity</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={effect.intensity}
                    onChange={(e) => onUpdateEffect(effect.id, { intensity: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-xs text-text-secondary text-center">{effect.intensity}%</div>
                </div>
              </div>
            ))}
          </div>
        </EffectSection>
      )}
    </motion.div>
  )
}

const AudioEffectsPanel: React.FC<{
  clip: any
  expandedSections: Set<string>
  onToggleSection: (section: string) => void
}> = ({ clip, expandedSections, onToggleSection }) => {
  const { updateClip } = useEditorStore()
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-4"
    >
      <EffectSection
        title="Audio Controls"
        isExpanded={expandedSections.has('audio-basic')}
        onToggle={() => onToggleSection('audio-basic')}
      >
        <div className="space-y-3">
          {('volume' in clip) && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Volume</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={clip.volume || 1}
                onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-text-secondary text-center">
                {Math.round((clip.volume || 1) * 100)}%
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <button className="button-secondary text-sm">Normalize</button>
            <button className="button-secondary text-sm">Fade In</button>
            <button className="button-secondary text-sm">Fade Out</button>
            <button className="button-secondary text-sm">Reverb</button>
          </div>
        </div>
      </EffectSection>
    </motion.div>
  )
}

const TransitionsPanel: React.FC<{
  clip: any
  expandedSections: Set<string>
  onToggleSection: (section: string) => void
}> = ({ clip, expandedSections, onToggleSection }) => {
  const transitionTypes: Transition['type'][] = ['fade', 'slide', 'wipe', 'dissolve', 'zoom']
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-4"
    >
      <EffectSection
        title="Transition Types"
        isExpanded={expandedSections.has('transitions')}
        onToggle={() => onToggleSection('transitions')}
      >
        <div className="grid grid-cols-2 gap-2">
          {transitionTypes.map(type => (
            <button
              key={type}
              className="button-secondary text-sm capitalize"
            >
              {type}
            </button>
          ))}
        </div>
      </EffectSection>
    </motion.div>
  )
}

interface EffectSectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

const EffectSection: React.FC<EffectSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-timeline-bg hover:bg-white/5 transition-colors rounded-t-lg"
      >
        <span className="font-medium text-text-primary">{title}</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EffectsPanel