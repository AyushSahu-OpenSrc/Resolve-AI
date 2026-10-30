'use client'

import React from 'react'

export type ChutkuEmotion =
  | 'idle'
  | 'happy'
  | 'curious'
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'sleeping'
  | 'surprised'
  | 'error'

interface Props {
  emotion: ChutkuEmotion
  isBlinking?: boolean
  onClick?: () => void
}

export function ChutkuAvatar({ emotion, isBlinking = false, onClick }: Props) {
  return (
    <div className={`chutku-pet-body ${emotion}`} onClick={onClick}>
      {/* 1. Dynamic Multicolour Ambient Aura */}
      <div className="chutku-aura" />

      {/* 2. Base Chutku Mascot Robot Head (Clean transparent cut from official logo) */}
      <img
        src="/chutku/chutku-mascot.png"
        alt="Chutku AI Mascot"
        className="chutku-image"
        draggable={false}
      />

      {/* 3. Dynamic Animated Face Visor Expressions Overlay */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          top: '32%',
          left: '30%',
          width: '42%',
          height: '35%',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        {/* Blinking or Sleeping Eyes */}
        {isBlinking || emotion === 'sleeping' ? (
          <>
            <path d="M22 45 Q32 45 42 45" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M58 45 Q68 45 78 45" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </>
        ) : emotion === 'thinking' ? (
          /* Thinking: Inquisitive upward gaze with moving dots */
          <>
            <circle cx="34" cy="38" r="6" fill="#38bdf8" />
            <circle cx="66" cy="38" r="6" fill="#38bdf8" />
            <circle cx="36" cy="35" r="2.2" fill="#fff" />
            <circle cx="68" cy="35" r="2.2" fill="#fff" />
          </>
        ) : emotion === 'listening' ? (
          /* Listening: Focused energetic bright oval eyes */
          <>
            <ellipse cx="32" cy="42" rx="7" ry="8" fill="#38bdf8" />
            <ellipse cx="68" cy="42" rx="7" ry="8" fill="#38bdf8" />
            <circle cx="34" cy="40" r="3" fill="#fff" />
            <circle cx="70" cy="40" r="3" fill="#fff" />
          </>
        ) : emotion === 'surprised' ? (
          /* Surprised: Large round eyes */
          <>
            <circle cx="32" cy="42" r="9" fill="#38bdf8" />
            <circle cx="68" cy="42" r="9" fill="#38bdf8" />
            <circle cx="35" cy="39" r="3.5" fill="#fff" />
            <circle cx="71" cy="39" r="3.5" fill="#fff" />
          </>
        ) : emotion === 'speaking' ? (
          /* Speaking: Happy eyes + pulsing cheeks */
          <>
            <path d="M22 44 Q32 35 42 44" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M58 44 Q68 35 78 44" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" fill="none" />
            <ellipse cx="20" cy="52" rx="4" ry="2" fill="rgba(244, 114, 182, 0.6)" />
            <ellipse cx="80" cy="52" rx="4" ry="2" fill="rgba(244, 114, 182, 0.6)" />
          </>
        ) : emotion === 'curious' ? (
          /* Curious: One eye slightly larger, playful wink */
          <>
            <circle cx="32" cy="42" r="7.5" fill="#38bdf8" />
            <path d="M60 43 Q70 36 78 43" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          /* Default Happy / Idle Eyes: Signature smiling curved arcs */
          <>
            <path d="M22 43 Q32 34 42 43" stroke="#38bdf8" strokeWidth="5.2" strokeLinecap="round" fill="none" />
            <path d="M58 43 Q68 34 78 43" stroke="#38bdf8" strokeWidth="5.2" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    </div>
  )
}

