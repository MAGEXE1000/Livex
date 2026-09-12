import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useStagexStore } from '../../state/useStagexStore';
import {
  useBackHandler,
  useSettingsStore,
  useSessionStore,
  NavigationDispatcher,
} from '@workspace/studio-core';
import { SharedFloatingHeader } from '../../../../shared/layout/StudioLayoutSystem';
import { STAGEX_ICON_MAP, localizeElementName } from '../../constants';
import {
  projectProductionDocumentData,
  DEFAULT_PRODUCTION_DOCUMENT_SECTIONS,
  type ProductionDocumentSectionsConfig,
} from '../../services/projectProductionDocumentData';
import { generateProductionDocumentPdf } from '../../services/generateProductionDocumentPdf';
import { StageBridge } from '../../services/StageBridgeService';
import { MorphingActionSurface } from '../../../../shared/design-system/MorphingActionSurface';
import { SectionVisibilityContent } from './SectionVisibilityPopover';
import { SaveFilenameModal } from './SaveFilenameModal';

export interface StageExportPdfViewProps {
  onBack: () => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

if (typeof window !== 'undefined') {
  (window as any).NavigationDispatcher = NavigationDispatcher;
  (window as any).useSessionStore = useSessionStore;
  (window as any).__stagexTestApi = {
    generateProductionDocumentPdf,
    projectProductionDocumentData,
    useStagexStore,
    useSessionStore,
    NavigationDispatcher,
  };
}

export const StageExportPdfView: React.FC<StageExportPdfViewProps> = ({
  onBack,
  isLight = false,
  isAmoled = false,
}) => {
  const store = useStagexStore(
    useShallow((s) => ({
      scenes: s.scenes,
      elements: s.elements,
      currentSceneIdx: s.currentSceneIdx,
      preferences: s.preferences,
      riderNeeds: s.riderNeeds,
      riderConfig: s.riderConfig,
      members: s.members,
      riderChannels: s.riderChannels,
      setlist: s.setlist,
      gear: s.gear,
      projectName: s.projectName,
    }))
  );
  const language = useSettingsStore((s) => s.settings.language) ?? 'en';
  const isSpanish = language === 'es';

  // Section visibility configuration state
  const [sectionsConfig, setSectionsConfig] = useState<ProductionDocumentSectionsConfig>(
    DEFAULT_PRODUCTION_DOCUMENT_SECTIONS
  );

  // Popovers & Dialogs state
  const [isSectionsPopoverOpen, setIsSectionsPopoverOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isExportBusy, setIsExportBusy] = useState(false);
  const [pdfSceneChoice] = useState<'current' | 'all' | number>('current');

  // Success Notification state
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<{
    fileName: string;
    uri?: string;
    pageCount: number;
  } | null>(null);

  // Auto-dismiss save notification after 4 seconds
  useEffect(() => {
    if (!saveSuccessNotification) return;
    const timer = setTimeout(() => {
      setSaveSuccessNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [saveSuccessNotification]);

  // Flush live state and reload storage data on mount to ensure fresh state
  useEffect(() => {
    StageBridge.syncCurrentProjectState();
  }, []);

  // Hardware Back Handler
  useBackHandler(
    'nested',
    () => {
      if (isSaveModalOpen) {
        setIsSaveModalOpen(false);
        return true;
      }
      if (isSectionsPopoverOpen) {
        setIsSectionsPopoverOpen(false);
        return true;
      }
      if (isExportMenuOpen) {
        setIsExportMenuOpen(false);
        return true;
      }
      onBack();
      return true;
    },
    [onBack, isSaveModalOpen, isSectionsPopoverOpen, isExportMenuOpen]
  );

  // Compute canonical document data projection
  const data = useMemo(() => {
    return projectProductionDocumentData(store as any, pdfSceneChoice);
  }, [store, pdfSceneChoice]);

  const defaultPdfFileName = useMemo(() => {
    const rawProject = data.projectName || (isSpanish ? 'Escenario_Principal' : 'Main_Stage');
    const cleanName = rawProject.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const docSuffix = isSpanish ? 'Documento_Produccion' : 'Production_Document';
    return `${cleanName}_${docSuffix}_${dateStr}`;
  }, [data.projectName, isSpanish]);

  // Dynamic Section Renumbering for In-App Preview (01 //, 02 //, ...)
  const sectionNumberMap = useMemo(() => {
    let count = 1;
    const map: Partial<Record<keyof ProductionDocumentSectionsConfig, string>> = {};
    if (sectionsConfig.stagePlot) map.stagePlot = String(count++).padStart(2, '0');
    if (sectionsConfig.inputPatch) map.inputPatch = String(count++).padStart(2, '0');
    if (sectionsConfig.technicalRequirements)
      map.technicalRequirements = String(count++).padStart(2, '0');
    if (sectionsConfig.technicalNotes) map.technicalNotes = String(count++).padStart(2, '0');
    if (sectionsConfig.setlist) map.setlist = String(count++).padStart(2, '0');
    if (sectionsConfig.gear) map.gear = String(count++).padStart(2, '0');
    if (sectionsConfig.bandCrew) map.bandCrew = String(count++).padStart(2, '0');
    return map;
  }, [sectionsConfig]);

  const activeSectionsCount = useMemo(() => {
    return Object.values(sectionsConfig).filter(Boolean).length;
  }, [sectionsConfig]);

  // Toggle Section handler
  const handleToggleSection = useCallback((key: keyof ProductionDocumentSectionsConfig) => {
    setSectionsConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleSelectAllSections = useCallback(() => {
    setSectionsConfig({
      stagePlot: true,
      inputPatch: true,
      technicalRequirements: true,
      technicalNotes: true,
      setlist: true,
      gear: true,
      bandCrew: true,
    });
  }, []);

  const handleResetSections = useCallback(() => {
    setSectionsConfig(DEFAULT_PRODUCTION_DOCUMENT_SECTIONS);
  }, []);

  // Active PDF theme mode
  const pdfTheme: 'light' | 'dark' | 'amoled' = isAmoled ? 'amoled' : isLight ? 'light' : 'dark';

  // PDF Export Execution: Share Document
  const handleShareDocument = useCallback(async () => {
    setIsExportMenuOpen(false);
    setIsExportBusy(true);
    try {
      await generateProductionDocumentPdf(data, {
        fileName: defaultPdfFileName,
        share: true,
        sections: sectionsConfig,
        theme: pdfTheme,
        lang: isSpanish ? 'es' : 'en',
      });
    } catch (err) {
      console.error('Failed to share production document PDF:', err);
      toast.error(
        isSpanish
          ? 'Error al compartir el Documento de Producción'
          : 'Failed to share Production Document'
      );
    } finally {
      setIsExportBusy(false);
    }
  }, [data, defaultPdfFileName, sectionsConfig, pdfTheme, isSpanish]);

  // PDF Export Execution: Save to Downloads
  const handleSaveToDownloads = useCallback(
    async (customFileName: string) => {
      setIsExportBusy(true);
      try {
        const result = await generateProductionDocumentPdf(data, {
          fileName: customFileName,
          share: false,
          sections: sectionsConfig,
          theme: pdfTheme,
          lang: isSpanish ? 'es' : 'en',
        });
        setIsSaveModalOpen(false);
        toast.success(
          isSpanish
            ? `Guardado en Descargas: ${result.fileName}`
            : `Saved to Downloads: ${result.fileName}`
        );
        setSaveSuccessNotification({
          fileName: result.fileName,
          uri: result.uri,
          pageCount: result.pageCount,
        });
      } catch (err) {
        console.error('Failed to save production document PDF:', err);
        toast.error(
          isSpanish
            ? 'Error al guardar el Documento de Producción en Descargas'
            : 'Failed to save Production Document to Downloads'
        );
      } finally {
        setIsExportBusy(false);
      }
    },
    [data, sectionsConfig, pdfTheme, language, isSpanish]
  );

  // Dynamic Theme Colors
  const bgMain = isLight ? '#f9f9fb' : isAmoled ? '#000000' : '#08080a';
  const bgCard = isLight
    ? 'rgba(255, 255, 255, 0.96)'
    : isAmoled
      ? 'rgba(10, 10, 14, 0.98)'
      : 'rgba(20, 20, 26, 0.95)';
  const textPrimary = isLight ? '#09090b' : '#ffffff';
  const textSecondary = isLight ? '#52525b' : '#d4d4d8';
  const textDim = isLight ? '#a1a1aa' : '#71717a';
  const borderCol = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const borderSubtle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)';
  const blueprintBg = isLight ? '#f4f4f6' : isAmoled ? '#050507' : '#0c0c0e';
  const hoverBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)';

  return (
    <div
      data-testid="stage-export-pdf-view"
      className="w-full h-full relative overflow-hidden flex flex-col bg-transparent selection:bg-blue-500 selection:text-white"
      style={{
        backgroundColor: bgMain,
        color: textSecondary,
        fontFamily: 'var(--studio-font-body)',
      }}
    >
      <style>{`
        .stage-blueprint-grid {
          background-size: 24px 24px;
          background-image: ${
            isLight
              ? 'linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)'
          };
        }
      `}</style>

      <SharedFloatingHeader
        title={isSpanish ? 'Documento de Producción' : 'Production Document'}
        titleTestId="production-document-title"
        backBtnTestId="production-document-back-btn"
        onBack={onBack}
        isLight={isLight}
        isAmoled={isAmoled}
        toolbarActions={
          <div className="flex items-center gap-1.5">
            {/* Control 1: Sections Visibility Morphing Surface */}
            <MorphingActionSurface
              isOpen={isSectionsPopoverOpen}
              onOpenChange={(open) => {
                if (open) setIsExportMenuOpen(false);
                setIsSectionsPopoverOpen(open);
              }}
              placement="anchor"
              maxWidth={340}
              title={isSpanish ? 'Secciones del Documento' : 'Document Sections'}
              subtitle={isSpanish ? `${activeSectionsCount} de 7 Activas` : `${activeSectionsCount} of 7 Active`}
              accentColor="#2563eb"
              customTrigger={({ triggerProps }) => (
                <motion.button
                  {...triggerProps}
                  type="button"
                  data-testid="export-pdf-sections-btn"
                  aria-label={isSpanish ? 'Secciones del Documento' : 'Document Sections'}
                  title={isSpanish ? 'Secciones del Documento' : 'Document Sections'}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSectionsPopoverOpen
                      ? '#2563eb'
                      : isLight
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.06)',
                    border: isLight
                      ? '1px solid rgba(0, 0, 0, 0.05)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isSectionsPopoverOpen ? '#ffffff' : textPrimary,
                    cursor: 'pointer',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    position: 'relative',
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 21v-7" />
                    <path d="M4 10V3" />
                    <path d="M12 21v-9" />
                    <path d="M12 8V3" />
                    <path d="M20 21v-5" />
                    <path d="M20 12V3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  {activeSectionsCount < 7 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
                      {activeSectionsCount}
                    </span>
                  )}
                </motion.button>
              )}
            >
              <SectionVisibilityContent
                sections={sectionsConfig}
                onToggleSection={handleToggleSection}
                onSelectAll={handleSelectAllSections}
                onReset={handleResetSections}
                data={data}
                isLight={isLight}
                isAmoled={isAmoled}
              />
            </MorphingActionSurface>

            {/* Control 2: Export / Share Contextual Morphing Surface */}
            <MorphingActionSurface
              isOpen={isExportMenuOpen}
              onOpenChange={(open) => {
                if (open) setIsSectionsPopoverOpen(false);
                setIsExportMenuOpen(open);
              }}
              placement="anchor"
              compact
              maxWidth={280}
              title={isSpanish ? 'Exportar Documento' : 'Export Document'}
              subtitle={
                isSpanish
                  ? `${activeSectionsCount} de 7 Activas`
                  : `${activeSectionsCount} of 7 Active`
              }
              accentColor="#2563eb"
              customTrigger={({ triggerProps }) => (
                <motion.button
                  {...triggerProps}
                  type="button"
                  data-testid="stage-export-btn"
                  disabled={isExportBusy}
                  onClick={isExportBusy ? undefined : triggerProps.onClick}
                  whileTap={isExportBusy ? undefined : triggerProps.whileTap}
                  aria-label={
                    isSpanish ? 'Exportar Documento de Producción' : 'Export Production Document'
                  }
                  title={isSpanish ? 'Exportar Documento de Producción' : 'Export Production Document'}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isExportMenuOpen
                      ? '#2563eb'
                      : isLight
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.06)',
                    border: isLight
                      ? '1px solid rgba(0, 0, 0, 0.05)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isExportMenuOpen ? '#ffffff' : textPrimary,
                    cursor: isExportBusy ? 'not-allowed' : 'pointer',
                    opacity: isExportBusy ? 0.6 : 1,
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </motion.button>
              )}
              rows={[
                {
                  id: 'share',
                  label: isSpanish ? 'Compartir Documento' : 'Share Document',
                  sublabel: isSpanish ? 'Enviar a través del diálogo nativo' : 'Send via native system share sheet',
                  icon: 'share',
                  onPress: handleShareDocument,
                  disabled: isExportBusy,
                },
                {
                  id: 'download',
                  label: isSpanish ? 'Guardar en Descargas' : 'Save to Downloads',
                  sublabel: isSpanish ? 'Guardar PDF directamente en el almacenamiento' : 'Directly save PDF to device storage',
                  icon: 'download',
                  onPress: () => {
                    setIsExportMenuOpen(false);
                    setIsSaveModalOpen(true);
                  },
                  disabled: isExportBusy,
                },
              ]}
            />
          </div>
        }
      />

      {/* ── SAVE FILENAME MODAL ───────────────────────────────────── */}
      <SaveFilenameModal
        open={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveToDownloads}
        defaultFileName={defaultPdfFileName}
        activeSectionsCount={activeSectionsCount}
        isSaving={isExportBusy}
        isLight={isLight}
        isAmoled={isAmoled}
      />

      {/* ── 2. CONTINUOUS SCROLLING DOCUMENT BODY ─────────────────── */}
      <div
        className="flex-1 overflow-y-auto w-full h-full relative"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 80px)',
          paddingBottom:
            'calc(var(--content-bottom-pad, 88px) + env(safe-area-inset-bottom, 0px) + 32px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <main className="w-full max-w-2xl mx-auto px-5 space-y-10">
          {/* ── PRODUCTION IDENTITY SECTION ────────────────────────── */}
          <section className="space-y-3 pt-2" data-purpose="production-identity">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono font-bold tracking-wider text-blue-500 uppercase">
                  {isSpanish
                    ? 'Documento de Producción de Escenario en Vivo'
                    : 'Live Stage Production Document'}
                </div>
                <span
                  data-testid="production-document-id"
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-500 uppercase tracking-widest"
                >
                  {data.documentId}
                </span>
              </div>

