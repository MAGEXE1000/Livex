import React, { useState } from 'react';
import {
  useBandStore,
  type Band,
  type BandMember,
} from '@workspace/livex-core';
import { StudioIcon } from '../../../shared/icons/StudioIcon';
import { Dialog } from '../../../shared/design-system/dialogs';
import { toast } from '../../../components/ui/sonner';

export interface BandHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  isAmoled: boolean;
  accent: { from: string; to: string };
  lang: string;
  currentUserName?: string;
  currentUserId?: string;
}

export const BandHubModal: React.FC<BandHubModalProps> = ({
  isOpen,
  onClose,
  isLight,
  isAmoled,
  accent,
  lang,
  currentUserName = 'Musician',
  currentUserId = 'local-user',
}) => {
  const isSpanish = lang === 'es';
  const {
    currentBand,
    members,
    events,
    createBand,
    joinBandByCode,
    leaveBand,
    addEvent,
    deleteEvent,
    isLoading,
    error,
    setError,
  } = useBandStore();

  const [noBandTab, setNoBandTab] = useState<'create' | 'join'>('create');
  const [bandTab, setBandTab] = useState<'members' | 'calendar'>('members');
  const [bandNameInput, setBandNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'rehearsal' | 'gig' | 'recording' | 'meeting'>('rehearsal');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [eventTime, setEventTime] = useState('19:00');
  const [eventCallTime, setEventCallTime] = useState('18:30');
  const [eventLocation, setEventLocation] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = bandNameInput.trim();
    if (!name) return;

    createBand(name, currentUserId, currentUserName);
    setBandNameInput('');
    setBandTab('members');
    showToast(isSpanish ? '¡Banda creada exitosamente!' : 'Band created successfully!');
  };

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    const res = await joinBandByCode(code, currentUserId, currentUserName);
    if (res.success) {
      setJoinCodeInput('');
      setBandTab('members');
      showToast(isSpanish ? '¡Te has unido a la banda!' : 'Joined band successfully!');
    }
  };

  const handleCopyCode = () => {
    if (!currentBand?.code) return;
    try {
      navigator.clipboard.writeText(currentBand.code);
      setCopiedCode(true);
      showToast(isSpanish ? 'Código copiado al portapapeles' : 'Code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {}
  };

  const handleSaveEvent = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentBand || !eventTitle.trim()) return;

    addEvent({
      bandId: currentBand.id,
      title: eventTitle.trim(),
      type: eventType,
      date: eventDate,
      time: eventTime.trim() || undefined,
      callTime: eventCallTime.trim() || undefined,
      location: eventLocation.trim() || undefined,
      notes: eventNotes.trim() || undefined,
      createdBy: currentUserId,
    });

    setEventTitle('');
    setEventLocation('');
    setEventNotes('');
    setShowAddEvent(false);
    showToast(isSpanish ? '¡Evento agregado al calendario!' : 'Event added to calendar!');
  };

  const isLeader = currentBand?.leaderId === currentUserId;

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setError(null);
        setShowLeaveConfirm(false);
        setShowAddEvent(false);
        onClose();
      }}
      size="md"
      hideCloseButton={false}
      className="max-w-md"
    >
      <div
        data-testid="band-hub-modal"
        className="flex flex-col gap-3.5 p-1 select-none"
        style={{ color: 'var(--c-text-primary)' }}
      >
        {/* Header Title with Dual-Person / Team Icon */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${accent.from}24, ${accent.to}14)`,
              border: `1px solid ${accent.from}40`,
              color: accent.from,
            }}
          >
            <StudioIcon name="groups" size={22} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
              {currentBand
                ? currentBand.name
                : isSpanish
                  ? 'Banda y Equipo'
                  : 'Band & Team Hub'}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {currentBand
                ? isSpanish
                  ? `${members.length} miembros • Código: ${currentBand.code}`
                  : `${members.length} members • Code: ${currentBand.code}`
                : isSpanish
                  ? 'Sincroniza ensayos, conciertos y eventos de la banda'
                  : 'Sync rehearsals, gigs, and stage events with your team'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <StudioIcon name="error" size={16} />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              <StudioIcon name="close" size={14} />
            </button>
          </div>
        )}

        {/* ── VIEW 1: ACTIVE BAND PRESENTATION ── */}
        {currentBand ? (
          <div className="flex flex-col gap-3">
            {/* Join Code Card with 1-Tap Copy */}
            <div
              className="flex items-center justify-between p-3 rounded-2xl border"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
              }}
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {isSpanish ? 'Código de Invitación' : 'Band Join Code'}
                </span>
                <span
                  data-testid="band-code-display"
                  className="text-xl font-black font-mono tracking-widest mt-0.5"
                  style={{ color: accent.from }}
                >
                  {currentBand.code}
                </span>
              </div>
              <button
                type="button"
                data-testid="band-copy-code-btn"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer"
                style={{
                  background: copiedCode ? `${accent.from}22` : 'rgba(255, 255, 255, 0.08)',
                  borderColor: copiedCode ? accent.from : 'rgba(255, 255, 255, 0.15)',
                  color: copiedCode ? accent.from : 'var(--c-text-primary)',
                }}
              >
                <StudioIcon name={copiedCode ? 'check' : 'content_copy'} size={15} />
                <span>{copiedCode ? (isSpanish ? 'Copiado' : 'Copied') : (isSpanish ? 'Copiar' : 'Copy')}</span>
              </button>
            </div>

            {/* Segmented Sub-Navigation (Repertoire / Calendar / Members) */}
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
              }}
            >
              <button
                type="button"
                data-testid="band-tab-members"
                onClick={() => {
                  setBandTab('members');
                  setShowAddEvent(false);
                }}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1"
                style={{
                  background: bandTab === 'members' ? accent.from : 'transparent',
                  color: bandTab === 'members' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: bandTab === 'members' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                <StudioIcon name="groups" size={13} />
                <span>{isSpanish ? 'Miembros' : 'Members'} ({members.length})</span>
              </button>
              <button
                type="button"
                data-testid="band-tab-calendar"
                onClick={() => {
                  setBandTab('calendar');
                  setShowAddEvent(false);
                }}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1"
                style={{
                  background: bandTab === 'calendar' ? accent.from : 'transparent',
                  color: bandTab === 'calendar' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: bandTab === 'calendar' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                <StudioIcon name="calendar_month" size={13} />
                <span>{isSpanish ? 'Gigs / Fechas' : 'Gigs'} ({events.length})</span>
              </button>
            </div>


            {/* ── SUB-VIEW 2: CALENDAR / GIGS & REHEARSALS ── */}
            {bandTab === 'calendar' && (
              <div className="flex flex-col gap-2.5">
                {/* Calendar Header Action */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {isSpanish ? 'Calendario de Ensayos y Gigs' : 'Rehearsal & Gig Schedule'}
                  </span>
                  <button
                    type="button"
                    data-testid="band-add-event-btn"
                    onClick={() => setShowAddEvent((v) => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                    style={{
                      background: showAddEvent ? `${accent.from}22` : 'rgba(255, 255, 255, 0.08)',
                      borderColor: showAddEvent ? accent.from : 'rgba(255, 255, 255, 0.12)',
                      borderWidth: '1px',
                      color: showAddEvent ? accent.from : 'var(--c-text-primary)',
                    }}
                  >
                    <StudioIcon name={showAddEvent ? 'close' : 'add'} size={14} />
                    <span>{showAddEvent ? (isSpanish ? 'Cerrar' : 'Close') : (isSpanish ? '+ Evento' : '+ Add Event')}</span>
                  </button>
                </div>

                {/* Add Event Form */}
                {showAddEvent && (
                  <form
                    onSubmit={handleSaveEvent}
                    data-testid="band-add-event-form"
                    className="p-3 rounded-xl border flex flex-col gap-2.5"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-zinc-400">
                        {isSpanish ? 'Título del Evento' : 'Event Title'}
                      </label>
                      <input
                        type="text"
                        data-testid="event-title-input"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder={isSpanish ? 'Ej. Ensayo General / Concierto en Vivo' : 'e.g. Full Rehearsal / Saturday Gig'}
                        className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition"
                        style={{
                          background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                          color: 'var(--c-text-primary)',
                        }}
                        autoFocus
                      />
                    </div>

                    {/* Event Type & Date Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-zinc-400">
                          {isSpanish ? 'Tipo de Evento' : 'Event Type'}
                        </label>
                        <select
                          value={eventType}
                          onChange={(e: any) => setEventType(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none"
                          style={{
                            background: isLight ? '#f4f4f5' : '#1e1e24',
                            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                            color: 'var(--c-text-primary)',
                          }}
                        >
                          <option value="rehearsal">{isSpanish ? '🎵 Ensayo' : '🎵 Rehearsal'}</option>
                          <option value="gig">{isSpanish ? '⭐ Concierto / Gig' : '⭐ Gig / Concert'}</option>
                          <option value="recording">{isSpanish ? '🎙️ Grabación' : '🎙️ Recording'}</option>
                          <option value="meeting">{isSpanish ? '💬 Reunión' : '💬 Meeting'}</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-zinc-400">
                          {isSpanish ? 'Fecha' : 'Date'}
                        </label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-2.5 py-1 rounded-lg border text-xs focus:outline-none"
                          style={{
                            background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                            color: 'var(--c-text-primary)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Time & Call Time Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-zinc-400">
                          {isSpanish ? 'Hora del Evento' : 'Event Time'}
                        </label>
                        <input
                          type="text"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          placeholder="19:00"
                          className="w-full px-2.5 py-1 rounded-lg border text-xs focus:outline-none font-mono"
                          style={{
                            background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                            color: 'var(--c-text-primary)',
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-zinc-400">
                          {isSpanish ? 'Call Time / Llegada' : 'Call Time'}
                        </label>
                        <input
                          type="text"
                          value={eventCallTime}
                          onChange={(e) => setEventCallTime(e.target.value)}
                          placeholder="18:30"
                          className="w-full px-2.5 py-1 rounded-lg border text-xs focus:outline-none font-mono"
                          style={{
                            background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                            color: 'var(--c-text-primary)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Location & Venue */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-400">
                        {isSpanish ? 'Ubicación / Lugar' : 'Location / Venue'}
                      </label>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder={isSpanish ? 'Ej. Sala de Ensayo B / Club Nocturno' : 'e.g. Studio Room B / Main Stage'}
                        className="w-full px-2.5 py-1 rounded-lg border text-xs focus:outline-none"
                        style={{
                          background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                          color: 'var(--c-text-primary)',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!eventTitle.trim()}
                      className="w-full py-2 rounded-lg font-bold text-xs text-white transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md mt-1"
                      style={{ background: accent.from }}
                    >
                      {isSpanish ? 'Guardar Evento en Calendario' : 'Save Event to Calendar'}
                    </button>
                  </form>
                )}

                {/* Events List */}
                {events.length === 0 ? (
                  <div
                    data-testid="band-empty-events"
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border text-center"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.06))',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--c-text-tertiary)' }}
                    >
                      <StudioIcon name="calendar_month" size={20} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: 'var(--c-text-secondary)' }}>
                      {isSpanish ? 'Sin eventos programados' : 'No scheduled events yet'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {isSpanish
                        ? 'Agrega fechas de ensayos, conciertos y call times para todo el equipo.'
                        : 'Schedule rehearsal dates, gig call times, and stage notes for your squad.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {events.map((ev) => {
                      const typeConfig = {
                        rehearsal: { icon: 'music_note', label: isSpanish ? 'Ensayo' : 'Rehearsal', color: '#38bdf8' },
                        gig: { icon: 'star', label: isSpanish ? 'Concierto' : 'Gig', color: '#fbbf24' },
                        recording: { icon: 'mic', label: isSpanish ? 'Grabación' : 'Recording', color: '#f43f5e' },
                        meeting: { icon: 'chat', label: isSpanish ? 'Reunión' : 'Meeting', color: '#a855f7' },
                        other: { icon: 'event', label: isSpanish ? 'Evento' : 'Event', color: '#4ade80' },
                      }[ev.type] || { icon: 'event', label: 'Event', color: accent.from };

                      return (
                        <div
                          key={ev.id}
                          data-testid={`band-event-${ev.id}`}
                          className="flex flex-col gap-1.5 p-2.5 rounded-xl border"
                          style={{
                            background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                            borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}
                              >
                                <StudioIcon name={typeConfig.icon as any} size={14} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold truncate" style={{ color: 'var(--c-text-primary)' }}>
                                  {ev.title}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {typeConfig.label} • {ev.date}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid={`delete-event-${ev.id}`}
                              onClick={() => deleteEvent(ev.id)}
                              className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer transition"
                              title={isSpanish ? 'Eliminar evento' : 'Delete event'}
                            >
                              <StudioIcon name="delete" size={13} />
                            </button>
                          </div>

                          {/* Time, Call Time & Location Chips */}
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-300 pt-0.5">
                            {ev.time && (
                              <span className="flex items-center gap-1 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                <StudioIcon name="schedule" size={11} />
                                {ev.time}
                              </span>
                            )}
                            {ev.callTime && (
                              <span className="flex items-center gap-1 font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <StudioIcon name="timer" size={11} />
                                Call: {ev.callTime}
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1 truncate bg-white/5 px-1.5 py-0.5 rounded">
                                <StudioIcon name="location_on" size={11} />
                                {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SUB-VIEW 3: MEMBERS / ROSTER ── */}
            {bandTab === 'members' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {isSpanish ? 'Miembros del Grupo' : 'Band Members'} ({members.length})
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const isLeaderMember = member.role === 'leader';
                    return (
                      <div
                        key={member.id}
                        data-testid={`band-member-${member.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl border"
                        style={{
                          background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                          borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: isLeaderMember ? `${accent.from}30` : 'rgba(255, 255, 255, 0.1)',
                              color: isLeaderMember ? accent.from : 'var(--c-text-primary)',
                            }}
                          >
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--c-text-primary)' }}>
                              {member.displayName}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {member.userId === currentUserId
                                ? isSpanish ? '(Tú)' : '(You)'
                                : isLeaderMember ? (isSpanish ? 'Líder' : 'Leader') : (isSpanish ? 'Miembro' : 'Member')}
                            </span>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                          style={{
                            background: isLeaderMember ? `${accent.from}20` : 'rgba(255, 255, 255, 0.06)',
                            color: isLeaderMember ? accent.from : 'var(--c-text-secondary)',
                            border: isLeaderMember ? `1px solid ${accent.from}35` : '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          {isLeaderMember ? (isSpanish ? 'Líder' : 'Leader') : (isSpanish ? 'Miembro' : 'Member')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leave / Manage Band Footer */}
            <div className="pt-2 border-t border-white/10">
              {showLeaveConfirm ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-xs font-semibold text-rose-400">
                    {isSpanish ? '¿Salir de esta banda?' : 'Leave this band?'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowLeaveConfirm(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-leave-band-btn"
                      onClick={() => {
                        leaveBand();
                        setShowLeaveConfirm(false);
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {isSpanish ? 'Salir' : 'Leave'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="leave-band-btn"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                >
                  <StudioIcon name="logout" size={15} />
                  <span>{isSpanish ? 'Salir de la Banda' : 'Leave Band'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── VIEW 2: NO ACTIVE BAND (CREATE OR JOIN) ── */
          <div className="flex flex-col gap-3.5">
            {/* Segmented Control: Create vs Join */}
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--c-border, rgba(255, 255, 255, 0.08))',
              }}
            >
              <button
                type="button"
                data-testid="tab-create-band"
                onClick={() => setNoBandTab('create')}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center"
                style={{
                  background: noBandTab === 'create' ? accent.from : 'transparent',
                  color: noBandTab === 'create' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: noBandTab === 'create' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                {isSpanish ? 'Crear Banda' : 'Create Band'}
              </button>
              <button
                type="button"
                data-testid="tab-join-band"
                onClick={() => setNoBandTab('join')}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer text-center"
                style={{
                  background: noBandTab === 'join' ? accent.from : 'transparent',
                  color: noBandTab === 'join' ? '#ffffff' : 'var(--c-text-secondary)',
                  boxShadow: noBandTab === 'join' ? `0 2px 8px ${accent.from}33` : 'none',
                }}
              >
                {isSpanish ? 'Unirse con Código' : 'Join with Code'}
              </button>
            </div>

            {/* CREATE BAND FORM */}
            {noBandTab === 'create' && (
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    {isSpanish ? 'Nombre de la Banda / Grupo' : 'Band or Group Name'}
                  </label>
                  <input
                    type="text"
                    data-testid="band-name-input"
                    value={bandNameInput}
                    onChange={(e) => setBandNameInput(e.target.value)}
                    placeholder={isSpanish ? 'Ej. The Midnight Echoes' : 'e.g. The Midnight Echoes'}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                      color: 'var(--c-text-primary)',
                    }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  data-testid="create-band-submit-btn"
                  disabled={!bandNameInput.trim()}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md"
                  style={{
                    background: accent.from,
                    boxShadow: `0 4px 14px ${accent.from}40`,
                  }}
                >
                  {isSpanish ? 'Crear Banda y Generar Código' : 'Create Band & Generate Code'}
                </button>
              </form>
            )}

            {/* JOIN BAND FORM */}
            {noBandTab === 'join' && (
              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    {isSpanish ? 'Código de 6 Caracteres' : '6-Character Join Code'}
                  </label>
                  <input
                    type="text"
                    data-testid="band-join-input"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="LVX702"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-widest uppercase focus:outline-none transition"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'var(--c-border, rgba(255, 255, 255, 0.12))',
                      color: 'var(--c-text-primary)',
                    }}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  data-testid="join-band-submit-btn"
                  disabled={joinCodeInput.trim().length < 4 || isLoading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md"
                  style={{
                    background: accent.from,
                    boxShadow: `0 4px 14px ${accent.from}40`,
                  }}
                >
                  {isLoading
                    ? (isSpanish ? 'Conectando...' : 'Joining...')
                    : (isSpanish ? 'Unirse a la Banda' : 'Join Band')}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
