export {};

declare global {
  interface Window {
    __studioStartupComplete?: boolean;
    studioTransitionActive?: boolean;
    __navigationTraceHistory?: Array<{
      timestamp: number;
      from: string;
      to: string;
      action: string;
      success: boolean;
    }>;
    __captureBlackScreenState?: () => any;
    __forceRerenderApp?: () => void;
    __openEmergencyOverlay?: (error: any) => void;
    __chordexDiagnostics?: {
      mountCount: number;
      unmountCount: number;
      lastMountTime: number;
      errors: any[];
    };
    __navigationDiagnostics?: {
      returnAttempts: number;
      failedReturns: number;
      blackScreenDetections: number;
      lastBlocker: string;
      history: any[];
    };
    __bootTimings?: Record<string, number>;
    __preloadUIModules?: () => void;
    __navigationInProgress?: boolean;
    __introDone?: boolean;
    __lastActiveSubApp?: string;
    __nativeBootTimings?: any;
    __runFailsafeRecovery?: () => void;
  }
}