              <h1
                data-testid="export-doc-project-name"
                className="text-3xl font-black tracking-tight uppercase"
                style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
              >
                {data.projectName || (isSpanish ? 'ESCENARIO PRINCIPAL' : 'MAIN STAGE')}
              </h1>

              <p className="text-[13px] font-medium text-zinc-500 tracking-tight">
                {data.projectName} · {data.sceneName}
              </p>
            </div>

            <div
              className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono font-semibold"
              style={{ color: textDim }}
            >
              <span className="uppercase" style={{ color: textPrimary }}>
                {isSpanish ? 'ELEMENTOS' : 'ELEMENTS'} {data.elements.length}
              </span>
              <span>•</span>
              <span className="uppercase">
                {isSpanish ? 'CANALES' : 'CHANNELS'} {data.channels.length}
              </span>
              <span>•</span>
              <span className="uppercase">{data.date}</span>
            </div>

            {/* Metadata Grid Strip (Venue & Contact) */}
            <div
              className="grid grid-cols-2 border-t border-b mt-4 select-none"
              style={{ borderColor: borderCol }}
            >
              <div
                className="py-2.5 pr-4 border-r flex flex-col gap-0.5"
                style={{ borderColor: borderCol }}
              >
                <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-400">
                  {isSpanish ? 'Lugar / Escenario' : 'Venue / Stage'}
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                  {data.venue || (isSpanish ? 'Escenario de Producción' : 'Production Stage')}
                </span>
              </div>
              <div className="py-2.5 pl-4 flex flex-col gap-0.5">
                <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-400">
                  {isSpanish ? 'Contacto de Producción' : 'Production Contact'}
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                  {data.contactName
                    ? `${data.contactName} (${data.contactPhone || 'FOH'})`
                    : isSpanish
                      ? 'Director de Escenario'
                      : 'Stage Director'}
                </span>
              </div>
            </div>
          </section>

