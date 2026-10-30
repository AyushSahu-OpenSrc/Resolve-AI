'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { IconAlert, IconBox, IconCases, IconClose, IconSend, IconSpark, IconUpload } from './icons'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const PRESET_QUESTIONS = [
  'What is our policy for damaged items?',
  'Check warehouse inventory for headphones',
  'How does ResolveAI verify replacements?',
]

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your ResolveAI autonomous operations assistant. Ask me anything about ongoing customer cases, inventory levels, or policy compliance rules.',
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [mounted, setMounted] = useState(open)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  if (open && !mounted) setMounted(true)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setMounted(false), 320)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim()
    if (!text || streaming) return

    const newMsgs: Message[] = [...messages, { role: 'user', content: text }]
    setMessages([...newMsgs, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const res = await api.chatStream(text)
      if (!res.body) throw new Error('No streaming body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) break
              if (data.token) {
                accumulated += data.token
                setMessages(prev => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { role: 'assistant', content: accumulated }
                  return copy
                })
              }
            } catch {
              // ignore partial lines
            }
          }
        }
      }
    } catch (err: unknown) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'I had trouble connecting to the resolution engine. Please check your backend connection.',
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  function openCaseFromChat(issue: string) {
    onClose()
    router.push('/cases/new?message=' + encodeURIComponent(issue))
  }

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className={'fl-assist-scrim ' + (open ? 'is-open' : '')} onClick={onClose} aria-hidden="true" />
      <aside
        className={'fl-assist ' + (open ? 'is-open' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="ResolveAI Assistant"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        {/* Header */}
        <header className="fl-assist-head" style={{ flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image src="/logo.png" alt="ResolveAI" width={24} height={24} style={{ borderRadius: 6, objectFit: 'contain' }} />
            <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>ResolveAI</strong>
            <span style={{ fontSize: '11px', background: 'var(--success-tint)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
              Gemini + Groq
            </span>
          </div>
          <button className="fl-icon-btn" onClick={onClose} aria-label="Close assistant">
            <IconClose />
          </button>
        </header>

        {/* Chat message timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--primary)' : 'var(--panel)',
                color: m.role === 'user' ? '#ffffff' : 'var(--ink)',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '10px 14px',
                fontSize: '13px',
                lineHeight: 1.5,
                border: m.role === 'assistant' ? '1px solid var(--line)' : 'none',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {m.role === 'assistant' && !m.content && streaming ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ink-muted)' }}>
                  <span>Thinking</span>
                  <span style={{ animation: 'fl-pulse 1s infinite' }}>...</span>
                </span>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
          {PRESET_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              style={{
                fontSize: '11px',
                whiteSpace: 'nowrap',
                padding: '4px 8px',
                borderRadius: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <form
          className="fl-assist-input"
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
          style={{ flexShrink: 0 }}
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask AI anything, or type a customer issue..."
            aria-label="Ask ResolveAI anything"
          />
          <button type="submit" className="fl-send" disabled={!input.trim() || streaming} aria-label="Send message">
            <IconSend />
          </button>
        </form>
      </aside>
    </>,
    document.body
  )
}
