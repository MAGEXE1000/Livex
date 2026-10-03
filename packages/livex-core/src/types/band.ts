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

export type LiveSessionStatus = 'idle' | 'active' | 'ended';

export type LiveSyncAction =
  | 'START_SESSION'
  | 'END_SESSION'
  | 'INVITE_BAND'
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'CUE'
  | 'SONG_SELECT'
  | 'CALL_BAND'
  | 'LOBBY_JOIN'
  | 'LOBBY_LEAVE'
  | 'START_PLAYBACK'
  | 'TEMPO_CHANGE'
  | 'BARS_CHANGE'
  | 'HEARTBEAT'
  | 'MEMBER_JOINED'
  | 'SONG_SHARED'
  | 'CLOCK_PING'
  | 'CLOCK_PONG';

export interface PlaybackPositionAnchor {
  positionMs: number;
  serverTimeMs: number;
}

export interface SessionJoinToken {
  type: 'livex_session_join';
  version: 1;
  bandId: string;
  sessionId: string;
  leaderId: string;
  leaderName: string;
  songId: string;
  songTitle: string;
  bpm: number;
  barsPerLine: number;
  createdAt: number;
  expiresAt: number;
}

export interface LobbyAttendee {
  userId: string;
  displayName: string;
  role?: BandRole;
  joinedAt: number;
  lastSeenAt?: number;
}

export interface LiveBandSyncPacket {
  id?: string;
  bandId: string;
  leaderId: string;
  leaderName: string;
  status?: LiveSessionStatus;
  playbackStatus?: 'playing' | 'paused' | 'stopped';
  positionAnchor?: PlaybackPositionAnchor;
  countIn?: {
    active: boolean;
    leadInBars: number;
    targetStartServerTimeMs?: number;
  };
  sectionCue?: {
    sectionIndex: number;
    sectionName: string;
  };
  setlistContext?: {
    setlistId?: string;
    setlistTitle?: string;
    songIndex?: number;
    totalSongs?: number;
  };
  clockPingPayload?: {
    pingId: string;
    senderId: string;
    targetId?: string;
    t0: number;
    t1?: number;
    t2?: number;
  };
  createdAt?: number;
  updatedAt?: number;
  expiresAt?: number;
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
  scheduledStartTimestamp?: number;
  songPayload?: Partial<SharedSong>;
  memberPayload?: Partial<BandMember>;
  lobbyAttendees?: LobbyAttendee[];
  connectedMembersCount?: number;
  sessionId?: string;
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
  currentUserId: string;
  currentUserName: string;
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
  lobbyAttendees: LobbyAttendee[];
  connectedMembersCount: number;
  sessionPreset: SongPreset | null;
}

export interface BandActions {
  setCurrentBand: (band: Band | null) => void;
  setCurrentUser: (userId: string, userName: string) => void;
  setMembers: (members: BandMember[]) => void;
  setSharedSongs: (songs: SharedSong[]) => void;
  setEvents: (events: BandEvent[]) => void;
  setLobbyAttendees: (attendees: LobbyAttendee[]) => void;
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
  setSessionPreset: (preset: SongPreset | null) => void;
  callBand: (preset: SongPreset, leaderId?: string, leaderName?: string) => void;
  startLiveSession: (preset: SongPreset, leaderId?: string, leaderName?: string) => Promise<void>;
  endLiveSession: () => Promise<void>;
  inviteBandToSession: (preset?: SongPreset) => Promise<void>;
  joinSession: (packet: LiveBandSyncPacket, userId?: string, userName?: string) => Promise<void>;
  leaveSession: (userId?: string) => Promise<void>;
  joinLobby: (bandId: string, attendee: LobbyAttendee) => void;
  leaveLobby: (bandId: string, userId: string) => void;
  startPlaybackFromLobby: (preset: SongPreset) => void;
}


