import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SAX_FINGERINGS,
  SAX_VARIANTS,
  getConcertNote,
  playRecordedSaxophoneSample,
  type SaxophoneVariant,
  type SaxKeyId,
  NavigationDispatcher,
} from '@workspace/studio-core';
import { SaxophoneView } from '../components/SaxophoneView';
import { StudioHeader } from '../../../shared/layout/StudioHeader';
import { SharedFloatingHeader } from '../../../shared/layout/StudioLayoutSystem';

export type SaxPracticeMode = 'free' | 'learn' | 'quiz' | 'playback' | 'scales' | 'exercises';

export const SaxophonePracticePanel: React.FC = () => {
  const saxScrollRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<SaxophoneVariant>('alto');
  const [practiceMode, setPracticeMode] = useState<SaxPracticeMode>('free');
  const [selectedNoteIdx, setSelectedNoteIdx] = useState<number>(6); // F4 default
  const [activeKeysOverride, setActiveKeysOverride] = useState<SaxKeyId[] | null>(null);

  // Quiz Mode state
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizTargetIdx, setQuizTargetIdx] = useState<number>(() =>
    Math.floor(Math.random() * SAX_FINGERINGS.length)
  );
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Playback Mode state
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);

  const currentFingering = SAX_FINGERINGS[selectedNoteIdx] || SAX_FINGERINGS[0];
  const concertNote = getConcertNote(currentFingering.writtenNote, variant);

  const handlePlaySound = useCallback(() => {
    playRecordedSaxophoneSample({
      writtenNote: currentFingering.writtenNote,
      variant,
      duration: 2.2,
    });
  }, [currentFingering.writtenNote, variant]);

  const handleKeyToggle = (keyId: SaxKeyId) => {
    const nextKeys = activeKeysOverride
      ? activeKeysOverride.includes(keyId)
        ? activeKeysOverride.filter((k) => k !== keyId)
        : [...activeKeysOverride, keyId]
      : [...currentFingering.keys, keyId];

    setActiveKeysOverride(nextKeys);
    handlePlaySound();

    // Learn & Quiz verification
    if (practiceMode === 'quiz') {
      const targetKeys = SAX_FINGERINGS[quizTargetIdx].keys;
      const isMatch =
        nextKeys.length === targetKeys.length && nextKeys.every((k) => targetKeys.includes(k));

      if (isMatch) {
        setQuizFeedback('correct');
        setQuizScore((s) => s + 100);
        setQuizStreak((st) => st + 1);
        setTimeout(() => {
          setQuizFeedback(null);
          setQuizTargetIdx(Math.floor(Math.random() * SAX_FINGERINGS.length));
          setActiveKeysOverride([]);
        }, 1200);
      }
    }
  };

  const handleNoteChange = (newIdx: number) => {
    const nextIdx = Math.max(0, Math.min(SAX_FINGERINGS.length - 1, newIdx));
    setSelectedNoteIdx(nextIdx);
    setActiveKeysOverride(null);
    playRecordedSaxophoneSample({
      writtenNote: SAX_FINGERINGS[nextIdx].writtenNote,
      variant,
      duration: 1.5,
    });
  };

  // Automated scale playback sequence
  const startScalePlayback = () => {
    if (isPlayingSequence) return;
    setIsPlayingSequence(true);

    const scaleIndices = [4, 6, 8, 9, 11, 13, 15, 16]; // C4 Major Scale notes
    let step = 0;

    const interval = setInterval(() => {
      if (step >= scaleIndices.length) {
        clearInterval(interval);
        setIsPlayingSequence(false);
        return;
      }
      const idx = scaleIndices[step];
      setSelectedNoteIdx(idx);
      setActiveKeysOverride(null);
      playRecordedSaxophoneSample({
        writtenNote: SAX_FINGERINGS[idx].writtenNote,
        variant,
        duration: 1.2,
      });
      step++;
    }, 700);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--c-background)',
      }}
    >
      <SharedFloatingHeader
        title="Saxophone Practice"
        onBack={() => NavigationDispatcher.pop()}
        scrollContainerRef={saxScrollRef}
      />

      <div
        ref={saxScrollRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          background: 'var(--c-background)',
          color: 'var(--c-text-primary)',
          fontFamily: 'var(--studio-font-display)',
          overflowY: 'auto',
          padding:
            'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 92px) 20px 100px 20px',
          boxSizing: 'border-box',
        }}
      >
        {/* Title & Transposition Variant Tabs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >

        {/* Sax Variant Selector */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: 4,
            borderRadius: 12,
            gap: 4,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {(Object.keys(SAX_VARIANTS) as SaxophoneVariant[]).map((v) => {
            const isActive = variant === v;
            return (
              <button
                key={v}
                onClick={() => {
                  setVariant(v);
                  setActiveKeysOverride(null);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? '#f59e0b' : 'transparent',
                  color: isActive ? '#000' : '#a1a1aa',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {SAX_VARIANTS[v].name.split(' ')[0]} ({SAX_VARIANTS[v].key})
              </button>
            );
          })}
        </div>

        {/* Practice Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 6,
            marginTop: 4,
          }}
        >
          {[
            { id: 'free', label: 'Free Play' },
            { id: 'learn', label: 'Learn Notes' },
            { id: 'quiz', label: 'Quiz' },
            { id: 'playback', label: 'Playback' },
            { id: 'scales', label: 'Scales' },
            { id: 'exercises', label: 'Exercises' },
          ].map((m) => {
            const isActive = practiceMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setPracticeMode(m.id as SaxPracticeMode);
                  setActiveKeysOverride(null);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: isActive ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                  background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(24,24,27,0.6)',
                  color: isActive ? '#f59e0b' : '#a1a1aa',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Saxophone Card */}
      <div
        style={{
          background: 'rgba(24, 24, 27, 0.8)',
          borderRadius: 20,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          marginBottom: 20,
        }}
      >
        {/* Mode Banner / Target info */}
        {practiceMode === 'quiz' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 360,
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                QUIZ TARGET NOTE
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                {SAX_FINGERINGS[quizTargetIdx].displayNote}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#a1a1aa' }}>SCORE</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>{quizScore}</div>
              <div style={{ fontSize: 10, color: '#f59e0b' }}>Streak: {quizStreak} 🔥</div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 360,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                }}
              >
                Written Pitch
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
                {currentFingering.displayNote}
              </div>
              <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                Concert Pitch: {concertNote}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handlePlaySound}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                volume_up
              </span>
            </motion.button>
          </div>
        )}

        {/* Note Steppers & Playback Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            maxWidth: 360,
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => handleNoteChange(selectedNoteIdx - 1)}
            disabled={selectedNoteIdx === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: selectedNoteIdx === 0 ? 0.4 : 1,
            }}
          >
            ◄ Prev Note
          </button>

          {practiceMode === 'scales' || practiceMode === 'playback' ? (
            <button
              onClick={startScalePlayback}
              disabled={isPlayingSequence}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: '#f59e0b',
                border: 'none',
                color: '#000',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {isPlayingSequence ? 'Playing...' : 'Play Scale'}
            </button>
          ) : (
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              {selectedNoteIdx + 1} / {SAX_FINGERINGS.length}
            </span>
          )}

          <button
            onClick={() => handleNoteChange(selectedNoteIdx + 1)}
            disabled={selectedNoteIdx === SAX_FINGERINGS.length - 1}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: selectedNoteIdx === SAX_FINGERINGS.length - 1 ? 0.4 : 1,
            }}
          >
            Next Note ►
          </button>
        </div>

        {/* Interactive Vector Saxophone Graphic */}
        <SaxophoneView
          fingering={currentFingering}
          activeKeys={activeKeysOverride || undefined}
          onKeyToggle={handleKeyToggle}
          variantName={SAX_VARIANTS[variant].name}
          accentColor="#f59e0b"
        />
      </div>
    </div>
    </div>
  );
};
