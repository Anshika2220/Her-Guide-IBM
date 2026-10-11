import { createContext, useContext } from 'react';

export interface AssistantAsk { prompt?: string; contextId?: string; context?: string }
export const AssistantCtx = createContext<{ ask: (a?: AssistantAsk) => void }>({ ask: () => {} });
export const useAssistant = () => useContext(AssistantCtx);
