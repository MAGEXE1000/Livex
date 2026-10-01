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

export interface BandState {
  currentBand: Band | null;
  members: BandMember[];
  sharedSongs: SharedSong[];
  userBands: Band[];
  isLoading: boolean;
  error: string | null;
}

export interface BandActions {
  setCurrentBand: (band: Band | null) => void;
  setMembers: (members: BandMember[]) => void;
  setSharedSongs: (songs: SharedSong[]) => void;
  createBand: (name: string, leaderId: string, leaderName: string, description?: string) => Band;
  joinBandByCode: (code: string, userId: string, userName: string) => Promise<{ success: boolean; message?: string }>;
  leaveBand: () => void;
  addSharedSong: (song: Omit<SharedSong, 'id' | 'version' | 'updatedAt'>) => SharedSong;
  shareSongFromPreset: (preset: SongPreset, bandId: string, userId: string, userName: string) => SharedSong;
  importSharedSongToLibrary: (sharedSong: SharedSong, createPresetFn: (data: any) => string) => string;
  removeSharedSong: (sharedSongId: string) => void;
  updateBandName: (name: string) => void;
  setError: (err: string | null) => void;
}
