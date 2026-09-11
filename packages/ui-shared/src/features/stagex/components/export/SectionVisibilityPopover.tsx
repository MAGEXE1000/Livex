import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '@workspace/studio-core';
import type {
  ProductionDocumentData,
  ProductionDocumentSectionsConfig,
} from '../../services/projectProductionDocumentData';

export interface SectionVisibilityPopoverProps {
  open: boolean;
  onClose: () => void;
  sections: ProductionDocumentSectionsConfig;
  onToggleSection: (key: keyof ProductionDocumentSectionsConfig) => void;
  onSelectAll: () => void;
  onReset: () => void;
  data: ProductionDocumentData;
  isLight?: boolean;
  isAmoled?: boolean;
}

interface SectionItemMeta {
  key: keyof ProductionDocumentSectionsConfig;
  title: string;
  getSubtitle: (data: ProductionDocumentData) => string;
  icon: (color: string) => React.ReactNode;
}

function getSectionItems(isSpanish: boolean): SectionItemMeta[] {
  return [
    {
      key: 'stagePlot',
      title: isSpanish ? 'Plano de Escenario' : 'Stage Plot',
      getSubtitle: (d) =>
        isSpanish
          ? `${d.elements.length} elementos · Escala 1:50`
          : `${d.elements.length} elements · Scale 1:50`,
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      key: 'inputPatch',
      title: isSpanish ? 'Lista de Canales y Patch' : 'Input Channel & Patch List',
      getSubtitle: (d) =>
        isSpanish
          ? `${d.channels.length} canales configurados`
          : `${d.channels.length} channels configured`,
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
    },
    {
      key: 'technicalRequirements',
      title: isSpanish ? 'Requerimientos Técnicos' : 'Technical Requirements',
      getSubtitle: (d) =>
        isSpanish
          ? `${d.totalRequirementsCount} especificaciones`
          : `${d.totalRequirementsCount} specs configured`,
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      key: 'technicalNotes',
      title: isSpanish ? 'Notas Técnicas y de Producción' : 'Production & Technical Notes',
      getSubtitle: (d) =>
        d.notes
          ? isSpanish
            ? 'Notas personalizadas'
            : 'Custom notes configured'
          : isSpanish
            ? 'Notas estándar'
            : 'Standard notes',
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      key: 'setlist',
      title: isSpanish ? 'Orden del Setlist' : 'Setlist Running Order',
      getSubtitle: (d) =>
        isSpanish
          ? `${d.setlist.length} canciones · ${d.totalSetlistMinutes || 0} min`
          : `${d.setlist.length} songs · ${d.totalSetlistMinutes || 0} min`,
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
    },
    {
      key: 'gear',
      title: isSpanish ? 'Equipamiento y Carga' : 'Gear / Load-In Checklist',
      getSubtitle: (d) =>
        isSpanish
          ? `${d.totalGearUnits || d.gear.length} unidades (${d.packedGearUnits || 0} empacadas)`
          : `${d.totalGearUnits || d.gear.length} units (${d.packedGearUnits || 0} packed)`,
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      key: 'bandCrew',
      title: isSpanish ? 'Banda y Equipo Técnico' : 'Band & Crew Roster',
      getSubtitle: (d) =>
        isSpanish
          ? `${d.totalMembers || d.members.length} miembros (${d.assignedMembersCount || 0} asignados)`
          : `${d.totalMembers || d.members.length} members (${d.assignedMembersCount || 0} assigned)`,
      icon: (col) => (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];
}

export interface SectionVisibilityContentProps {
  sections: ProductionDocumentSectionsConfig;
  onToggleSection: (key: keyof ProductionDocumentSectionsConfig) => void;
  onSelectAll: () => void;
  onReset: () => void;
  data: ProductionDocumentData;
  isLight?: boolean;
  isAmoled?: boolean;
}

export const SectionVisibilityContent: React.FC<SectionVisibilityContentProps> = ({
  sections,
  onToggleSection,
  onSelectAll,
  onReset,
  data,
  isLight = false,
  isAmoled = false,
}) => {
  const isSpanish = (useSettingsStore((s) => s.settings.language) ?? 'en') === 'es';
  const sectionItems = useMemo(() => getSectionItems(isSpanish), [isSpanish]);

  const activeCount = Object.values(sections).filter(Boolean).length;
  const isAllActive = activeCount === sectionItems.length;

  const borderCol = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  const textPrimary = isLight ? '#09090b' : '#ffffff';
  const textDim = isLight ? '#a1a1aa' : '#71717a';
  const hoverBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header: Title, Count Badge, Quick Actions */}
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: borderCol }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-bold tracking-wider uppercase"
            style={{ color: textDim }}
          >
            {isSpanish ? 'Secciones' : 'Sections'}
          </span>
          <span
            data-testid="sections-count-badge"
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20"
          >
            {isSpanish
              ? `${activeCount} de ${sectionItems.length}`
              : `${activeCount} of ${sectionItems.length}`}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isAllActive}
            data-testid="sections-select-all-btn"
            className="hover:underline disabled:opacity-40 disabled:hover:no-underline transition-opacity cursor-pointer"
            style={{ color: '#2563eb' }}
          >
            {isSpanish ? 'Todas' : 'All'}
          </button>
          <span style={{ color: borderCol }}>|</span>
          <button
            type="button"
            onClick={onReset}
            data-testid="sections-reset-btn"
            className="hover:underline transition-opacity cursor-pointer"
            style={{ color: textDim }}
          >
            {isSpanish ? 'Restablecer' : 'Reset'}
          </button>
        </div>
      </div>

      {/* List of 7 Section Toggles */}
      <div className="p-1 max-h-[320px] overflow-y-auto divide-y divide-transparent">
        {sectionItems.map((item) => {
          const isActive = Boolean(sections[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              role="checkbox"
              aria-checked={isActive}
              data-testid={`section-toggle-${item.key}`}
              onClick={() => onToggleSection(item.key)}
              className="w-full text-left px-2 py-1.5 rounded-xl flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
              style={{
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Section Type Icon */}
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? isLight
                        ? 'rgba(37, 99, 235, 0.08)'
                        : 'rgba(37, 99, 235, 0.15)'
                      : isLight
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.04)',
                  }}
                >
                  {item.icon(isActive ? '#2563eb' : textDim)}
                </div>

                {/* Title & Subtitle */}
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[12px] font-bold truncate leading-snug"
                    style={{
                      color: isActive ? textPrimary : textDim,
                      fontFamily: 'var(--studio-font-display)',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    className="text-[9.5px] font-medium truncate leading-none mt-0.5"
                    style={{ color: textDim }}
                  >
                    {item.getSubtitle(data)}
                  </div>
                </div>
              </div>

              {/* Active State Checkmark Box */}
              <div
                className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: isActive ? '#2563eb' : 'transparent',
                  border: isActive
                    ? '1.5px solid #2563eb'
                    : isLight
                      ? '1.5px solid rgba(0, 0, 0, 0.2)'
                      : '1.5px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {isActive && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Helper Note */}
      <div
        className="px-3 py-1.5 border-t text-[9.5px] font-mono text-center select-none"
        style={{
          borderColor: borderCol,
          color: textDim,
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
        }}
      >
        {isSpanish
          ? 'Las secciones excluidas se omiten del PDF'
          : 'Excluded sections are omitted from PDF export'}
      </div>
    </div>
  );
};

export const SectionVisibilityPopover: React.FC<SectionVisibilityPopoverProps> = ({
  open,
  onClose,
  ...props
}) => {
  return (
    <SectionVisibilityContent {...props} />
  );
};

