import React from 'react';
import { transitionHistory } from '@workspace/livex-core';

export default function StateMachineVisualizer() {
  const history = transitionHistory || [];

  return (
    <div className="bg-black border border-outline-variant/10 p-6 rounded-2xl space-y-8">
      {history.length === 0 ? (
        <div className="text-on-surface-variant/30 text-xs italic">
          No transitions recorded yet. Standing by.
        </div>
      ) : (
        [...history]
          .slice(-5)
          .reverse()
          .map((t, idx, arr) => {
            const isCurrent = idx === 0;
            const isLastItem = idx === arr.length - 1;

            let dotColor = 'bg-[#484848]';
            let ringColor = 'bg-[#484848]/20';
            let stateColor = 'text-on-surface-variant';

            if (isCurrent) {
              dotColor = 'bg-tertiary';
              ringColor = 'bg-tertiary/20';
              stateColor = 'text-on-surface';
            } else if (
              [
                'failed',
                'download_failed',
                'sha_failed',
                'eligibility_failed',
                'install_failed',
                'signature_mismatch',
                'versionCode_low',
              ].includes(t.to)
            ) {
              dotColor = 'bg-red-500';
              ringColor = 'bg-red-500/20';
              stateColor = 'text-red-400';
            } else {
              dotColor = 'bg-green-500';
              ringColor = 'bg-green-500/20';
              stateColor = 'text-green-400';
            }

            return (
              <div key={idx} className="relative flex gap-6 state-line">
                {/* Vertical connecting line */}
                {!isLastItem && (
                  <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-[#484848]/30 z-0" />
                )}

                <div
                  className={`z-10 w-6 h-6 rounded-full ${ringColor} flex items-center justify-center shrink-0 ${isCurrent ? 'status-dot-pulse' : ''}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                </div>

                <div>
                  <h4 className={`font-bold text-sm ${stateColor} flex items-center gap-2`}>
                    {t.to}
                    {isCurrent && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary border border-tertiary/20">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Reason: {t.reason} &bull;{' '}
                    <span className="font-mono text-[10px]">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </p>
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}
