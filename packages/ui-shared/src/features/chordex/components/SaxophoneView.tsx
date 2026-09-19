import React from 'react';
import { motion } from 'motion/react';
import type { SaxFingering, SaxKeyId } from '@workspace/livex-core';

export interface SaxophoneViewProps {
  fingering: SaxFingering;
  activeKeys?: SaxKeyId[];
  onKeyToggle?: (keyId: SaxKeyId) => void;
  accentColor?: string;
  variantName?: string;
}

/**
 * Production-Grade Interactive Vector Alto Saxophone Diagram.
 * Accurately renders the anatomical structure of a real saxophone:
 *  - Mouthpiece & Neck (Gooseneck)
 *  - Upper Stack (Keys 1, 2, 3, Bis, Octave)
 *  - Lower Stack (Keys 4, 5, 6)
 *  - Palm Keys (D, Eb, F)
 *  - Side Keys (High E, Side C, Side Bb)
 *  - Pinky Tables (LH G#, Low Bb, B, C# / RH Eb, C)
 *  - Mechanical Rod Linkages & Key Guards
 *  - Bell & Bow Flare
 */
export const SaxophoneView: React.FC<SaxophoneViewProps> = ({
  fingering,
  activeKeys,
  onKeyToggle,
  accentColor = '#f59e0b',
  variantName = 'Alto Saxophone',
}) => {
  const currentKeys = activeKeys || fingering.keys;

  const isPressed = (keyId: SaxKeyId) => currentKeys.includes(keyId);

  const handleKeyClick = (keyId: SaxKeyId) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(12);
      } catch (_) {}
    }
    if (onKeyToggle) {
      onKeyToggle(keyId);
    }
  };

  const renderKeyPad = (
    keyId: SaxKeyId,
    cx: number,
    cy: number,
    r: number,
    label: string,
    shape: 'circle' | 'ellipse' | 'rect' = 'circle',
    rectW = 24,
    rectH = 14
  ) => {
    const pressed = isPressed(keyId);

    return (
      <g
        key={keyId}
        onClick={() => handleKeyClick(keyId)}
        style={{ cursor: 'pointer', outline: 'none' }}
      >
        <motion.g
          animate={{
            scale: pressed ? 0.92 : 1,
            y: pressed ? 1.5 : 0,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        >
          {/* Key shadow */}
          {shape === 'circle' && (
            <circle cx={cx} cy={cy + 2} r={r} fill="rgba(0,0,0,0.4)" />
          )}

          {/* Key Body / Pad */}
          {shape === 'circle' ? (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={pressed ? accentColor : 'url(#gold-key-grad)'}
              stroke={pressed ? '#ffffff' : '#d97706'}
              strokeWidth={pressed ? 2 : 1.5}
              style={{
                filter: pressed ? `drop-shadow(0 0 8px ${accentColor})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                transition: 'all 0.15s ease',
              }}
            />
          ) : (
            <rect
              x={cx - rectW / 2}
              y={cy - rectH / 2}
              width={rectW}
              height={rectH}
              rx={6}
              fill={pressed ? accentColor : 'url(#gold-key-grad)'}
              stroke={pressed ? '#ffffff' : '#d97706'}
              strokeWidth={pressed ? 2 : 1.5}
              style={{
                filter: pressed ? `drop-shadow(0 0 8px ${accentColor})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                transition: 'all 0.15s ease',
              }}
            />
          )}

          {/* Inner Pearl Inlay */}
          {shape === 'circle' && r > 10 && (
            <circle
              cx={cx}
              cy={cy}
              r={r * 0.55}
              fill={pressed ? '#ffffff' : 'url(#pearl-inlay-grad)'}
              opacity={0.9}
            />
          )}

          {/* Key Label Text */}
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fill={pressed ? '#000000' : '#ffffff'}
            fontSize={r > 12 ? 10 : 8}
            fontWeight="800"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
        </motion.g>
      </g>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 380,
        position: 'relative',
      }}
    >
      <svg
        viewBox="0 0 320 680"
        width="100%"
        height="100%"
        style={{ overflow: 'visible', filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.6))' }}
      >
        <defs>
          {/* Metallic Saxophone Brass Gradient */}
          <linearGradient id="sax-brass-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="20%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef3c7" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          {/* Key Gold Gradient */}
          <linearGradient id="gold-key-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Pearl Inlay Gradient */}
          <radialGradient id="pearl-inlay-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
        </defs>

        {/* ── MOUTHPIECE & NECK ── */}
        <path d="M152 20 h16 v25 h-16 z" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
        <path d="M150 45 Q160 70 160 110" fill="none" stroke="url(#sax-brass-grad)" strokeWidth="14" strokeLinecap="round" />

        {/* Octave Key Arm & Rod */}
        <motion.path
          d="M152 55 L144 85 L144 140"
          fill="none"
          stroke={isPressed('octave') ? accentColor : '#d97706'}
          strokeWidth="3"
          animate={{ x: isPressed('octave') ? -1 : 0 }}
        />
        {renderKeyPad('octave', 138, 75, 10, '8va')}

        {/* ── MAIN SAXOPHONE TUBE BODY ── */}
        <path d="M148 110 L148 520 C148 580 230 580 230 500 C230 420 280 400 280 360" fill="none" stroke="url(#sax-brass-grad)" strokeWidth="36" strokeLinecap="round" />

        {/* Bell Flare */}
        <path d="M260 380 Q290 340 310 320" fill="none" stroke="url(#sax-brass-grad)" strokeWidth="48" strokeLinecap="round" />

        {/* Mechanical Main Rod Assembly Linkages */}
        <line x1="134" y1="130" x2="134" y2="480" stroke="#b45309" strokeWidth="4" />
        <line x1="166" y1="130" x2="166" y2="480" stroke="#78350f" strokeWidth="3" />

        {/* ── PALM KEYS (LH High D, Eb, F) ── */}
        <g id="palm-keys">
          {renderKeyPad('lh_d', 124, 150, 9, 'D', 'rect', 20, 12)}
          {renderKeyPad('lh_eb', 114, 170, 9, 'E♭', 'rect', 20, 12)}
          {renderKeyPad('lh_f', 108, 190, 9, 'F', 'rect', 20, 12)}
        </g>

        {/* ── UPPER STACK (LH 1, 2, 3 & Bis) ── */}
        <g id="upper-stack">
          {renderKeyPad('lh1', 148, 160, 15, '1')}
          {renderKeyPad('bis', 124, 190, 8, 'B')}
          {renderKeyPad('lh2', 148, 210, 15, '2')}
          {renderKeyPad('lh3', 148, 260, 15, '3')}
          {renderKeyPad('lh_gsharp', 118, 290, 11, 'G♯', 'rect', 22, 14)}
        </g>

        {/* ── LOWER STACK (RH 4, 5, 6) ── */}
        <g id="lower-stack">
          {renderKeyPad('rh1', 148, 340, 15, '4')}
          {renderKeyPad('rh2', 148, 390, 15, '5')}
          {renderKeyPad('rh3', 148, 440, 15, '6')}
        </g>

        {/* ── SIDE KEYS (High E, Side C, Side Bb) ── */}
        <g id="side-keys">
          {renderKeyPad('rh_side_e', 178, 330, 9, 'E', 'rect', 20, 12)}
          {renderKeyPad('rh_side_c', 178, 360, 9, 'C', 'rect', 20, 12)}
          {renderKeyPad('rh_side_bb', 178, 390, 9, 'B♭', 'rect', 20, 12)}
        </g>

        {/* ── PINKY TABLES ── */}
        {/* LH Table */}
        <g id="lh-pinky-table">
          {renderKeyPad('lh_low_csharp', 112, 320, 9, 'C♯', 'rect', 20, 11)}
          {renderKeyPad('lh_low_b', 112, 340, 9, 'B', 'rect', 20, 11)}
          {renderKeyPad('lh_low_bb', 112, 360, 9, 'B♭', 'rect', 20, 11)}
        </g>
        {/* RH Table */}
        <g id="rh-pinky-table">
          {renderKeyPad('rh_low_eb', 176, 460, 10, 'E♭', 'rect', 22, 12)}
          {renderKeyPad('rh_low_c', 176, 485, 10, 'C', 'rect', 22, 12)}
        </g>
      </svg>
    </div>
  );
};
