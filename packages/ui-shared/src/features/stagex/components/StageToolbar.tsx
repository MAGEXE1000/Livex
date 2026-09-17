import React from 'react';
import { Toolbar, Button, ButtonGroup } from '../../../shared/design-system/StudioDesignSystem';

interface StageToolbarProps {
  curView: string;
  isLight: boolean;
  tr: any;
  callIframe: (fn: string, arg?: string | number) => void;
  transitionToView: (view: string) => void;
  openPdfSheet: () => void;
  collabState?: string;
  onOpenCollab?: () => void;
  onOpenHistory?: () => void;
}

export const StageToolbar: React.FC<StageToolbarProps> = ({
  curView,
  isLight,
  tr,
  callIframe,
  transitionToView,
  openPdfSheet,
  collabState,
  onOpenCollab,
  onOpenHistory,
}) => {
  return (
    <Toolbar
      className={`border-b ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-[#141414]'} h-12 flex-shrink-0 select-none`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`font-extrabold text-[10px] uppercase ${isLight ? 'text-zinc-850' : 'text-white'} tracking-widest`}
          style={{ letterSpacing: '0.08em' }}
        >
          Stagex
        </span>
        {curView !== 'Editor' && (
          <>
            <div className={`h-4 w-[1px] ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
            <span
              data-testid="stagex-toolbar-curview"
              className="text-[8.5px] text-zinc-500 font-extrabold uppercase tracking-widest"
            >
              {curView === 'Export'
                ? tr.stagex?.productionDocShort || 'Production Document'
                : tr.stagex?.setupOptions || 'Setup & Options'}
            </span>
          </>
        )}
      </div>

      {curView === 'Editor' && (
        <div className="flex items-center gap-2">
          <ButtonGroup size="sm" variant="secondary">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => callIframe('scActivateMeasure')}
              icon={<span className="material-symbols-outlined text-[15px]">straighten</span>}
            >
              {tr.stagex?.toolMeasure || 'Measure'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => callIframe('resetView')}
              icon={
                <span className="material-symbols-outlined text-[15px]">center_focus_strong</span>
              }
            >
              {tr.stagex?.resetView || 'Reset View'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="stagex-history-btn"
              onClick={onOpenHistory ? onOpenHistory : () => callIframe('openTimelinePanel')}
              icon={<span className="material-symbols-outlined text-[15px]">history</span>}
            >
              {tr.stagex?.toolHistory || 'History'}
            </Button>
          </ButtonGroup>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => callIframe('openPresetsPanel')}
            icon={<span className="material-symbols-outlined text-[15px]">save</span>}
          >
            {tr.stagex?.savePreset || 'Save Preset'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="stagex-export-doc-btn"
            onClick={() => transitionToView('Export')}
            icon={<span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>}
            title={tr.stagex?.productionDoc || 'Production Document (PDF)'}
          >
            {tr.stagex?.productionDocShort || 'Production Document'}
          </Button>
          {onOpenCollab && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenCollab}
              icon={
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={{ color: collabState === 'connected' ? '#10b981' : undefined }}
                >
                  {collabState === 'connected' ? 'cloud' : 'cloud_queue'}
                </span>
              }
            >
              {collabState === 'connected'
                ? tr.stagex?.collabLive || 'Live'
                : tr.stagex?.collab || 'Collab'}
            </Button>
          )}
        </div>
      )}

      {curView === 'Export' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => transitionToView('Editor')}
            icon={<span className="material-symbols-outlined text-[15px]">arrow_back</span>}
          >
            Editor
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => callIframe('toggleExportOptions')}
            icon={<span className="material-symbols-outlined text-[15px]">tune</span>}
          >
            Sections
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={openPdfSheet}
            icon={<span className="material-symbols-outlined text-[15px]">download</span>}
          >
            Get PDF
          </Button>
        </div>
      )}
    </Toolbar>
  );
};
