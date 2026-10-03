import React, { useState, useEffect } from 'react';
import { Sheet } from './dialogs';
import { Button } from './buttons';

export interface CustomBarsSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (bars: number) => void;
  initialBars?: number;
}

export function parseCustomBars(value: string, fallback: number): number {
  let parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  if (parsed > 32) return 32;
  return parsed;
}

export function CustomBarsSheet({ open, onClose, onConfirm, initialBars = 4 }: CustomBarsSheetProps) {
  const [value, setValue] = useState(String(initialBars));

  useEffect(() => {
    if (open) {
      setValue(String(initialBars));
    }
  }, [open, initialBars]);

  const handleConfirm = () => {
    onConfirm(parseCustomBars(value, initialBars));
    onClose();
  };

  const handleBlur = () => {
    setValue(String(parseCustomBars(value, initialBars)));
  };

  const decrement = () => {
    let parsed = parseInt(value, 10);
    if (isNaN(parsed)) parsed = initialBars;
    if (parsed > 1) setValue(String(parsed - 1));
  };

  const increment = () => {
    let parsed = parseInt(value, 10);
    if (isNaN(parsed)) parsed = initialBars;
    if (parsed < 32) setValue(String(parsed + 1));
  };

  return (
    <Sheet open={open} onClose={onClose} title="Custom Bars">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-4) 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
          <button
            onClick={decrement}
            className="touch-target-44"
            type="button"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid var(--track, var(--c-border))',
              background: 'var(--app-surface-high)',
              color: 'var(--c-text-primary)',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            style={{
              width: '80px',
              textAlign: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--c-accent, var(--accent))',
              color: 'var(--c-text-primary, var(--text))',
              padding: 'var(--space-2)'
            }}
          />
          <button
            onClick={increment}
            className="touch-target-44"
            type="button"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid var(--track, var(--c-border))',
              background: 'var(--app-surface-high)',
              color: 'var(--c-text-primary)',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="outline" size="lg" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
