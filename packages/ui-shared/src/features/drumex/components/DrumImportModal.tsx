import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '../../../shared/design-system/dialogs';
import { Button } from '../../../shared/design-system/buttons';
import { type DrumPattern, type KitType } from '@workspace/studio-core';

export interface DrumImportContentProps {
  accent: { from: string; to: string };
  onImport: (
    name: string,
    artist: string,
    notes: string,
    patterns: DrumPattern[],
    activePatternId: string,
    kitType?: KitType | null
  ) => void;
  onClose?: () => void;
}

export function DrumImportContent({
  accent,
  onImport,
  onClose,
}: DrumImportContentProps) {
  type Stage = 'idle' | 'preview' | 'error';
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<{
    name: string;
    artist: string;
    notes: string;
    patterns: DrumPattern[];
    activePatternId: string;
    kitType?: KitType | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setErrorMsg('Please select a Drumex .json file.');
      setStage('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (!raw || typeof raw !== 'object' || raw._app !== 'Drumex')
          throw new Error('Not a valid Drumex JSON file.');
        if (!Array.isArray(raw.patterns) || raw.patterns.length === 0)
          throw new Error('No patterns found in file.');
        const reconstructed: DrumPattern[] = (raw.patterns as any[]).map((p: any) => ({
          id: `p-import-${Math.random().toString(36).slice(2)}`,
          name: p.name ?? 'Pattern',
          bpm: Math.max(40, Math.min(280, Number(p.bpm) || 120)),
          subdivision: ([8, 16].includes(Number(p.subdivision)) ? Number(p.subdivision) : 16) as
            8 | 16,
          timeSignature: [4, 4] as [number, number],
          mutedInstruments: Array.isArray(p.mutedInstruments) ? p.mutedInstruments : [],
          measures: Array.isArray(p.measures)
            ? (p.measures as any[]).map((m: any) => ({
                id: `m-import-${Math.random().toString(36).slice(2)}`,
                hits: m.hits ?? {},
              }))
            : [],
        }));
        const songName = (raw.song?.name ?? '').trim() || 'Imported Beat';
        const artist = (raw.song?.artist ?? '').trim();
        const notes = (raw.song?.notes ?? '').trim();
        const kitType = raw.song?.kitType || 'house';
        setPreview({
          name: songName,
          artist,
          notes,
          patterns: reconstructed,
          activePatternId: reconstructed[0].id,
          kitType,
        });
        setStage('preview');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not parse file.');
        setStage('error');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file.');
      setStage('error');
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const totalBars = preview ? preview.patterns.reduce((n, p) => n + p.measures.length, 0) : 0;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {stage === 'idle' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) parseFile(f);
            }}
            className="btn-smooth"
            style={{
              border: `2px dashed ${dragOver ? 'var(--c-accent-from)' : 'rgba(128,128,128,0.25)'}`,
              borderRadius: 16,
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              background: dragOver ? 'var(--c-accent-from)0a' : 'var(--c-surface-high)',
              transition: 'all 200ms',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 40, color: 'var(--c-accent-from)' }}
            >
              upload_file
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-primary)' }}>
              Tap to select a Drumex JSON file
            </span>
            <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>or drag & drop here</span>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.20)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#f87171', fontSize: 20, flexShrink: 0, marginTop: 1 }}
              >
                error
              </span>
              <span style={{ fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>{errorMsg}</span>
            </div>
            <Button
              onClick={() => {
                setStage('idle');
                setErrorMsg('');
              }}
              style={{ width: '100%' }}
            >
              Try another file
            </Button>
          </div>
        )}

        {stage === 'preview' && preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                background: 'var(--c-surface-high)',
                border: '1px solid var(--c-border)',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: 'var(--c-text-primary)',
                    fontFamily: 'var(--font-headline)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {preview.name}
                </span>
              </div>
              {preview.artist && (
                <span style={{ fontSize: 12, color: 'var(--c-text-secondary)' }}>
                  {preview.artist}
                </span>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--c-accent-from)18',
                    color: 'var(--c-accent-from)',
                    borderRadius: 6,
                    padding: '3px 8px',
                  }}
                >
                  {preview.patterns.length} pattern{preview.patterns.length !== 1 ? 's' : ''}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'rgba(128,128,128,0.10)',
                    color: 'var(--c-text-secondary)',
                    borderRadius: 6,
                    padding: '3px 8px',
                  }}
                >
                  {totalBars} bar{totalBars !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '250px',
                overflowY: 'auto',
              }}
              className="no-scrollbar"
            >
              {preview.patterns.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: 'var(--c-surface-high)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 10,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--c-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-secondary)' }}>
                    {p.bpm} BPM Â· {p.measures.length} bar{p.measures.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={() => {
                onImport(
                  preview.name,
                  preview.artist,
                  preview.notes,
                  preview.patterns,
                  preview.activePatternId,
                  preview.kitType
                );
                onClose?.();
              }}
              icon="add_circle"
              style={{ width: '100%' }}
            >
              Import to Library
            </Button>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </>
  );
}

export function DrumImportModal(props: DrumImportContentProps & { onClose: () => void }) {
  return (
    <Dialog open={true} onClose={props.onClose} title="Import Beat">
      <DrumImportContent {...props} />
    </Dialog>
  );
}

export default DrumImportModal;
