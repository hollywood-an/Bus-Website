// Talks to the backend agent proxy (POST /api/agent) and streams the reply.
//
// The proxy sends Server-Sent Events, one JSON object per `data:` line:
//   { type: 'delta', text }    incremental assistant text
//   { type: 'done', stop_reason }
//   { type: 'error', message }
//
// streamAgent accumulates the text, invokes onDelta(chunk, accumulated) as it arrives, and
// returns the full text. It throws if the transport fails or an error arrives before any text,
// so the caller can fall back to the offline responder.
export async function streamAgent({ messages, context, signal }, onDelta) {
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
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

  // If the agent errored and produced nothing usable, surface it so the caller can fall back.
  if (pendingError && !text) throw pendingError;
  return text;
}
