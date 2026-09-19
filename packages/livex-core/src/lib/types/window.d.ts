// window.d.ts - Global Window Type Declarations for Studio

export interface StudioNavMetrics {
  mounts: number;
  unmounts: number;
  fallbackActivations: number;
  recoveries: number;
  itemRebuilds: number;
  controllerRecreations: number;
}

export interface StudioChordexDiagnostics {
  mountedCount: number;
  unmountedCount: number;
  lastMountTime: number | null;
  lastUnmountTime: number | null;
  unmountRequestedTime?: number;
  status: string;
}

export interface StudioBootTimings {
  hubVisible?: number;
  checked?: boolean;
  platform?: string;
}

declare global {
  interface Window {
    __studioStartupComplete?: boolean;
    __studio_debug_mode?: boolean;
    __studioStableKey?: string;
    __lastActiveSubApp?: string;
    __lastStableKey?: string;
    __lastActiveAppToRender?: string;
    __lastCachedAppRef?: string;
    __lastHubRenderKey?: number;
    __lastPreviousAppMode?: string;
    __lastForensicCaptureId?: number;
    __lastCheckpointStage?: string;
    __watchdogRunning?: boolean;
    __introDone?: boolean;
    __navMetrics?: StudioNavMetrics;
    __chordexDiagnostics?: StudioChordexDiagnostics;
    __bootTimings?: StudioBootTimings;
    __nativeBootTimings?: StudioBootTimings;
    __preloadUIModules?: () => void;
    __openEmergencyOverlay?: () => void;
    __forceRerenderApp?: () => void;
    __runFailsafeRecovery?: (checkpoint: string) => void;
    __runRootWatchdogCheck?: (name: string) => void;
    __captureBlackScreenState?: () => any;
    studioTransitionActive?: boolean;
    returnToStudioHub?: (isSwipeSuccess?: boolean) => void;
    runPaintVerification?: (scaleFactor?: number) => Promise<any>;
    runForceWebViewRepaint?: () => void;
    runForceFullHubRebuild?: () => void;
    runForceWebViewRefreshLayer?: () => void;
  }
}

export {};
