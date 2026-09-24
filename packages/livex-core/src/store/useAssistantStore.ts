import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type AssistantMessage,
  type AssistantAttachment,
  type AssistantState,
  type StructuredRecommendation,
  type AssistantQuickPrompt,
} from '../types/assistant';
import { getMusicalContextSnapshot } from '../lib/assistant/contextAggregator';
import { streamChatCompletion } from '../lib/assistant/assistantApiClient';
import { useSettingsStore } from './useSettingsStore';

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

export function getDefaultStatusLabel(state: AssistantState): string {
  switch (state) {
    case 'connecting':
      return 'Connecting…';
    case 'searching':
      return 'Searching web…';
    case 'solving':
      return 'Analyzing music theory…';
    case 'working':
    case 'thinking':
      return 'Thinking…';
    case 'composing':
    case 'responding':
      return 'Composing…';
    case 'shaping':
      return 'Shaping recommendations…';
    case 'weaving':
      return 'Synthesizing harmony…';
    case 'listening':
      return 'Listening…';
    case 'idle':
    case 'sleeping':
      return 'Ready';
    case 'error':
      return 'Error';
    case 'interrupted':
      return 'Stopped';
    default:
      return 'Working…';
  }
}

interface AssistantStoreState {
  messages: AssistantMessage[];
  mascotState: AssistantState;
  statusLabel?: string | null;
  status: 'idle' | 'streaming' | 'error';
  errorMessage?: string | null;
  activeThreadId: string;
  inputText: string;
  attachments: AssistantAttachment[];
  userApiKey?: string;
  customGatewayUrl?: string;
  customModel?: string;

