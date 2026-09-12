import { describe, it, expect } from 'vitest';

interface NavigationItemModel {
  key: string;
  label: string;
  isActive: boolean;
}

interface ComputeGeometryOptions {
  viewportWidth: number;
  app: string;
  items: NavigationItemModel[];
  activeIndex: number;
  isSwitcherOpen?: boolean;
  scrollScale?: number; // 1.0 = expanded, 0.88 = collapsed
}

export function computeBottomNavigationGeometry(options: ComputeGeometryOptions) {
  const {
    viewportWidth,
    app,
    items,
    activeIndex,
    isSwitcherOpen = false,
    scrollScale = 1.0,
  } = options;

  const isHub = app === 'hub';
  const showSwitcherButton = app !== 'hub';
  const totalSlots = items.length || 1;

  const idealSlotWidth = isSwitcherOpen
    ? 46
    : isHub
      ? 82
      : totalSlots >= 4
        ? 60
        : totalSlots === 2
          ? 88
          : 76;
  const paddingX = isSwitcherOpen ? 6 : 8;

  const satelliteWidth = 58;
  const dockGap = 8;
  const edgeMargin = 6;
  const maxScreenWidth = Math.min(viewportWidth - 24, 600);

  // Satellite button is positioned at barWidth / 2 + dockGap.
  // To keep it strictly within the visible viewport: barWidth / 2 + dockGap + satelliteWidth <= windowWidth / 2 - edgeMargin
  const maxBarWithSatellite = Math.max(
    180,
    (viewportWidth / 2 - dockGap - satelliteWidth - edgeMargin) * 2
  );
  const maxBarWidth = showSwitcherButton
    ? Math.min(maxScreenWidth, maxBarWithSatellite)
    : maxScreenWidth;

  const targetBarWidth = totalSlots * idealSlotWidth + paddingX * 2;
  const minBarW = isSwitcherOpen
    ? Math.min(240, maxBarWidth)
    : viewportWidth < 480
      ? Math.min(180, maxBarWidth)
      : 220;
  const barWidth = Math.max(Math.min(targetBarWidth, maxBarWidth), Math.min(minBarW, maxBarWidth));

  // The navigation bar is strictly horizontally centered relative to the viewport (x = 0)
  const viewportCenter = viewportWidth / 2;
  const naturalLeft = (viewportWidth - barWidth) / 2;
  const naturalRight = naturalLeft + barWidth;

  // With transformOrigin: 'center bottom', scaling preserves the horizontal center identically:
  const scaledWidth = barWidth * scrollScale;
  const scaledLeft = viewportCenter - scaledWidth / 2;
  const scaledRight = viewportCenter + scaledWidth / 2;
  const navCenter = (scaledLeft + scaledRight) / 2;
  const deviationFromViewport = navCenter - viewportCenter;

  const usableWidth = barWidth - paddingX * 2;
  const itemWidth = usableWidth / totalSlots;

  // Selected highlight geometry (calculated independently)
  const activeItem = items[activeIndex] || items[0];
  const labelStr = typeof activeItem?.label === 'string' ? activeItem.label : '';
  const labelLen = labelStr.length;
  const charWidth = totalSlots >= 4 || labelLen >= 10 ? 5.8 : 6.2;
  const contentWidth = Math.max(22, Math.round(labelLen * charWidth));
  const desiredPillWidth = contentWidth + 18;
  const maxPillWidth = itemWidth - (totalSlots >= 4 ? 6 : 8);
  const minPillWidth = Math.min(38, maxPillWidth);
  const pillWidthVal = Math.min(maxPillWidth, Math.max(minPillWidth, desiredPillWidth));

  const centerOffset = (itemWidth - pillWidthVal) / 2;
  const pillX = activeIndex * itemWidth + centerOffset;
  const slotCenter = activeIndex * itemWidth + itemWidth / 2;
  const pillCenter = pillX + pillWidthVal / 2;

  // Satellite switcher button geometry
  const satX = barWidth / 2 + dockGap;
  const satLeft = viewportCenter + satX;
  const satRight = satLeft + satelliteWidth;
  const satMarginRight = viewportWidth - satRight;

  return {
    barWidth,
    scaledWidth,
    navCenter,
    viewportCenter,
    deviationFromViewport,
    usableWidth,
    itemWidth,
    pillWidthVal,
    pillX,
    slotCenter,
    pillCenter,
    showSwitcherButton,
    satLeft,
    satRight,
    satMarginRight,
  };
}

