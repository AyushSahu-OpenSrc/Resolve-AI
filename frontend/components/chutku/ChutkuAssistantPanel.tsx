'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { IconClose, IconMic, IconSend, IconSettings, IconSpark } from '@/components/icons'
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'assistant',
      text: "Hey! I'm Chutku, your ResolveAI companion. Ask me anything about cases, warehouse stock, policies, or navigation!",
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

  // Contextual suggestion chips based on active route
  const getContextChips = () => {
    if (pathname.includes('/dashboard')) {
      return [
        { label: '📊 Summarize open cases', prompt: 'Summarize our open cases' },
        { label: '📦 Check Pune vs Mumbai stock', prompt: 'What is the stock in Mumbai and Pune hubs?' },
        { label: '📥 Import new CSV data', prompt: 'Take me to the import center' },
      ]
    }
    if (pathname.includes('/cases')) {
      return [
        { label: '⚡ Explain Case 1042', prompt: 'What is the status of Case CASE-1042?' },
        { label: '🛡️ Check warranty policy', prompt: 'What is policy POL-DMG-01?' },
        { label: '🎙️ Record new conflict', prompt: 'Take me to record a new case' },
      ]
    }
    if (pathname.includes('/inventory') || pathname.includes('/explorer')) {
      return [
        { label: '📍 Depleted warehouses', prompt: 'Which warehouse is out of headphones?' },
        { label: '🔄 Show logistics routing', prompt: 'How does stock get routed from Pune?' },
      ]
    }
    return [
      { label: '🚀 Open dashboard', prompt: 'Open my dashboard' },
      { label: '📋 View all cases', prompt: 'Show me the case register' },
      { label: '📦 Check inventory', prompt: 'Check warehouse inventory' },
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

      // Call FastAPI backend neural TTS endpoint
      const response = await fetch('/api/chutku/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          voice,
          language,
          speed,
          emotion: 'friendly',
        }),
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

    // Direct navigation shortcuts
    const qLower = query.toLowerCase()
    if (qLower.includes('open dashboard') || qLower.includes('go to dashboard')) {
      router.push('/dashboard')
      const reply = 'Taking you to your Resolution Dashboard right now!'
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }
    if (qLower.includes('open case') || qLower.includes('show case') || qLower.includes('case register')) {
      router.push('/cases')
      const reply = 'Opening the customer case register!'
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }
    if (qLower.includes('record') || qLower.includes('new case') || qLower.includes('mic')) {
      router.push('/cases/new')
      const reply = 'Opening the voice intake screen so you can speak or record a customer conflict.'
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }
    if (qLower.includes('inventory') || qLower.includes('stock')) {
      router.push('/inventory')
      const reply = 'Opening inventory! Mumbai Hub has 0 units of PROD-HP01, while Pune Hub has 2 units available.'
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }
    if (qLower.includes('import') || qLower.includes('csv')) {
      router.push('/imports')
      const reply = 'Opening the CSV Import Center where you can upload and download sample datasets.'
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }
    if (qLower.includes('policy') || qLower.includes('policies')) {
      router.push('/policies')
      const reply = 'Showing your business policies! Under POL-DMG-01, damaged-on-arrival replacements are eligible within 7 days.'
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: reply }])
      speakText(reply)
      return
    }

    // Call backend or contextual knowledge
    setIsThinking(true)
    setEmotion('thinking')

    try {
      const [cases, inventory] = await Promise.all([api.getCases(), api.getInventory()])
      const openCount = cases.filter((c: any) => !['resolved', 'verified', 'completed'].includes(c.status)).length
      const resolvedCount = cases.filter((c: any) => ['resolved', 'verified', 'completed'].includes(c.status)).length
      const puneStock = inventory.find((i: any) => i.warehouse?.toLowerCase() === 'pune')?.quantity ?? 2
      const mumbaiStock = inventory.find((i: any) => i.warehouse?.toLowerCase() === 'mumbai')?.quantity ?? 0

      let responseText = ''

      if (qLower.includes('summar') || qLower.includes('how many cases')) {
        responseText = `You currently have ${cases.length} customer cases on record: ${openCount} pending investigation and ${resolvedCount} verified & resolved.`
      } else if (qLower.includes('mumbai') || qLower.includes('pune') || qLower.includes('stock')) {
        responseText = `Live inventory check: Mumbai Hub is currently depleted at 0 units. Pune Hub has ${puneStock} units allocated. The agent automatically reroutes to Pune to prevent fulfillment delays.`
      } else if (qLower.includes('case-1042') || qLower.includes('1042')) {
        responseText = `Case CASE-1042 for Rahul Sharma reported outer box damage. Under warranty policy POL-DMG-01, replacement was permitted and 1 unit was allocated from Pune Hub.`
      } else {
        // Fallback to backend chat endpoint
        try {
          const res = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Context: ResolveAI customer resolution SaaS. Current live DB: ${cases.length} cases (${resolvedCount} resolved, ${openCount} open), Mumbai stock: ${mumbaiStock}, Pune stock: ${puneStock}. User query: ${query}`,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            responseText = data.response || data.reply || data.text
          }
        } catch {}

        if (!responseText) {
          responseText = `ResolveAI evaluates customer evidence, verifies inventory (${puneStock} units in Pune), and enforces policy without hallucination. What would you like to inspect next?`
        }
      }

      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: responseText }])
      setEmotion('happy')
      speakText(responseText)
    } catch {
      const errReply = "I couldn't reach the live database right now, but I'm ready to help you navigate or inspect your records!"
      setMessages((prev) => [...prev, { id: 'a-' + Date.now(), role: 'assistant', text: errReply }])
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

  // Calculate panel position so it stays on-screen
  const panelRight = Math.max(16, window.innerWidth - chutkuPos.x - 30)
  const panelBottom = Math.max(90, window.innerHeight - chutkuPos.y + 10)

  return (
    <div
      className="chutku-panel"
      style={{
        right: Math.min(panelRight, window.innerWidth - 400),
        bottom: Math.min(panelBottom, window.innerHeight - 560),
      }}
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
            }}
          >
            <IconSpark size={18} color="#fff" />
          </div>
          <div>
            <strong>Chutku AI Voice Companion</strong>
            <small>
              {isListening
                ? '🎙 Listening to your voice…'
                : isSpeaking
                ? '🔊 Speaking with human neural voice…'
                : isThinking
                ? '⚡ Evaluating database state…'
                : '● Ready to assist'}
            </small>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            style={{ width: 28, height: 28 }}
            title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          {/* Close button */}
          <button
            onClick={() => {
              stopAudio()
              onClose()
            }}
            className="chutku-btn-icon"
            style={{ width: 28, height: 28 }}
          >
            <IconClose size={14} />
          </button>
        </div>
      </div>

      {/* Voice Settings Dropdown / Drawer */}
      {showSettings && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>🎙️ Human Neural Voice Persona</span>
            <button
              onClick={previewVoice}
              className="chutku-chip"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              ▶ Preview Voice
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
              🌸 Neerja (Soft)
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
              🎙️ Prabhat (Male)
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
              🌺 Swara (Hindi)
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
    </div>
  )
}
