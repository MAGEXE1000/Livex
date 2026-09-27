/**
 * Livex Cross-App Assistant Context & Action Registry
 *
 * Allows apps (Stagex, Groovex, Vocalex, etc.) to register their structured
 * context collectors and action handlers without creating circular package dependencies.
 */

export interface AppActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface AppActionValidation {
  valid: boolean;
  error?: string;
}

export interface AppContextProvider {
  app: string;
  getContext: () => any;
  executeAction?: (
    actionType: string,
    params: Record<string, any>
  ) => Promise<AppActionResult> | AppActionResult;
  validateAction?: (
    actionType: string,
    params: Record<string, any>
  ) => AppActionValidation;
}

class AppContextRegistry {
  private static instance: AppContextRegistry;
  private providers = new Map<string, AppContextProvider>();

  private constructor() {}

  public static getInstance(): AppContextRegistry {
    if (!AppContextRegistry.instance) {
      AppContextRegistry.instance = new AppContextRegistry();
    }
    return AppContextRegistry.instance;
  }

  public register(provider: AppContextProvider): () => void {
    if (!provider || !provider.app) {
      return () => {};
    }
    this.providers.set(provider.app, provider);
    return () => {
      if (this.providers.get(provider.app) === provider) {
        this.providers.delete(provider.app);
      }
    };
  }

  public unregister(app: string): void {
    this.providers.delete(app);
  }

  public getProvider(app: string): AppContextProvider | undefined {
    return this.providers.get(app);
  }

  public getContext(app: string): Record<string, unknown> | null {
    const provider = this.providers.get(app);
    if (!provider) return null;
    try {
      return provider.getContext();
    } catch (err) {
      console.warn(`[AppContextRegistry] Failed to get context for ${app}:`, err);
      return null;
    }
  }

  public getAllContexts(): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};
    for (const [app, provider] of this.providers.entries()) {
      try {
        const ctx = provider.getContext();
        if (ctx) {
          result[app] = ctx;
        }
      } catch (err) {
        console.warn(`[AppContextRegistry] Error reading context for ${app}:`, err);
      }
    }
    return result;
  }

  public clear(): void {
    this.providers.clear();
  }
}

export const appContextRegistry = AppContextRegistry.getInstance();

export function registerAppContextProvider(provider: AppContextProvider): () => void {
  return appContextRegistry.register(provider);
}

export function unregisterAppContextProvider(app: string): void {
  appContextRegistry.unregister(app);
}

export function getAppContext(app: string): Record<string, unknown> | null {
  return appContextRegistry.getContext(app);
}

export function getAllAppContexts(): Record<string, Record<string, unknown>> {
  return appContextRegistry.getAllContexts();
}

export function getAppProvider(app: string): AppContextProvider | undefined {
  return appContextRegistry.getProvider(app);
}
