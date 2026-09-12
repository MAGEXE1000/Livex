import React, { useRef } from 'react';
import { useStagexStore } from '../../state/useStagexStore';
import {
  useSettingsStore,
  settingsController,
  useScrollHide,
  useT,
  useIsWebDesktop,
  resolveAccent,
  useShallow,
} from '@workspace/studio-core';
import {
  Toggle,
  SectionHeader,
  SettingRow,
  SegmentedControl,
} from '../../../../shared/settings/SettingControls';
import { StudioHeader } from '../../../../shared/layout/StudioHeader';

export interface StagePreferencesViewProps {
  isLight?: boolean;
  isAmoled?: boolean;
}

export const StagePreferencesView: React.FC<StagePreferencesViewProps> = ({
  isLight: isLightProp,
  isAmoled: isAmoledProp,
}) => {
  const settings = useSettingsStore(
    useShallow((s) => ({
      accentColor: s.settings.accentColor,
      perApp: s.settings.perApp,
      theme: s.settings.theme,
      amoledMode: s.settings.amoledMode,
      language: s.settings.language,
    }))
  );
  const acc = resolveAccent(settings.accentColor);

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);

  const t = useT();
  const tr = t as any;
  const isWebDesktop = useIsWebDesktop();

  const preferences = useStagexStore((s) => s.preferences);
  const updatePreferences = useStagexStore((s) => s.updatePreferences);

  const activeVis = settings.perApp?.stagex;
  const isLight =
    isLightProp !== undefined
      ? isLightProp
      : activeVis
        ? activeVis.theme === 'light'
        : settings.theme === 'light';
  const isAmoled =
    isAmoledProp !== undefined
      ? isAmoledProp
      : !isLight && Boolean(settings.amoledMode || activeVis?.amoledMode);

  const currentLanguage = settings.language ?? 'en';
  const isSpanish = currentLanguage === 'es';

  const cardStyle: React.CSSProperties = {
    background: isLight
      ? '#ffffff'
      : isAmoled
        ? '#000000'
        : 'var(--surface-card-bg, var(--app-surface, #111115))',
    border: '1px solid var(--track, var(--c-border))',
    borderRadius: 'var(--radius-card, 16px)',
    boxShadow:
      'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
    overflow: 'hidden',
    position: 'relative',
  };

  const gridSizes = [
    { label: tr.stagex?.gridFine || 'FINE', value: 40, testId: 'grid-size-fine' },
    { label: tr.stagex?.gridNormal || 'NORMAL', value: 80, testId: 'grid-size-normal' },
    { label: tr.stagex?.gridCoarse || 'COARSE', value: 120, testId: 'grid-size-coarse' },
  ];

  const stageShapes = [
    {
      label: tr.stagex?.shapeRectangle || (isSpanish ? 'Rectángulo' : 'Rectangle'),
      value: 'rectangular',
      testId: 'stage-shape-rectangle',
    },
    {
      label: tr.stagex?.shapeSquare || (isSpanish ? 'Cuadrado' : 'Square'),
      value: 'square',
      testId: 'stage-shape-square',
    },
  ];

  const stageUnitsList = [
    {
      label: tr.stagex?.unitsMeters || (isSpanish ? 'Metros (m)' : 'Meters (m)'),
      value: 'meters',
      testId: 'units-meters',
    },
    {
      label: tr.stagex?.unitsFeet || (isSpanish ? 'Pies (ft)' : 'Feet (ft)'),
      value: 'feet',
      testId: 'units-feet',
    },
  ];

  const title =
    tr.stagex?.preferencesTitle ||
    tr.nav?.preferences ||
    (isSpanish ? 'Preferencias' : 'Preferences');
  const subtitle =
    tr.stagex?.preferencesSubtitle ||
    (isSpanish
      ? 'Ajustes del lienzo del escenario, visualización y editor'
      : 'Stage plot canvas, display and editor settings');

  return (
    <div
      className="flex flex-col h-full overflow-hidden app-bg"
      style={{
        backgroundColor: isLight
          ? 'var(--app-bg, #f8fafc)'
          : isAmoled
            ? '#000000'
            : 'var(--app-bg, #0a0a0c)',
      }}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-0"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 80px)',
          paddingTop: isWebDesktop ? '20px' : '0',
        }}
      >
        <StudioHeader title={title} subtitle={subtitle} />

        <div className="px-6 max-w-3xl mx-auto">
          {/* ── 1. DISPLAY & OVERLAYS ── */}
          <SectionHeader
            icon="layers"
            title={
              tr.stagex?.displayAndOverlays ||
              (isSpanish ? 'Visualización y Capas' : 'Display & Overlays')
            }
          />
          <div style={cardStyle} className="mb-6">
            <SettingRow
              label={tr.stagex?.gridOverlay || (isSpanish ? 'Cuadrícula visible' : 'Grid Overlay')}
              desc={
                tr.stagex?.gridOverlayDesc ||
                (isSpanish
                  ? 'Muestra la cuadrícula de alineación en el lienzo del escenario.'
                  : 'Display layout alignment grid on the stage canvas.')
              }
            >
              <Toggle
                value={preferences.gridVisible !== false}
                onChange={(val) => updatePreferences({ gridVisible: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>

            <SettingRow
              label={
                tr.stagex?.cableConnections ||
                (isSpanish ? 'Conexiones de cable' : 'Cable Connections')
              }
              desc={
                tr.stagex?.cableConnectionsDesc ||
                (isSpanish
                  ? 'Muestra rutas de señal y energía entre elementos del escenario.'
                  : 'Show signal and power routes between stage elements.')
              }
            >
              <Toggle
                value={preferences.connectionsVisible !== false}
                onChange={(val) => updatePreferences({ connectionsVisible: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>

            <SettingRow
              label={
                tr.stagex?.audioCoverage ||
                (isSpanish ? 'Cobertura de audio' : 'Audio Coverage Cones')
              }
              desc={
                tr.stagex?.audioCoverageDesc ||
                (isSpanish
                  ? 'Muestra los conos de dispersión y alcance de monitores y altavoces PA.'
                  : 'Show dispersion cones and coverage range for audio speakers and wedges.')
              }
            >
              <Toggle
                testId="toggle-pref-audio-coverage"
                ariaLabel="Audio Coverage Cones"
                value={preferences.audioCoverageVisible !== false}
                onChange={(val) => updatePreferences({ audioCoverageVisible: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>

            <SettingRow
              label={
                tr.stagex?.elementNames || (isSpanish ? 'Nombres de elementos' : 'Element Names')
              }
              desc={
                tr.stagex?.elementNamesDesc ||
                (isSpanish
                  ? 'Muestra u oculta los nombres de cada elemento en el escenario.'
                  : 'Show or hide element name labels on the stage canvas.')
              }
            >
              <Toggle
                testId="toggle-pref-element-names"
                ariaLabel="Element Names"
                value={preferences.labelsVisible !== false}
                onChange={(val) => updatePreferences({ labelsVisible: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>

            <SettingRow
              label={
                tr.stagex?.stageGuides ||
                (isSpanish ? 'Guías y zona segura' : 'Stage Guides & Safe Area')
              }
              desc={
                tr.stagex?.stageGuidesDesc ||
                (isSpanish
                  ? 'Muestra el límite de área segura (8%) y las líneas de centro del escenario.'
                  : 'Show performance safe area boundary (8%) and alignment crosshairs.')
              }
            >
              <Toggle
                testId="toggle-pref-stage-guides"
                ariaLabel="Stage Guides & Safe Area"
                value={preferences.stageGuidesVisible !== false}
                onChange={(val) => updatePreferences({ stageGuidesVisible: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
          </div>

          {/* ── 2. STAGE GEOMETRY ── */}
          <SectionHeader
            icon="aspect_ratio"
            title={
              tr.stagex?.stageGeometry || (isSpanish ? 'Geometría del Escenario' : 'Stage Geometry')
            }
          />
          <div style={cardStyle} className="mb-6">
            <SettingRow
              label={
                tr.stagex?.stagePlotShape || (isSpanish ? 'Forma del plano' : 'Stage Plot Shape')
              }
              desc={
                tr.stagex?.stagePlotShapeDesc ||
                (isSpanish
                  ? 'Relación de aspecto y geometría del plano de escenario.'
                  : 'Aspect ratio and geometry of the stage canvas plot.')
              }
            >
              <SegmentedControl
                options={stageShapes}
                value={preferences.stageShape || 'rectangular'}
                onChange={(val) =>
                  updatePreferences({ stageShape: val as 'rectangular' | 'square' })
                }
                accentFrom={acc.from}
                accentTo={acc.to}
                layoutId="stagex-shape"
              />
            </SettingRow>

            <SettingRow
              label={tr.stagex?.gridSize || (isSpanish ? 'Tamaño de cuadrícula' : 'Grid Size')}
              desc={
                tr.stagex?.gridSizeDesc ||
                (isSpanish
                  ? 'Controla el espaciado de las líneas de la cuadrícula.'
                  : 'Controls the spacing of the stage grid lines.')
              }
            >
              <SegmentedControl
                options={gridSizes}
                value={preferences.gridSize || 80}
                onChange={(val) => updatePreferences({ gridSize: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
                layoutId="stagex-grid-size"
              />
            </SettingRow>

            <SettingRow
              label={
                tr.stagex?.measurementUnits ||
                (isSpanish ? 'Unidades de medida' : 'Measurement Units')
              }
              desc={
                tr.stagex?.measurementUnitsDesc ||
                (isSpanish
                  ? 'Unidades usadas para ancho, fondo e indicadores de distancia.'
                  : 'Units used for stage width, depth, and distance indicators.')
              }
            >
              <SegmentedControl
                options={stageUnitsList}
                value={preferences.stageUnits || 'meters'}
                onChange={(val) => updatePreferences({ stageUnits: val as 'meters' | 'feet' })}
                accentFrom={acc.from}
                accentTo={acc.to}
                layoutId="stagex-units"
              />
            </SettingRow>
          </div>

          {/* ── 3. SNAPPING & LAYOUT ── */}
          <SectionHeader
            icon="tune"
            title={
              tr.stagex?.snappingAndLayout ||
              (isSpanish ? 'Ajuste y Alineación' : 'Snapping & Layout')
            }
          />
          <div style={cardStyle} className="mb-6">
            <SettingRow
              label={tr.stagex?.snapToGrid || (isSpanish ? 'Ajustar a cuadrícula' : 'Snap to Grid')}
              desc={
                tr.stagex?.snapToGridDesc ||
                (isSpanish
                  ? 'Los elementos se ajustan a la cuadrícula al arrastrar.'
                  : 'Elements snap to grid when dragging.')
              }
            >
              <Toggle
                value={preferences.snapToGrid}
                onChange={(val) => updatePreferences({ snapToGrid: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>

            <SettingRow
              label={
                tr.stagex?.cableDistances ||
                (isSpanish ? 'Distancia de cables' : 'Show Cable Distances')
              }
              desc={
                tr.stagex?.cableDistancesDesc ||
                (isSpanish
                  ? 'Muestra las distancias calculadas a lo largo de las conexiones de cable.'
                  : 'Display calculated cable distance labels along connection routes.')
              }
            >
              <Toggle
                value={Boolean(preferences.showCableLength)}
                onChange={(val) => updatePreferences({ showCableLength: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>

            <SettingRow
              label={tr.stagex?.autoWire || (isSpanish ? 'Conexión automática' : 'Auto Wire')}
              desc={
                tr.stagex?.autoWireDesc ||
                (isSpanish
                  ? 'Conectar automáticamente elementos compatibles al colocarlos.'
                  : 'Automatically connect compatible elements when placed.')
              }
            >
              <Toggle
                value={Boolean(preferences.autoWire)}
                onChange={(val) => updatePreferences({ autoWire: val })}
                accentFrom={acc.from}
                accentTo={acc.to}
              />
            </SettingRow>
          </div>
        </div>
      </div>
    </div>
  );
};
