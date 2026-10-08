import React, { useState } from 'react';
import { StagexLogo } from '@workspace/ui-shared';
import { Mic, Volume2, Radio, FileText, CheckCircle2, Sliders, Layers } from 'lucide-react';

interface StageNode {
  id: string;
  name: string;
  role: string;
  x: number; // percentage from left
  y: number; // percentage from top
  channel: string;
  transducer: string;
  fohPatch: string;
  color: string;
}

const STAGE_NODES: StageNode[] = [
  {
    id: 'drums',
    name: 'Drum Kit & Cymbals',
    role: 'Backline / Rhythm',
    x: 50,
    y: 22,
    channel: 'Ch 01-08',
    transducer: 'D112 (Kick) + SM57 (Snare) + C414 (Overheads)',
    fohPatch: 'Dante Sub-Snake B (Stage Center Up)',
    color: '#f59e0b',
  },
  {
    id: 'leadVocals',
    name: 'Lead Vocalist',
    role: 'Front Center',
    x: 50,
    y: 76,
    channel: 'Ch 09',
    transducer: 'Shure Axient Wireless Beta 58A',
    fohPatch: 'Dante Primary Rec A (FOH Multitrack)',
    color: '#38bdf8',
  },
  {
    id: 'guitar',
    name: 'Electric Guitar Stage Left',
    role: 'Rhythm & Lead',
    x: 22,
    y: 58,
    channel: 'Ch 10',
    transducer: 'Kemper Profiler Stereo XLR Out',
    fohPatch: 'Direct Box Radial J48 Stereo (Stage Left)',
    color: '#a855f7',
  },
  {
    id: 'bass',
    name: 'Bass Rig Stage Right',
    role: 'Bass Guitar',
    x: 78,
    y: 58,
    channel: 'Ch 11',
    transducer: 'Noble Preamp DI / Darkglass Microtubes',
    fohPatch: 'Direct Box Radial JDI (Stage Right)',
    color: '#10b981',
  },
  {
    id: 'keys',
    name: 'Keyboard Synthesizer Rig',
    role: 'Keys & Pads',
    x: 24,
    y: 28,
    channel: 'Ch 12-13',
    transducer: 'Nord Stage 4 Stereo DI',
    fohPatch: 'Stage Box Ch 12/13 Balanced Pair',
    color: '#ec4899',
  },
];

export function StagexSpatialPlot() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('leadVocals');
  const [viewMode, setViewMode] = useState<'plot' | 'rider'>('plot');

  const selectedNode = STAGE_NODES.find((n) => n.id === selectedNodeId) || STAGE_NODES[0];

  return (
    <div className="w-full flex flex-col rounded-2xl bg-[#09090b] border border-white/10 p-5 font-sans select-none shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <StagexLogo size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Stagex Spatial Plot</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                14m × 10m Stage Grid
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Interactive stage layout & FOH technical patch list</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('plot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              viewMode === 'plot'
                ? 'bg-white/15 border-white/20 text-white'
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spatial Canvas</span>
          </button>
          <button
            onClick={() => setViewMode('rider')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              viewMode === 'rider'
                ? 'bg-white/15 border-white/20 text-white'
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Input Patch List</span>
          </button>
        </div>
      </div>

      {viewMode === 'plot' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Spatial Grid Canvas (2 cols) */}
          <div className="lg:col-span-2 relative h-[310px] rounded-xl bg-black/60 border border-white/10 overflow-hidden p-4 flex flex-col justify-between">
            {/* Stage orientation badges */}
            <div className="w-full flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500 tracking-wider border-b border-white/5 pb-1">
              <span>Upstage (Drums / Amps)</span>
              <span>Stage Width: 14.0m</span>
            </div>

            {/* Subtle grid pattern background */}
            <div
              className="absolute inset-x-4 inset-y-8 pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Stage Center Reference Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-20 flex items-center justify-center">
              <div className="w-full h-px bg-white" />
              <div className="h-full w-px bg-white absolute" />
            </div>

            {/* Interactive Stage Nodes */}
            <div className="relative w-full h-full">
              {STAGE_NODES.map((node) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    {/* Glowing Marker */}
                    <div
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'border-white bg-white/20 shadow-[0_0_16px_rgba(255,255,255,0.4)] scale-110'
                          : 'border-white/20 bg-black/80 hover:border-white/40'
                      }`}
                      style={{ borderColor: isSelected ? node.color : undefined }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: node.color }}
                      />
                      {isSelected && (
                        <div
                          className="absolute inset-0 rounded-full animate-ping opacity-30"
                          style={{ backgroundColor: node.color }}
                        />
                      )}
                    </div>
                    {/* Node Tag */}
                    <span
                      className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-white/20 text-white font-semibold'
                          : 'bg-black/60 text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      {node.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Downstage Label */}
            <div className="w-full flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500 tracking-wider border-t border-white/5 pt-1">
              <span>Downstage (Audience / FOH)</span>
              <span>Depth: 10.0m</span>
            </div>
          </div>

          {/* Node Inspector Panel (1 col) */}
          <div className="rounded-xl bg-black/40 border border-white/10 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Node Inspector
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
              </div>

              <div className="mt-3">
                <h4 className="text-base font-bold text-white tracking-tight">{selectedNode.name}</h4>
                <p className="text-xs text-zinc-400">{selectedNode.role}</p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <div className="text-[10px] text-zinc-400 uppercase font-medium">Console Channel</div>
                  <div className="text-xs font-semibold text-white font-mono mt-0.5">{selectedNode.channel}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <div className="text-[10px] text-zinc-400 uppercase font-medium">Transducer / Mic / DI</div>
                  <div className="text-xs text-zinc-200 mt-0.5">{selectedNode.transducer}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/5">
                  <div className="text-[10px] text-zinc-400 uppercase font-medium">FOH Patch Line</div>
                  <div className="text-xs text-zinc-300 font-mono mt-0.5">{selectedNode.fohPatch}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Coordinates:</span>
              <span className="font-mono text-zinc-200">
                X: {selectedNode.x}% • Y: {selectedNode.y}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Technical Rider Input Patch Table */
        <div className="rounded-xl bg-black/40 border border-white/10 overflow-hidden">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Full FOH Channel Patch List (16 Inputs)</span>
            <span className="text-[11px] text-zinc-400 font-mono">Status: Ready for Soundcheck</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-[10px] text-zinc-400 uppercase font-mono border-b border-white/5">
                <tr>
                  <th className="py-2 px-3">CH</th>
                  <th className="py-2 px-3">Source Name</th>
                  <th className="py-2 px-3">Transducer / DI</th>
                  <th className="py-2 px-3">FOH Routing</th>
                  <th className="py-2 px-3">Phantom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {STAGE_NODES.map((node) => (
                  <tr
                    key={node.id}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setViewMode('plot');
                    }}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-mono font-bold text-white">{node.channel}</td>
                    <td className="py-2 px-3 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                      {node.name}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">{node.transducer}</td>
                    <td className="py-2 px-3 font-mono text-zinc-400">{node.fohPatch}</td>
                    <td className="py-2 px-3 text-emerald-400 font-mono">+48V</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
