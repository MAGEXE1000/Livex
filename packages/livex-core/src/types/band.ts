import type { SongLyricsDocument } from './lyrics';
import type { SongPreset, SongSection } from '../store/slices/songSlice';

export type BandRole = 'leader' | 'member' | 'admin';

export interface Band {
  id: string;
  name: string;
  code: string; // 6-character alphanumeric join code (e.g., 'LVX702')
  leaderId: string;
  createdAt: number;
  updatedAt?: number;
  description?: string;
  avatarUrl?: string;
}

export interface BandMember {
  id: string;
  bandId: string;
  userId: string;
  displayName: string;
  role: BandRole;
  joinedAt: number;
  avatarUrl?: string;
  instrument?: string;
  isOnline?: boolean;
  lastActiveAt?: number;
}

export interface SharedSong {
  id: string;
  bandId: string;
  songId: string;
  title: string;
  artist?: string;
  key: string;
  bpm: number;
  speed?: number;
  duration?: number;
  targetDurationSeconds?: number;
  barsPerLine?: number;
  notes?: string;
  lyrics?: SongLyricsDocument;
  chords?: string[];
  sections?: SongSection[];
  interludes?: any[];
  coverUri?: string;
  coverImage?: string;
  version: number;
  updatedAt: number;
  updatedBy: string;
  uploaderName?: string;
}

export type LiveSyncAction =
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'CUE'
  | 'SONG_SELECT'
  | 'TEMPO_CHANGE'
  | 'BARS_CHANGE'
  | 'HEARTBEAT'
  | 'MEMBER_JOINED'
  | 'SONG_SHARED';

export interface LiveBandSyncPacket {
  bandId: string;
  leaderId: string;
  leaderName: string;
  songId: string;
  songTitle: string;
  action: LiveSyncAction;
  timestamp: number; // UTC ms
  currentLineIdx: number;
  currentWordIdx: number;
  currentBeat: number;
  currentBar: number;
  bpm: number;
  speed?: number;
  barsPerLine: number;
  elapsedMs?: number;
  autoPlay: boolean;
  version: number;
  songPayload?: Partial<SharedSong>;
  memberPayload?: Partial<BandMember>;
}

export type BandEventType = 'rehearsal' | 'gig' | 'recording' | 'meeting' | 'other';

export interface BandEvent {
  id: string;
  bandId: string;
  title: string;
  type: BandEventType;
  date: string; // ISO date format YYYY-MM-DD
  time?: string; // e.g. "19:00" or "7:00 PM"
  callTime?: string; // e.g. "18:30"
  location?: string;
  notes?: string;
  setlistSongIds?: string[]; // IDs of shared songs scheduled for this event
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
}

export interface LiveBandSessionState {
  isBroadcasting: boolean;
  isLockedToLeader: boolean;
  activeSessionPacket: LiveBandSyncPacket | null;
  lastPacketReceivedAt: number | null;
  networkLatencyMs: number;
}

export interface BandState {
  currentBand: Band | null;
  members: BandMember[];
  sharedSongs: SharedSong[];
  events: BandEvent[];
  userBands: Band[];
  isLoading: boolean;
  error: string | null;
  // Live stage sync session state
  isBroadcasting: boolean;
  isLockedToLeader: boolean;
  activeLiveSession: LiveBandSyncPacket | null;
  lastSyncTimestamp: number | null;
}

export interface BandActions {
  setCurrentBand: (band: Band | null) => void;
  setMembers: (members: BandMember[]) => void;
  setSharedSongs: (songs: SharedSong[]) => void;
  setEvents: (events: BandEvent[]) => void;
  createBand: (name: string, leaderId: string, leaderName: string, description?: string) => Band;
  joinBandByCode: (code: string, userId: string, userName: string) => Promise<{ success: boolean; message?: string }>;
  leaveBand: () => void;
  addSharedSong: (song: Omit<SharedSong, 'id' | 'version' | 'updatedAt'>) => SharedSong;
  shareSongFromPreset: (preset: SongPreset, bandId: string, userId: string, userName: string) => SharedSong;
  importSharedSongToLibrary: (sharedSong: SharedSong, createPresetFn: (data: any) => string) => string;
  removeSharedSong: (sharedSongId: string) => void;
  addEvent: (event: Omit<BandEvent, 'id' | 'createdAt'>) => BandEvent;
  updateEvent: (eventId: string, updates: Partial<BandEvent>) => void;
  deleteEvent: (eventId: string) => void;
  updateBandName: (name: string) => void;
  setError: (err: string | null) => void;
  // Live session actions
  setIsBroadcasting: (broadcasting: boolean) => void;
  setIsLockedToLeader: (locked: boolean) => void;
  setActiveLiveSession: (packet: LiveBandSyncPacket | null) => void;
}

