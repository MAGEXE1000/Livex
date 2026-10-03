import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from './dialogs';
import { Button } from './buttons';

export interface TextInputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}

export function TextInputDialog({
  open,
  onClose,
  onConfirm,
  title,
  initialValue = '',
  placeholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  status = 'default',
}: TextInputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (open) {
      setValue(initialValue);
      t = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [open, initialValue]);

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      status={status}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div style={{ paddingTop: 'var(--space-2)' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--track, var(--c-border))',
            background: 'var(--app-surface)',
            color: 'var(--c-text-primary, var(--text))',
            fontSize: '16px', // 16px to prevent zoom
          }}
        />
      </div>
    </Dialog>
  );
}
