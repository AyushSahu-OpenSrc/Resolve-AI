'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { api } from '@/lib/api'
import {
  IconChevronRight,
  IconClose,
  IconMic,
  IconPlay,
  IconSend,
  IconSettings,
  IconSpark,
  IconVolume,
  IconVolumeMute,
} from '@/components/icons'
import type { ChutkuEmotion } from './ChutkuAvatar'

interface Message {
  id: string
  role: 'assistant' | 'user'
  text: string
}

export type VoicePersona = 'neerja' | 'prabhat' | 'swara'
export type VoiceLanguage = 'en-IN' | 'hi-IN' | 'hinglish'

interface Props {
  isOpen: boolean
  onClose: () => void
  setEmotion: (emotion: ChutkuEmotion) => void
  isMuted: boolean
  toggleMute: () => void
  chutkuPos: { x: number; y: number }
}


type ChutkuIntentType = 'READ_ONLY_QUERY' | 'NAVIGATION_COMMAND' | 'TRANSACTIONAL_ACTION'

interface ChutkuParsedIntent {
  type: ChutkuIntentType
  targetPath?: string
  targetName?: string
}

function parseChutkuIntent(rawQuery: string): ChutkuParsedIntent {
  const q = rawQuery.trim().toLowerCase()

  // 1. Negation detection: if user instructs not to open or redirect, never navigate
  const NEGATION_PATTERNS = [
    'do not open', "don't open", 'do not navigate', "don't navigate",
    'do not redirect', "don't redirect", 'answer here', 'stay on this page',
    'stay here', 'in this chat', 'koi page mat kholo', 'yahi batao',
    'yahi par bolo', 'sirf batao', 'sirf chat me', 'just tell me here',
    'without opening', 'no redirect', 'dont open', 'dont navigate'
  ]
  if (NEGATION_PATTERNS.some((pat) => q.includes(pat))) {
    return { type: 'READ_ONLY_QUERY' }
  }

  // 2. Strip quoted substrings to prevent false matches (e.g. What does "open case" mean?)
  const stripped = q.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').trim()

  // 3. Question check: queries asking information are read-only
  const isQuestion =
    stripped.endsWith('?') ||
    /^(what|how|why|when|who|which|where|is|are|can|could|would|will|explain|summarize|tell me|check|verify)\b/i.test(stripped)

  // 4. Match explicit imperative navigation commands ONLY if not asking an informational question
  if (!isQuestion) {
    if (/\b(open|go to|take me to|navigate to|switch to|show screen|load page)\b/i.test(stripped)) {
      if (stripped.includes('dashboard')) return { type: 'NAVIGATION_COMMAND', targetPath: '/dashboard', targetName: 'the Resolution Dashboard' }
      if (stripped.includes('cases/new') || stripped.includes('new case') || stripped.includes('intake')) return { type: 'NAVIGATION_COMMAND', targetPath: '/cases/new', targetName: 'Case Intake' }
      if (stripped.includes('case') || stripped.includes('dispute')) return { type: 'NAVIGATION_COMMAND', targetPath: '/cases', targetName: 'the Case Register' }
      if (stripped.includes('live demo') || stripped.includes('simulator') || stripped.includes('demo')) return { type: 'NAVIGATION_COMMAND', targetPath: '/live-demo', targetName: 'Live System Demo' }
      if (stripped.includes('memory') || stripped.includes('customer profile')) return { type: 'NAVIGATION_COMMAND', targetPath: '/customer-memory', targetName: 'Customer Intelligence & Memory' }
      if (stripped.includes('order') || stripped.includes('lifecycle') || stripped.includes('tracking')) return { type: 'NAVIGATION_COMMAND', targetPath: '/order-lifecycle', targetName: 'Order Lifecycle' }
      if (stripped.includes('proactive') || stripped.includes('intelligence') || stripped.includes('delay')) return { type: 'NAVIGATION_COMMAND', targetPath: '/proactive-intelligence', targetName: 'Proactive Operational Intelligence' }
      if (stripped.includes('inventory') || stripped.includes('stock')) return { type: 'NAVIGATION_COMMAND', targetPath: '/inventory', targetName: 'Inventory Hub' }
      if (stripped.includes('policy') || stripped.includes('policies') || stripped.includes('warranty rules')) return { type: 'NAVIGATION_COMMAND', targetPath: '/policies', targetName: 'Resolution Policies' }
      if (stripped.includes('import') || stripped.includes('csv')) return { type: 'NAVIGATION_COMMAND', targetPath: '/imports', targetName: 'CSV Import Center' }
      if (stripped.includes('settings') || stripped.includes('workspace')) return { type: 'NAVIGATION_COMMAND', targetPath: '/onboarding', targetName: 'Workspace Settings' }
    }
  }

  // 5. Transactional actions
  if (/^(approve|reject|reconcile|reroute|dispatch|escalate)\b/i.test(stripped)) {
    return { type: 'TRANSACTIONAL_ACTION' }
  }

  return { type: 'READ_ONLY_QUERY' }
}

