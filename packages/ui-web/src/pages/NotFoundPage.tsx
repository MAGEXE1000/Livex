import React, { useEffect } from 'react';
import { Radio, ArrowLeft, Home, Compass } from 'lucide-react';

export interface NotFoundPageProps {
  navigateTo?: (path: string) => void;
}

export default function NotFoundPage({ navigateTo }: NotFoundPageProps) {
  useEffect(() => {
    document.title = '404 — Frequency Not Found';
    document.documentElement.classList.add('dark', 'amoled');
    document.documentElement.classList.remove('light');
  }, []);

  const handleNavigate = (path: string) => {
    if (navigateTo) {
      navigateTo(path);
    } else {
      window.location.href = path;
    }
  };

  return (
    <main
      role="main"
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

      {/* Top Header Badge */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10">
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.04] [html.light_&]:bg-zinc-100 border border-white/10 [html.light_&]:border-zinc-200 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-400 [html.light_&]:text-zinc-600 font-medium">
            SIGNAL STATUS // UNRESOLVED ROUTE
          </span>
        </div>

        <span className="text-xs font-mono text-zinc-500 [html.light_&]:text-zinc-400 tracking-wider">
          CARRIER: 0.0 kHz
        </span>
      </header>

      {/* Centerpiece Content */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center z-10 my-auto py-12">
        {/* Hardware Oscilloscope Motif */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 [html.light_&]:bg-zinc-100 border border-white/10 [html.light_&]:border-zinc-200 flex items-center justify-center shadow-2xl [html.light_&]:shadow-lg relative overflow-hidden">
            {/* Flatline oscilloscope grid lines */}
            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
            <svg
              className="w-16 h-10 text-zinc-500 [html.light_&]:text-zinc-400"
              viewBox="0 0 100 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M0 20 H35 L40 10 L45 30 L50 20 H100" />
            </svg>
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-500/80" />
            </div>
          </div>
        </div>

        {/* Display Headline */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.035em] text-white [html.light_&]:text-zinc-950 leading-[1.15]">
          404 — Frequency Not Found
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base text-zinc-400 [html.light_&]:text-zinc-600 max-w-md font-normal leading-relaxed text-pretty">
          The requested route does not exist in the Livex workspace. The carrier frequency could not be locked.
        </p>

        {/* Action Button Cluster */}
        <nav aria-label="Recovery navigation" className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          {/* Primary: Return to Hub */}
          <button
            type="button"
            onClick={() => handleNavigate('/app')}
            className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-full bg-white text-black hover:bg-zinc-200 [html.light_&]:bg-zinc-900 [html.light_&]:text-white [html.light_&]:hover:bg-zinc-800 text-sm font-semibold tracking-tight active:scale-[0.96] transition-all duration-150 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 [html.light_&]:focus-visible:ring-zinc-500 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Return to Hub</span>
          </button>

          {/* Secondary: Back to Home */}
          <button
            type="button"
            onClick={() => handleNavigate('/')}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 border border-white/10 [html.light_&]:bg-zinc-100 [html.light_&]:hover:bg-zinc-200/80 [html.light_&]:text-zinc-800 [html.light_&]:border-zinc-200 text-sm font-medium active:scale-[0.96] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 [html.light_&]:focus-visible:ring-zinc-400 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-zinc-400 [html.light_&]:text-zinc-500" />
            <span>Back to Home</span>
          </button>
        </nav>
      </div>

      {/* Footer System Telemetry */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-zinc-500 [html.light_&]:text-zinc-400 gap-2 z-10">
        <span>LIVEX AUDIO WORKSPACE // OFFLINE READY</span>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 [html.light_&]:text-zinc-500 [html.light_&]:hover:text-zinc-800 transition-colors p-2 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Screen</span>
        </button>
      </footer>
    </main>
  );
}
