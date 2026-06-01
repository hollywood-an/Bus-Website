import { Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TripMap from './TripMap';

const EXAMPLES = ['How do I get from Morrill to the Union?', 'Which bus is least crowded right now?', 'Is the Connector packed?'];

export default function AiView({
  chatMessages,
  chatInput,
  setChatInput,
  isAiThinking,
  sendMessage,
  pendingConfirm,
  confirmPending,
  cancelPending,
}) {
  const waiting = isAiThinking && chatMessages[chatMessages.length - 1]?.role !== 'assistant';

  return (
    <section className="mx-auto flex h-[calc(100vh-11rem)] max-w-2xl flex-col md:h-[calc(100vh-3rem)]">
      <div className="mb-3">
        <h1 className="text-2xl">Assistant</h1>
        <p className="mt-1 text-sm text-muted">Ask for a route, crowding, or what to avoid. It plans trips and drives the map.</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {chatMessages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-scarlet-wash text-scarlet-ink">
                <Bot size={26} />
              </span>
              <p className="mt-3 font-bold text-ink">Where are you headed?</p>
              <div className="mt-3 flex flex-col gap-2">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setChatInput(q)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-2"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          chatMessages.map((m, i) => {
            if (m.role === 'trip') {
              return (
                <div key={i} className="rounded-lg border border-line bg-surface p-2.5">
                  <div className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                    {m.trip.from?.name} → {m.trip.to?.name}
                  </div>
                  <TripMap geometry={m.trip} />
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-scarlet px-3.5 py-2 text-sm font-medium text-white">{m.content}</div>
                ) : (
                  <div className="md max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })
        )}
        {waiting && (
          <div className="flex justify-start">
            <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-3">
              <div className="h-2.5 w-40 rounded-full bg-surface-2" />
              <div className="h-2.5 w-28 rounded-full bg-surface-2" />
            </div>
          </div>
        )}
      </div>

      {pendingConfirm && (
        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-sm text-ink">
            Submit this report? <strong>{pendingConfirm.args.name}</strong>{' '}
            {pendingConfirm.args.kind === 'capacity' ? `· ${pendingConfirm.args.label}` : '· reported down'}{' '}
            <span className="font-mono text-xs text-muted">+{pendingConfirm.args.points}</span>
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={confirmPending} className="rounded-lg bg-scarlet px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              Confirm &amp; submit
            </button>
            <button onClick={cancelPending} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isAiThinking}
          placeholder="Ask about routes, crowding, or a trip…"
          className="flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-scarlet focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={sendMessage}
          disabled={!chatInput.trim() || isAiThinking}
          aria-label="Send"
          className="grid w-11 shrink-0 place-items-center rounded-lg bg-scarlet text-white transition-colors hover:bg-scarlet-ink disabled:bg-surface-2 disabled:text-muted"
        >
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}
