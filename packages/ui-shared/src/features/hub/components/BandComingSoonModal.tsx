import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Wifi, QrCode, Clock, X, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '@workspace/livex-core';

export interface BandComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStageRooms?: () => void;
}

export const BandComingSoonModal: React.FC<BandComingSoonModalProps> = ({
  isOpen,
  onClose,
  onOpenStageRooms,
}) => {
  const isLight = useSettingsStore((s) => s.settings.theme === 'light');
  const isSpanish = useSettingsStore((s) => s.settings.language === 'es');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            data-testid="band-coming-soon-backdrop"
          />

          {/* Modal Surface */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col gap-5 z-10 overflow-hidden"
            style={{
              backgroundColor: isLight ? '#ffffff' : '#09090b',
              color: isLight ? '#09090b' : '#ffffff',
            }}
            data-testid="band-coming-soon-modal"
          >
            {/* Top Close */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/10">
                {isSpanish ? 'Próximamente' : 'Coming Soon'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Icon & Title */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--studio-font-display)' }}>
                  {isSpanish ? 'Espacios de Banda en la Nube' : 'Cloud Band Workspaces'}
                </h3>
                <p className="text-xs text-white/60 mt-1 max-w-[320px] mx-auto leading-relaxed">
                  {isSpanish
                    ? 'Los espacios de banda en la nube llegarán en una próxima actualización. Para tus conciertos y ensayos en vivo, utiliza las nuevas Salas de Sincronización Local sin necesidad de internet.'
                    : 'Cloud Band Workspaces are arriving in an upcoming release. Use Local Stage Rooms for instant, offline gig synchronization.'}
                </p>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="space-y-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3.5 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Wifi className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div>
                  <p className="font-bold">{isSpanish ? '100% Offline para Escenario' : '100% Offline for Stage'}</p>
                  <p className="text-[11px] text-white/50">{isSpanish ? 'Funciona con Hotspot o Wi-Fi local sin conexión exterior' : 'Operates via local Wi-Fi or hotspot with zero internet required'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div>
                  <p className="font-bold">{isSpanish ? 'Emparejamiento QR Instantáneo' : 'Instant QR Pairing'}</p>
                  <p className="text-[11px] text-white/50">{isSpanish ? 'Escanea el código del anfitrión para sincronizar repertorio y compases' : 'Scan host QR code to lock into setlists, bars, and beats'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div>
                  <p className="font-bold">{isSpanish ? 'Calibración de Latencia' : 'Millisecond Calibration'}</p>
                  <p className="text-[11px] text-white/50">{isSpanish ? 'Ajusta el retardo (-250ms a +250ms) para cero desfase acústico' : 'Fine-tune offset (-250ms to +250ms) for absolute sync parity'}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              {onOpenStageRooms && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStageRooms();
                  }}
                  className="w-full h-11 rounded-2xl bg-white text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  data-testid="btn-open-local-stage-rooms"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isSpanish ? 'Abrir Salas de Sincronización Local' : 'Open Local Stage Rooms'}</span>
                  <ChevronRight className="w-4 h-4 ml-auto mr-1 opacity-60" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
