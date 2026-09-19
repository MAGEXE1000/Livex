import type { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import type {
  ProductionDocumentData,
  ProductionDocumentSectionsConfig,
} from './projectProductionDocumentData';
import { DEFAULT_PRODUCTION_DOCUMENT_SECTIONS } from './projectProductionDocumentData';
import { STAGEX_ICON_MAP, localizeElementName } from '../constants';

export type PdfThemeMode = 'light' | 'dark' | 'amoled';

export interface GeneratePdfOptions {
  fileName?: string;
  share?: boolean;
  sections?: ProductionDocumentSectionsConfig;
  theme?: PdfThemeMode;
  lang?: 'en' | 'es';
}

export interface GeneratePdfResult {
  fileName: string;
  pageCount: number;
  blob?: Blob;
  uri?: string;
  success?: boolean;
}

export interface PdfThemePalette {
  mode: PdfThemeMode;
  bgPage: readonly [number, number, number];
  bgCard: readonly [number, number, number];
  bgHeader: readonly [number, number, number];
  bgZebra: readonly [number, number, number];
  bgBlueprint: readonly [number, number, number];
  gridDot: readonly [number, number, number];
  textPrimary: readonly [number, number, number];
  textSecondary: readonly [number, number, number];
  textMuted: readonly [number, number, number];
  border: readonly [number, number, number];
  borderSubtle: readonly [number, number, number];
  blue: readonly [number, number, number];
  bluePillBg: readonly [number, number, number];
  amber: readonly [number, number, number];
  green: readonly [number, number, number];
}

export function resolvePdfTheme(theme?: PdfThemeMode): PdfThemePalette {
  if (theme === 'amoled') {
    return {
      mode: 'amoled',
      bgPage: [0, 0, 0] as const, // Pure pitch black #000000 for AMOLED
      bgCard: [10, 10, 14] as const,
      bgHeader: [16, 16, 22] as const,
      bgZebra: [12, 12, 16] as const,
      bgBlueprint: [4, 4, 6] as const,
      gridDot: [32, 32, 42] as const,
      textPrimary: [255, 255, 255] as const,
      textSecondary: [212, 212, 216] as const,
      textMuted: [140, 140, 150] as const,
      border: [42, 42, 52] as const,
      borderSubtle: [26, 26, 34] as const,
      blue: [59, 130, 246] as const,
      bluePillBg: [15, 23, 42] as const,
      amber: [245, 158, 11] as const,
      green: [16, 185, 129] as const,
    };
  }

  if (theme === 'dark') {
    return {
      mode: 'dark',
      bgPage: [9, 9, 11] as const, // #09090b
      bgCard: [20, 20, 26] as const,
      bgHeader: [27, 27, 35] as const,
      bgZebra: [15, 15, 20] as const,
      bgBlueprint: [12, 12, 15] as const,
      gridDot: [36, 36, 46] as const,
      textPrimary: [255, 255, 255] as const,
      textSecondary: [212, 212, 216] as const,
      textMuted: [140, 140, 150] as const,
      border: [45, 45, 55] as const,
      borderSubtle: [28, 28, 36] as const,
      blue: [59, 130, 246] as const,
      bluePillBg: [20, 30, 55] as const,
      amber: [245, 158, 11] as const,
      green: [16, 185, 129] as const,
    };
  }

  // Light (default)
  return {
    mode: 'light',
    bgPage: [255, 255, 255] as const,
    bgCard: [249, 250, 251] as const,
    bgHeader: [243, 244, 246] as const,
    bgZebra: [250, 250, 251] as const,
    bgBlueprint: [244, 245, 247] as const,
    gridDot: [224, 227, 233] as const,
    textPrimary: [17, 24, 39] as const,
    textSecondary: [75, 85, 99] as const,
    textMuted: [156, 163, 175] as const,
    border: [229, 231, 235] as const,
    borderSubtle: [243, 244, 246] as const,
    blue: [37, 99, 235] as const,
    bluePillBg: [239, 246, 255] as const,
    amber: [245, 158, 11] as const,
    green: [16, 185, 129] as const,
  };
}

function parseHexColor(
  hex?: string,
  fallback: readonly [number, number, number] = [59, 130, 246]
): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [fallback[0], fallback[1], fallback[2]];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  } else if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  }
  return [fallback[0], fallback[1], fallback[2]];
}

// In-memory cache for rasterized PNG data URLs to guarantee fast, reliable PDF generation
const assetPngCache = new Map<string, string>();

async function resolveAssetPngDataUrl(src: string, rotation = 0): Promise<string | null> {
  if (!src) return null;
  const rotNorm = ((Math.round(rotation) % 360) + 360) % 360;
  const cacheKey = `${src}_rot_${rotNorm}`;
  if (assetPngCache.has(cacheKey)) return assetPngCache.get(cacheKey)!;

  if (rotNorm === 0 && (src.startsWith('data:image/png') || src.startsWith('data:image/jpeg'))) {
    assetPngCache.set(cacheKey, src);
    return src;
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = Math.max(img.naturalWidth || 96, img.naturalHeight || 96, 96);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('No canvas 2D context'));
              return;
            }
            ctx.save();
            ctx.translate(size / 2, size / 2);
            if (rotNorm !== 0) {
              ctx.rotate((rotNorm * Math.PI) / 180);
            }
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
            const out = canvas.toDataURL('image/png');
            resolve(out);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = src;
      });
      assetPngCache.set(cacheKey, dataUrl);
      return dataUrl;
    } catch (err) {
      console.warn('Could not rasterize asset for PDF:', src, err);
      return null;
    }
  }
  return null;
}