  // Actions
  sendMessage: (promptText?: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  stopStreaming: () => void;
  setMascotState: (state: AssistantState, label?: string | null) => void;
  setStatusLabel: (label: string | null) => void;
  setInputText: (text: string) => void;
  setUserApiKey: (key: string) => void;
  setCustomGatewayUrl: (url: string) => void;
  setCustomModel: (model: string) => void;
  addAttachment: (att: AssistantAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
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
        statusLabel: null,
        status: 'idle',
        errorMessage: null,
        activeThreadId: 'default-thread',
        inputText: '',
        attachments: [],
        userApiKey: undefined,
        customGatewayUrl: undefined,
        customModel: undefined,

        setUserApiKey: (userApiKey: string) => {
          set({ userApiKey: userApiKey.trim() || undefined });
        },

        setCustomGatewayUrl: (customGatewayUrl: string) => {
          set({ customGatewayUrl: customGatewayUrl.trim() || undefined });
        },

        setCustomModel: (customModel: string) => {
          set({ customModel: customModel.trim() || undefined });
        },

        retryLastMessage: async () => {
          const messages = get().messages;
          const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
          if (lastUserIndex === -1) return;
          const actualIndex = messages.length - 1 - lastUserIndex;
          const lastUserMsg = messages[actualIndex];

          const priorHistory = messages.slice(0, actualIndex);
          set({
            messages: priorHistory,
            inputText: lastUserMsg.content,
            attachments: lastUserMsg.attachments || [],
            errorMessage: null,
            status: 'idle',
            mascotState: 'idle',
            statusLabel: null,
          });

          await get().sendMessage();
        },

        wakeMascot: () => {
          if (get().mascotState === 'sleeping') {
            set({ mascotState: 'idle', statusLabel: null });
          }
          resetSleepTimer();
        },

        setMascotState: (mascotState: AssistantState, label?: string | null) => {
          set({
            mascotState,
            statusLabel: label !== undefined ? label : getDefaultStatusLabel(mascotState),
          });
          resetSleepTimer();
        },

        setStatusLabel: (statusLabel: string | null) => {
          set({ statusLabel });
        },

        setInputText: (inputText: string) => {
          set({ inputText });
          get().wakeMascot();
        },

        addAttachment: (att: AssistantAttachment) => {
          set((state) => ({
            attachments: [...state.attachments, att],
          }));
          get().wakeMascot();
        },

        removeAttachment: (id: string) => {
          set((state) => ({
            attachments: state.attachments.filter((a) => a.id !== id),
          }));
        },

        clearAttachments: () => {
          set({ attachments: [] });
        },

        clearConversation: () => {
          if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
          }
          set({
            messages: [],
            attachments: [],
            status: 'idle',
            mascotState: 'idle',
            statusLabel: null,
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

          set((state) => ({
            status: 'idle',
            mascotState: 'interrupted',
            statusLabel: 'Stopped',
            messages: state.messages.map((m) =>
              m.status === 'streaming'
                ? {
                    ...m,
                    status: 'complete',
                    activeState: 'interrupted',
                    statusLabel: undefined,
                    content: m.content || '(Generation stopped)',
                  }
                : m
            ),
          }));

          stateResetTimer = setTimeout(() => {
            set({ mascotState: 'idle', statusLabel: null });
          }, 1200);

          resetSleepTimer();
        },

        sendMessage: async (promptOverride?: string) => {
          const rawText = (promptOverride !== undefined ? promptOverride : get().inputText).trim();
          const pendingAttachments = [...get().attachments];

          if ((!rawText && pendingAttachments.length === 0) || get().status === 'streaming') return;

          // Clear text input and pending attachments
          set({ inputText: '', attachments: [], errorMessage: null });

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

          const currentLanguage = useSettingsStore.getState().settings?.language || 'en';
          const hasImages = pendingAttachments.some(
            (a) => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/')
          );
          const hasAudio = pendingAttachments.some(
            (a) => a.type?.startsWith('audio/') || a.dataUrl?.startsWith('data:audio/')
          );
          const hasAttachments = pendingAttachments.length > 0;

          let initialMascotState: AssistantState = 'connecting';
          let initialLabel = currentLanguage === 'es' ? 'Conectando…' : 'Connecting…';

          if (hasImages) {
            initialMascotState = 'working';
            initialLabel = currentLanguage === 'es' ? 'Leyendo imagen…' : 'Reading image…';
          } else if (hasAudio) {
            initialMascotState = 'working';
            initialLabel = currentLanguage === 'es' ? 'Analizando audio…' : 'Analyzing audio…';
          } else if (hasAttachments) {
            initialMascotState = 'working';
            initialLabel = currentLanguage === 'es' ? 'Analizando archivo…' : 'Analyzing file…';
          }

          const effectivePrompt =
            rawText ||
            (hasImages
              ? currentLanguage === 'es'
                ? 'Analiza esta imagen musical y proporciona notas, acordes, digitación o transcripción.'
                : 'Analyze this musical image and provide chords, notes, fingering, or transcription.'
              : hasAudio
                ? currentLanguage === 'es'
                  ? 'Analiza este audio musical y proporciona tonalidad, tempo, acordes y ritmo.'
                  : 'Analyze this musical audio and provide key, tempo, chords, and groove details.'
                : currentLanguage === 'es'
                  ? 'Analiza este documento musical y proporciona ideas teóricas o estructura.'
                  : 'Analyze this musical document and provide theoretical analysis or structure.');

          const userMessage: AssistantMessage = {
            id: userMsgId,
            threadId,
            role: 'user',
            content: rawText,
            status: 'complete',
            timestamp: Date.now(),
            contextSnapshot,
            attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
          };

          const assistantMessage: AssistantMessage = {
            id: assistantMsgId,
            threadId,
            role: 'assistant',
            content: '',
            status: 'streaming',
            statusLabel: initialLabel,
            activeState: initialMascotState,
            timestamp: Date.now(),
            recommendations: [],
            contextSnapshot,
          };

          // Optimistically append messages and transition mascot to initial state
          set((state) => ({
            messages: [...state.messages, userMessage, assistantMessage],
            status: 'streaming',
            mascotState: initialMascotState,
            statusLabel: initialLabel,
          }));

          // Yield one render frame so the browser commits and paints the ThinkingOrb before tokens arrive
          if (typeof requestAnimationFrame === 'function') {
            await new Promise<void>((r) => requestAnimationFrame(() => r()));
          }

          const priorMessages = get().messages.filter(
            (m) => m.id !== userMsgId && m.id !== assistantMsgId && m.status !== 'streaming'
          );

          let hasReceivedFirstToken = false;

          try {
            await streamChatCompletion({
              prompt: effectivePrompt,
              history: priorMessages,
              contextSnapshot,
              language: currentLanguage,
              attachments: pendingAttachments,
              apiKey: get().userApiKey,
              gatewayUrl: get().customGatewayUrl,
              model: get().customModel,
              signal,
              callbacks: {
                onStateChange: (backendState, backendLabel) => {
                  if (signal.aborted) return;
                  const label = backendLabel || getDefaultStatusLabel(backendState);
                  set((state) => ({
                    mascotState: backendState,
                    statusLabel: label,
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, activeState: backendState, statusLabel: label }
                        : m
                    ),
                  }));
                },

                onSources: (sources) => {
                  if (signal.aborted) return;
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            sources: [
                              ...(m.sources || []),
                              ...sources.filter(
                                (s) => !(m.sources || []).some((existing) => existing.url === s.url)
                              ),
                            ],
                          }
                        : m
                    ),
                  }));
                },

                onToken: (tokenDelta) => {
                  if (signal.aborted) return;

                  if (!hasReceivedFirstToken) {
                    hasReceivedFirstToken = true;
                    set((state) => ({
                      mascotState: 'composing',
                      statusLabel: currentLanguage === 'es' ? 'Componiendo…' : 'Composing…',
                      messages: state.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              activeState: 'composing',
                              statusLabel: currentLanguage === 'es' ? 'Componiendo…' : 'Composing…',
                            }
                          : m
                      ),
                    }));
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
                    mascotState: 'idle',
                    statusLabel: null,
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, status: 'complete', activeState: 'idle', statusLabel: undefined }
                        : m
                    ),
                  }));

                  resetSleepTimer();
                },

                onError: (err) => {
                  if (signal.aborted) {
                    set((state) => ({
                      status: 'idle',
                      statusLabel: null,
                      messages: state.messages.map((m) =>
                        m.id === assistantMsgId && m.status === 'streaming'
                          ? { ...m, status: 'complete', content: m.content || '(Generation stopped)' }
                          : m
                      ),
                    }));
                    return;
                  }

                  console.warn('[LivexAssistant] Stream error:', err);
                  set((state) => ({
                    status: 'error',
                    mascotState: 'error',
                    statusLabel: null,
                    errorMessage: err.message || 'Error formulating response',
                    messages: state.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            status: 'error',
                            activeState: 'error',
                            statusLabel: undefined,
                            content:
                              m.content ||
                              err.message ||
                              'Unable to connect to Livex AI cloud service. Please check your connection and retry.',
                          }
                        : m
                    ),
                  }));

                  if (stateResetTimer) clearTimeout(stateResetTimer);
                  stateResetTimer = setTimeout(() => {
                    set({ mascotState: 'idle', status: 'idle', statusLabel: null });
                  }, 4000);

                  resetSleepTimer();
                },
              },
            });
          } catch (err: any) {
            if (signal.aborted) {
              set((state) => ({
                status: 'idle',
                statusLabel: null,
                messages: state.messages.map((m) =>
                  m.id === assistantMsgId && m.status === 'streaming'
                    ? { ...m, status: 'complete', content: m.content || '(Generation stopped)' }
                    : m
                ),
              }));
              return;
            }
            set((state) => ({
              status: 'error',
              mascotState: 'error',
              statusLabel: null,
              errorMessage: err?.message || 'Error formulating response',
              messages: state.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      status: 'error',
                      activeState: 'error',
                      statusLabel: undefined,
                      content:
                        m.content ||
                        err?.message ||
                        'Unable to connect to Livex AI cloud service. Please check your connection and retry.',
                    }
                  : m
              ),
            }));
            if (stateResetTimer) clearTimeout(stateResetTimer);
            stateResetTimer = setTimeout(() => {
              set({ mascotState: 'idle', status: 'idle', statusLabel: null });
            }, 4000);
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
        userApiKey: state.userApiKey,
        customGatewayUrl: state.customGatewayUrl,
        customModel: state.customModel,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  (window as any).__studioAssistantStore = useAssistantStore;
}
