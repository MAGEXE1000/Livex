import React, { useState, useEffect } from 'react';
import type { Setlist } from '@workspace/livex-core';
import { Dialog } from '../../../../shared/design-system/dialogs';
import { Button, Input } from '../../../../shared/design-system/StudioDesignSystem';

export interface SetlistFormData {
  title: string;
  description?: string;
  date?: string;
  initialSectionName?: string;
}

export interface SetlistFormContentProps {
  initialSetlist?: Setlist | null;
  onSave: (data: SetlistFormData) => void;
  onClose: () => void;
  accentColor?: string;
  showFooterButtons?: boolean;
}

export function SetlistFormContent({
  initialSetlist,
  onSave,
  onClose,
  showFooterButtons = true,
}: SetlistFormContentProps) {
  const isEditing = Boolean(initialSetlist);
  const [title, setTitle] = useState(initialSetlist?.title || '');
  const [date, setDate] = useState(initialSetlist?.date || '');
  const [description, setDescription] = useState(initialSetlist?.description || '');
  const [initialSectionName, setInitialSectionName] = useState('Set 1');

  useEffect(() => {
    if (initialSetlist) {
      setTitle(initialSetlist.title || '');
      setDate(initialSetlist.date || '');
      setDescription(initialSetlist.description || '');
    } else {
      setTitle('');
      setDate('');
      setDescription('');
      setInitialSectionName('Set 1');
    }
  }, [initialSetlist]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date: date.trim() || undefined,
      description: description.trim() || undefined,
      initialSectionName: !isEditing ? initialSectionName.trim() || 'Set 1' : undefined,
    });
    onClose();
  };

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
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--c-text-secondary)',
    fontFamily: 'var(--font-headline)',
    fontWeight: 800,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      data-purpose="setlist-form-content"
    >
      <Input
        label="Setlist Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Festival Set 2026..."
        data-testid="setlist-title-input"
        required
      />

      <Input
        label="Target Performance Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="e.g. Oct 15, 2026 or 2026-10-15"
        data-testid="setlist-date-input"
      />

      {!isEditing && (
        <Input
          label="First Section Name"
          value={initialSectionName}
          onChange={(e) => setInitialSectionName(e.target.value)}
          placeholder="e.g. Set 1, Bloque 1, Acoustic..."
          data-testid="setlist-section-input"
        />
      )}

      <div>
        <label style={labelStyle}>Description / Notes</label>
        <textarea
          rows={2}
          data-testid="setlist-desc-input"
          placeholder="Optional notes, venue details, or gig guidelines..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...selectStyle, resize: 'none' }}
        />
      </div>

      {showFooterButtons && (
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
          <Button onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            onClick={() => handleSubmit()}
            data-testid="save-setlist-btn"
            style={{ flex: 1 }}
          >
            {isEditing ? 'Save Changes' : 'Create Setlist'}
          </Button>
        </div>
      )}
    </form>
  );
}

export interface SetlistCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SetlistFormData) => void;
  initialSetlist?: Setlist | null;
  accentColor?: string;
}

export const SetlistCreateModal: React.FC<SetlistCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSetlist,
  accentColor = '#ffffff',
}) => {
  if (!isOpen) return null;
  const isEditing = Boolean(initialSetlist);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Setlist' : 'New Setlist'}
    >
      <SetlistFormContent
        initialSetlist={initialSetlist}
        onSave={onSave}
        onClose={onClose}
        accentColor={accentColor}
        showFooterButtons={true}
      />
    </Dialog>
  );
};
