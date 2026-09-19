import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  getFirebaseApp, 
  isPersistenceEnabled, 
  isFirestoreNetworkEnabled, 
  hasEnableNetworkSucceeded,
  firebaseInitErrors
} from '../services/firebase';
import { useNavigationStore } from '../navigation/useNavigationStore';
import { Capacitor } from '@capacitor/core';

export interface CollabDiagnosticPayload {
  timestamp: string;
  currentRoute: string;
  currentStagexPage: string;
  currentUserUid: string;
  roomId: string;
  shortCode: string;
  platform: string;
  capacitorWeb: 'Capacitor' | 'Web';
  networkState: 'online' | 'offline';
  firestoreConnectionState: string;
  authenticationState: 'authenticated' | 'unauthenticated';
  currentOperation: string;
  isFirestoreInitialized: boolean;
  isAuthInitialized: boolean;
  isAppInitialized: boolean;
  isPersistenceEnabled: boolean;
  isNetworkEnabled: boolean;
  hasEnableNetworkSucceeded: boolean;
  isSdkCurrentlyOffline: boolean;
  hasFirstSnapshotBeenReceived: boolean;
  hasFirstWriteCompleted: boolean;
  disconnectReason: string;
  retryCount?: number;
  retryReason?: string;
  backoffDelay?: number;
  finalFailureReason?: string;
  startupErrors?: any[];
}

export const CollabDiagnosticsRegistry = {
  firstSnapshotReceived: false,
  firstWriteCompleted: false,
  lastError: null as any,
  lastErrorTimestamp: null as string | null,
  disconnectReason: 'none',
  retryCount: 0,
  retryReason: 'none',
  backoffDelay: 0,
  finalFailureReason: 'none',
  connectionStateGetter: (() => 'disconnected') as () => string,
};

function serializeError(err: any): any {
  if (!err) return null;
  const obj: any = {
    class: err.constructor?.name || 'Error',
    name: err.name || 'Error',
    message: err.message || String(err),
    stack: err.stack,
    code: err.code,
  };

  // Expose all custom error fields (non-enumerable or enumerable)
  for (const key of Object.getOwnPropertyNames(err)) {
    if (key !== 'stack') {
      obj[key] = err[key];
    }
  }

  if (err.cause) {
    obj.cause = serializeError(err.cause);
  }

  return obj;
}

