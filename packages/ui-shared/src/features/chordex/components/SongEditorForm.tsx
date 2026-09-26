import { Button, Input } from '../../../shared/design-system/StudioDesignSystem';
import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../shared/design-system/dialogs';
import { useT } from '@workspace/livex-core'; 

export interface FormData {
  name: string;
  artist: string;
  bpm: string;
  key: string;
  notes: string;
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
    initial || { name: '', artist: '', bpm: '120', key: 'C', notes: '' }
  );

  useEffect(() => {
    if (initial) {
      setForm(initial);
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
          label={t.songs.bpm}
          min={20}
          max={400}
          value={form.bpm}
          onChange={(e) => setForm((f) => ({ ...f, bpm: e.target.value }))}
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