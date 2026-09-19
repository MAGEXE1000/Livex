import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getLogs, stateTimeline } from '@workspace/livex-core';
import { Button, ButtonGroup } from '../../../shared/design-system/buttons';
import { copyToClipboard } from './centralizedClipboard';

interface LiveConsoleProps {
  nativeLogsList: any[];
  clearNativeLogsList: () => void;
  showToast: (msg: string) => void;
  addJsLog: (msg: string) => void;
}

export default function LiveConsole({
  nativeLogsList,
  clearNativeLogsList,
  showToast,
  addJsLog,
}: LiveConsoleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'js' | 'native' | 'state' | 'errors' | 'warnings'
  >('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Retrieve fresh JS console logs
  const jsLogs = getLogs() || [];

  // Generate unified timeline
  const unifiedTimeline = useMemo(() => {
    const list: Array<{
      time: number;
      type: 'js' | 'native' | 'state';
      text: string;
      details?: string;
    }> = [];

    jsLogs.forEach((log) => {
      list.push({ time: log.timestamp, type: 'js', text: log.message });
    });

    nativeLogsList.forEach((log) => {
      const time = log.timestamp || Date.now();
      list.push({
        time,
        type: 'native',
        text: log.stage || 'Native Step',
        details: `${log.message || ''} ${log.explanation || ''}`,
      });
    });

    stateTimeline.forEach((t) => {
      list.push({
        time: t.timestamp,
        type: 'state',
        text: `State Transition: ${t.state}`,
        details: `Reason: ${t.reason}`,
      });
    });

    return list.sort((a, b) => a.time - b.time);
  }, [jsLogs, nativeLogsList]);

  // Apply search query and category filters
  const filteredTimeline = useMemo(() => {
    let list = unifiedTimeline;

    if (filterMode === 'js') {
      list = list.filter((e) => e.type === 'js');
    } else if (filterMode === 'native') {
      list = list.filter((e) => e.type === 'native');
    } else if (filterMode === 'state') {
      list = list.filter((e) => e.type === 'state');
    } else if (filterMode === 'errors') {
      list = list.filter(
        (e) =>
          e.text.toLowerCase().includes('error') ||
          e.text.toLowerCase().includes('fail') ||
          (e.details &&
            (e.details.toLowerCase().includes('error') || e.details.toLowerCase().includes('fail')))
      );
    } else if (filterMode === 'warnings') {
      list = list.filter(
        (e) =>
          e.text.toLowerCase().includes('warn') ||
          (e.details && e.details.toLowerCase().includes('warn'))
      );
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.text.toLowerCase().includes(query) ||
          (e.details && e.details.toLowerCase().includes(query))
      );
    }

    return list;
  }, [unifiedTimeline, filterMode, searchQuery]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredTimeline, autoScroll]);

  const handleCopyLogs = async () => {
    let txt = `=== LIVE CONSOLE LOGS ===\n`;
    filteredTimeline.forEach((e) => {
      const timeStr = new Date(e.time).toLocaleTimeString();
      txt += `[${timeStr}] [${e.type.toUpperCase()}] ${e.text} ${e.details ? ` - ${e.details}` : ''}\n`;
    });
    try {
      const msg = await copyToClipboard(txt, 'Console Logs');
      showToast(msg);
    } catch (err: any) {
      showToast(`Copy failed: ${err.message || String(err)}`);
    }
  };

  const handleClearLogs = () => {
    // Clear JS logs memory array if writable, or just native log buffer
    clearNativeLogsList();
    showToast('Live logs cleared');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">
          Live Logs
        </h2>
        <ButtonGroup size="sm" variant="ghost">
          <Button
            size="sm"
            variant="ghost"
            isIconOnly={true}
            onClick={handleClearLogs}
            aria-label="Clear logs"
            title="Clear logs"
            icon={
              <span className="material-symbols-outlined text-sm text-red-400">delete_sweep</span>
            }
          />
          <Button
            size="sm"
            variant="ghost"
            isIconOnly={true}
            onClick={handleCopyLogs}
            aria-label="Copy logs"
            title="Copy logs"
            icon={
              <span className="material-symbols-outlined text-sm text-tertiary">content_copy</span>
            }
          />
        </ButtonGroup>
      </div>

      <div className="bg-black border border-outline-variant/10 rounded-xl overflow-hidden flex flex-col h-80 shadow-inner">
        {/* Search Bar Header */}
        <div className="flex items-center gap-3 p-3 bg-black border-b border-outline-variant/5">
          <div className="flex-1 flex items-center gap-2 bg-[var(--app-surface-low)] px-3 py-1.5 rounded-lg border border-outline-variant/10">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              search
            </span>
            <input
              className="bg-transparent border-none text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 w-full font-mono outline-none"
              placeholder="Search logs..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Row */}
        <div className="flex gap-1 overflow-x-auto px-3 py-2 bg-black border-b border-outline-variant/5 scrollbar-none">
          {(['all', 'js', 'native', 'state', 'errors', 'warnings'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors outline-none whitespace-nowrap ${
                filterMode === mode
                  ? 'bg-tertiary text-on-tertiary-fixed'
                  : 'bg-[var(--app-surface-low)] text-on-surface-variant hover:bg-white/10'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Timeline Log Viewport */}
        <div
          ref={scrollContainerRef}
          className="flex-1 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 bg-black"
        >
          {filteredTimeline.length === 0 ? (
            <div className="text-on-surface-variant/30 text-center py-8 italic">
              No log messages available.
            </div>
          ) : (
            filteredTimeline.map((e, idx) => {
              const timeStr = new Date(e.time).toLocaleTimeString();
              let badgeColor = 'text-blue-400';
              if (e.type === 'native') badgeColor = 'text-green-400';
              if (e.type === 'state') badgeColor = 'text-purple-400';

              return (
                <div
                  key={idx}
                  className="flex gap-3 items-start border-b border-outline-variant/5 pb-1"
                >
                  <span className="text-on-surface-variant/40 shrink-0 select-none">{timeStr}</span>
                  <span
                    className={`${badgeColor} shrink-0 uppercase font-bold text-[9px] tracking-wide select-none`}
                  >
                    [{e.type}]
                  </span>
                  <span className="text-[#e7e5e4] word-break-all select-text">
                    {e.text}{' '}
                    {e.details ? (
                      <span className="text-on-surface-variant/50">({e.details})</span>
                    ) : (
                      ''
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Auto Scroll footer */}
        <div className="px-3 py-2 bg-surface-container-high/50 border-t border-outline-variant/5 flex justify-end items-center gap-2">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase">
            Auto Scroll
          </span>
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${
              autoScroll ? 'bg-tertiary' : 'bg-surface-container-highest'
            }`}
          >
            <div
              className={`w-3 h-3 bg-white rounded-full transition-transform ${
                autoScroll ? 'translate-x-3' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
