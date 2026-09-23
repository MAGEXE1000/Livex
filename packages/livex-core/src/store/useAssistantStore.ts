import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type AssistantMessage,
  type AssistantState,
  type StructuredRecommendation,
  type AssistantQuickPrompt,
} from '../types/assistant';
import { getMusicalContextSnapshot } from '../lib/assistant/contextAggregator';
import { streamChatCompletion } from '../lib/assistant/assistantApiClient';

export const ASSISTANT_QUICK_PROMPTS: AssistantQuickPrompt[] = [
  {
    id: 'prompt-neosoul',
    label: 'Neo-Soul Chords',
    prompt: 'Suggest a lush Neo-Soul chord progression with 9th and 13th extensions.',
    category: 'chords',
    icon: 'music_note',
  },
  {
    id: 'prompt-gilmour-tone',
    label: 'Gilmour Lead Tone',
    prompt: 'How can I dial in a David Gilmour style singing fuzz lead guitar tone?',
    category: 'tone',
    icon: 'electric_guitar',
  },
  {
    id: 'prompt-dorian-aeolian',
    label: 'Dorian vs Aeolian',
    prompt: 'Explain the difference between Dorian and Aeolian modes with practical examples.',
    category: 'theory',
    icon: 'menu_book',
  },
  {
    id: 'prompt-funk-groove',
    label: 'Pocket Funk Drums',
    prompt: 'Give me a 16th-note pocket funk drum groove with BPM and kit settings.',
    category: 'drums',
    icon: 'graphic_eq',
  },
  {
    id: 'prompt-vocal-warmup',
    label: 'Vocal Warmup',
    prompt: 'What is a 5-minute vocal warmup routine I can do before a gig?',
    category: 'vocals',
    icon: 'mic',
  },
  {
    id: 'prompt-livex-guide',
    label: 'Livex Studio Tour',
    prompt: 'Explain how Chordex, Drumex, and Vocalex work together in Livex.',
    category: 'livex',
    icon: 'auto_awesome',
  },
];

interface AssistantStoreState {
  messages: AssistantMessage[];
  mascotState: AssistantState;
  status: 'idle' | 'streaming' | 'error';
  activeThreadId: string;
  inputText: string;
  errorMessage: string | null;

  // Actions
  sendMessage: (promptText?: string) => Promise<void>;
  stopStreaming: () => void;
  setMascotState: (state: AssistantState) => void;
  setInputText: (text: string) => void;
  clearConversation: () => void;
  addRecommendation: (messageId: string, rec: StructuredRecommendation) => void;
  wakeMascot: () => void;
}

let activeAbortController: AbortController | null = null;
let stateResetTimer: ReturnType<typeof setTimeout> | null = null;
let sleepWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

