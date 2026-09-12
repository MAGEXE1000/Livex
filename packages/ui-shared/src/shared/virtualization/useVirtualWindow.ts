import { useState, useEffect, useMemo } from 'react';

export interface UseVirtualWindowOptions<T> {
  /** Array of items to virtualize */
  items: T[];
  /** Fixed height per item, or a function returning height for a given item/index */
  itemHeight: number | ((item: T, index: number) => number);
  /** Ref to the scrolling container element */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Number of items to render above and below the visible window (default: 4) */
  overscan?: number;
  /** Estimated container height when scrollRef is not yet measured (default: 600) */
  estimatedContainerHeight?: number;
  /** Optional offset of the list within the scroll container (default: auto-detected from listRef) */
  listRef?: React.RefObject<HTMLElement | null>;
}

export interface VirtualItem<T> {
  index: number;
  item: T;
  offsetTop: number;
  size: number;
}

export interface VirtualWindowResult<T> {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  startIndex: number;
  endIndex: number;
  isVirtual: boolean;
}

/**
 * Lightweight, zero-dependency, mobile-optimized list virtualization hook.
 *
 * Uses requestAnimationFrame-throttled scroll listeners and prefix-sum binary search
 * to compute visible slices with zero synchronous layout thrashing.
 */
export function useVirtualWindow<T>({
  items,
  itemHeight,
  scrollRef,
  overscan = 4,
  estimatedContainerHeight = 600,
  listRef,
}: UseVirtualWindowOptions<T>): VirtualWindowResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(estimatedContainerHeight);

  // Measure container height & setup scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Set initial container height
    if (el.clientHeight > 0) {
      setContainerHeight(el.clientHeight);
    }

    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (scrollRef.current) {
          setScrollTop(scrollRef.current.scrollTop);
        }
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    // ResizeObserver to track container height changes (orientation change, window resize)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [scrollRef]);

  // Compute item sizes and cumulative prefix offsets
  const { offsets, sizes, totalHeight } = useMemo(() => {
    const n = items.length;
    const offs = new Float64Array(n);
    const szs = new Float64Array(n);
    let total = 0;

    const isFixed = typeof itemHeight === 'number';
    const fixedHeight = isFixed ? (itemHeight as number) : 0;

    for (let i = 0; i < n; i++) {
      offs[i] = total;
      const h = isFixed ? fixedHeight : (itemHeight as (item: T, idx: number) => number)(items[i], i);
      szs[i] = h;
      total += h;
    }

    return { offsets: offs, sizes: szs, totalHeight: total };
  }, [items, itemHeight]);

  // Determine list's top offset within the scroll container
  const listOffsetTop = useMemo(() => {
    if (listRef?.current && scrollRef.current) {
      return Math.max(0, listRef.current.offsetTop);
    }
    return 0;
  }, [listRef, scrollRef, scrollTop]);

  // Compute visible range
  const { startIndex, endIndex } = useMemo(() => {
    const n = items.length;
    if (n === 0) return { startIndex: 0, endIndex: -1 };

    // Relative scroll inside the list
    const relativeScroll = Math.max(0, scrollTop - listOffsetTop);
    const viewportStart = relativeScroll;
    const viewportEnd = relativeScroll + containerHeight;

    // Binary search for first item ending after viewportStart
    let low = 0;
    let high = n - 1;
    let start = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const itemEnd = offsets[mid] + sizes[mid];
      if (itemEnd >= viewportStart) {
        start = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // Binary search for last item starting before viewportEnd
    low = start;
    high = n - 1;
    let end = start;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (offsets[mid] <= viewportEnd) {
        end = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Apply overscan
    const clampedStart = Math.max(0, start - overscan);
    const clampedEnd = Math.min(n - 1, end + overscan);

    return { startIndex: clampedStart, endIndex: clampedEnd };
  }, [items.length, offsets, sizes, scrollTop, listOffsetTop, containerHeight, overscan]);

  // Build virtual items slice
  const virtualItems = useMemo(() => {
    if (endIndex < startIndex || items.length === 0) return [];

    const result: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetTop: offsets[i],
        size: sizes[i],
      });
    }
    return result;
  }, [items, startIndex, endIndex, offsets, sizes]);

  const topSpacerHeight = startIndex > 0 ? offsets[startIndex] : 0;
  const bottomSpacerHeight =
    endIndex >= 0 && endIndex < items.length - 1
      ? Math.max(0, totalHeight - (offsets[endIndex] + sizes[endIndex]))
      : 0;

  return {
    virtualItems,
    totalHeight,
    topSpacerHeight,
    bottomSpacerHeight,
    startIndex,
    endIndex,
    isVirtual: items.length > 0,
  };
}
