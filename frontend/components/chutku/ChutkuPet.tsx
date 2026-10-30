'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChutkuAvatar, ChutkuEmotion } from './ChutkuAvatar'
import { ChutkuAssistantPanel } from './ChutkuAssistantPanel'
import './chutku.css'

export function ChutkuPet() {
  // Screen position
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [emotion, setEmotion] = useState<ChutkuEmotion>('idle')
  const [isBlinking, setIsBlinking] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showSpeechBubble, setShowSpeechBubble] = useState(false)
  const [speechBubbleText, setSpeechBubbleText] = useState("Hey! I'm Chutku 🤖 Click to chat!")
  const [roamingEnabled, setRoamingEnabled] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  // Dragging state
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const posStart = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const idleTimer = useRef<NodeJS.Timeout | null>(null)

  // Initialize position to bottom right corner
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const updateInitPos = () => {
        const initialX = Math.max(20, window.innerWidth - 130)
        const initialY = Math.max(20, window.innerHeight - 140)
        setPos({ x: initialX, y: initialY })
      }
      updateInitPos()

      const handleResize = () => {
        setPos((prev) => ({
          x: Math.min(prev.x, window.innerWidth - 130),
          y: Math.min(prev.y, window.innerHeight - 140),
        }))
      }
      window.addEventListener('resize', handleResize)

      const handleOpenEvent = () => {
        setIsHidden(false)
        setIsPanelOpen(true)
        setEmotion('happy')
        setTimeout(() => setEmotion('listening'), 500)
      }
      window.addEventListener('open-chutku', handleOpenEvent)

      // Load settings
      try {
        const savedRoam = localStorage.getItem('resolveai_chutku_roam')
        if (savedRoam !== null) setRoamingEnabled(savedRoam === 'true')
        const savedMute = localStorage.getItem('resolveai_chutku_mute')
        if (savedMute !== null) setIsMuted(savedMute === 'true')
        const savedHidden = localStorage.getItem('resolveai_chutku_hidden')
        if (savedHidden !== null) setIsHidden(savedHidden === 'true')
      } catch {}

      // Keep speech bubble visible initially
      setShowSpeechBubble(true)
      const t = setTimeout(() => setShowSpeechBubble(false), 8000)

      return () => {
        clearTimeout(t)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('open-chutku', handleOpenEvent)
      }
    }
  }, [])

  // Natural blinking timer
  useEffect(() => {
    if (emotion === 'sleeping') return
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 180)
    }, 4500 + Math.random() * 3000)
    return () => clearInterval(blinkInterval)
  }, [emotion])

  // Inactivity Sleep Timer (Sleep after 90 seconds of no interaction)
  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (emotion === 'sleeping') {
      setEmotion('idle')
    }
    idleTimer.current = setTimeout(() => {
      if (!isPanelOpen) {
        setEmotion('sleeping')
        setSpeechBubbleText('Zzz… click me to wake up!')
        setShowSpeechBubble(true)
        setTimeout(() => setShowSpeechBubble(false), 4000)
      }
    }, 90000)
  }

  useEffect(() => {
    resetIdleTimer()
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [isPanelOpen])

  // Autonomous Safe Roaming
  useEffect(() => {
    if (!roamingEnabled || isPanelOpen || emotion === 'sleeping') return

    const roamInterval = setInterval(() => {
      // Don't move if user is currently typing in an input
      if (typeof document !== 'undefined') {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable'))) {
          return
        }
      }

      setPos((prev) => {
        // Safe wandering delta: small hop ±80px
        const dx = (Math.random() - 0.5) * 160
        const dy = (Math.random() - 0.5) * 120
        const maxX = window.innerWidth - 120
        const maxY = window.innerHeight - 130
        const newX = Math.min(Math.max(30, prev.x + dx), maxX)
        const newY = Math.min(Math.max(80, prev.y + dy), maxY)

        setEmotion('curious')
        setTimeout(() => setEmotion('idle'), 800)
        return { x: newX, y: newY }
      })
    }, 28000)

    return () => clearInterval(roamInterval)
  }, [roamingEnabled, isPanelOpen, emotion])

  // Drag handlers (Pointer events)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    hasMoved.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    posStart.current = { ...pos }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    resetIdleTimer()
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMoved.current = true
      const maxX = window.innerWidth - 110
      const maxY = window.innerHeight - 120
      setPos({
        x: Math.min(Math.max(10, posStart.current.x + dx), maxX),
        y: Math.min(Math.max(40, posStart.current.y + dy), maxY),
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    // If it was a click (not dragged), toggle conversational panel
    if (!hasMoved.current) {
      handleClick()
    }
  }

  const handleClick = () => {
    resetIdleTimer()
    setEmotion('happy')
    setTimeout(() => {
      setEmotion(isPanelOpen ? 'idle' : 'listening')
    }, 600)
    setIsPanelOpen(!isPanelOpen)
  }

  // Toggle Mute
  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    try {
      localStorage.setItem('resolveai_chutku_mute', String(next))
    } catch {}
  }

  if (!mounted) return null

  if (isHidden) {
    return (
      <button
        className="chutku-restore-pill"
        onClick={() => {
          setIsHidden(false)
          try {
            localStorage.setItem('resolveai_chutku_hidden', 'false')
          } catch {}
        }}
        title="Summon Chutku AI"
      >
        <span>🤖</span>
        <span>Wake Chutku</span>
      </button>
    )
  }

  return (
    <>
      <div
        className="chutku-container"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => {
          if (emotion === 'idle') setEmotion('curious')
        }}
        onMouseLeave={() => {
          if (emotion === 'curious') setEmotion('idle')
        }}
      >
        {/* Dynamic speech bubble prompt */}
        {showSpeechBubble && <div className="chutku-speech-bubble">{speechBubbleText}</div>}

        {/* Chutku Animated Avatar */}
        <ChutkuAvatar emotion={emotion} isBlinking={isBlinking} />

        {/* Mascot Name Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#38bdf8',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
            pointerEvents: 'none',
          }}
        >
          Chutku AI
        </div>
      </div>

      {/* Floating Siri-inspired Conversation HUD */}
      <ChutkuAssistantPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        setEmotion={setEmotion}
        isMuted={isMuted}
        toggleMute={toggleMute}
        chutkuPos={pos}
      />
    </>
  )
}
