import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useLocalStageSyncStore,
  createStageRoomToken,
  parseStageRoomToken,
  generateQrSvg,
  type SongPreset,
  type LocalStageSyncState,
  requestCameraPermission,
} from '@workspace/livex-core';
import { StageSyncOffsetCalibration } from './StageSyncOffsetCalibration';
import { ScanSessionQRModal } from '../../sync/ScanSessionQRModal';

export type StageRoomTab = 'host' | 'join' | 'calibration';

export interface LocalStageRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset?: SongPreset | null;
}

export const LocalStageRoomModal: React.FC<LocalStageRoomModalProps> = ({
  isOpen,
  onClose,
  preset,
}) => {
  const role = useLocalStageSyncStore((s: LocalStageSyncState) => s.role);
  const room = useLocalStageSyncStore((s: LocalStageSyncState) => s.room);
  const peers = useLocalStageSyncStore((s: LocalStageSyncState) => s.peers);
  const startHosting = useLocalStageSyncStore((s: LocalStageSyncState) => s.startHosting);
  const joinRoom = useLocalStageSyncStore((s: LocalStageSyncState) => s.joinRoom);
  const leaveRoom = useLocalStageSyncStore((s: LocalStageSyncState) => s.leaveRoom);

  const [activeTab, setActiveTab] = useState<StageRoomTab>('host');
  const [manualCode, setManualCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Auto-switch tab only on initial active role transitions
  const prevRoleRef = useRef(role);
  useEffect(() => {
    if (prevRoleRef.current !== role) {
      prevRoleRef.current = role;
      if (role === 'host') setActiveTab('host');
      else if (role === 'follower') setActiveTab('join');
    }
  }, [role]);

  // Reset errors on close
  useEffect(() => {
    if (!isOpen) {
      setJoinError(null);
      setIsScanModalOpen(false);
    }
  }, [isOpen]);

  // Generate SVG QR Code for current active room
  const qrSvg = useMemo(() => {
    if (!room || role !== 'host') return null;
    try {
      const token = createStageRoomToken(room);
      return generateQrSvg(token, {
        size: 210,
        fgColor: '#000000',
        bgColor: '#FFFFFF',
      });
    } catch (_) {
      return null;
    }
  }, [room, role]);

  const handleStartHosting = () => {
    startHosting({
      hostName: 'Stage Leader',
      songId: preset?.id,
      songTitle: preset?.name || 'Live Stage',
      bpm: preset?.bpm || preset?.speed || 120,
    });
  };

  const handleManualJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoinError(null);
    if (!manualCode.trim()) return;

    const parsed = parseStageRoomToken(manualCode.trim());
    if (!parsed) {
      setJoinError('Invalid room code. Format: LX-XXX or 3-8 characters.');
      return;
    }

    const success = joinRoom(parsed.roomId);
    if (success) {
      setManualCode('');
    } else {
      setJoinError('Could not connect to room. Verify both devices are on the same Wi-Fi or hotspot.');
    }
  };

  const handleCopyCode = async () => {
    if (!room?.roomId) return;
    try {
      await navigator.clipboard.writeText(room.roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {}
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        data-testid="local-stage-room-modal"
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                <span className="material-symbols-rounded text-xl">sensors</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  Local Stage Rooms
                </h3>
                <p className="text-xs text-neutral-400">
                  Ultra-low-latency P2P sync over Wi-Fi / Hotspot
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="close-stage-room-modal"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-rounded text-lg">close</span>
            </button>
          </div>

          {/* Mode & Settings Selector Tabs */}
          <div className={`grid p-1 rounded-2xl bg-white/5 border border-white/10 ${role === 'idle' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {role === 'idle' ? (
              <>
                <button
                  type="button"
                  data-testid="stage-tab-host"
                  onClick={() => setActiveTab('host')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'host'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Host Session
                </button>
                <button
                  type="button"
                  data-testid="stage-tab-join"
                  onClick={() => setActiveTab('join')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'join'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Join Session
                </button>
                <button
                  type="button"
                  data-testid="stage-tab-calibration"
                  onClick={() => setActiveTab('calibration')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'calibration'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Calibration
                </button>
              </>
            ) : role === 'host' ? (
              <>
                <button
                  type="button"
                  data-testid="stage-tab-host"
                  onClick={() => setActiveTab('host')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'host'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Host Room
                </button>
                <button
                  type="button"
                  data-testid="stage-tab-calibration"
                  onClick={() => setActiveTab('calibration')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'calibration'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Calibration
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="stage-tab-join"
                  onClick={() => setActiveTab('join')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'join'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Joined Session
                </button>
                <button
                  type="button"
                  data-testid="stage-tab-calibration"
                  onClick={() => setActiveTab('calibration')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'calibration'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Calibration
                </button>
              </>
            )}
          </div>

          {/* ── TAB 1: HOST SESSION ────────────────────────────────────── */}
          {activeTab === 'host' && (
            <div className="flex flex-col gap-4">
              {role !== 'host' ? (
                <div className="flex flex-col items-center gap-3 py-6 px-4 text-center rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <span className="material-symbols-rounded text-2xl">wifi_tethering</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Ready to Lead Stage Sync?</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                      Creates an instant offline room on your local network. Bandmates scan your QR code to follow your setlist, chords, and downbeats in sub-15ms.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-start-hosting"
                    onClick={handleStartHosting}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-95 font-bold text-xs tracking-tight transition-all flex items-center gap-2 mt-2"
                  >
                    <span className="material-symbols-rounded text-base">sensors</span>
                    <span>Host Stage Room</span>
                  </button>
                </div>
              ) : (
                /* Active Host Panel */
                <div className="flex flex-col items-center gap-4">
                  {/* Status Banner */}
                  <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400">Hosting Active Room</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-300">
                      {room?.activeSongTitle}
                    </span>
                  </div>

                  {/* QR Code Card */}
                  {qrSvg && (
                    <div className="p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                      <div
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                        className="w-[200px] h-[200px] flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                      />
                    </div>
                  )}

                  {/* Join Code Display with Copy */}
                  <div className="flex items-center gap-2">
                    <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 font-mono text-lg font-black tracking-widest text-white">
                      {room?.roomId}
                    </div>
                    <button
                      type="button"
                      data-testid="copy-room-code-btn"
                      onClick={handleCopyCode}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-rounded text-sm">
                        {copiedCode ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Connected Peers Counter */}
                  <div className="w-full p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-300">Connected Bandmates</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {peers.length > 0 ? `🟢 ${peers.length} linked` : '⏳ Waiting for peers...'}
                      </span>
                    </div>
                    {peers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {peers.map((p) => (
                          <div
                            key={p.peerId}
                            className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-medium text-white flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{p.peerName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500">
                        Ask musicians to open Livex and scan the QR code above or enter code{' '}
                        <strong className="text-white font-mono">{room?.roomId}</strong>.
                      </p>
                    )}
                  </div>

                  {/* End Room Action */}
                  <button
                    type="button"
                    data-testid="btn-end-hosting"
                    onClick={leaveRoom}
                    className="w-full min-h-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/20 text-red-400 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-base">logout</span>
                    <span>End Stage Room</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: JOIN SESSION ────────────────────────────────────── */}
          {activeTab === 'join' && (
            <div className="flex flex-col gap-4">
              {role === 'follower' && room ? (
                /* Connected as Follower */
                <div className="flex flex-col items-center gap-4 py-3">
                  <div className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400">
                          Linked to {room.hostName}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-neutral-400">
                        Room {room.roomId}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1">
                      <span className="text-sm font-extrabold text-white">
                        {room.activeSongTitle}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {room.bpm} BPM • {room.timeSignature[0]}/{room.timeSignature[1]} •{' '}
                        {room.isPlaying ? '▶ Playing' : '⏸ Paused'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 text-center">
                    Your teleprompter and chord progression will automatically mirror the host in real time. Use the calibration slider below if your headphones have wireless latency.
                  </p>

                  <button
                    type="button"
                    data-testid="btn-leave-room"
                    onClick={leaveRoom}
                    className="w-full min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-base">logout</span>
                    <span>Leave Stage Room</span>
                  </button>
                </div>
              ) : (
                /* Join Form & Camera Scan */
                <div className="flex flex-col gap-3.5">
                  <button
                    type="button"
                    data-testid="btn-scan-qr"
                    onClick={() => setIsScanModalOpen(true)}
                    className="min-h-[48px] w-full rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.99] border border-white/15 text-white font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-lg">qr_code_scanner</span>
                    <span>Scan QR to Join</span>
                  </button>

                  <div className="flex items-center gap-2.5 my-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-neutral-500">
                      or enter code
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Manual Code Form */}
                  <form onSubmit={handleManualJoin} className="flex gap-2">
                    <input
                      type="text"
                      data-testid="input-stage-room-code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      placeholder="LX-7M8"
                      maxLength={12}
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-white/5 border border-white/15 font-mono text-sm uppercase font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="submit"
                      data-testid="btn-join-room-code"
                      disabled={!manualCode.trim()}
                      className="min-h-[44px] px-5 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-95 font-bold text-xs tracking-tight transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Join
                    </button>
                  </form>

                  {joinError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {joinError}
                    </div>
                  )}

                  {/* Dedicated Hardware QR Scanner Modal */}
                  <ScanSessionQRModal
                    isOpen={isScanModalOpen}
                    onClose={() => setIsScanModalOpen(false)}
                    onSuccess={() => setIsScanModalOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: DELAY CALIBRATION ─────────────────────────────── */}
          {activeTab === 'calibration' && (
            <div className="flex flex-col gap-3 py-1">
              <div className="px-1 text-xs text-neutral-400">
                Fine-tune acoustic latency and stage monitor alignment across wireless headphones and in-ear systems.
              </div>
              <StageSyncOffsetCalibration compact={false} showPulseTest={true} />
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const StageRoomPortalModal = LocalStageRoomModal;
export type StageRoomPortalModalProps = LocalStageRoomModalProps;
