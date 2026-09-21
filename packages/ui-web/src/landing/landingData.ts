import { Layers, Volume2, Mic, Cloud, Music, SlidersHorizontal, Share2, ShieldCheck } from 'lucide-react';
import React from 'react';

export interface AppInfo {
  key: string;
  name: string;
  badge: string;
  desc: string;
  bullets: string[];
  colorClass: string;
  hoverColor: string;
}

export const APPS_DATA: AppInfo[] = [
  {
    key: 'chords',
    name: 'Chordex',
    badge: 'Songs & Chords',
    desc: 'Manage song databases, organize chord sheets, transpose keys instantly, and reference interactive chord fingering diagrams.',
    bullets: [
      'Interactive guitar, piano & mandolin diagrams',
      'Instant key transpositions & setlist manager',
      'Custom chord sheets & formatting options',
    ],
    colorClass: 'border-white/10 group-hover:border-zinc-200/40',
    hoverColor: 'rgba(255, 255, 255, 0.04)',
  },
  {
    key: 'drums',
    name: 'Drumex',
    badge: 'Rhythm & Click',
    desc: 'Interactive 16-step sequencer matrix, snare rudiment library, and dynamic visual metronome/click indicator for rock-solid timing.',
    bullets: [
      '16-step polyphonic pattern sequencer',
      'Dynamic visual beat-pulse metronome',
      'Snare drum rudiment exercises & tempo trainer',
    ],
    colorClass: 'border-white/10 group-hover:border-zinc-200/40',
    hoverColor: 'rgba(255, 255, 255, 0.04)',
  },
  {
    key: 'stage',
    name: 'Stagex',
    badge: 'Stage Plots',
    desc: 'Map out stage plots and gear placements, construct input grids, and export technical riders for sound engineers.',
    bullets: [
      'Drag-and-drop gear, monitor, and amp nodes',
      'Technical rider exports & input charts',
      'Band setup templates for any venue size',
    ],
    colorClass: 'border-white/10 group-hover:border-zinc-200/40',
    hoverColor: 'rgba(255, 255, 255, 0.04)',
  },
  {
    key: 'groovex',
    name: 'Groovex',
    badge: 'Practice Mixer',
    desc: 'Rehearse with multitrack stem files. Control volume levels, mute or solo channels, loop segments, and speed-train tempo.',
    bullets: [
      'Low-latency multitrack fader mixing',
      'Flexible A-B segment loops & speed trainer',
      'Isolated backing stems & rehearsal tracks',
    ],
    colorClass: 'border-white/10 group-hover:border-zinc-200/40',
    hoverColor: 'rgba(255, 255, 255, 0.04)',
  },
  {
    key: 'vocalex',
    name: 'Vocalex',
    badge: 'Vocal Tools',
    desc: 'Evaluate vocal pitch in real-time, trace melodic accuracy, and record multiple audio takes directly to local device storage.',
    bullets: [
      'Real-time vocal pitch visual tracing curve',
      'Safe local audio take recorder & logger',
      'Vocal warmup scales & target interval training',
    ],
    colorClass: 'border-white/10 group-hover:border-zinc-200/40',
    hoverColor: 'rgba(255, 255, 255, 0.04)',
  },
];

export interface FeatureInfo {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

export const FEATURES_DATA: FeatureInfo[] = [
  {
    icon: Layers,
    title: 'Song to Stage Continuity',
    desc: 'Organize song chord sheets and setlists in Chordex, then translate band line-ups directly into Stagex equipment plots and sound tech riders.',
  },
  {
    icon: Volume2,
    title: 'Synchronized Rehearsal Engine',
    desc: 'Lock your groove with Drumex’s visual metronome and balance isolated instrument stems in Groovex with low-latency multitrack mixing.',
  },
  {
    icon: Mic,
    title: 'Precision Pitch & Takes',
    desc: 'Monitor vocal accuracy with Vocalex’s real-time pitch detection curve, record multi-take rehearsal takes, and practice vocal warmup intervals.',
  },
  {
    icon: Cloud,
    title: 'Zero-Install Web & Cloud Sync',
    desc: 'Instant workstation access on any browser without installations. Local offline persistence ensures stage continuity, with cloud sync across devices.',
  },
];