export function getCollabDiagnostics(
  operation: string, 
  roomId?: string, 
  shortCode?: string
): CollabDiagnosticPayload {
  const history = useNavigationStore.getState().history || [];
  const currentRouteObj = history[history.length - 1];
  const currentRoute = currentRouteObj 
    ? `app:${currentRouteObj.app}, tab:${currentRouteObj.tab || 'none'}, page:${currentRouteObj.page || 'none'}`
    : 'unknown';

  const stagexRoute = history.find(r => r.app === 'stagex');
  const currentStagexPage = stagexRoute?.page || 'unknown';

  const auth = getFirebaseAuth();
  const currentUserUid = auth?.currentUser?.uid || 'unauthenticated';

  const finalRoomId = roomId || 'none';
  const finalShortCode = shortCode || 'none';

  const platform = Capacitor.getPlatform() || 'web';
  const capacitorWeb = Capacitor.isNativePlatform() ? 'Capacitor' : 'Web';
  const networkState = (typeof navigator !== 'undefined' && navigator.onLine) ? 'online' : 'offline';

  const firestoreConnectionState = CollabDiagnosticsRegistry.connectionStateGetter();

  const authenticationState = auth?.currentUser ? 'authenticated' : 'unauthenticated';

  const isSdkCurrentlyOffline = firestoreConnectionState === 'offline' || networkState === 'offline';

  return {
    timestamp: new Date().toISOString(),
    currentRoute,
    currentStagexPage,
    currentUserUid,
    roomId: finalRoomId,
    shortCode: finalShortCode,
    platform,
    capacitorWeb,
    networkState,
    firestoreConnectionState,
    authenticationState,
    currentOperation: operation,
    isFirestoreInitialized: Boolean(getFirebaseDb()),
    isAuthInitialized: Boolean(auth),
    isAppInitialized: Boolean(getFirebaseApp()),
    isPersistenceEnabled: isPersistenceEnabled(),
    isNetworkEnabled: isFirestoreNetworkEnabled(),
    hasEnableNetworkSucceeded: hasEnableNetworkSucceeded(),
    isSdkCurrentlyOffline,
    hasFirstSnapshotBeenReceived: CollabDiagnosticsRegistry.firstSnapshotReceived,
    hasFirstWriteCompleted: CollabDiagnosticsRegistry.firstWriteCompleted,
    disconnectReason: CollabDiagnosticsRegistry.disconnectReason,
    retryCount: CollabDiagnosticsRegistry.retryCount > 0 ? CollabDiagnosticsRegistry.retryCount : undefined,
    retryReason: CollabDiagnosticsRegistry.retryReason !== 'none' ? CollabDiagnosticsRegistry.retryReason : undefined,
    backoffDelay: CollabDiagnosticsRegistry.backoffDelay > 0 ? CollabDiagnosticsRegistry.backoffDelay : undefined,
    finalFailureReason: CollabDiagnosticsRegistry.finalFailureReason !== 'none' ? CollabDiagnosticsRegistry.finalFailureReason : undefined,
    startupErrors: firebaseInitErrors.length > 0 ? firebaseInitErrors.map(e => ({
      message: e.message || String(e),
      code: e.code,
      stack: e.stack
    })) : undefined,
  };
}

export function mapFriendlyMessage(error: any): string {
  const rawMsg = error?.message || String(error);
  const msg = rawMsg.toLowerCase();
  
  if (msg.includes('offline') || msg.includes('network') || msg.includes('unavailable') || msg.includes('failed to get document') || msg.includes('timeout')) {
    return 'Connection lost. Please check your internet connection and try again.';
  } else if (msg.includes('permission') || msg.includes('denied')) {
    return 'Access denied. You do not have permission to join this room.';
  } else if (msg.includes('not-found') || msg.includes('invalid') || msg.includes('expired') || msg.includes('not found')) {
    return 'Room does not exist or has expired.';
  }
  return 'Unable to connect to the collaboration server. Please try again.';
}

export function enrichAndLogError(
  operation: string, 
  error: any, 
  context?: { roomId?: string; shortCode?: string }
): any {
  if (!error) return error;

  const roomId = context?.roomId;
  const shortCode = context?.shortCode;
  const diagnostics = getCollabDiagnostics(operation, roomId, shortCode);

  // Attach debugging data onto the exception itself
  error.operation = operation;
  error.friendlyMessage = mapFriendlyMessage(error);
  error.diagnostics = diagnostics;

  CollabDiagnosticsRegistry.lastError = error;
  CollabDiagnosticsRegistry.lastErrorTimestamp = new Date().toISOString();

  // Print high-visibility engineering diagnostic logs
  console.error(`==================================================`);
  console.error(`FAILED OPERATION:\n${operation}`);
  console.error(`\nERROR TYPE:\n${error.constructor?.name || 'Error'}`);
  console.error(`\nERROR NAME:\n${error.name || 'Error'}`);
  console.error(`\nERROR CODE:\n${error.code || 'unknown'}`);
  console.error(`\nERROR MESSAGE:\n${error.message || String(error)}`);
  console.error(`\nFULL STACK:\n${error.stack || 'No stack trace available'}`);
  console.error(`\nORIGINAL FIREBASE OBJECT:\n`, error);
  console.error(`\nDETAILED DIAGNOSTIC CONTEXT:`, JSON.stringify(diagnostics, null, 2));
  console.error(`\nSERIALIZED ERROR DETAILS:`, JSON.stringify(serializeError(error), null, 2));
  console.error(`==================================================`);

  return error;
}
