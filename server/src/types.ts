// Shared request/response shapes for the agent proxy. Kept server-local for now (the client is
// plain JS/JSX and doesn't import TS types); a top-level shared/ can be introduced if the client
// migrates to TS later.

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AgentRequest {
  messages: ChatMessage[];
  /**
   * Phase 1 only: a crowdsourced capacity/down summary the client computes and sends so the
   * proxy has parity with the old prompt-stuffing chatbot. This goes away in Phase 1.6/2 when
   * reports live server-side and the agent reads them via tools instead of trusting the client.
   */
  context?: string;
}

// One JSON object per SSE `data:` line streamed from POST /api/agent.
export type AgentEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; stop_reason?: string | null }
  | { type: 'error'; message: string };
