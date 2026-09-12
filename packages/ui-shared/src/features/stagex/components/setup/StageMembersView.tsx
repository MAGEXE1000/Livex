import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStagexStore } from '../../state/useStagexStore';
import { StageSetupDetailLayout } from './StageSetupDetailLayout';
import { useSettingsStore, useT } from '@workspace/studio-core';
import { useAppReducedMotion } from '../../../../hooks/useAppReducedMotion';


interface StageMembersViewProps {
  onBack: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

const MEMBER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export interface PredefinedTag {
  id: string;
  key: string;
  fallbackEn: string;
  fallbackEs: string;
}

export const PREDEFINED_TAGS: PredefinedTag[] = [
  {
    id: 'lead_vocals',
    key: 'tagLeadVocals',
    fallbackEn: 'Lead Vocals',
    fallbackEs: 'Voz Principal',
  },
  {
    id: 'backing_vocals',
    key: 'tagBackingVocals',
    fallbackEn: 'Backing Vocals',
    fallbackEs: 'Coros',
  },
  { id: 'guitar', key: 'tagGuitar', fallbackEn: 'Guitar', fallbackEs: 'Guitarra' },
  { id: 'bass', key: 'tagBass', fallbackEn: 'Bass', fallbackEs: 'Bajo' },
  { id: 'drums', key: 'tagDrums', fallbackEn: 'Drums', fallbackEs: 'Batería' },
  { id: 'keys', key: 'tagKeys', fallbackEn: 'Keys', fallbackEs: 'Teclados' },
  {
    id: 'foh_engineer',
    key: 'tagFohEngineer',
    fallbackEn: 'FOH Engineer',
    fallbackEs: 'Ingeniero FOH',
  },
  {
    id: 'monitor_engineer',
    key: 'tagMonitorEngineer',
    fallbackEn: 'Monitor Engineer',
    fallbackEs: 'Ingeniero de Monitores',
  },
  {
    id: 'stage_tech',
    key: 'tagStageTech',
    fallbackEn: 'Stage Technician',
    fallbackEs: 'Técnico de Escenario',
  },
  { id: 'lighting', key: 'tagLighting', fallbackEn: 'Lighting', fallbackEs: 'Iluminación' },
  { id: 'backline', key: 'tagBackline', fallbackEn: 'Backline', fallbackEs: 'Backline' },
  { id: 'production', key: 'tagProduction', fallbackEn: 'Production', fallbackEs: 'Producción' },
  {
    id: 'tour_manager',
    key: 'tagTourManager',
    fallbackEn: 'Tour Manager',
    fallbackEs: 'Tour Manager',
  },
  {
    id: 'musical_director',
    key: 'tagMusicalDirector',
    fallbackEn: 'Musical Director',
    fallbackEs: 'Director Musical',
  },
];

export function getTagLabel(tagIdOrLabel: string, isSpanish: boolean, membersTr?: any): string {
  const match = PREDEFINED_TAGS.find(
    (t) =>
      t.id === tagIdOrLabel ||
      t.fallbackEn.toLowerCase() === tagIdOrLabel.toLowerCase() ||
      t.fallbackEs.toLowerCase() === tagIdOrLabel.toLowerCase()
  );
  if (match) {
    return membersTr?.[match.key] || (isSpanish ? match.fallbackEs : match.fallbackEn);
  }
  return tagIdOrLabel;
}

export const StageMembersView: React.FC<StageMembersViewProps> = ({
  onBack,
  isLight: isLightProp,
  isAmoled: isAmoledProp,
}) => {
  const t = useT();
  const tr = t as any;
  const membersTr = tr.stagex?.setup?.members;
  const settings = useSettingsStore((s) => s.settings);
  const isSpanish = (settings.language ?? 'en') === 'es';

  const activeVis = settings.perApp?.stagex;
  const isLight =
    isLightProp !== undefined ? isLightProp : activeVis ? activeVis.theme === 'light' : false;

  const { members, addMember, updateMember, removeMember, elements, preferences } =
    useStagexStore();
  const isAmoled =
    isAmoledProp !== undefined
      ? isAmoledProp
      : !isLight && Boolean(settings.amoledMode || activeVis?.amoledMode || preferences?.amoled);
  const prefersReducedMotion = useAppReducedMotion();

  const inputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['lead_vocals']);
  const [tagLimitWarning, setTagLimitWarning] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        setTagLimitWarning(false);
        return prev.filter((t) => t !== tagId);
      }
      if (prev.length >= 3) {
        setTagLimitWarning(true);
        setTimeout(() => setTagLimitWarning(false), 2600);
        return prev;
      }
      setTagLimitWarning(false);
      return [...prev, tagId];
    });
  };

  const isAtLimit = members.length >= 8;

  // Real Reactive Metrics (2x2 Structure)
  const assignedMembersCount = useMemo(() => {
    return members.filter((m) => elements && elements.some((el: any) => el.memberId === m.id))
      .length;
  }, [members, elements]);

  const unassignedMembersCount = useMemo(() => {
    return Math.max(0, members.length - assignedMembersCount);
  }, [members.length, assignedMembersCount]);

  const stageElementsCount = useMemo(() => {
    return elements ? elements.length : 0;
  }, [elements]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isAtLimit) return;

    const firstTagLabel =
      selectedTags.length > 0 ? getTagLabel(selectedTags[0], isSpanish, membersTr) : '';
    const resolvedRole =
      customRole.trim() || firstTagLabel || (isSpanish ? 'Miembro de Banda' : 'Band Member');

    const ok = addMember({
      name: name.trim(),
      role: resolvedRole,
      tags: selectedTags.length > 0 ? [...selectedTags] : [resolvedRole],
      color,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (ok) {
      setName('');
      setSelectedTags(['lead_vocals']);
      setTagLimitWarning(false);
      setCustomRole('');
      setPhone('');
      setEmail('');
      setNotes('');
      setShowExtraDetails(false);
      // Auto-cycle color for next entry
      setColor(MEMBER_COLORS[(members.length + 1) % MEMBER_COLORS.length]);
      inputRef.current?.focus();
    }
  };

  const handleFocusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Theme Design Tokens
  const cardBg = isLight ? '#ffffff' : isAmoled ? '#000000' : 'var(--c-bg-card, #111115)';
  const cardBorder = isLight
    ? '#eaecef'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.12)'
      : 'var(--c-border, rgba(255, 255, 255, 0.08))';
  const inputBg = isLight
    ? 'rgba(246, 246, 247, 0.8)'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(255, 255, 255, 0.05)';
  const inputBorder = isLight
    ? 'rgba(0, 0, 0, 0.08)'
    : isAmoled
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.08)';

  const textPrimary = isLight ? '#09090b' : '#ffffff';
  const textSecondary = isLight ? '#71717a' : '#a1a1aa';
  const textMuted = isLight ? '#a1a1aa' : '#71717a';

  return (
    <StageSetupDetailLayout
      title={membersTr?.title || tr.stagex?.bandCrewTitle || 'Band & Crew'}
      onBack={onBack}
      isLight={isLight}
      isAmoled={isAmoled}
      toolbarActions={
        <button
          type="button"
          onClick={handleFocusInput}
          disabled={isAtLimit}
          className="relative z-10 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 touch-target-44"
          style={{
            backgroundColor: isLight ? '#000000' : '#ffffff',
            color: isLight ? '#ffffff' : '#000000',
          }}
          title={isAtLimit ? 'Capacity reached' : 'Add Member'}
          aria-label="Add Member"
          data-testid="btn-quick-add-member"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      }
    >
      <div className="space-y-4 pb-8">
        {/* ── CAPACITY WARNING BANNER (8-MEMBER TIER LIMIT) ────────── */}
        {isAtLimit && (
          <div
            className="p-3.5 rounded-[18px] border text-xs flex items-center gap-2.5 shadow-sm"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.22)',
              color: '#ef4444',
            }}
            data-testid="banner-capacity-warning"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-semibold leading-relaxed">
              Maximum member limit reached for this tier (8 members).
            </span>
          </div>
        )}

        {/* ── 1. LIGHTWEIGHT EMPTY STATE (STITCH PARITY) ────────────── */}
        {members.length === 0 && (
          <section className="text-center py-6 px-4" data-testid="band-crew-empty-state">
            <h2
              className="text-sm font-bold tracking-[0.2em] uppercase mb-2 font-sans"
              style={{ color: textSecondary }}
            >
              {membersTr?.emptyTitle || (isSpanish ? 'NO HAY MIEMBROS' : 'NO MEMBERS YET')}
            </h2>
            <p className="text-[15px] font-medium" style={{ color: textMuted }}>
              {membersTr?.emptyDesc ||
                (isSpanish
                  ? 'Ingresa un nombre y pulsa Añadir para comenzar.'
                  : 'Enter a name and tap Add to get started.')}
            </p>
          </section>
        )}

        {/* ── 2. MEMBER LIST / CURRENT ROSTER (STITCH PARITY) ───────── */}
        {members.length > 0 && (
          <section className="flex flex-col space-y-2.5" data-testid="member-roster-section">
            <div className="flex items-center justify-between px-1">
              <span
                className="text-[11px] font-bold tracking-wider uppercase font-sans"
                style={{ color: textSecondary }}
              >
                {isSpanish ? 'Plantilla Actual' : 'Current Roster'}
              </span>
              <span
                className="text-xs font-semibold font-mono"
                style={{ color: textSecondary }}
                data-testid="roster-badge"
              >
                {members.length} / 8
              </span>
            </div>

            <div className="space-y-2" data-testid="member-cards-container">
              <AnimatePresence initial={false}>
                {members.map((member) => {
                  const initials = member.name
                    .trim()
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const assignedElements = elements
                    ? elements.filter((el: any) => el.memberId === member.id)
                    : [];
                  const isAssigned = assignedElements.length > 0;
                  const assignedLabels = assignedElements
                    .map((e: any) => e.label || e.name || 'Stage Element')
                    .join(', ');

                  return (
                    <motion.div
                      key={member.id}
                      data-testid={`member-item-${member.id}`}
                      layout={!prefersReducedMotion}
                      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="p-3.5 border flex items-center justify-between transition-colors relative overflow-hidden"
                      style={{
                        borderRadius: 'var(--radius-card, 16px)',
                        backgroundColor: cardBg,
                        borderColor: 'var(--track, var(--c-border))',
                        boxShadow:
                          'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
                      }}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2 flex-1">
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
                          style={{
                            backgroundColor: member.color
                              ? `${member.color}20`
                              : isLight
                                ? '#f4f4f5'
                                : '#1f1f23',
                            borderColor: member.color || cardBorder,
                            color: member.color || textPrimary,
                          }}
                        >
                          {initials || '?'}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate"
                            style={{
                              color: textPrimary,
                              fontFamily:
                                'var(--type-title-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                              fontSize: 'var(--type-body-size, 14.5px)',
                              lineHeight: 'var(--type-body-lh, 18px)',
                              fontWeight: 600,
                              margin: 0,
                            }}
                          >
                            {member.name}
                          </p>
                          <p
                            className="text-[11px] font-medium truncate mt-0.5"
                            style={{
                              color: isAssigned ? (isLight ? '#2563eb' : '#60a5fa') : textMuted,
                              fontFamily:
                                'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                            }}
                          >
                            {isAssigned
                              ? `${isSpanish ? 'Asignado' : 'Assigned'}: ${assignedLabels}`
                              : member.role
                                ? `${member.role} • ${isSpanish ? 'Sin asignar' : 'Unassigned'}`
                                : isSpanish
                                  ? 'Posición sin asignar'
                                  : 'Unassigned position'}
                          </p>

                          {/* Member Tags Badges (Up to 3) */}
                          {(() => {
                            const displayTags =
                              member.tags && member.tags.length > 0
                                ? member.tags
                                : member.role
                                  ? [member.role]
                                  : [];
                            if (displayTags.length === 0) return null;
                            return (
                              <div
                                className="flex flex-wrap gap-1 mt-1.5"
                                data-testid={`member-tags-${member.id}`}
                              >
                                {displayTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                                    style={{
                                      borderRadius: 'var(--radius-compact, 12px)',
                                      backgroundColor: isLight
                                        ? 'rgba(0, 0, 0, 0.05)'
                                        : 'rgba(255, 255, 255, 0.08)',
                                      color: isLight ? '#27272a' : '#d4d4d8',
                                      border: '1px solid var(--track, var(--c-border))',
                                      fontFamily:
                                        'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                                      fontSize: 'var(--type-meta-size, 12px)',
                                      lineHeight: 'var(--type-meta-lh, 16px)',
                                      letterSpacing: 'var(--type-meta-tracking, 0.2px)',
                                    }}
                                    data-testid={`member-tag-badge-${tag}`}
                                  >
                                    <span>{getTagLabel(tag, isSpanish, membersTr)}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nextTags = displayTags.filter((t) => t !== tag);
                                        updateMember(member.id, { tags: nextTags });
                                      }}
                                      className="ml-0.5 hover:text-red-500 transition-colors cursor-pointer text-xs leading-none"
                                      title={isSpanish ? 'Eliminar etiqueta' : 'Remove tag'}
                                      aria-label={`Remove tag ${tag}`}
                                      data-testid={`btn-remove-tag-${member.id}-${tag}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            );
                          })()}

                          {(member.phone || member.email) && (
                            <p
                              className="text-[10px] truncate mt-1"
                              style={{ color: textSecondary }}
                            >
                              {[member.phone, member.email].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 hover:bg-red-500/10 hover:text-red-500 touch-target-44"
                        style={{ color: textSecondary }}
                        title="Remove member"
                        aria-label={`Remove ${member.name}`}
                        data-testid={`btn-remove-member-${member.id}`}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* ── 3. ADD MEMBER CARD (STITCH PARITY) ────────────────────── */}
        <section
          className="p-6 border relative overflow-hidden"
          style={{
            borderRadius: 'var(--radius-card, 16px)',
            backgroundColor: cardBg,
            borderColor: 'var(--track, var(--c-border))',
            boxShadow:
              'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
          }}
          data-testid="add-member-card"
        >
          {/* Top Specular Rim */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 12,
              right: 12,
              height: '1px',
              background: 'var(--surface-card-inset, rgba(255, 255, 255, 0.08))',
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          />

          <h3
            className="mb-3.5"
            style={{
              color: 'var(--c-text-primary, var(--text))',
              fontFamily:
                'var(--type-section-font, var(--font-title, "Inter Tight", "Inter", sans-serif))',
              fontSize: 'var(--type-section-size, 19px)',
              lineHeight: 'var(--type-section-lh, 24px)',
              fontWeight: 'var(--type-section-weight, 600)' as any,
              letterSpacing: 'var(--type-section-tracking, 0.6px)',
              margin: '0 0 14px 0',
            }}
          >
            {membersTr?.formAddTitle || (isSpanish ? 'AÑADIR MIEMBRO' : 'ADD MEMBER')}
          </h3>

          <form onSubmit={handleAdd} className="space-y-3">
            {/* Rounded Text Input with Integrated Add Button */}
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isSpanish ? 'Ingresa un nombre...' : 'Enter a name...'}
                autoComplete="off"
                disabled={isAtLimit}
                className="w-full h-14 pl-4 pr-24 py-3 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: 'var(--radius-compact, 12px)',
                  backgroundColor: inputBg,
                  borderColor: 'var(--track, var(--c-border))',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: textPrimary,
                  fontFamily: 'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
                  fontSize: 'var(--type-body-size, 14.5px)',
                }}
                data-testid="input-member-name"
              />

              <button
                type="submit"
                disabled={!name.trim() || isAtLimit}
                className="absolute right-2 h-[38px] px-4 font-semibold text-xs tracking-wide transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-target-44"
                style={{
                  borderRadius: 'var(--radius-compact, 12px)',
                  backgroundColor: isLight ? '#09090b' : '#ffffff',
                  color: isLight ? '#ffffff' : '#09090b',
                  fontFamily:
                    'var(--type-button-font, var(--studio-font-body, "Inter", sans-serif))',
                }}
                id="btn-add-member"
                data-testid="btn-add-member"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{isSpanish ? 'Añadir' : 'Add'}</span>
              </button>
            </div>

            {/* Tag Selection Header */}
            <div className="flex items-center justify-between pt-1">
              <span
                className="text-[11px] font-bold tracking-wider uppercase font-sans"
                style={{ color: textSecondary }}
              >
                {membersTr?.memberTags ||
                  (isSpanish ? 'Etiquetas del miembro (máx. 3)' : 'Member Tags (Max 3)')}
              </span>
              <span
                className="text-xs font-semibold font-mono"
                style={{
                  color:
                    selectedTags.length === 3 ? (isLight ? '#b45309' : '#facc15') : textSecondary,
                }}
                data-testid="selected-tags-count"
              >
                {selectedTags.length} / 3
              </span>
            </div>

            {/* Tag Limit Warning Banner */}
            <AnimatePresence>
              {tagLimitWarning && (
                <motion.div
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border"
                  style={{
                    backgroundColor: isLight
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    color: isLight ? '#b45309' : '#fbbf24',
                  }}
                  data-testid="tag-limit-warning"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    {membersTr?.maxTagsReached ||
                      (isSpanish
                        ? 'Se alcanzó el límite de 3 etiquetas por miembro'
                        : 'Maximum 3 tags per member reached')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Predefined Tag Selector Chips */}
            <div
              className="flex items-center gap-1.5 flex-wrap pt-0.5"
              data-testid="tag-selector-container"
            >
              {PREDEFINED_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                const label = getTagLabel(tag.id, isSpanish, membersTr);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className="px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border active:scale-95 flex items-center gap-1"
                    style={{
                      borderRadius: 'var(--radius-compact, 12px)',
                      fontFamily:
                        'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                      fontSize: 'var(--type-meta-size, 12px)',
                      lineHeight: 'var(--type-meta-lh, 16px)',
                      letterSpacing: 'var(--type-meta-tracking, 0.2px)',
                      backgroundColor: isSelected
                        ? isLight
                          ? '#09090b'
                          : '#ffffff'
                        : isLight
                          ? 'rgba(0, 0, 0, 0.03)'
                          : 'rgba(255, 255, 255, 0.04)',
                      borderColor: isSelected
                        ? isLight
                          ? '#09090b'
                          : '#ffffff'
                        : 'var(--track, var(--c-border))',
                      color: isSelected ? (isLight ? '#ffffff' : '#09090b') : textSecondary,
                    }}
                    data-testid={`tag-chip-${tag.id}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}

              {/* Extra Details Toggle Button */}
              <button
                type="button"
                onClick={() => setShowExtraDetails((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border active:scale-95 flex items-center gap-1"
                style={{
                  backgroundColor: showExtraDetails
                    ? isLight
                      ? 'rgba(0, 0, 0, 0.06)'
                      : 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  borderColor: inputBorder,
                  color: textSecondary,
                }}
                data-testid="btn-toggle-extra-details"
              >
                <span>
                  {showExtraDetails
                    ? isSpanish
                      ? 'Menos detalles'
                      : 'Fewer details'
                    : isSpanish
                      ? '+ Detalles'
                      : '+ Details'}
                </span>
              </button>
            </div>

            {/* Optional Extended Details Drawer */}
            <AnimatePresence>
              {showExtraDetails && (
                <motion.div
                  initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder={
                        isSpanish
                          ? 'Rol personalizado (invalida etiquetas)'
                          : 'Custom Role (overrides tags)'
                      }
                      className="h-10 px-3 text-xs rounded-xl border focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textPrimary,
                      }}
                      data-testid="input-custom-role"
                    />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isSpanish ? 'Teléfono (opcional)' : 'Phone (optional)'}
                      className="h-10 px-3 text-xs rounded-xl border focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textPrimary,
                      }}
                      data-testid="input-member-phone"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isSpanish ? 'Correo electrónico (opcional)' : 'Email (optional)'}
                      className="h-10 px-3 text-xs rounded-xl border focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textPrimary,
                      }}
                      data-testid="input-member-email"
                    />
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        isSpanish
                          ? 'Notas / especificaciones de posición'
                          : 'Notes / Position specs'
                      }
                      className="h-10 px-3 text-xs rounded-xl border focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textPrimary,
                      }}
                      data-testid="input-member-notes"
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="flex items-center gap-2 pt-1">
                    <span
                      className="text-[10.5px] font-bold uppercase tracking-wider"
                      style={{ color: textSecondary }}
                    >
                      {isSpanish ? 'Acento de avatar:' : 'Avatar Accent:'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {MEMBER_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className="w-5 h-5 rounded-full border-2 transition-transform cursor-pointer"
                          style={{
                            backgroundColor: c,
                            borderColor:
                              color === c ? (isLight ? '#09090b' : '#ffffff') : 'transparent',
                            transform: color === c ? 'scale(1.2)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </section>

        {/* ── 4. 2x2 METRICS GRID (STITCH PARITY) ────────────────────── */}
        <section className="grid grid-cols-2 gap-3.5" data-testid="metrics-grid">
          {/* MEMBERS */}
          <article
            className="p-5 flex flex-col justify-between min-h-[104px] relative overflow-hidden"
            style={{
              borderRadius: 'var(--radius-card, 16px)',
              backgroundColor: cardBg,
              border: '1px solid var(--track, var(--c-border))',
              boxShadow:
                'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
            }}
            data-testid="metric-card-members"
          >
            <span
              className="text-xs font-bold tracking-wider uppercase font-sans"
              style={{ color: textSecondary }}
            >
              {membersTr?.statTotalRoster || (isSpanish ? 'MIEMBROS' : 'MEMBERS')}
            </span>
            <div className="flex items-baseline mt-3">
              <span
                className="text-3xl font-extrabold tracking-tight leading-none font-sans"
                style={{ color: textPrimary }}
                id="metric-members-count"
                data-testid="metric-members-count"
              >
                {members.length}
              </span>
              <span
                className="text-xl font-bold leading-none ml-0.5 font-sans"
                style={{ color: textSecondary }}
              >
                /8
              </span>
            </div>
          </article>

          {/* ASSIGNED */}
          <article
            className="p-5 flex flex-col justify-between min-h-[104px] relative overflow-hidden"
            style={{
              borderRadius: 'var(--radius-card, 16px)',
              backgroundColor: cardBg,
              border: '1px solid var(--track, var(--c-border))',
              boxShadow:
                'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
            }}
            data-testid="metric-card-assigned"
          >
            <span
              className="text-xs font-bold tracking-wider uppercase font-sans"
              style={{ color: textSecondary }}
            >
              {membersTr?.statAssigned || (isSpanish ? 'ASIGNADOS' : 'ASSIGNED')}
            </span>
            <div className="mt-3">
              <span
                className="text-3xl font-extrabold tracking-tight leading-none font-sans"
                style={{ color: textPrimary }}
                id="metric-assigned-count"
                data-testid="metric-assigned-count"
              >
                {assignedMembersCount}
              </span>
            </div>
          </article>

          {/* STAGE ELEMENTS */}
          <article
            className="p-5 flex flex-col justify-between min-h-[104px] relative overflow-hidden"
            style={{
              borderRadius: 'var(--radius-card, 16px)',
              backgroundColor: cardBg,
              border: '1px solid var(--track, var(--c-border))',
              boxShadow:
                'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
            }}
            data-testid="metric-card-stage-elements"
          >
            <span
              className="text-xs font-bold tracking-wider uppercase font-sans"
              style={{ color: textSecondary }}
            >
              {membersTr?.statStageElements ||
                (isSpanish ? 'ELEMENTOS EN ESCENARIO' : 'STAGE ELEMENTS')}
            </span>
            <div className="mt-3">
              <span
                className="text-3xl font-extrabold tracking-tight leading-none font-sans"
                style={{ color: textPrimary }}
                id="metric-elements-count"
                data-testid="metric-elements-count"
              >
                {stageElementsCount}
              </span>
            </div>
          </article>

          {/* UNASSIGNED */}
          <article
            className="p-5 flex flex-col justify-between min-h-[104px] relative overflow-hidden"
            style={{
              borderRadius: 'var(--radius-card, 16px)',
              backgroundColor: cardBg,
              border: '1px solid var(--track, var(--c-border))',
              boxShadow:
                'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
            }}
            data-testid="metric-card-unassigned"
          >
            <span
              className="text-xs font-bold tracking-wider uppercase font-sans"
              style={{ color: textSecondary }}
            >
              {membersTr?.statUnassigned || (isSpanish ? 'SIN ASIGNAR' : 'UNASSIGNED')}
            </span>
            <div className="mt-3">
              <span
                className="text-3xl font-extrabold tracking-tight leading-none font-sans"
                style={{ color: textPrimary }}
                id="metric-unassigned-count"
                data-testid="metric-unassigned-count"
              >
                {unassignedMembersCount}
              </span>
            </div>
          </article>
        </section>
      </div>
    </StageSetupDetailLayout>
  );
};
