import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enableLiquidGlass,
  disableLiquidGlass,
  tagLiquidTarget,
  untagLiquidTarget,
  liquidGlassPlatformSupported,
  updateNativeLiquidGlassBridge,
  clearLiquidGlassCache,
} from '../liquidGlass';

describe('Liquid Glass Rendering Pipeline & Cache', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalResizeObserver: any;
  let originalImageData: any;
  let mockContainer: any;
  let mockElements: any[];
  let canvasInstances: any[];

  beforeEach(() => {
    clearLiquidGlassCache();
    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;
    originalResizeObserver = (globalThis as any).ResizeObserver;
    originalImageData = (globalThis as any).ImageData;

    (globalThis as any).ImageData = class {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };

    mockElements = [];
    canvasInstances = [];

    const createMockElement = (tagName: string) => {
      const styles = new Map<string, { value: string; priority: string }>();
      const attributes = new Map<string, string>();
      const classes = new Set<string>();
      const children: any[] = [];

      const styleTarget: any = {
        getPropertyValue: (prop: string) => styles.get(prop)?.value || '',
        getPropertyPriority: (prop: string) => styles.get(prop)?.priority || '',
        setProperty: (prop: string, val: string, pri = '') => {
          styles.set(prop, { value: val, priority: pri });
        },
        removeProperty: (prop: string) => {
          styles.delete(prop);
        },
      };

      const styleProxy = new Proxy(styleTarget, {
        set(t, prop: string, val: string) {
          t[prop] = val;
          styles.set(prop, { value: val, priority: '' });
          return true;
        },
        get(t, prop: string) {
          if (prop in t) return t[prop];
          return styles.get(prop)?.value || '';
        },
      });

      const el: any = {
        tagName: tagName.toUpperCase(),
        classList: {
          add: (...cls: string[]) => cls.forEach((c) => classes.add(c)),
          remove: (...cls: string[]) => cls.forEach((c) => classes.delete(c)),
          contains: (c: string) => classes.has(c),
        },
        style: styleProxy,
        setAttribute: (attr: string, val: string) => attributes.set(attr, val),
        getAttribute: (attr: string) => attributes.get(attr) || null,
        removeAttribute: (attr: string) => attributes.delete(attr),
        setAttributeNS: (_ns: string, attr: string, val: string) => attributes.set(attr, val),
        appendChild: (child: any) => {
          children.push(child);
          child.parentElement = el;
          return child;
        },
        append: (...newChildren: any[]) => {
          newChildren.forEach((child) => {
            children.push(child);
            child.parentElement = el;
          });
        },
        remove: vi.fn(() => {
          if (el.parentElement) {
            const idx = el.parentElement.children?.indexOf(el);
            if (idx >= 0) el.parentElement.children.splice(idx, 1);
          }
        }),
        getBoundingClientRect: vi.fn(() => ({
          x: 0,
          y: 0,
          width: 360,
          height: 64,
          top: 0,
          right: 360,
          bottom: 64,
          left: 0,
          toJSON: () => {},
        })),
        children,
        parentElement: null,
      };

      if (tagName.toLowerCase() === 'canvas') {
        el.getContext = vi.fn(() => ({
          putImageData: vi.fn(),
          getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(360 * 64 * 4) })),
        }));
        el.toDataURL = vi.fn(() => 'data:image/png;base64,mockDisplacementMap');
        canvasInstances.push(el);
      }

      mockElements.push(el);
      return el;
    };

    const mockHead = createMockElement('head');
    const mockBody = createMockElement('body');

    const mockDoc = {
      head: mockHead,
      body: mockBody,
      createElement: (tag: string) => createMockElement(tag),
      createElementNS: (_ns: string, tag: string) => createMockElement(tag),
      getElementById: (id: string) => mockElements.find((e) => e.id === id) || null,
    };

    (globalThis as any).document = mockDoc;
    (globalThis as any).window = {
      matchMedia: vi.fn(() => ({ matches: false })),
      location: { search: '' },
      CSS: {
        supports: vi.fn(() => true),
      },
    };
    (globalThis as any).CSS = (globalThis as any).window.CSS;
    (globalThis as any).ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };

    mockContainer = createMockElement('nav');
    mockBody.appendChild(mockContainer);
  });

  afterEach(() => {
    disableLiquidGlass();
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).ResizeObserver = originalResizeObserver;
    (globalThis as any).ImageData = originalImageData;
    delete (globalThis as any).CSS;
    delete (globalThis as any).LiquidGlassBridge;
    vi.restoreAllMocks();
  });

  it('probes platform support correctly when CSS.supports is available', () => {
    const supported = liquidGlassPlatformSupported();
    expect(supported).toBe(true);
  });

  it('tags and untags element correctly, managing styles and shader lifecycle', () => {
    enableLiquidGlass();
    tagLiquidTarget(mockContainer);

    expect(mockContainer.classList.contains('liquidGL-nav')).toBe(true);
    expect(mockContainer.style.getPropertyValue('backdrop-filter')).toContain('url(#lgshader-');

    untagLiquidTarget(mockContainer);
    expect(mockContainer.classList.contains('liquidGL-nav')).toBe(false);
    expect(mockContainer.style.getPropertyValue('backdrop-filter')).toBe('');
  });

  it('reuses displacement map cache across tag operations for identical dimensions', () => {
    enableLiquidGlass();

    // First tag generates displacement map (creates canvas and calls toDataURL)
    tagLiquidTarget(mockContainer);
    expect(canvasInstances.length).toBe(1);
    expect(canvasInstances[0].toDataURL).toHaveBeenCalledTimes(1);

    // Untag
    untagLiquidTarget(mockContainer);

    // Second tag on another element of identical dimensions (360x64)
    const secondContainer = (globalThis as any).document.createElement('nav');
    (globalThis as any).document.body.appendChild(secondContainer);

    tagLiquidTarget(secondContainer);
    // Canvas was created for the new element's filter, but toDataURL was NOT called because cache hit!
    const secondCanvas = canvasInstances[1];
    expect(secondCanvas.toDataURL).not.toHaveBeenCalled();

    untagLiquidTarget(secondContainer);
  });

  it('deduplicates native bridge calls when coordinate delta is under 0.5px', () => {
    const mockBridge = {
      updatePosition: vi.fn(),
    };
    (window as any).LiquidGlassBridge = mockBridge;

    // Initial call
    updateNativeLiquidGlassBridge(10, 20, 360, 64, true, 'dark', 24);
    expect(mockBridge.updatePosition).toHaveBeenCalledTimes(1);
    expect(mockBridge.updatePosition).toHaveBeenLastCalledWith(10, 20, 360, 64, true, 'dark', 24);

    // Subpixel jitter (delta < 0.5px): should be skipped
    updateNativeLiquidGlassBridge(10.2, 20.1, 360.1, 64.2, true, 'dark', 24);
    expect(mockBridge.updatePosition).toHaveBeenCalledTimes(1);

    // Significant delta (>= 0.5px): should dispatch
    updateNativeLiquidGlassBridge(11, 20, 360, 64, true, 'dark', 24);
    expect(mockBridge.updatePosition).toHaveBeenCalledTimes(2);
    expect(mockBridge.updatePosition).toHaveBeenLastCalledWith(11, 20, 360, 64, true, 'dark', 24);

    // Visibility change: should dispatch even if coords are unchanged
    updateNativeLiquidGlassBridge(11, 20, 360, 64, false, 'dark', 24);
    expect(mockBridge.updatePosition).toHaveBeenCalledTimes(3);
  });
});
