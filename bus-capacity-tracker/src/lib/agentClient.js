// Talks to the backend agent proxy (POST /api/agent) and streams the reply.
//
// The proxy sends Server-Sent Events, one JSON object per `data:` line:
//   { type: 'delta', text }            incremental assistant text
//   { type: 'tool', name }             a tool the agent invoked (informational)
//   { type: 'confirm', action, args }  a write the agent proposes — needs user confirmation
//   { type: 'ui_directive', action, args }  drive the app UI (Phase 4)
//   { type: 'done', stop_reason } | { type: 'error', message }
//
// Text chunks go to onDelta; everything else goes to onEvent. Returns the accumulated text, and
// throws if the transport fails or an error arrives before any text (so the caller can fall back).
export async function streamAgent({ messages, signal, onDelta, onEvent }) {
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`agent_http_${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let pendingError = null;

  const handleFrame = (frame) => {
    const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return;
    const payload = dataLine.slice(5).trim();
    if (!payload) return;

    let evt;
    try {
      evt = JSON.parse(payload);
    } catch {
      return;
    }

    if (evt.type === 'delta' && typeof evt.text === 'string') {
      text += evt.text;
      onDelta?.(evt.text, text);
    } else if (evt.type === 'error') {
      pendingError = new Error(evt.message || 'agent_error');
    } else {
      onEvent?.(evt);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) handleFrame(frame);
  }
  if (buffer) handleFrame(buffer);

  if (pendingError && !text) throw pendingError;
  return text;
}
