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
   * Optional user location, sent only after the user granted the browser's geolocation permission.
   * Server-side it is bounds-validated + campus-gated (parseUserOrigin) and appended to the system
   * prompt for this request only — never stored or logged.
   */
  location?: { lat?: number; lng?: number };
}
// The SSE event shapes streamed back live with the loop that emits them: AgentEvent in agent/loop.ts.