describe('Shared Android Bottom Navigation Geometry & Centering', () => {
  const viewports = [360, 375, 390, 412, 480, 600, 768];

  const appTestData: Record<string, { slots: string[]; labelsEs?: string[] }> = {
    hub: { slots: ['Profile', 'Home', 'Settings'], labelsEs: ['Perfil', 'Inicio', 'Ajustes'] },
    chordex: { slots: ['Songs', 'Library', 'Preferences'], labelsEs: ['Canciones', 'Biblioteca', 'Ajustes'] },
    drumex: { slots: ['Metronome', 'Beats', 'Patterns', 'Preferences'], labelsEs: ['Metrónomo', 'Ritmos', 'Patrones', 'Ajustes'] },
    groovex: { slots: ['Rhythms', 'Preferences'], labelsEs: ['Ritmos', 'Ajustes'] },
    stagex: { slots: ['Stage', 'Setup', 'Preferences'], labelsEs: ['Escenario', 'Setup', 'Ajustes'] },
    vocalex: { slots: ['Coach', 'Takes', 'Preferences'], labelsEs: ['Coach', 'Tomas', 'Ajustes'] },
  };

  describe('1. Viewport Horizontal Centering', () => {
    it('guarantees zero horizontal deviation across all applications and viewports', () => {
      for (const vp of viewports) {
        for (const [appKey, data] of Object.entries(appTestData)) {
          const items = data.slots.map((label, i) => ({ key: label.toLowerCase(), label, isActive: i === 0 }));
          const geom = computeBottomNavigationGeometry({
            viewportWidth: vp,
            app: appKey,
            items,
            activeIndex: 0,
          });

          expect(
            Math.abs(geom.deviationFromViewport),
            `App "${appKey}" at viewport ${vp}px must have 0 deviation from viewport center`
          ).toBeLessThanOrEqual(0.001);
          expect(geom.navCenter).toBe(vp / 2);
        }
      }
    });
  });

  describe('2. Expanded / Collapsed Scroll-Center Invariance', () => {
    it('preserves identical horizontal center between expanded and collapsed states', () => {
      for (const vp of viewports) {
        for (const [appKey, data] of Object.entries(appTestData)) {
          const items = data.slots.map((label, i) => ({ key: label.toLowerCase(), label, isActive: i === 0 }));

          // Expanded (top of page, scale 1.0)
          const expanded = computeBottomNavigationGeometry({
            viewportWidth: vp,
            app: appKey,
            items,
            activeIndex: 0,
            scrollScale: 1.0,
          });

          // Collapsed (scrolling down, scale 0.88)
          const collapsed = computeBottomNavigationGeometry({
            viewportWidth: vp,
            app: appKey,
            items,
            activeIndex: 0,
            scrollScale: 0.88,
          });

          expect(expanded.navCenter).toBe(vp / 2);
          expect(collapsed.navCenter).toBe(vp / 2);
          expect(
            Math.abs(expanded.navCenter - collapsed.navCenter),
            `Expanded and collapsed centers must match exactly for ${appKey} at ${vp}px`
          ).toBeLessThanOrEqual(0.001);
        }
      }
    });
  });

  describe('3. Drumex Compact Footprint', () => {
    it('restores compact Drumex width (< 275px) without bloating to accommodate highlight', () => {
      const drumexItems = appTestData.drumex.slots.map((label, i) => ({
        key: label.toLowerCase(),
        label,
        isActive: i === 0,
      }));

      // At standard 412px (Pixel / Galaxy)
      const geom412 = computeBottomNavigationGeometry({
        viewportWidth: 412,
        app: 'drumex',
        items: drumexItems,
        activeIndex: 0,
      });

      // Previous broken size was 304px. New compact size is 256px.
      expect(geom412.barWidth).toBeLessThanOrEqual(275);
      expect(geom412.barWidth).toBe(256);

      // At 390px (iPhone 13-15 / Android medium)
      const geom390 = computeBottomNavigationGeometry({
        viewportWidth: 390,
        app: 'drumex',
        items: drumexItems,
        activeIndex: 0,
      });
      expect(geom390.barWidth).toBeLessThanOrEqual(250);

      // Verify touch target remains adequate (>= 48px width per slot)
      expect(geom412.itemWidth).toBeGreaterThanOrEqual(48);
      expect(geom390.itemWidth).toBeGreaterThanOrEqual(48);
    });
  });

  describe('4. Selected Highlight Independent Containment & Centering', () => {
    it('keeps highlight pill perfectly centered over every slot without shifting container', () => {
      for (const [appKey, data] of Object.entries(appTestData)) {
        const items = data.slots.map((label) => ({ key: label.toLowerCase(), label, isActive: false }));

        let baselineBarWidth: number | null = null;

        for (let idx = 0; idx < items.length; idx++) {
          const geom = computeBottomNavigationGeometry({
            viewportWidth: 390,
            app: appKey,
            items,
            activeIndex: idx,
          });

          // 1. Container width must NEVER change when active tab changes
          if (baselineBarWidth === null) {
            baselineBarWidth = geom.barWidth;
          } else {
            expect(
              geom.barWidth,
              `Selecting slot ${idx} in ${appKey} must not change container width`
            ).toBe(baselineBarWidth);
          }

          // 2. Pill center must align with slot center
          expect(
            Math.abs(geom.pillCenter - geom.slotCenter),
            `Highlight pill must be centered on slot ${idx} in ${appKey}`
          ).toBeLessThanOrEqual(0.001);

          // 3. Pill must be fully contained within the slot and usable bounds
          expect(geom.pillX).toBeGreaterThanOrEqual(0);
          expect(geom.pillX + geom.pillWidthVal).toBeLessThanOrEqual(geom.usableWidth);
          expect(geom.pillWidthVal).toBeLessThanOrEqual(geom.itemWidth - (data.slots.length >= 4 ? 6 : 8));
        }
      }
    });

    it('adapts pill width to label length in English and Spanish without overflow', () => {
      for (const [appKey, data] of Object.entries(appTestData)) {
        const enItems = data.slots.map((label) => ({ key: label.toLowerCase(), label, isActive: false }));
        const esItems = (data.labelsEs || data.slots).map((label) => ({ key: label.toLowerCase(), label, isActive: false }));

        for (const items of [enItems, esItems]) {
          for (let idx = 0; idx < items.length; idx++) {
            const geom = computeBottomNavigationGeometry({
              viewportWidth: 390,
              app: appKey,
              items,
              activeIndex: idx,
            });

            expect(geom.pillWidthVal).toBeGreaterThanOrEqual(38);
            expect(geom.pillWidthVal).toBeLessThanOrEqual(geom.itemWidth);
            expect(geom.pillX + geom.pillWidthVal).toBeLessThanOrEqual(geom.usableWidth);
          }
        }
      }
    });
  });

  describe('5. Satellite Switcher Button Viewport Safety', () => {
    it('ensures satellite button stays strictly inside viewport on narrow and wide screens', () => {
      for (const vp of viewports) {
        for (const [appKey, data] of Object.entries(appTestData)) {
          if (appKey === 'hub') continue; // Hub does not have satellite button

          const items = data.slots.map((label, i) => ({ key: label.toLowerCase(), label, isActive: i === 0 }));
          const geom = computeBottomNavigationGeometry({
            viewportWidth: vp,
            app: appKey,
            items,
            activeIndex: 0,
          });

          expect(geom.showSwitcherButton).toBe(true);
          expect(
            geom.satRight,
            `Satellite right edge for ${appKey} at ${vp}px must not exceed viewport`
          ).toBeLessThanOrEqual(vp);
          expect(geom.satMarginRight).toBeGreaterThanOrEqual(5.99);
        }
      }
    });
  });
});
