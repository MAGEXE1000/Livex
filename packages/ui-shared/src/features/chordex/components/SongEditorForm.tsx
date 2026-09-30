import { Button, Input } from '../../../shared/design-system/StudioDesignSystem';
import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../shared/design-system/dialogs';
import { useT, formatDurationMmSs, parseDurationMmSs } from '@workspace/livex-core'; 

export interface FormData {
  name: string;
  artist: string;
  speed?: string;
  bpm: string;
  key: string;
  notes: string;
  durationMinutes?: string;
  durationSeconds?: string;
  coverImage?: string;
}
const KEYS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
  'Cm',
  'C#m',
  'Dm',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'Abm',
  'Am',
  'Bbm',
  'Bm',
];

export interface PresetFormContentProps {
  initial?: FormData;
  isEditing?: boolean;
  onSave: (d: FormData) => void;
  onCancel: () => void;
  accent: { from: string; to: string; mid?: string };
  showFooterButtons?: boolean;
}

export function PresetFormContent({
  initial,
  isEditing = false,
  onSave,
  onCancel,
  accent,
  showFooterButtons = true,
}: PresetFormContentProps) {
  const t = useT();
  const [form, setForm] = useState<FormData>(
    initial || { name: '', artist: '', bpm: '120', key: 'C', notes: '', durationMinutes: '', durationSeconds: '', coverImage: undefined }
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setForm((f) => ({ ...f, coverImage: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getFormattedDuration = (min?: string, sec?: string) => {
    if (!min && !sec) return '';
    const m = parseInt(min || '0', 10) || 0;
    const s = parseInt(sec || '0', 10) || 0;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [durationStr, setDurationStr] = useState<string>(() =>
    getFormattedDuration(initial?.durationMinutes, initial?.durationSeconds)
  );

  useEffect(() => {
    if (initial) {
      setForm(initial);
      setDurationStr(getFormattedDuration(initial.durationMinutes, initial.durationSeconds));
    }
  }, [initial]);

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--c-surface-high)',
    border: '1px solid var(--c-border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    color: 'var(--c-text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    color: 'var(--c-text-secondary)',
    fontFamily: 'var(--font-headline)',
    fontWeight: 800,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'block',
    marginBottom: '4px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 4px 4px 4px' }}>
      {/* Cover Image Selection Control */}
      <div>
        <label style={labelStyle}>Cover Image</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              backgroundColor: 'var(--c-surface-high)',
              border: '1px solid var(--c-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {form.coverImage ? (
              <img
                src={form.coverImage}
                alt="Song cover"
                data-testid="song-cover-preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span
                className="material-symbols-rounded"
                style={{
                  fontSize: '28px',
                  color: 'var(--c-text-secondary)',
                  opacity: 0.6,
                }}
              >
                album
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverSelect}
              data-testid="song-cover-file-input"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                data-testid="upload-song-cover-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'var(--c-surface-high)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-primary)',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                  {form.coverImage ? 'edit' : 'add_photo_alternate'}
                </span>
                {form.coverImage ? 'Change Cover' : 'Add Cover Image'}
              </button>
              {form.coverImage && (
                <button
                  type="button"
                  data-testid="remove-song-cover-btn"
                  onClick={() => setForm((f) => ({ ...f, coverImage: undefined }))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#EF4444',
                    fontFamily: 'var(--font-headline)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Remove cover image"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                    delete
                  </span>
                  Remove
                </button>
              )}
            </div>
            <span
              style={{
                fontSize: '10px',
                color: 'var(--c-text-secondary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              JPG or PNG (auto-optimized max 512×512)
            </span>
          </div>
        </div>
      </div>

      <Input
        label={t.songs.songTitle}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="e.g. Blackbird"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && form.name.trim()) {
            onSave(form);
          }
        }}
      />
      <Input
        label={t.songs.artist}
        value={form.artist}
        onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
        placeholder="e.g. The Beatles"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input
          type="number"
          label="BPM"
          min={40}
          max={400}
          value={form.speed || form.bpm}
          onChange={(e) => setForm((f) => ({ ...f, speed: e.target.value, bpm: e.target.value }))}
        />
        <div>
          <label style={labelStyle}>{t.songs.key}</label>
          <select
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            style={{ ...selectStyle, cursor: 'pointer' }}
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Song Duration Control (Direct MM:SS with colon support) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={labelStyle}>Song Duration</label>
          {(durationStr || form.durationMinutes || form.durationSeconds) && (
            <button
              type="button"
              data-testid="clear-song-duration-btn"
              onClick={() => {
                setDurationStr('');
                setForm((f) => ({ ...f, durationMinutes: '', durationSeconds: '' }));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--c-accent-from, #2563EB)',
                fontFamily: 'var(--font-headline)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              Auto (from BPM)
            </button>
          )}
        </div>
        <div
          data-testid="song-duration-control"
          style={{ position: 'relative' }}
        >
          <input
            type="text"
            inputMode="text"
            data-testid="song-duration-input"
            value={durationStr}
            placeholder="e.g. 3:45"
            onChange={(e) => {
              const val = e.target.value;
              setDurationStr(val);
              const parsed = parseDurationMmSs(val);
              if (parsed !== null) {
                const m = Math.floor(parsed / 60).toString();
                const s = (parsed % 60).toString();
                setForm((f) => ({ ...f, durationMinutes: m, durationSeconds: s }));
              } else if (!val.trim()) {
                setForm((f) => ({ ...f, durationMinutes: '', durationSeconds: '' }));
              }
            }}
            onBlur={() => {
              const parsed = parseDurationMmSs(durationStr);
              if (parsed !== null) {
                setDurationStr(formatDurationMmSs(parsed));
                const m = Math.floor(parsed / 60).toString();
                const s = (parsed % 60).toString();
                setForm((f) => ({ ...f, durationMinutes: m, durationSeconds: s }));
              }
            }}
            style={{
              ...selectStyle,
              textAlign: 'center',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              fontSize: '15px',
            }}
          />
          {/* Backwards-compatible hidden inputs for testids */}
          <input type="hidden" data-testid="song-duration-minutes" value={form.durationMinutes ?? ''} />
          <input type="hidden" data-testid="song-duration-seconds" value={form.durationSeconds ?? ''} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>{t.songs.notes}</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder={t.songs.notesPlaceholder}
          style={{ ...selectStyle, resize: 'none' }}
        />
      </div>
      {showFooterButtons && (
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>
            {t.songs.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!form.name.trim()}
            onClick={() => {
              if (form.name.trim()) onSave(form);
            }}
            style={{ flex: 1 }}
          >
            {isEditing ? t.songs.save : t.songs.newSong}
          </Button>
        </div>
      )}
    </div>
  );
}

export function SongEditorForm({
  initial,
  isEditing,
  onSave,
  onCancel,
  accent,
}: {
  initial?: FormData;
  isEditing?: boolean;
  onSave: (d: FormData) => void;
  onCancel: () => void;
  accent: { from: string; to: string; mid: string };
}) {
  const t = useT();
  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title={isEditing ? t.songs.editSong : t.songs.newSong}
    >
      <PresetFormContent
        key={isEditing ? 'edit' : initial?.name ? `import-${initial.name}` : 'new'}
        initial={initial}
        isEditing={isEditing}
        onSave={onSave}
        onCancel={onCancel}
        accent={accent}
        showFooterButtons={true}
      />
    </Dialog>
  );
}