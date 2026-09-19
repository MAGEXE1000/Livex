export type CollabConnectionState = 'disconnected' | 'connecting' | 'connected' | 'offline';

export interface Participant {
  id: string;
  displayName: string;
  avatar: string;
  device: 'web' | 'android' | 'desktop';
  online: boolean;
  cursorColor: string;
  lastSeen: number; // Timestamp in milliseconds
}

export interface CollaboratorRoom {
  roomId: string;
  shortCode: string;
  hostId: string;
  currentStageVersion: number;
  lastHeartbeat: number; // Timestamp in milliseconds
  createdAt: number; // Timestamp in milliseconds
  updatedAt: number; // Timestamp in milliseconds
  snapshot?: Record<string, string>; // Maps localStorage keys to value strings
}

export interface StageOperation {
  id: string;
  authorId: string;
  timestamp: number; // Timestamp in milliseconds
  type: 'create' | 'delete' | 'move' | 'resize' | 'rotate' | 'rename' | 'layer' | 'scene' | 'property' | 'reorder' | 'selection';
  payload: any;
}
