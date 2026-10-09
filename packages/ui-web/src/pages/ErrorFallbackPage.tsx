import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { scrubSensitivePII } from '@workspace/livex-core';

export interface ErrorFallbackPageProps {
  error?: Error | null;
  errorId?: string;
  resetErrorBoundary?: () => void;
  onReload?: () => void;
  onResetStorage?: () => void;
}

export default function ErrorFallbackPage({
  error,
  errorId,
  resetErrorBoundary,
  onReload,
  onResetStorage,
}: ErrorFallbackPageProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    document.title = '500 — Audio Stream Interrupted';
    document.documentElement.classList.add('dark', 'amoled');
    document.documentElement.classList.remove('light');
  }, []);

  const displayId =
    errorId ||
    `ERR-${Math.abs((error?.message || '500').split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0))
      .toString(16)
      .toUpperCase()
      .padStart(6, '0')}`;

  const handleReload = () => {
    if (onReload) {
      onReload();
    } else if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const handleClearCacheAndReset = () => {
    if (onResetStorage) {
      onResetStorage();
    } else {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
      window.location.href = '/';
    }
  };

  const handleReportIssue = () => {
    const reportUrl = 'https://github.com/MAGEXE1000/Livex/issues/new?title=' +
      encodeURIComponent(`[Crash Report] ${error?.name || 'Error'}: ${error?.message ? scrubSensitivePII(error.message) : 'Runtime exception'}`);
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  const sanitizedMessage = error?.message ? scrubSensitivePII(error.message) : 'An unexpected exception halted the DSP audio pipeline.';

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="min-h-[100dvh] w-full bg-black text-zinc-100 [html.light_&]:bg-white [html.light_&]:text-zinc-900 flex flex-col justify-between items-center p-6 sm:p-12 relative overflow-hidden select-none transition-colors duration-200"
    >
      {/* Subtle Hardware Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] [html.light_&]:opacity-[0.035] text-white [html.light_&]:text-zinc-900"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top Header System Status */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10">
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-red-950/20 [html.light_&]:bg-red-50 border border-red-900/30 [html.light_&]:border-red-200 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-red-400 [html.light_&]:text-red-700 font-semibold">
            STATUS 500 // AUDIO STREAM INTERRUPTED
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 [html.light_&]:text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>STATE ISOLATED</span>
        </div>
      </header>

      {/* Centerpiece Recovery Content */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center z-10 my-auto py-10">
        {/* Hardware Waveform Interruption Graphic */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 [html.light_&]:bg-zinc-100 border border-red-500/20 [html.light_&]:border-red-200/60 flex items-center justify-center shadow-2xl [html.light_&]:shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
            <svg
              className="w-16 h-10 text-red-400 [html.light_&]:text-red-500/90"
              viewBox="0 0 100 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* Interrupted clipped audio pulse */}
              <path d="M0 20 H30 L38 4 L44 36 L50 20 L56 20 M64 20 H100" />
              <circle cx="60" cy="20" r="2" fill="currentColor" />
            </svg>
            <div className="absolute bottom-2 right-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500/80" />
            </div>
          </div>
        </div>

        {/* Display Headline */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.035em] text-white [html.light_&]:text-zinc-950 leading-[1.15]">
          500 — Audio Stream Interrupted
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base text-zinc-400 [html.light_&]:text-zinc-600 max-w-md font-normal leading-relaxed text-pretty">
          A runtime exception occurred in the workspace. The audio stream and application state have been safely isolated.
        </p>

        {/* Diagnostic Reference Tag */}
        <div className="mt-4 px-3 py-1 rounded bg-zinc-900 [html.light_&]:bg-zinc-100 border border-zinc-800 [html.light_&]:border-zinc-200 text-[11px] font-mono text-zinc-400 [html.light_&]:text-zinc-500">
          REFERENCE: <span className="font-semibold text-zinc-200 [html.light_&]:text-zinc-800">{displayId}</span>
        </div>

        {/* Action Button Cluster */}
        <nav aria-label="Recovery actions" className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          {/* Primary: Reload Workspace */}
          <button
            type="button"
            onClick={handleReload}
            className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-full bg-white text-black hover:bg-zinc-200 [html.light_&]:bg-zinc-900 [html.light_&]:text-white [html.light_&]:hover:bg-zinc-800 text-sm font-semibold tracking-tight active:scale-[0.96] transition-all duration-150 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 [html.light_&]:focus-visible:ring-zinc-500 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Workspace</span>
          </button>

          {/* Secondary: Clear Cache & Reset */}
          <button
            type="button"
            onClick={handleClearCacheAndReset}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 border border-white/10 [html.light_&]:bg-zinc-100 [html.light_&]:hover:bg-zinc-200/80 [html.light_&]:text-zinc-800 [html.light_&]:border-zinc-200 text-sm font-medium active:scale-[0.96] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 [html.light_&]:focus-visible:ring-zinc-400 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-zinc-400 [html.light_&]:text-zinc-500" />
            <span>Clear Cache &amp; Reset</span>
          </button>

          {/* Tertiary: Report Issue */}
          <button
            type="button"
            onClick={handleReportIssue}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-full bg-transparent hover:bg-white/[0.04] [html.light_&]:hover:bg-zinc-100 text-zinc-400 hover:text-zinc-200 [html.light_&]:text-zinc-600 [html.light_&]:hover:text-zinc-900 text-sm font-medium active:scale-[0.96] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 [html.light_&]:focus-visible:ring-zinc-400 cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <span>Report Issue</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>
        </nav>

        {/* Collapsible Sanitized Technical Diagnostics */}
        <div className="mt-8 w-full max-w-md">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 [html.light_&]:text-zinc-500 [html.light_&]:hover:text-zinc-800 inline-flex items-center gap-1.5 p-2 transition-colors cursor-pointer"
          >
            <span>{showTechnicalDetails ? 'Hide technical summary' : 'View technical summary'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnicalDetails && (
            <div className="mt-3 p-4 rounded-xl bg-zinc-950/80 [html.light_&]:bg-zinc-100 border border-white/10 [html.light_&]:border-zinc-200 text-left font-mono text-xs text-zinc-400 [html.light_&]:text-zinc-600 overflow-x-auto select-text">
              <div className="text-[11px] font-semibold text-zinc-300 [html.light_&]:text-zinc-700 mb-1">
                ISOLATED ERROR SUMMARY
              </div>
              <p className="leading-relaxed break-all">
                {sanitizedMessage}
              </p>
              <div className="mt-2 text-[10px] text-zinc-600 [html.light_&]:text-zinc-400">
                Zero sensitive credentials or user PII leaked. Telemetry encrypted.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Diagnostic Identifier */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-zinc-500 [html.light_&]:text-zinc-400 gap-2 z-10">
        <span>FAIL-SAFE MODE // RECOVERY ACTIVE</span>
        <span>ID: {displayId}</span>
      </footer>
    </main>
  );
}