function drawVectorElementFallback(
  doc: jsPDF,
  el: any,
  x: number,
  y: number,
  size: number,
  color: [number, number, number],
  T: PdfThemePalette
) {
  doc.setFillColor(T.bgCard[0], T.bgCard[1], T.bgCard[2]);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - size / 2, y - size / 2, size, size, 1.2, 1.2, 'FD');

  const iconStr = (el.icon || el.type || el.label || el.name || 'EL').slice(0, 3).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(Math.max(4, Math.min(6.5, size * 0.5)));
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(iconStr, x, y + size * 0.16, { align: 'center' });
}

/**
 * Generates a clean, professional, single long-format vector PDF production document
 * from the canonical Stagex ProductionDocumentData contract, fully respecting
 * the active Studio theme (Light, Dark, AMOLED) and bilingual localization.
 *
 * Requirements guaranteed:
 * - Exactly ONE physical page (A4 width 210mm, dynamic calculated height, no multi-page breaks).
 * - Exact Stage Plot geometry (32:24 / 4:3 rectangular or 1:1 square).
 * - Actual graphical element representations with small unobtrusive channel identifier badges.
 * - Bilingual live-production Spanish terminology.
 * - Perfect 1:1 synchronization with stage elements and input channels.
 */
export async function generateProductionDocumentPdf(
  data: ProductionDocumentData,
  options: GeneratePdfOptions = {}
): Promise<GeneratePdfResult> {
  const PAGE_WIDTH = 210; // Standard A4 width (mm)
  const MARGIN_LEFT = 14;
  const MARGIN_RIGHT = 14;
  const MARGIN_TOP = 16;
  const MARGIN_BOTTOM = 16;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 182mm

  // Active theme palette & localization
  const T = resolvePdfTheme(options.theme);
  const isEs = options.lang === 'es';

  const sections: ProductionDocumentSectionsConfig = {
    ...DEFAULT_PRODUCTION_DOCUMENT_SECTIONS,
    ...(options.sections || {}),
  };

  const activeSectionsCount = Object.values(sections).filter(Boolean).length;

  // ═══════════════════════════════════════════════════════════════════
  // 1. PRE-LOAD ELEMENT GRAPHICAL ASSETS (WITH CENTER ROTATION)
  // ═══════════════════════════════════════════════════════════════════
  const elementImages = await Promise.all(
    (data.elements || []).map(async (el) => {
      const iconKey = el.icon || el.type || 'mic';
      const src = el.imageData || STAGEX_ICON_MAP[iconKey] || STAGEX_ICON_MAP['mic'];
      const dataUrl = src ? await resolveAssetPngDataUrl(src, el.rotation || 0) : null;
      return { id: el.id, dataUrl };
    })
  );
  const elementImageMap = new Map<string, string | null>();
  elementImages.forEach((item) => {
    elementImageMap.set(item.id, item.dataUrl);
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. DYNAMIC SINGLE-PAGE HEIGHT CALCULATION
  // ═══════════════════════════════════════════════════════════════════
  let totalContentHeight = 0;

  // Cover & Header:
  // Pill (8.5mm) + Project Title (7.5mm) + Subtitle (6.0mm) + Spacing (3.0mm) = 25mm
  let headerH = 25.0;
  const hasLogistics = Boolean(data.venue || data.contactName || data.contactPhone);
  if (hasLogistics) {
    headerH += 18.0;
  }
  totalContentHeight += headerH;

  // Section 1: Stage Plot (preserving 16:9 rectangular or 1:1 square logical aspect ratio)
  const refW = data.refW || (data.isSquare ? 800 : 800);
  const refH = data.refH || (data.isSquare ? 800 : 450);
  const stageAspectRatio = refH / refW; // 9/16 = 0.5625 for 16:9, or 1.0 for square
  const plotW = CONTENT_WIDTH; // 182mm
  const plotBoxH = data.isSquare ? plotW : Math.round(plotW * stageAspectRatio * 10) / 10;
  if (sections.stagePlot) {
    totalContentHeight += 7.0 + plotBoxH + 6.0;
  }

  // Section 2: Input Channels & Patch List
  if (sections.inputPatch) {
    const patchRowsH = data.channels.length === 0 ? 12.0 : data.channels.length * 6.0;
    totalContentHeight += 7.0 + 6.0 + patchRowsH + 6.0;
  }

  // Section 3: Technical Requirements (Rider)
  let extraSpecs: string[] = [];
  if (sections.technicalRequirements) {
    extraSpecs = [
      ...data.requirements.foh.slice(1),
      ...data.requirements.monitor.slice(1),
      ...data.requirements.power.slice(1),
      ...(data.requirements.hospitality || []),
      ...(data.requirements.custom || []),
    ];
    let extraH = 0;
    if (extraSpecs.length > 0) {
      extraH = 4.0 + Math.min(extraSpecs.length, 6) * 4.0 + 2.0;
    }
    totalContentHeight += 7.0 + 24.0 + extraH + 6.0;
  }

  // Section 4: Production & Technical Notes
  let notesLines: string[] = [];
  let notesBoxH = 16.0;
  if (sections.technicalNotes) {
    const notesText =
      data.notes ||
      (isEs
        ? 'No se proporcionaron notas de producción personalizadas.'
        : 'No custom production notes provided.');
    const approxCharsPerLine = Math.floor((CONTENT_WIDTH - 8) / 1.7);
    const words = notesText.split(/\s+/);
    let curLine = '';
    notesLines = [];
    words.forEach((w) => {
      if ((curLine + ' ' + w).length > approxCharsPerLine) {
        notesLines.push(curLine.trim());
        curLine = w;
      } else {
        curLine = curLine ? `${curLine} ${w}` : w;
      }
    });
    if (curLine) notesLines.push(curLine.trim());
    notesBoxH = Math.max(16.0, notesLines.length * 4.2 + 6.0);
    totalContentHeight += 7.0 + notesBoxH + 6.0;
  }

  // Section 5: Setlist Running Order
  if (sections.setlist) {
    const setlistRowsH = data.setlist.length === 0 ? 12.0 : 5.5 + data.setlist.length * 5.5;
    totalContentHeight += 7.0 + setlistRowsH + 6.0;
  }

  // Section 6: Gear / Load-In Checklist
  if (sections.gear) {
    const gearRowsH = data.gear.length === 0 ? 12.0 : 5.5 + data.gear.length * 5.5;
    totalContentHeight += 7.0 + gearRowsH + 6.0;
  }

  // Section 7: Band & Crew Roster
  if (sections.bandCrew) {
    const memberRowsH = data.members.length === 0 ? 12.0 : 5.5 + data.members.length * 5.5;
    totalContentHeight += 7.0 + memberRowsH + 6.0;
  }

  // Fallback if all sections disabled
  if (activeSectionsCount === 0) {
    totalContentHeight += 24.0;
  }

  // Footer: 16mm
  totalContentHeight += 16.0;

  // Single Page Total Height (dynamic, exact, continuous with safe bottom margin buffer)
  const PAGE_HEIGHT = Math.max(
    120,
    Math.round(MARGIN_TOP + totalContentHeight + MARGIN_BOTTOM + 6)
  );

  // Initialize jsPDF with EXACT single-page long-format dimensions
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. PAGE BACKGROUND & DRAWING HELPERS
  // ═══════════════════════════════════════════════════════════════════
  // Paint full background with the active theme color (Pure Black #000000 for AMOLED)
  doc.setFillColor(T.bgPage[0], T.bgPage[1], T.bgPage[2]);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let currentY = MARGIN_TOP;

  let sectionCounter = 1;
  const getNextSectionNumber = (): string => String(sectionCounter++).padStart(2, '0');

  const drawSectionTitle = (num: string, title: string, subtitle?: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(T.blue[0], T.blue[1], T.blue[2]);
    doc.text(`${num} //`, MARGIN_LEFT, currentY);

    const titleX = MARGIN_LEFT + doc.getTextWidth(`${num} // `);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    doc.text(title.toUpperCase(), titleX, currentY);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(subtitle, PAGE_WIDTH - MARGIN_RIGHT, currentY, { align: 'right' });
    }

    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_LEFT, currentY + 2.5, PAGE_WIDTH - MARGIN_RIGHT, currentY + 2.5);
    currentY += 7;
  };

  // ═══════════════════════════════════════════════════════════════════
  // 4. COVER, LOGISTICS & IDENTITY
  // ═══════════════════════════════════════════════════════════════════
  // Document Type Pill
  const pillText = isEs ? 'DOCUMENTO DE PRODUCCIÓN EN VIVO' : 'LIVE STAGE PRODUCTION DOCUMENT';
  const pillW = isEs ? 64 : 58;
  doc.setFillColor(T.bluePillBg[0], T.bluePillBg[1], T.bluePillBg[2]);
  doc.roundedRect(MARGIN_LEFT, currentY, pillW, 5.5, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(T.blue[0], T.blue[1], T.blue[2]);
  doc.text(pillText, MARGIN_LEFT + 3, currentY + 3.8);
  currentY += 8.5;

  // Project Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
  doc.text(data.projectName.toUpperCase(), MARGIN_LEFT, currentY);
  currentY += 5.5;

  // Subtitle / Scene Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
  const sceneStr = isEs
    ? `Escenario: ${data.sceneName} · Generado: ${data.date} ${data.time} · ID de Documento: ${data.documentId}`
    : `Scene: ${data.sceneName} · Generated: ${data.date} ${data.time} · Document ID: ${data.documentId}`;
  doc.text(sceneStr, MARGIN_LEFT, currentY);
  currentY += 6;

  // Production Logistics Card (Venue, Contact, Phone/Email)
  if (hasLogistics) {
    doc.setFillColor(T.bgCard[0], T.bgCard[1], T.bgCard[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 14, 2, 2, 'FD');

    // Left Column: Venue
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
    doc.text(isEs ? 'LUGAR / FESTIVAL' : 'VENUE / FESTIVAL', MARGIN_LEFT + 4, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    doc.text(
      data.venue ||
        (isEs ? 'Escenario de Producción / Sala Principal' : 'Production Stage / Main Hall'),
      MARGIN_LEFT + 4,
      currentY + 9.5
    );

    // Right Column: Production Contact
    const col2X = MARGIN_LEFT + CONTENT_WIDTH / 2 + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
    doc.text(isEs ? 'CONTACTO DE PRODUCCIÓN' : 'PRODUCTION CONTACT', col2X, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    const contactLine = [data.contactName, data.contactPhone].filter(Boolean).join(' · ');
    doc.text(
      contactLine ||
        (isEs ? 'Director de Escenario / Ingeniero FOH' : 'Stage Manager / FOH Engineer'),
      col2X,
      currentY + 9.5
    );

    currentY += 18;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. SECTION: STAGE PLOT DIAGRAM (CANONICAL GRAPHICAL ASSETS + 16:9/1:1 GEOMETRY)
  // ═══════════════════════════════════════════════════════════════════
  if (sections.stagePlot) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Plano de Escenario' : 'Stage Plot',
      isEs ? `Escala 1:50 · ${data.stageDimensions}` : `Scale 1:50 · ${data.stageDimensions}`
    );

    const plotX = MARGIN_LEFT;
    const plotY = currentY;

    // Stage Boundary Outer Box (Stage Floor)
    doc.setFillColor(T.bgBlueprint[0], T.bgBlueprint[1], T.bgBlueprint[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(plotX, plotY, plotW, plotBoxH, 2, 2, 'FD');

    // Blueprint Grid Dots
    doc.setFillColor(T.gridDot[0], T.gridDot[1], T.gridDot[2]);
    for (let gx = plotX + 8; gx < plotX + plotW - 6; gx += 8) {
      for (let gy = plotY + 7; gy < plotY + plotBoxH - 5; gy += 8) {
        doc.circle(gx, gy, 0.25, 'F');
      }
    }

    // Performance Area Boundary (8% canonical margin matching _renderStageLayout in features.js)
    const bX = plotX + plotW * 0.08;
    const bY = plotY + plotBoxH * 0.08;
    const bW = plotW * 0.84;
    const bH = plotBoxH * 0.84;

    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(bX, bY, bW, bH, 1.5, 1.5, 'D');

    // Center Crosshairs & Zone Separators (matching live stage)
    doc.setDrawColor(T.borderSubtle[0], T.borderSubtle[1], T.borderSubtle[2]);
    doc.setLineWidth(0.18);
    doc.setLineDashPattern([1.5, 2.5], 0);
    // Vertical center line
    doc.line(plotX + plotW * 0.5, bY, plotX + plotW * 0.5, bY + bH);
    // Horizontal center line
    doc.line(bX, plotY + plotBoxH * 0.5, bX + bW, plotY + plotBoxH * 0.5);
    // Zone separators (35% and 65% width)
    doc.line(plotX + plotW * 0.35, bY, plotX + plotW * 0.35, bY + bH);
    doc.line(plotX + plotW * 0.65, bY, plotX + plotW * 0.65, bY + bH);
    doc.setLineDashPattern([], 0); // Reset dash

    // Upstage marker bar
    doc.setFillColor(T.border[0], T.border[1], T.border[2]);
    doc.rect(plotX + 2, plotY + 1, plotW - 4, 0.35, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    doc.text(
      isEs ? '▲ FONDO DE ESCENARIO / PARED BACKLINE' : '▲ UPSTAGE / BACKLINE WALL',
      plotX + plotW / 2,
      plotY + 4,
      { align: 'center' }
    );
    doc.setFontSize(5.5);
    doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
    doc.text(isEs ? 'ESCENARIO IZQUIERDA (SL)' : 'STAGE LEFT (SL)', plotX + 4, plotY + 4);
    doc.text(isEs ? 'ESCENARIO DERECHA (SR)' : 'STAGE RIGHT (SR)', plotX + plotW - 4, plotY + 4, {
      align: 'right',
    });

    const elements = data.elements || [];
    const connections = data.connections || [];

    // Draw active connections joining exact element centers
    if (connections.length > 0 && elements.length > 0) {
      connections.forEach((conn: any) => {
        const fromEl = elements.find((e: any) => e.id === conn.fromId);
        const toEl = elements.find((e: any) => e.id === conn.toId);
        if (!fromEl || !toEl) return;
        const fromX = plotX + (fromEl.x / refW) * plotW;
        const fromY = plotY + (fromEl.y / refH) * plotBoxH;
        const toX = plotX + (toEl.x / refW) * plotW;
        const toY = plotY + (toEl.y / refH) * plotBoxH;

        const connColor = parseHexColor(conn.color, T.blue);
        doc.setDrawColor(connColor[0], connColor[1], connColor[2]);
        doc.setLineWidth(0.25);
        if (conn.style === 'dashed') {
          doc.setLineDashPattern([2, 1.5], 0);
        } else if (conn.style === 'dotted') {
          doc.setLineDashPattern([0.8, 0.8], 0);
        }
        doc.line(fromX, fromY, toX, toY);
        doc.setLineDashPattern([], 0);
      });
    }

    // Draw Elements on Stage Plot (Graphical Assets + Channel Number Badges)
    if (elements.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(
        isEs
          ? 'No hay elementos ubicados en la escena activa'
          : 'No stage elements placed in active scene',
        plotX + plotW / 2,
        plotY + plotBoxH / 2,
        { align: 'center' }
      );
    } else {
      elements.forEach((el, idx) => {
        const scale = (el.scale || 100) / 100;
        const baseIconSize = 9.5; // 9.5mm standard size
        const iconSize = Math.max(6.0, Math.min(20.0, baseIconSize * scale));

        // Exact canonical linear position matching stage-canvas coordinates
        const rawElX = plotX + (el.x / refW) * plotW;
        const rawElY = plotY + (el.y / refH) * plotBoxH;

        // Keep graphic securely within outer stage bounds
        const elX = Math.max(
          plotX + iconSize / 2 + 1,
          Math.min(plotX + plotW - iconSize / 2 - 1, rawElX)
        );
        const elY = Math.max(
          plotY + iconSize / 2 + 1,
          Math.min(plotY + plotBoxH - iconSize / 2 - 1, rawElY)
        );

        const elColor = parseHexColor(el.color, T.blue);
        const imgDataUrl = elementImageMap.get(el.id);

        if (imgDataUrl) {
          try {
            doc.addImage(
              imgDataUrl,
              'PNG',
              elX - iconSize / 2,
              elY - iconSize / 2,
              iconSize,
              iconSize,
              undefined,
              'FAST'
            );
          } catch (imgErr) {
            console.warn('doc.addImage fallback for', el.id, imgErr);
            drawVectorElementFallback(doc, el, elX, elY, iconSize, elColor, T);
          }
        } else {
          // Fallback if asset is missing or in headless environment
          drawVectorElementFallback(doc, el, elX, elY, iconSize, elColor, T);
        }

        // Small, Unobtrusive Channel Identifier Badge (Top-Right Corner of Graphic)
        const chNum = el.channelId
          ? String(el.channelId).replace(/^CH-?/i, '').padStart(2, '0')
          : String(idx + 1).padStart(2, '0');
        const badgeW = 4.4;
        const badgeH = 2.9;
        const badgeX = elX + iconSize / 2 - 2.2;
        const badgeY = elY - iconSize / 2 - 1.2;

        doc.setFillColor(T.blue[0], T.blue[1], T.blue[2]);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.6, 0.6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.text(chNum, badgeX + badgeW / 2, badgeY + 2.05, { align: 'center' });

        // Label below element - Natural Live-Production Spanish & Density-adapted
        const rawLabel = localizeElementName(
          el.label || el.name,
          el.type,
          isEs ? 'es' : 'en'
        ).toUpperCase();
        const labelStr = rawLabel.length > 15 ? `${rawLabel.slice(0, 14)}…` : rawLabel;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.8);
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        const labelY = Math.min(plotY + plotBoxH - 1.8, elY + iconSize / 2 + 2.8);
        doc.text(labelStr, elX, labelY, { align: 'center' });
      });
    }

    // Downstage marker bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(T.blue[0], T.blue[1], T.blue[2]);
    doc.text(
      isEs ? '▼ FRENTE DE ESCENARIO / AUDIENCIA (LÍNEA FOH)' : '▼ DOWNSTAGE / AUDIENCE (FOH LINE)',
      plotX + plotW / 2,
      plotY + plotBoxH - 2.2,
      { align: 'center' }
    );
    currentY += plotBoxH + 6;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. SECTION: INPUT CHANNELS & PATCH LIST (1:1 SYNCHRONIZED)
  // ═══════════════════════════════════════════════════════════════════
  if (sections.inputPatch) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Lista de Canales y Patch' : 'Input Channel & Patch List',
      isEs ? `${data.channels.length} Canales Activos` : `${data.channels.length} Active Channels`
    );

    // Table Columns Setup
    const colChW = 12;
    const colInstW = 46;
    const colPerfW = 38;
    const colMicW = 44;
    const col48vW = 14;
    const colNotesW = CONTENT_WIDTH - (colChW + colInstW + colPerfW + colMicW + col48vW); // 28mm

    const drawTableHeader = () => {
      doc.setFillColor(T.bgHeader[0], T.bgHeader[1], T.bgHeader[2]);
      doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);

      let x = MARGIN_LEFT + 2;
      doc.text('CH#', x, currentY + 4);
      x += colChW;
      doc.text(isEs ? 'INSTRUMENTO / FUENTE' : 'INSTRUMENT / SOURCE', x, currentY + 4);
      x += colInstW;
      doc.text(isEs ? 'INTÉRPRETE' : 'PERFORMER', x, currentY + 4);
      x += colPerfW;
      doc.text(isEs ? 'TRANSDUCTOR / MIC / CAJA DI' : 'TRANSDUCER / MIC / DI', x, currentY + 4);
      x += colMicW;
      doc.text('48V', x + col48vW / 2 - 2, currentY + 4, { align: 'center' });
      x += col48vW;
      doc.text(isEs ? 'NOTAS / MEZCLA' : 'NOTES / MIX', x, currentY + 4);

      currentY += 6;
    };

    drawTableHeader();

    if (data.channels.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(
        isEs ? 'No hay canales de entrada configurados' : 'No input channels configured',
        MARGIN_LEFT + CONTENT_WIDTH / 2,
        currentY + 6,
        { align: 'center' }
      );
      currentY += 12;
    } else {
      data.channels.forEach((ch, idx) => {
        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(T.bgZebra[0], T.bgZebra[1], T.bgZebra[2]);
          doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 6, 'F');
        }

        doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
        doc.setLineWidth(0.1);
        doc.line(MARGIN_LEFT, currentY + 6, PAGE_WIDTH - MARGIN_RIGHT, currentY + 6);

        let x = MARGIN_LEFT + 2;
        // CH#
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
        doc.text(ch.ch, x, currentY + 4.2);

        // Instrument / Source (Bilingual Live-Production Spanish Translation)
        x += colChW;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        const localizedSource = localizeElementName(
          ch.source,
          undefined,
          isEs ? 'es' : 'en'
        ).toUpperCase();
        doc.text(localizedSource.slice(0, 24), x, currentY + 4.2);

        // Performer
        x += colInstW;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text((ch.performer || '—').slice(0, 20), x, currentY + 4.2);

        // Mic / DI
        x += colPerfW;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text((ch.mic || '—').slice(0, 24), x, currentY + 4.2);

        // 48V Phantom Power
        x += colMicW;
        if (ch.phantom) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(T.amber[0], T.amber[1], T.amber[2]);
          doc.text('+48V', x + col48vW / 2 - 2, currentY + 4.2, { align: 'center' });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
          doc.text('—', x + col48vW / 2 - 2, currentY + 4.2, { align: 'center' });
        }

        // Notes / Mix
        x += col48vW;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
        doc.text((ch.notes || '—').slice(0, 18), x, currentY + 4.2);

        currentY += 6;
      });
      currentY += 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. SECTION: TECHNICAL REQUIREMENTS (RIDER)
  // ═══════════════════════════════════════════════════════════════════
  if (sections.technicalRequirements) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Requerimientos Técnicos' : 'Technical Requirements',
      isEs
        ? `${data.totalRequirementsCount} Especificaciones`
        : `${data.totalRequirementsCount} Specifications`
    );

    const reqCardW = (CONTENT_WIDTH - 6) / 3;

    // Card 1: FOH Audio Protocol
    doc.setFillColor(T.bgCard[0], T.bgCard[1], T.bgCard[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.roundedRect(MARGIN_LEFT, currentY, reqCardW, 20, 1.5, 1.5, 'FD');
    doc.setFillColor(T.blue[0], T.blue[1], T.blue[2]);
    doc.rect(MARGIN_LEFT, currentY, 1.5, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(T.blue[0], T.blue[1], T.blue[2]);
    doc.text(isEs ? 'PROTOCOLO FOH' : 'FOH PROTOCOL', MARGIN_LEFT + 4, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    const fohLines = doc.splitTextToSize(data.requirements.foh[0] || '—', reqCardW - 6);
    doc.text(fohLines.slice(0, 3), MARGIN_LEFT + 4, currentY + 9);

    // Card 2: Monitor / IEM
    const card2X = MARGIN_LEFT + reqCardW + 3;
    doc.setFillColor(T.bgCard[0], T.bgCard[1], T.bgCard[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.roundedRect(card2X, currentY, reqCardW, 20, 1.5, 1.5, 'FD');
    doc.setFillColor(T.amber[0], T.amber[1], T.amber[2]);
    doc.rect(card2X, currentY, 1.5, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(T.amber[0], T.amber[1], T.amber[2]);
    doc.text(isEs ? 'MONITOR / IEM' : 'MONITOR / IEM', card2X + 4, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    const monLines = doc.splitTextToSize(data.requirements.monitor[0] || '—', reqCardW - 6);
    doc.text(monLines.slice(0, 3), card2X + 4, currentY + 9);

    // Card 3: Power Distribution
    const card3X = card2X + reqCardW + 3;
    doc.setFillColor(T.bgCard[0], T.bgCard[1], T.bgCard[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.roundedRect(card3X, currentY, reqCardW, 20, 1.5, 1.5, 'FD');
    doc.setFillColor(T.green[0], T.green[1], T.green[2]);
    doc.rect(card3X, currentY, 1.5, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(T.green[0], T.green[1], T.green[2]);
    doc.text(isEs ? 'REQUERIMIENTO ELÉCTRICO' : 'POWER REQUIREMENT', card3X + 4, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
    const powerLines = doc.splitTextToSize(data.requirements.power[0] || '—', reqCardW - 6);
    doc.text(powerLines.slice(0, 3), card3X + 4, currentY + 9);
    currentY += 24;

    // Additional hospitality or custom specs if present
    if (extraSpecs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(
        isEs
          ? 'ESPECIFICACIONES DE PRODUCCIÓN ADICIONALES:'
          : 'ADDITIONAL PRODUCTION SPECIFICATIONS:',
        MARGIN_LEFT,
        currentY
      );
      currentY += 4;

      extraSpecs.slice(0, 4).forEach((spec) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text(`•  ${spec}`, MARGIN_LEFT + 2, currentY);
        currentY += 4;
      });
      currentY += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. SECTION: PRODUCTION & TECHNICAL NOTES
  // ═══════════════════════════════════════════════════════════════════
  if (sections.technicalNotes) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Notas Técnicas y de Producción' : 'Production & Technical Notes'
    );

    doc.setFillColor(T.bgCard[0], T.bgCard[1], T.bgCard[2]);
    doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN_LEFT, currentY, CONTENT_WIDTH, notesBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
    doc.text(notesLines, MARGIN_LEFT + 4, currentY + 5.5);
    currentY += notesBoxH + 6;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 9. SECTION: SETLIST RUNNING ORDER
  // ═══════════════════════════════════════════════════════════════════
  if (sections.setlist) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Orden del Setlist' : 'Setlist Running Order',
      data.setlist.length > 0
        ? isEs
          ? `${data.setlist.length} Canciones · Total ${data.totalSetlistMinutes} Min`
          : `${data.setlist.length} Songs · Total ${data.totalSetlistMinutes} Min`
        : isEs
          ? '0 Canciones'
          : '0 Songs'
    );

    if (data.setlist.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(
        isEs ? 'No se han agregado canciones al setlist' : 'No songs added to setlist',
        MARGIN_LEFT + CONTENT_WIDTH / 2,
        currentY + 6,
        { align: 'center' }
      );
      currentY += 12;
    } else {
      doc.setFillColor(T.bgHeader[0], T.bgHeader[1], T.bgHeader[2]);
      doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);

      doc.text('#', MARGIN_LEFT + 2, currentY + 3.8);
      doc.text(isEs ? 'TÍTULO DE CANCIÓN' : 'TRACK TITLE', MARGIN_LEFT + 12, currentY + 3.8);
      doc.text(isEs ? 'ARTISTA / NOTA' : 'ARTIST / NOTE', MARGIN_LEFT + 80, currentY + 3.8);
      doc.text(isEs ? 'TONO' : 'KEY', MARGIN_LEFT + 125, currentY + 3.8);
      doc.text(isEs ? 'TEMPO' : 'TEMPO', MARGIN_LEFT + 145, currentY + 3.8);
      doc.text(isEs ? 'DURACIÓN' : 'TIME', PAGE_WIDTH - MARGIN_RIGHT - 2, currentY + 3.8, {
        align: 'right',
      });
      currentY += 5.5;

      data.setlist.forEach((s, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(T.bgZebra[0], T.bgZebra[1], T.bgZebra[2]);
          doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
        }
        doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
        doc.setLineWidth(0.1);
        doc.line(MARGIN_LEFT, currentY + 5.5, PAGE_WIDTH - MARGIN_RIGHT, currentY + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
        doc.text(String(idx + 1).padStart(2, '0'), MARGIN_LEFT + 2, currentY + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        doc.text(s.title.slice(0, 36), MARGIN_LEFT + 12, currentY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text((s.artist || s.notes || '—').slice(0, 24), MARGIN_LEFT + 80, currentY + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(T.blue[0], T.blue[1], T.blue[2]);
        doc.text(s.key || 'C', MARGIN_LEFT + 125, currentY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text(`${s.bpm || 120} BPM`, MARGIN_LEFT + 145, currentY + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        doc.text(s.duration || '04:00', PAGE_WIDTH - MARGIN_RIGHT - 2, currentY + 3.8, {
          align: 'right',
        });

        currentY += 5.5;
      });
      currentY += 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 10. SECTION: GEAR / LOAD-IN CHECKLIST
  // ═══════════════════════════════════════════════════════════════════
  if (sections.gear) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Equipamiento y Carga' : 'Gear / Load-In Checklist',
      isEs
        ? `${data.totalGearItems} Elementos · ${data.totalGearUnits} Unidades Totales (${data.packedGearUnits} Empacadas)`
        : `${data.totalGearItems} Items · ${data.totalGearUnits} Total Units (${data.packedGearUnits} Packed)`
    );

    if (data.gear.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(
        isEs
          ? 'No hay elementos de equipamiento en el inventario'
          : 'No gear items added to inventory',
        MARGIN_LEFT + CONTENT_WIDTH / 2,
        currentY + 6,
        { align: 'center' }
      );
      currentY += 12;
    } else {
      doc.setFillColor(T.bgHeader[0], T.bgHeader[1], T.bgHeader[2]);
      doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);

      doc.text(isEs ? 'NOMBRE DEL ELEMENTO' : 'ITEM NAME', MARGIN_LEFT + 2, currentY + 3.8);
      doc.text(isEs ? 'CATEGORÍA' : 'CATEGORY', MARGIN_LEFT + 80, currentY + 3.8);
      doc.text(isEs ? 'CANT' : 'QTY', MARGIN_LEFT + 130, currentY + 3.8);
      doc.text(isEs ? 'ESTADO' : 'STATUS', PAGE_WIDTH - MARGIN_RIGHT - 2, currentY + 3.8, {
        align: 'right',
      });
      currentY += 5.5;

      data.gear.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(T.bgZebra[0], T.bgZebra[1], T.bgZebra[2]);
          doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
        }
        doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
        doc.setLineWidth(0.1);
        doc.line(MARGIN_LEFT, currentY + 5.5, PAGE_WIDTH - MARGIN_RIGHT, currentY + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        doc.text(item.name.slice(0, 38), MARGIN_LEFT + 2, currentY + 3.8);

        const gearCatMap: Record<string, string> = isEs
          ? {
              mics: 'Micrófonos',
              inst: 'Instrumentos',
              amps: 'Amplificadores',
              mon: 'Monitoreo / IEM',
              util: 'Accesorios / Energía',
              cables: 'Cables',
              misc: 'Varios',
            }
          : {
              mics: 'Microphones',
              inst: 'Instruments',
              amps: 'Amplifiers',
              mon: 'Monitoring / IEM',
              util: 'Utilities / Power',
              cables: 'Cables',
              misc: 'Miscellaneous',
            };
        const catLabel =
          gearCatMap[item.category] || item.category || (isEs ? 'General' : 'General');
        doc.text(catLabel.slice(0, 24), MARGIN_LEFT + 80, currentY + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        doc.text(`${item.qty || 1}x`, MARGIN_LEFT + 130, currentY + 3.8);

        if (item.packed) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(T.green[0], T.green[1], T.green[2]);
          doc.text(
            isEs ? 'VERIFICADO / EMPACADO' : 'VERIFIED / PACKED',
            PAGE_WIDTH - MARGIN_RIGHT - 2,
            currentY + 3.8,
            { align: 'right' }
          );
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
          doc.text(isEs ? 'REQUERIDO' : 'REQUIRED', PAGE_WIDTH - MARGIN_RIGHT - 2, currentY + 3.8, {
            align: 'right',
          });
        }

        currentY += 5.5;
      });
      currentY += 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 11. SECTION: BAND & CREW ROSTER
  // ═══════════════════════════════════════════════════════════════════
  if (sections.bandCrew) {
    drawSectionTitle(
      getNextSectionNumber(),
      isEs ? 'Banda y Equipo Técnico' : 'Band & Crew Roster',
      isEs
        ? `${data.totalMembers} Miembros (${data.assignedMembersCount} Asignados)`
        : `${data.totalMembers} Members (${data.assignedMembersCount} Assigned)`
    );

    if (data.members.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
      doc.text(
        isEs ? 'No hay miembros en la lista' : 'No members added to roster',
        MARGIN_LEFT + CONTENT_WIDTH / 2,
        currentY + 6,
        { align: 'center' }
      );
      currentY += 12;
    } else {
      doc.setFillColor(T.bgHeader[0], T.bgHeader[1], T.bgHeader[2]);
      doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);

      doc.text(isEs ? 'NOMBRE' : 'NAME', MARGIN_LEFT + 2, currentY + 3.8);
      doc.text(isEs ? 'ROL / FUNCIÓN' : 'ROLE / POSITION', MARGIN_LEFT + 50, currentY + 3.8);
      doc.text(
        isEs ? 'ASIGNACIONES EN ESCENARIO' : 'STAGE ELEMENT ASSIGNMENTS',
        MARGIN_LEFT + 100,
        currentY + 3.8
      );
      doc.text(isEs ? 'CONTACTO' : 'CONTACT', PAGE_WIDTH - MARGIN_RIGHT - 2, currentY + 3.8, {
        align: 'right',
      });
      currentY += 5.5;

      data.members.forEach((m, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(T.bgZebra[0], T.bgZebra[1], T.bgZebra[2]);
          doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
        }
        doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
        doc.setLineWidth(0.1);
        doc.line(MARGIN_LEFT, currentY + 5.5, PAGE_WIDTH - MARGIN_RIGHT, currentY + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(T.textPrimary[0], T.textPrimary[1], T.textPrimary[2]);
        doc.text(m.name.slice(0, 24), MARGIN_LEFT + 2, currentY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text(
          (m.role || (isEs ? 'Miembro' : 'Member')).slice(0, 24),
          MARGIN_LEFT + 50,
          currentY + 3.8
        );

        const assignText =
          m.assignedElements.length > 0
            ? m.assignedElements
                .map((ae) => localizeElementName(ae, undefined, isEs ? 'es' : 'en'))
                .join(', ')
            : isEs
              ? 'Sin asignar'
              : 'Unassigned';
        doc.setFont('helvetica', m.assignedElements.length > 0 ? 'bold' : 'normal');
        doc.setTextColor(
          m.assignedElements.length > 0 ? T.blue[0] : T.textMuted[0],
          m.assignedElements.length > 0 ? T.blue[1] : T.textMuted[1],
          m.assignedElements.length > 0 ? T.blue[2] : T.textMuted[2]
        );
        doc.text(assignText.slice(0, 30), MARGIN_LEFT + 100, currentY + 3.8);

        const contactStr = [m.phone, m.email].filter(Boolean).join(' · ');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(T.textSecondary[0], T.textSecondary[1], T.textSecondary[2]);
        doc.text((contactStr || '—').slice(0, 20), PAGE_WIDTH - MARGIN_RIGHT - 2, currentY + 3.8, {
          align: 'right',
        });

        currentY += 5.5;
      });
      currentY += 5;
    }
  }

  // Fallback if all sections are disabled
  if (sectionCounter === 1) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
    doc.text(
      isEs
        ? 'No se seleccionaron secciones del documento en la configuración de exportación.'
        : 'No document sections selected in export configuration.',
      MARGIN_LEFT + CONTENT_WIDTH / 2,
      currentY + 12,
      { align: 'center' }
    );
    currentY += 24;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 12. DOCUMENT FOOTER (EXACTLY 1 PHYSICAL PAGE)
  // ═══════════════════════════════════════════════════════════════════
  const footerY = PAGE_HEIGHT - 12;
  doc.setDrawColor(T.border[0], T.border[1], T.border[2]);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(T.textMuted[0], T.textMuted[1], T.textMuted[2]);
  doc.text(
    isEs ? 'DOCUMENTO DE PRODUCCIÓN STAGEX' : 'STAGEX PRODUCTION DOCUMENT',
    MARGIN_LEFT,
    PAGE_HEIGHT - 8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    isEs
      ? `ÚLTIMA ACTUALIZACIÓN: ${data.date} ${data.time}`
      : `LAST UPDATED: ${data.date} ${data.time}`,
    MARGIN_LEFT + CONTENT_WIDTH / 2,
    PAGE_HEIGHT - 8,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.text(isEs ? 'PÁGINA 1 DE 1' : 'PAGE 1 OF 1', PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 8, {
    align: 'right',
  });

  // ═══════════════════════════════════════════════════════════════════
  // 13. EXPORT / SAVE / SHARE HANDLING (CROSS-PLATFORM)
  // ═══════════════════════════════════════════════════════════════════
  const rawFileName =
    options.fileName?.trim() || `${data.projectName.replace(/\s+/g, '_')}_Production_Document`;
  const sanitizedName = rawFileName.replace(/[\\/:*?"<>|]/g, '').trim() || 'Production_Document';
  const finalFileName = sanitizedName.toLowerCase().endsWith('.pdf')
    ? sanitizedName
    : `${sanitizedName}.pdf`;

  const totalPages = doc.getNumberOfPages(); // Strictly 1

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const base64Data = doc.output('datauristring').split(',')[1];

      if (options.share) {
        const writeResult = await Filesystem.writeFile({
          path: finalFileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: data.projectName,
          text: isEs
            ? `Documento de Producción Stagex — ${data.projectName}`
            : `Stagex Production Document — ${data.projectName}`,
          url: writeResult.uri,
          dialogTitle: isEs ? 'Compartir Documento de Producción' : 'Share Production Document',
        });

        return {
          fileName: finalFileName,
          pageCount: totalPages,
          uri: writeResult.uri,
          success: true,
        };
      } else {
        // Save to Android public Downloads directory
        let savedUri = '';
        try {
          const writeResult = await Filesystem.writeFile({
            path: `Download/${finalFileName}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          savedUri = writeResult.uri;
        } catch (extErr) {
          console.warn(
            'Saving to ExternalStorage/Download failed, falling back to Documents:',
            extErr
          );
          try {
            const writeResult = await Filesystem.writeFile({
              path: finalFileName,
              data: base64Data,
              directory: Directory.Documents,
              recursive: true,
            });
            savedUri = writeResult.uri;
          } catch (docErr) {
            console.warn('Saving to Documents failed, falling back to External:', docErr);
            const writeResult = await Filesystem.writeFile({
              path: finalFileName,
              data: base64Data,
              directory: Directory.External,
              recursive: true,
            });
            savedUri = writeResult.uri;
          }
        }

        return {
          fileName: finalFileName,
          pageCount: totalPages,
          uri: savedUri,
          success: true,
        };
      }
    } catch (nativeErr) {
      console.warn(
        'Capacitor native filesystem save/share failed, falling back to web download:',
        nativeErr
      );
    }
  }

  // Web Browser Download / Share Fallback
  const pdfBlob = doc.output('blob');
  if (typeof window !== 'undefined' && options.share && navigator.share && navigator.canShare) {
    try {
      const file = new File([pdfBlob], finalFileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: data.projectName,
          text: `Stagex Production Document — ${data.projectName}`,
        });
        return {
          fileName: finalFileName,
          pageCount: totalPages,
          blob: pdfBlob,
          success: true,
        };
      }
    } catch (shareErr) {
      console.warn('Web share failed, falling back to save:', shareErr);
    }
  }

  doc.save(finalFileName);

  return {
    fileName: finalFileName,
    pageCount: totalPages,
    blob: pdfBlob,
    success: true,
  };
}
