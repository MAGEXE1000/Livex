import { useStudioPreferences } from '@workspace/livex-core';
import React from 'react';
import {
  ChordexSongsMockup,
  ChordexLibraryMockup,
  ChordexChordsMockup,
  DrumexMockup,
  StagexMockup,
  GroovexMockup,
  VocalexMockup,
  PreferencesMockup,
} from './StudioScreenMockups';

export default function Landing3DMarquee() {
  const { preferences } = useStudioPreferences();
  const isReduced = preferences.reduceMotion;

  const mockups = [
    { name: 'Chordex Songs', comp: ChordexSongsMockup },
    { name: 'Chordex Library', comp: ChordexLibraryMockup },
    { name: 'Chordex Chords', comp: ChordexChordsMockup },
    { name: 'Drumex Sequencer', comp: DrumexMockup },
    { name: 'Stagex Stage Plot', comp: StagexMockup },
    { name: 'Groovex Mixer', comp: GroovexMockup },
    { name: 'Vocalex Tuner', comp: VocalexMockup },
    { name: 'Preferences', comp: PreferencesMockup },
  ];

  // Duplicate for seamless loop
  const list = [...mockups, ...mockups, ...mockups];

  return (
    <div
      className="w-full overflow-hidden py-20 relative border-t border-b select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--landing-surface-subtle)',
        borderColor: 'var(--landing-border)',
      }}
    >
      {/* Radical fade masks */}
      <div
        className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none transition-colors duration-200"
        style={{
          background: 'linear-gradient(to right, var(--landing-marquee-mask), transparent)',
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none transition-colors duration-200"
        style={{
          background: 'linear-gradient(to left, var(--landing-marquee-mask), transparent)',
        }}
      />

      {/* Perspective view container */}
      <div className="w-full flex justify-center py-4" style={{ perspective: '1200px' }}>
        <div
          className="flex gap-6 relative"
          style={{
            transform: isReduced ? 'none' : 'rotateX(20deg) rotateY(-6deg) rotateZ(-4deg)',
            transformStyle: 'preserve-3d',
            width: '100%',
          }}
        >
          {/* Marquee Track */}
          <div className="animate-marquee-scroll flex gap-6">
            {list.map((item, idx) => {
              const Comp = item.comp;
              return (
                <div
                  key={idx}
                  className="w-[240px] h-[160px] md:w-[300px] md:h-[200px] rounded-2xl border p-2 flex flex-col justify-between shadow-xl transition-all duration-300 hover:scale-[1.02] flex-shrink-0"
                  style={{
                    transformStyle: 'preserve-3d',
                    backgroundColor: 'var(--landing-surface-card)',
                    borderColor: 'var(--landing-border)',
                  }}
                >
                  <div className="flex-1 rounded-xl overflow-hidden bg-black border relative mockup-viewport"
                    style={{ borderColor: 'var(--landing-border)' }}
                  >
                    <Comp />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