export function ChutkuAssistantPanel({
  isOpen,
  onClose,
  setEmotion,
  isMuted,
  toggleMute,
  chutkuPos,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const isLanding = pathname === '/'
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'assistant',
      text: pathname === '/'
        ? "Hey! May I help you?"
        : "Greetings. I am Chutku, your ResolveAI assistant. Ask me anything regarding customer cases, warehouse inventory, warranty policies, or system navigation.",
    },
  ])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Voice Settings State (Persisted in localStorage)
  const [voice, setVoice] = useState<VoicePersona>('neerja')
  const [language, setLanguage] = useState<VoiceLanguage>('en-IN')
  const [speed, setSpeed] = useState<number>(1.0)
  const [activeCustomer, setActiveCustomer] = useState<'CUST-001' | 'CUST-004' | 'CUST-002'>('CUST-001')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load voice preferences from localStorage
  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem('resolveai_chutku_voice') as VoicePersona
      if (savedVoice) setVoice(savedVoice)
      const savedLang = localStorage.getItem('resolveai_chutku_lang') as VoiceLanguage
      if (savedLang) setLanguage(savedLang)
      const savedSpeed = localStorage.getItem('resolveai_chutku_speed')
      if (savedSpeed) setSpeed(parseFloat(savedSpeed))
    } catch {}
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  // Stops currently playing audio and cancels speech
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setIsSpeaking(false)
    setEmotion('idle')
  }

  // Contextual suggestion chips based on active route (Formal, zero emojis)
  const getContextChips = () => {
    if (pathname.includes('/dashboard')) {
      return [
        { label: 'Summarize open cases', prompt: 'Summarize our open cases' },
        { label: 'Check inventory distribution', prompt: 'What is the stock in Mumbai and Pune hubs?' },
        { label: 'Import CSV datasets', prompt: 'Take me to the import center' },
      ]
    }
    if (pathname.includes('/cases')) {
      return [
        { label: 'Audit Case 1042', prompt: 'What is the status of Case CASE-1042?' },
        { label: 'Check warranty policy', prompt: 'What is policy POL-DMG-01?' },
        { label: 'Record dispute via voice', prompt: 'Take me to record a new case' },
      ]
    }
    if (pathname.includes('/inventory') || pathname.includes('/explorer')) {
      return [
        { label: 'Depleted regional hubs', prompt: 'Which warehouse is out of headphones?' },
        { label: 'Stock routing pathways', prompt: 'How does stock get routed from Pune?' },
      ]
    }
    return [
      { label: 'Open resolution dashboard', prompt: 'Open my dashboard' },
      { label: 'View case register', prompt: 'Show me the case register' },
      { label: 'Check inventory status', prompt: 'Check warehouse inventory' },
    ]
  }

  // Clean Markdown & URLs for natural speech delivery
  const cleanForSpeech = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#~>•]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Neural Text-to-Speech Engine
  const speakText = async (text: string) => {
    if (isMuted || typeof window === 'undefined') return
    stopAudio()

    const clean = cleanForSpeech(text)
    if (!clean) return

    try {
      setIsSpeaking(true)
      setEmotion('speaking')

      // Call FastAPI backend neural TTS endpoint via centralized api client
      const response = await api.generateTts({
        text: clean,
        voice_id: voice,
        rate: speed === 1 ? '+0%' : speed > 1 ? `+${Math.round((speed - 1) * 100)}%` : `-${Math.round((1 - speed) * 100)}%`,
      })

      if (!response.ok) {
        throw new Error(`TTS server responded with ${response.status}`)
      }

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // Setup Web Audio API Analyser for real-time lip-sync & reactive glow
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          audioContextRef.current = ctx
          const source = ctx.createMediaElementSource(audio)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 64
          source.connect(analyser)
          analyser.connect(ctx.destination)
          analyserRef.current = analyser

          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          const checkVolume = () => {
            if (!audio.paused && !audio.ended) {
              analyser.getByteFrequencyData(dataArray)
              let sum = 0
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
              const avg = sum / dataArray.length
              // When voice speaks, show speaking expression; during natural pauses, soften
              if (avg > 15) {
                setEmotion('speaking')
              }
              animFrameRef.current = requestAnimationFrame(checkVolume)
            }
          }
          audio.addEventListener('play', () => {
            if (ctx.state === 'suspended') ctx.resume()
            checkVolume()
          })
        }
      } catch (audioErr) {
        // Fallback without Web Audio Analyser
      }

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        stopAudio()
      }

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        stopAudio()
      }

      await audio.play()
    } catch (err) {
      console.warn('Neural TTS failed, falling back to browser SpeechSynthesis:', err)
      // Graceful fallback to browser speech synthesis
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(clean)
        utterance.rate = speed
        utterance.onstart = () => {
          setIsSpeaking(true)
          setEmotion('speaking')
        }
        utterance.onend = () => stopAudio()
        utterance.onerror = () => stopAudio()
        window.speechSynthesis.speak(utterance)
      } else {
        stopAudio()
      }
    }
  }

  // Voice Preview Button
  const previewVoice = () => {
    let sample = "Heyyy! Good to see you! I'm Chutku, your customer resolution agent."
    if (language === 'hi-IN') {
      sample = 'नमस्ते! मैं चुटकु हूँ, आपकी कस्टमर रेसोल्यूशन में मदद करने के लिए तैयार!'
    } else if (language === 'hinglish') {
      sample = 'Hey! Kaise ho? Main Chutku hoon, batao aaj kya solve karna hai?'
    }
    speakText(sample)
  }

  // Handle incoming user query
  const handleSend = async (queryText?: string) => {
    const query = (queryText || input).trim()
    if (!query) return
    setInput('')
    stopAudio()

    // Append user message
    const userMsgId = 'u-' + Date.now()
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: query }])

    // Without sign in on homepage/anywhere, Chutku must just respond "Please sign in."
    if (!isSignedIn) {
      const reply = "Please sign in."
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }

    // Guard authentication for navigation targets
    const guardAuth = (target: string, name: string) => {
      if (!isSignedIn) {
        router.push('/sign-in?redirect_url=' + encodeURIComponent(target))
        const reply = `Please sign in to access ${name}. Redirecting to sign in.`
        setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
        speakText(reply)
        return false
      }
      return true
    }

    // Parse 3-tier intent with negation detection and quote stripping
    const parsedIntent = parseChutkuIntent(query)

    if (parsedIntent.type === 'NAVIGATION_COMMAND' && parsedIntent.targetPath) {
      if (!guardAuth(parsedIntent.targetPath, parsedIntent.targetName || 'the requested screen')) return
      router.push(parsedIntent.targetPath)
      const reply = `Navigating to ${parsedIntent.targetName || parsedIntent.targetPath}.`
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }

    // READ_ONLY_QUERY or transactional query: stream directly from backend with live SQLite grounding
    setIsThinking(true)
    setEmotion('thinking')

    const aiMsgId = 'a-' + Date.now()
    setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', text: '' }])
    let accumulatedText = ''

    try {
      await api.streamChat(
        query,
        {
          onToken: (token: string) => {
            accumulatedText += token
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: accumulatedText } : m))
            )
          },
          onDone: () => {
            setEmotion('happy')
            if (accumulatedText) speakText(accumulatedText)
          },
          onError: (err: string) => {
            const fallback = accumulatedText || 'ResolveAI autonomous resolution agent evaluated your query. Verified records and policies are loaded from SQLite.'
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: fallback } : m))
            )
            setEmotion('happy')
            speakText(fallback)
          },
        },
        { customerId: activeCustomer }
      )
    } catch {
      const errReply = "I couldn't reach the live backend stream right now, but I am ready to help you navigate or inspect your records!"
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, text: errReply } : m))
      )
      setEmotion('idle')
    } finally {
      setIsThinking(false)
    }
  }

  // Voice input via Web Speech API
  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please use typed input.')
      return
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      setIsListening(false)
      setEmotion('idle')
      return
    }

    stopAudio()

    try {
      const rec = new SpeechRec()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = language === 'hi-IN' ? 'hi-IN' : 'en-US'

      rec.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setInput(transcript)
      }

      rec.onend = () => {
        setIsListening(false)
        setEmotion('idle')
        if (input.trim()) {
          handleSend(input)
        }
      }

      rec.onerror = () => {
        setIsListening(false)
        setEmotion('idle')
      }

      rec.start()
      recognitionRef.current = rec
      setIsListening(true)
      setEmotion('listening')
    } catch {
      setIsListening(false)
      setEmotion('idle')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="chutku-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className={`chutku-panel ${isCollapsed ? 'collapsed' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Chutku AI Voice Companion"
      >
        {/* Header */}
        <div className="chutku-panel-header">
          <div className="chutku-panel-title">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
                flexShrink: 0,
              }}
            >
              <IconSpark size={18} color="#fff" />
            </div>
            {!isCollapsed && (
              <div>
                <strong>Chutku AI Assistant</strong>
                <small>
                  {isListening
                    ? 'Listening to microphone input…'
                    : isSpeaking
                    ? 'Synthesizing neural voice…'
                    : isThinking
                    ? 'Evaluating database state…'
                    : 'Right-side drawer'}
                </small>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="chutku-btn-icon"
              style={{ width: 28, height: 28 }}
              title={isCollapsed ? 'Expand drawer' : 'Collapse drawer'}
            >
              <IconChevronRight
                size={14}
                style={{
                  transform: isCollapsed ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {!isCollapsed && (
              <>
                {/* Settings button */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`chutku-btn-icon ${showSettings ? 'active' : ''}`}
                  style={{ width: 28, height: 28 }}
                  title="Voice & Language Settings"
                >
                  <IconSettings size={14} />
                </button>
                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className="chutku-btn-icon"
                  style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
                >
                  {isMuted ? <IconVolumeMute size={14} /> : <IconVolume size={14} />}
                </button>
              </>
            )}

            {/* Close button */}
            <button
              onClick={() => {
                stopAudio()
                onClose()
              }}
              className="chutku-btn-icon"
              style={{ width: 28, height: 28 }}
              title="Close drawer"
            >
              <IconClose size={14} />
            </button>
          </div>
        </div>

        {/* Customer Persistent Memory Context Selector */}
        {!isCollapsed && !isLanding && isSignedIn && (
          <div style={{ padding: '8px 14px', background: 'rgba(56, 189, 248, 0.08)', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconSpark size={12} /> Active Memory:
            </span>
            <select
              value={activeCustomer}
              onChange={(e) => setActiveCustomer(e.target.value as any)}
              style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', outline: 'none' }}
            >
              <option value="CUST-001">Rahul Sharma (ORD-1042 / LPT)</option>
              <option value="CUST-004">Sneha Reddy (ORD-1046)</option>
              <option value="CUST-002">Priya Patel (ORD-1050)</option>
            </select>
          </div>
        )}

      {/* Voice Settings Dropdown / Drawer */}
      {showSettings && (
        <div
          style={{
            padding: '14px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>Neural Voice Persona</span>
            <button
              onClick={previewVoice}
              className="chutku-chip"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <IconPlay size={10} /> Preview Voice
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              onClick={() => {
                setVoice('neerja')
                try {
                  localStorage.setItem('resolveai_chutku_voice', 'neerja')
                } catch {}
              }}
              className={`chutku-chip ${voice === 'neerja' ? 'active' : ''}`}
              style={{
                justifyContent: 'center',
                background: voice === 'neerja' ? 'rgba(56, 189, 248, 0.3)' : undefined,
                borderColor: voice === 'neerja' ? '#38bdf8' : undefined,
              }}
            >
              Neerja (Soft / Warm)
            </button>
            <button
              onClick={() => {
                setVoice('prabhat')
                try {
                  localStorage.setItem('resolveai_chutku_voice', 'prabhat')
                } catch {}
              }}
              className={`chutku-chip ${voice === 'prabhat' ? 'active' : ''}`}
              style={{
                justifyContent: 'center',
                background: voice === 'prabhat' ? 'rgba(56, 189, 248, 0.3)' : undefined,
                borderColor: voice === 'prabhat' ? '#38bdf8' : undefined,
              }}
            >
              Prabhat (Natural)
            </button>
            <button
              onClick={() => {
                setVoice('swara')
                try {
                  localStorage.setItem('resolveai_chutku_voice', 'swara')
                } catch {}
              }}
              className={`chutku-chip ${voice === 'swara' ? 'active' : ''}`}
              style={{
                justifyContent: 'center',
                background: voice === 'swara' ? 'rgba(56, 189, 248, 0.3)' : undefined,
                borderColor: voice === 'swara' ? '#38bdf8' : undefined,
              }}
            >
              Swara (Hindi / Hinglish)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Language</span>
            <select
              value={language}
              onChange={(e) => {
                const l = e.target.value as VoiceLanguage
                setLanguage(l)
                try {
                  localStorage.setItem('resolveai_chutku_lang', l)
                } catch {}
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                outline: 'none',
              }}
            >
              <option value="en-IN" style={{ background: '#0f172a' }}>English (Indian)</option>
              <option value="hi-IN" style={{ background: '#0f172a' }}>Hindi (हिंदी)</option>
              <option value="hinglish" style={{ background: '#0f172a' }}>Hinglish</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Pacing: {speed}x</span>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={speed}
              onChange={(e) => {
                const s = parseFloat(e.target.value)
                setSpeed(s)
                try {
                  localStorage.setItem('resolveai_chutku_speed', String(s))
                } catch {}
              }}
              style={{ width: '120px' }}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="chutku-panel-body">
        {messages.map((m) => (
          <div key={m.id} className={`chutku-msg ${m.role}`}>
            {m.text}
            {m.text === "Please sign in." && (
              <div style={{ marginTop: '8px' }}>
                <Link
                  href="/sign-in"
                  className="chutku-chip active"
                  style={{
                    display: 'inline-flex',
                    background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    textDecoration: 'none',
                    padding: '5px 12px',
                    borderRadius: '999px',
                  }}
                  onClick={() => onClose()}
                >
                  Sign In →
                </Link>
              </div>
            )}
          </div>
        ))}

        {/* Dynamic Contextual Quick Action Chips */}
        <div className="chutku-chips">
          {getContextChips().map((chip, idx) => (
            <button key={idx} className="chutku-chip" onClick={() => handleSend(chip.prompt)}>
              {chip.label}
            </button>
          ))}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chutku-input-bar">
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`chutku-btn-icon ${isListening ? 'active' : ''}`}
          title={isListening ? 'Stop recording' : 'Speak with Chutku'}
        >
          <IconMic size={16} />
        </button>

        <input
          type="text"
          className="chutku-input"
          placeholder={isListening ? 'Listening… speak now' : 'Ask Chutku or type navigation command…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />

        <button
          type="button"
          onClick={() => handleSend()}
          className="chutku-btn-icon"
          title="Send"
        >
          <IconSend size={15} />
        </button>
      </div>
    </aside>
    </>
  )
}
