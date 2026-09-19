export interface ThemeTransitionOptions {
  nextTheme: string;
  amoled: boolean;
  startX: number;
  startY: number;
  updateFn: () => void;
}

class ThemeTransitionEngineImpl {
  public startTransition(options: ThemeTransitionOptions) {
    const { nextTheme, amoled, updateFn } = options;
    const root = document.documentElement;

    // 1. Perform DOM mutations and execute the theme update immediately
    updateFn();

    // 2. Mutate theme utility classes on root HTML element synchronously
    if (nextTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    if (amoled) {
      root.classList.add('amoled');
    } else {
      root.classList.remove('amoled');
    }
  }
}

export const ThemeTransitionEngine = new ThemeTransitionEngineImpl();