export const useAssistantStore = create<AssistantStoreState>()(
  persist(
    (set, get) => {
      const resetSleepTimer = () => {
        if (typeof window === 'undefined') return;
        if (sleepWatchdogTimer) clearTimeout(sleepWatchdogTimer);
        sleepWatchdogTimer = setTimeout(() => {
          if (get().status === 'idle' && get().mascotState === 'idle') {
            set({ mascotState: 'sleeping' });
          }
        }, 90000); // 90 seconds idle sleep
      };

      resetSleepTimer();

      return {
        messages: [],
        mascotState: 'idle',
        status: 'idle',
        activeThreadId: 'default-thread',
        inputText: '',
        errorMessage: null,

        wakeMascot: () => {
          if (get().mascotState === 'sleeping') {
            set({ mascotState: 'idle' });
          }
          resetSleepTimer();
        },

        setMascotState: (mascotState: AssistantState) => {
          set({ mascotState });
          resetSleepTimer();
        },

        setInputText: (inputText: string) => {
          set({ inputText });
          get().wakeMascot();
        },

        clearConversation: () => {
          if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
          }
          set({
            messages: [],
            status: 'idle',
            mascotState: 'idle',
            errorMessage: null,
          });
          resetSleepTimer();
        },

        addRecommendation: (messageId: string, rec: StructuredRecommendation) => {
          set((state) => ({
            messages: state.messages.map((m) => {
              if (m.id !== messageId) return m;
              const existing = m.recommendations || [];
              if (existing.some((r) => r.id === rec.id)) return m;
              return {
                ...m,
                recommendations: [...existing, rec],
              };
            }),
          }));
        },

        stopStreaming: () => {
          if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
          }
          if (stateResetTimer) clearTimeout(stateResetTimer);

          set({
            status: 'idle',
            mascotState: 'interrupted',
          });

          stateResetTimer = setTimeout(() => {
            set({ mascotState: 'idle' });
          }, 1200);

          resetSleepTimer();
        },

        sendMessage: async (promptOverride?: string) => {
          const currentText = (promptOverride !== undefined ? promptOverride : get().inputText).trim();
          if (!currentText || get().status === 'streaming') return;

          // Clear text input
          set({ inputText: '', errorMessage: null });

          // Cancel any prior in-flight stream
          if (activeAbortController) {
            activeAbortController.abort();
          }
          activeAbortController = new AbortController();
          const signal = activeAbortController.signal;

          const contextSnapshot = getMusicalContextSnapshot();
          const userMsgId = `usr-${Date.now()}`;
          const assistantMsgId = `ast-${Date.now() + 1}`;
          const threadId = get().activeThreadId;

          const userMessage: AssistantMessage = {
            id: userMsgId,
            threadId,
            role: 'user',
            content: currentText,
            status: 'complete',
            timestamp: Date.now(),
            contextSnapshot,
          };

          const assistantMessage: AssistantMessage = {
            id: assistantMsgId,
            threadId,
            role: 'assistant',
            content: '',
            status: 'streaming',
            timestamp: Date.now(),
            recommendations: [],
            contextSnapshot,
          };

          // Optimistically append messages and transition mascot to thinking
          set((state) => ({
            messages: [...state.messages, userMessage, assistantMessage],
            status: 'streaming',
            mascotState: 'thinking',
          }));

          let hasReceivedFirstToken = false;

          try {
            await streamChatCompletion({
              prompt: currentText,
              history: get().messages,
              contextSnapshot,
              signal,
              callbacks: {
                onToken: (tokenDelta) => {
                  if (signal.aborted) return;

                  if (!hasReceivedFirstToken) {
                    hasReceivedFirstToken = true;
                    set({ mascotState: 'responding' });
                  }

                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: m.content + tokenDelta }
                        : m
                    ),
                  }));
                },

                onRecommendation: (recommendation) => {
                  if (signal.aborted) return;
                  get().addRecommendation(assistantMsgId, recommendation);
                },

                onComplete: () => {
                  if (signal.aborted) return;

                  set((state) => ({
                    status: 'idle',
                    mascotState: 'success',
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, status: 'complete' } : m
                    ),
                  }));

                  if (stateResetTimer) clearTimeout(stateResetTimer);
                  stateResetTimer = setTimeout(() => {
                    set({ mascotState: 'idle' });
                  }, 2400);

                  resetSleepTimer();
                },

                onError: (err) => {
                  if (signal.aborted) return;

                  console.warn('[LivexAssistant] Stream error:', err);
                  set((state) => ({
                    status: 'error',
                    mascotState: 'error',
                    errorMessage: err.message || 'Error formulating response',
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            status: 'error',
                            content: m.content || 'Unable to connect. Please try again.',
                          }
                        : m
                    ),
                  }));

                  if (stateResetTimer) clearTimeout(stateResetTimer);
                  stateResetTimer = setTimeout(() => {
                    set({ mascotState: 'idle', status: 'idle' });
                  }, 3500);

                  resetSleepTimer();
                },
              },
            });
          } catch (err: any) {
            if (signal.aborted) return;
            set({
              status: 'error',
              mascotState: 'error',
              errorMessage: err.message || 'Error formulating response',
            });
            if (stateResetTimer) clearTimeout(stateResetTimer);
            stateResetTimer = setTimeout(() => {
              set({ mascotState: 'idle', status: 'idle' });
            }, 3500);
            resetSleepTimer();
          } finally {
            if (activeAbortController?.signal === signal) {
              activeAbortController = null;
            }
          }
        },
      };
    },
    {
      name: 'livex:assistant:history:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages.slice(-30), // Retain last 30 messages in storage
        activeThreadId: state.activeThreadId,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  (window as any).__studioAssistantStore = useAssistantStore;
}