          {/* ── EMPTY STATE IF ALL SECTIONS DISABLED ───────────────── */}
          {activeSectionsCount === 0 && (
            <div
              data-testid="no-sections-enabled-state"
              className="w-full py-16 px-6 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-3"
              style={{
                borderColor: borderCol,
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="text-sm font-bold" style={{ color: textPrimary }}>
                {isSpanish ? 'Ninguna Sección Habilitada' : 'No Document Sections Enabled'}
              </div>
              <p className="text-xs max-w-sm text-zinc-400">
                {isSpanish
                  ? 'Usa el control de Secciones del Documento en la barra superior para habilitar o deshabilitar secciones para la vista previa y la exportación de PDF vectorial.'
                  : 'Use the Document Sections control in the top bar to enable or disable sections for in-app preview and vector PDF export.'}
              </p>
              <button
                type="button"
                onClick={() => setIsSectionsPopoverOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer"
              >
                {isSpanish ? 'Configurar Secciones' : 'Configure Sections'}
              </button>
            </div>
          )}

          {/* ── 01 // STAGE PLOT (LITERAL STAGE PREVIEW) ──────────── */}
          {sectionsConfig.stagePlot && (
            <section className="space-y-3" data-purpose="stage-plot-blueprint">
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.stagePlot} //
                    </span>
                    {isSpanish ? 'Plano de Escenario' : 'Stage Plot'}
                  </h2>
                </div>
                <span
                  className="text-[10px] font-mono tracking-tight font-semibold"
                  style={{ color: textDim }}
                >
                  {isSpanish ? 'ESCALA: 1:50' : 'SCALE: 1:50'} · {data.stageDimensions}
                </span>
              </div>

              {/* Literal Stage Plot Canvas Container */}
              {data.elements.length === 0 ? (
                <div
                  data-testid="stage-plot-empty"
                  className="w-full flex items-center justify-center rounded-lg border border-dashed select-none"
                  style={{
                    height: data.isSquare ? '280px' : '200px',
                    backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    borderColor: borderCol,
                  }}
                >
                  <span
                    className="text-[10.5px] font-mono font-bold tracking-[0.2em] uppercase"
                    style={{ color: textDim }}
                  >
                    {isSpanish
                      ? 'No hay elementos colocados en el escenario'
                      : 'No elements placed on stage'}
                  </span>
                </div>
              ) : (
                <div
                  data-testid="stage-plot-preview-container"
                  className={`relative w-full border rounded-xl overflow-hidden stage-blueprint-grid select-none ${
                    data.isSquare ? 'aspect-square max-h-[420px]' : 'aspect-[16/9] max-h-[360px]'
                  }`}
                  style={{
                    backgroundColor: blueprintBg,
                    borderColor: borderCol,
                  }}
                >
                  {/* Upstage Boundary Header */}
                  <div
                    className="absolute top-1.5 inset-x-2.5 flex items-center justify-between text-[8px] font-mono font-bold tracking-wider uppercase z-10 select-none pointer-events-none"
                    style={{ color: textDim }}
                  >
                    <span>{isSpanish ? 'Escenario Izquierda (SL)' : 'Stage Left (SL)'}</span>
                    <span
                      className="border-b pb-0.5"
                      style={{
                        borderColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                        color: textPrimary,
                      }}
                    >
                      {isSpanish
                        ? '▲ Fondo de Escenario / Pared Backline'
                        : '▲ Upstage / Backline Wall'}
                    </span>
                    <span>{isSpanish ? 'Escenario Derecha (SR)' : 'Stage Right (SR)'}</span>
                  </div>

                  {/* Stage Canonical Layout & Boundary Overlay (matching live canvas _renderStageLayout) */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
                    style={{ color: borderCol }}
                  >
                    {/* 8% Performance Boundary */}
                    <rect
                      x="8%"
                      y="8%"
                      width="84%"
                      height="84%"
                      rx="4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                      opacity={0.6}
                    />
                    {/* Vertical Centerline */}
                    <line
                      x1="50%"
                      y1="8%"
                      x2="50%"
                      y2="92%"
                      stroke="currentColor"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                      opacity={0.35}
                    />
                    {/* Horizontal Centerline */}
                    <line
                      x1="8%"
                      y1="50%"
                      x2="92%"
                      y2="50%"
                      stroke="currentColor"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                      opacity={0.35}
                    />
                    {/* Zone Separators */}
                    <line
                      x1="35%"
                      y1="8%"
                      x2="35%"
                      y2="92%"
                      stroke="currentColor"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                      opacity={0.35}
                    />
                    <line
                      x1="65%"
                      y1="8%"
                      x2="65%"
                      y2="92%"
                      stroke="currentColor"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                      opacity={0.35}
                    />
                  </svg>

                  {/* Elements & Connections Plot Plane */}
                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {/* Active Connection Lines */}
                    {data.connections.length > 0 && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        {data.connections.map((conn: any, cIdx: number) => {
                          const fromEl = data.elements.find((e: any) => e.id === conn.fromId);
                          const toEl = data.elements.find((e: any) => e.id === conn.toId);
                          if (!fromEl || !toEl) return null;
                          const x1 = (fromEl.x / data.refW) * 100;
                          const y1 = (fromEl.y / data.refH) * 100;
                          const x2 = (toEl.x / data.refW) * 100;
                          const y2 = (toEl.y / data.refH) * 100;
                          return (
                            <line
                              key={conn.id || cIdx}
                              x1={`${x1}%`}
                              y1={`${y1}%`}
                              x2={`${x2}%`}
                              y2={`${y2}%`}
                              stroke={conn.color || '#7aafff'}
                              strokeWidth="1.5"
                              strokeDasharray={
                                conn.style === 'dashed'
                                  ? '4 3'
                                  : conn.style === 'dotted'
                                    ? '2 2'
                                    : undefined
                              }
                              opacity={0.6}
                            />
                          );
                        })}
                      </svg>
                    )}

                    {/* Literal Elements Rendered from State */}
                    {data.elements.map((el: any, idx: number) => {
                      const pctX = (el.x / data.refW) * 100;
                      const pctY = (el.y / data.refH) * 100;
                      const rotation = el.rotation || 0;
                      const scale = (el.scale || 100) / 100;
                      const color = el.color || '#7aafff';
                      const chNum = el.channelId
                        ? String(el.channelId).replace(/^CH-?/i, '').padStart(2, '0')
                        : String(idx + 1).padStart(2, '0');
                      const labelText = localizeElementName(
                        el.label || el.name,
                        el.type,
                        isSpanish ? 'es' : 'en'
                      ).toUpperCase();
                      const iconKey = el.icon || 'mic';
                      const mappedIcon = STAGEX_ICON_MAP[iconKey];

                      return (
                        <div
                          key={el.id || idx}
                          data-testid={`preview-element-${el.id || idx}`}
                          className="absolute flex items-center justify-center select-none pointer-events-none w-7 h-7"
                          style={{
                            left: `${pctX}%`,
                            top: `${pctY}%`,
                            transform: `translate(-50%, -50%) scale(${scale})`,
                          }}
                        >
                          {/* Rotated Icon Wrapper with Channel Badge */}
                          <div
                            className="relative flex items-center justify-center w-7 h-7"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transformOrigin: 'center center',
                            }}
                          >
                            {el.imageData ? (
                              <img
                                src={el.imageData}
                                alt={labelText}
                                className="w-7 h-7 object-contain"
                                style={{
                                  filter: isLight
                                    ? undefined
                                    : 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                                }}
                              />
                            ) : mappedIcon ? (
                              <img
                                src={mappedIcon}
                                alt={labelText}
                                className="w-7 h-7 object-contain"
                                style={{
                                  filter: isLight
                                    ? undefined
                                    : 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                                }}
                              />
                            ) : (
                              <span
                                className="material-symbols-outlined text-[24px]"
                                style={{ color }}
                              >
                                {iconKey === 'mic'
                                  ? 'mic'
                                  : iconKey === 'piano'
                                    ? 'piano'
                                    : 'music_note'}
                              </span>
                            )}

                            {/* Small Channel Identifier Badge */}
                            <span
                              data-testid={`preview-element-ch-${idx + 1}`}
                              className="absolute -top-1.5 -right-2 px-1 py-0.5 rounded text-[7.5px] font-mono font-extrabold leading-none select-none z-20 pointer-events-none"
                              style={{
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {chNum}
                            </span>
                          </div>

                          {/* Standardized Canonical Label */}
                          <span
                            className="absolute top-[calc(100%+2px)] left-1/2 -translate-x-1/2 text-[9.5px] font-bold uppercase tracking-[0.05em] text-center truncate max-w-[85px] leading-tight select-none whitespace-nowrap"
                            style={{
                              fontFamily: 'var(--studio-font-display)',
                              color: isLight ? '#18181b' : '#ffffff',
                            }}
                          >
                            {labelText}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Downstage Boundary Footer */}
                  <div
                    className="absolute bottom-1.5 inset-x-2.5 flex items-center justify-between text-[8px] font-mono font-bold tracking-wider uppercase z-10 select-none pointer-events-none"
                    style={{
                      color: textDim,
                    }}
                  >
                    <span>{isSpanish ? 'Borde de Escenario' : 'Downstage Edge'}</span>
                    <span style={{ color: textPrimary }}>
                      {isSpanish ? '▼ FOH / Línea de Audiencia' : '▼ FOH / Audience Line'}
                    </span>
                    <span>{isSpanish ? 'Línea Central (CL)' : 'Centerline (CL)'}</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── 02 // INPUT LIST & PATCH ─────────────────────────── */}
          {sectionsConfig.inputPatch && (
            <section className="space-y-3" data-purpose="input-patch-sheet">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.inputPatch} //
                    </span>
                    {isSpanish
                      ? 'Lista de Canales y Parcheo de Entrada'
                      : 'Input Channel & Patch List'}
                  </h2>
                </div>
                <span
                  className="text-[10px] font-mono tracking-tight font-semibold"
                  style={{ color: textDim }}
                >
                  {isSpanish
                    ? `${data.channels.length} Canales Activos`
                    : `${data.channels.length} Active Channels`}
                </span>
              </div>

              <div
                data-purpose="input-patch-sheet"
                className="border rounded-lg overflow-hidden divide-y select-none"
                style={{ borderColor: borderCol }}
              >
                {/* Table Header Strip */}
                <div
                  className="grid grid-cols-12 py-2 px-3 text-[9px] font-mono font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                    color: textDim,
                  }}
                >
                  <div className="col-span-1">CH#</div>
                  <div className="col-span-3">{isSpanish ? 'INSTRUMENTO' : 'INSTRUMENT'}</div>
                  <div className="col-span-2">{isSpanish ? 'INTÉRPRETE' : 'PERFORMER'}</div>
                  <div className="col-span-3">MIC / DI</div>
                  <div className="col-span-1 text-center">48V</div>
                  <div className="col-span-2 text-right">{isSpanish ? 'NOTAS' : 'NOTES'}</div>
                </div>

                {/* Channels Rows */}
                {data.channels.length > 0 ? (
                  data.channels.map((ch, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 py-2 px-3 items-center text-[11.5px] font-normal tracking-tight"
                      style={{
                        borderTopColor: borderSubtle,
                      }}
                    >
                      <div
                        className="col-span-1 font-mono text-[11px] font-bold"
                        style={{ color: textDim }}
                      >
                        {ch.ch}
                      </div>
                      <div className="col-span-3 font-bold truncate" style={{ color: textPrimary }}>
                        {localizeElementName(
                          ch.source,
                          undefined,
                          isSpanish ? 'es' : 'en'
                        ).toUpperCase()}
                      </div>
                      <div
                        className="col-span-2 text-[11px] truncate font-medium"
                        style={{ color: textDim }}
                      >
                        {ch.performer || '—'}
                      </div>
                      <div
                        className="col-span-3 font-mono text-[11px] truncate"
                        style={{ color: textSecondary }}
                      >
                        {ch.mic || '—'}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {ch.phantom ? (
                          <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 leading-none">
                            48V
                          </span>
                        ) : (
                          <span
                            className="text-center font-mono text-[10px]"
                            style={{ color: textDim }}
                          >
                            —
                          </span>
                        )}
                      </div>
                      <div
                        className="col-span-2 text-right text-[11px] truncate"
                        style={{ color: textDim }}
                      >
                        {ch.notes || '—'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                    {isSpanish
                      ? 'No hay canales configurados — añade elementos al escenario o parchea canales para completarlo'
                      : 'No channels configured — add stage elements or patch channels to populate'}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── 03 // TECHNICAL REQUIREMENTS ─────────────────────── */}
          {sectionsConfig.technicalRequirements && (
            <section className="space-y-3" data-purpose="connectivity-protocols">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.technicalRequirements} //
                    </span>
                    {isSpanish ? 'Requerimientos Técnicos' : 'Technical Requirements'}
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-semibold" style={{ color: textDim }}>
                  {isSpanish
                    ? `${data.totalRequirementsCount} Especificaciones`
                    : `${data.totalRequirementsCount} Specs`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* FOH Protocol Card */}
                <div
                  className="p-3.5 rounded-lg border flex flex-col gap-1"
                  style={{
                    backgroundColor: isLight
                      ? 'rgba(59, 130, 246, 0.03)'
                      : 'rgba(59, 130, 246, 0.05)',
                    borderColor: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.25)',
                    borderLeftWidth: '3px',
                    borderLeftColor: '#3b82f6',
                  }}
                >
                  <div className="text-[9px] font-mono tracking-wider font-bold uppercase text-blue-500">
                    {isSpanish ? 'Protocolo FOH' : 'FOH Protocol'}
                  </div>
                  <div className="text-[12px] font-bold" style={{ color: textPrimary }}>
                    {data.requirements.foh[0] || '—'}
                  </div>
                </div>

                {/* Monitor / IEM Card */}
                <div
                  className="p-3.5 rounded-lg border flex flex-col gap-1"
                  style={{
                    backgroundColor: isLight
                      ? 'rgba(249, 115, 22, 0.03)'
                      : 'rgba(249, 115, 22, 0.05)',
                    borderColor: isLight ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.25)',
                    borderLeftWidth: '3px',
                    borderLeftColor: '#f97316',
                  }}
                >
                  <div className="text-[9px] font-mono tracking-wider font-bold uppercase text-orange-500">
                    Monitor / IEM
                  </div>
                  <div className="text-[12px] font-bold" style={{ color: textPrimary }}>
                    {data.requirements.monitor[0] || '—'}
                  </div>
                </div>

                {/* Power Requirements Card */}
                <div
                  className="p-3.5 rounded-lg border flex flex-col gap-1"
                  style={{
                    backgroundColor: isLight
                      ? 'rgba(16, 185, 129, 0.03)'
                      : 'rgba(16, 185, 129, 0.05)',
                    borderColor: isLight ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.25)',
                    borderLeftWidth: '3px',
                    borderLeftColor: '#10b981',
                  }}
                >
                  <div className="text-[9px] font-mono tracking-wider font-bold uppercase text-emerald-500">
                    {isSpanish ? 'Requerimientos de Energía' : 'Power Requirements'}
                  </div>
                  <div className="text-[12px] font-bold" style={{ color: textPrimary }}>
                    {data.requirements.power[0] || '—'}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── 04 // PRODUCTION & TECHNICAL NOTES ───────────────── */}
          {sectionsConfig.technicalNotes && (
            <section className="space-y-3" data-purpose="technical-notes">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.technicalNotes} //
                    </span>
                    {isSpanish ? 'Notas de Producción y Técnicas' : 'Production & Technical Notes'}
                  </h2>
                </div>
              </div>

              <div
                className="p-4 rounded-lg border text-[12px] leading-relaxed select-none"
                style={{
                  backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: borderCol,
                  color: textSecondary,
                }}
              >
                {data.notes ||
                  (isSpanish
                    ? 'No se proporcionaron notas de producción personalizadas.'
                    : 'No custom production notes provided.')}
              </div>
            </section>
          )}

          {/* ── 05 // SETLIST RUNNING ORDER ──────────────────────── */}
          {sectionsConfig.setlist && (
            <section className="space-y-3" data-purpose="setlist-running-order">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.setlist} //
                    </span>
                    {isSpanish ? 'Orden de Canciones del Setlist' : 'Setlist Running Order'}
                  </h2>
                </div>
                {data.setlist.length > 0 && (
                  <span
                    className="text-[10px] font-mono tracking-tight font-semibold"
                    style={{ color: textDim }}
                  >
                    TOTAL {data.totalSetlistMinutes} MIN
                  </span>
                )}
              </div>

              <div
                className="border rounded-lg overflow-hidden divide-y select-none"
                style={{ borderColor: borderCol }}
              >
                {data.setlist.length > 0 ? (
                  data.setlist.map((song, idx) => (
                    <div
                      key={song.id || idx}
                      className="py-2.5 px-3 flex items-center justify-between text-[12px]"
                      style={{ borderTopColor: borderSubtle }}
                    >
                      <div className="flex items-baseline gap-3">
                        <span
                          className="font-mono text-[11px] font-bold"
                          style={{ color: textDim }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-bold" style={{ color: textPrimary }}>
                          {song.title}
                        </span>
                        {song.artist && (
                          <span className="text-[11px]" style={{ color: textDim }}>
                            · {song.artist}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px]" style={{ color: textDim }}>
                        {song.key ? `${song.key} · ` : ''}
                        {song.bpm ? `${song.bpm} BPM · ` : ''}
                        {song.duration || '04:00'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                    {isSpanish
                      ? 'No hay canciones añadidas al setlist'
                      : 'No songs added to setlist'}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── 06 // GEAR / LOAD-IN CHECKLIST ───────────────────── */}
          {sectionsConfig.gear && (
            <section className="space-y-3" data-purpose="load-in-checklist">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.gear} //
                    </span>
                    {isSpanish ? 'Equipamiento / Lista de Carga' : 'Gear / Load-In Checklist'}
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-semibold" style={{ color: textDim }}>
                  {isSpanish
                    ? `${data.totalGearUnits} Unidades (${data.packedGearUnits} Empacadas)`
                    : `${data.totalGearUnits} Units (${data.packedGearUnits} Packed)`}
                </span>
              </div>

              <div
                className="border rounded-lg overflow-hidden divide-y select-none"
                style={{ borderColor: borderCol }}
              >
                {data.gear.length > 0 ? (
                  data.gear.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="py-2.5 px-3 flex items-center justify-between text-[12px]"
                      style={{ borderTopColor: borderSubtle }}
                    >
                      <div className="flex items-baseline gap-3">
                        <span
                          className="font-mono text-[11px] font-bold"
                          style={{ color: textDim }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-bold" style={{ color: textPrimary }}>
                          {item.name}
                        </span>
                        <span className="text-[11px]" style={{ color: textDim }}>
                          ({item.category || (isSpanish ? 'General' : 'General')}) · {item.qty || 1}
                          x
                        </span>
                      </div>
                      <span
                        className={`text-[8.5px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${
                          item.packed
                            ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
                        }`}
                      >
                        {item.packed
                          ? isSpanish
                            ? 'Verificado'
                            : 'Verified'
                          : isSpanish
                            ? 'Requerido'
                            : 'Required'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                    {isSpanish
                      ? 'No hay elementos de equipamiento añadidos — visita la pestaña Equipamiento para armar tu lista.'
                      : 'No gear items added — visit the Gear tab to build your list.'}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── 07 // BAND & CREW ROSTER ─────────────────────────── */}
          {sectionsConfig.bandCrew && (
            <section className="space-y-3" data-purpose="band-crew-roster">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2
                    className="text-[14px] font-extrabold tracking-tight uppercase"
                    style={{ color: textPrimary, fontFamily: 'var(--studio-font-display)' }}
                  >
                    <span className="text-blue-500 font-mono text-[11px] mr-1.5">
                      {sectionNumberMap.bandCrew} //
                    </span>
                    {isSpanish ? 'Lista de Banda y Equipo' : 'Band & Crew Roster'}
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-semibold" style={{ color: textDim }}>
                  {isSpanish
                    ? `${data.totalMembers} Miembros (${data.assignedMembersCount} Asignados)`
                    : `${data.totalMembers} Members (${data.assignedMembersCount} Assigned)`}
                </span>
              </div>

              <div
                className="border rounded-lg overflow-hidden divide-y select-none"
                style={{ borderColor: borderCol }}
              >
                {data.members.length > 0 ? (
                  data.members.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="py-2.5 px-3 flex items-center justify-between text-[12px]"
                      style={{ borderTopColor: borderSubtle }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0"
                          style={{
                            backgroundColor: member.color
                              ? `${member.color}20`
                              : 'rgba(0,0,0,0.05)',
                            borderColor: member.color || borderCol,
                            color: member.color || textPrimary,
                          }}
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold block" style={{ color: textPrimary }}>
                            {member.name}
                          </span>
                          <span className="text-[10px]" style={{ color: textDim }}>
                            {member.role || (isSpanish ? 'Miembro de Banda' : 'Band Member')} ·{' '}
                            {member.assignedElements.length > 0
                              ? `${isSpanish ? 'Asignado: ' : 'Assigned: '}${member.assignedElements
                                  .map((ae) =>
                                    localizeElementName(ae, undefined, isSpanish ? 'es' : 'en')
                                  )
                                  .join(', ')}`
                              : isSpanish
                                ? 'Sin asignar'
                                : 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {(member.phone || member.email) && (
                        <span className="text-[10px] font-mono" style={{ color: textDim }}>
                          {[member.phone, member.email].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                    {isSpanish
                      ? 'No hay miembros añadidos — visita la pestaña Banda y Equipo para armar tu lista.'
                      : 'No members added — visit the Band & Crew tab to build your roster.'}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── DOCUMENT FOOTER ──────────────────────────────────── */}
          <footer
            className="pt-6 pb-4 border-t text-[10px] font-mono flex justify-between items-center select-none"
            style={{
              borderColor: borderCol,
              color: textDim,
            }}
          >
            <div>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">STAGEX</span>
              <p className="text-[8.5px] uppercase tracking-wider mt-0.5 text-zinc-400">
                {isSpanish
                  ? 'Editor Profesional de Planos de Escenario y Documentos de Producción'
                  : 'Professional Stage Plot & Production Document Editor'}
              </p>
            </div>
            <div className="text-right">
              <span>{data.date.toUpperCase()}</span>
              <p className="text-[8.5px] uppercase tracking-wider mt-0.5 text-zinc-400">
                {isSpanish ? 'Última actualización: ' : 'Last Updated: '}
                {data.date.toUpperCase()} - {data.time}
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* ── IN-APP ANIMATED SAVE SUCCESS BANNER ───────────────────── */}
      <AnimatePresence>
        {saveSuccessNotification && (
          <motion.div
            data-testid="save-success-banner"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 border shadow-2xl select-none"
            style={{
              backgroundColor: bgCard,
              borderColor: isLight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
              width: 'min(420px, calc(100vw - 32px))',
            }}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-emerald-500 flex items-center gap-1.5">
                <span>{isSpanish ? 'Guardado en Descargas' : 'Saved to Downloads'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {isSpanish
                    ? `${saveSuccessNotification.pageCount} Páginas`
                    : `${saveSuccessNotification.pageCount} Pages`}
                </span>
              </div>
              <div
                className="text-[11px] font-mono truncate mt-0.5"
                style={{ color: textSecondary }}
              >
                {saveSuccessNotification.fileName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessNotification(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:opacity-75 shrink-0"
              style={{ color: textDim }}
              aria-label={isSpanish ? 'Descartar notificación' : 'Dismiss notification'}
            >
              <svg
                width="13"
                height="13"
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default StageExportPdfView;
