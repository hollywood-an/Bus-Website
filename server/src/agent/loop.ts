import type Anthropic from '@anthropic-ai/sdk';

// The agent loop (the heart of the project). A single "turn" streams assistant text and assembles
// any tool_use blocks; the loop runs turns until the model stops asking for tools, executing all
// tool calls in a turn IN PARALLEL and feeding the results back. Capped, with a graceful give-up.
//
// runTurn and dispatch are injected so the loop is unit-testable without a real model or network.

export interface AssistantBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface TurnResult {
  content: AssistantBlock[];
  stopReason: string | null;
}

export type RunTurn = (messages: unknown[], onText: (t: string) => void | Promise<void>) => Promise<TurnResult>;
export type Dispatch = (name: string, input: Record<string, unknown>) => Promise<unknown>;

// A structured instruction streamed to the client (confirm a write; drive the UI). It's emitted via
// onEvent AND the tool result still goes back to the model, so the agent knows the tool "did" something.
export type Directive = { type: 'confirm' | 'ui_directive'; action: string; args: Record<string, unknown> };
export type DirectiveFor = (name: string, result: unknown) => Directive | null;

export type AgentEvent =
  | { type: 'tool'; name: string }
  | { type: 'done'; stop_reason: string | null }
  | { type: 'error'; message: string }
  | Directive;

const DEFAULT_MAX_ITERS = 8;

export async function runAgentLoop(opts: {
  messages: unknown[];
  runTurn: RunTurn;
  dispatch: Dispatch;
  onText: (t: string) => void | Promise<void>;
  onEvent: (e: AgentEvent) => void | Promise<void>;
  directiveFor?: DirectiveFor;
  maxIters?: number;
  log?: (line: string) => void;
}): Promise<void> {
  const { messages, runTurn, dispatch, onText, onEvent, directiveFor, log } = opts;
  const maxIters = opts.maxIters ?? DEFAULT_MAX_ITERS;
  const convo: unknown[] = [...messages];

  for (let i = 0; i < maxIters; i++) {
    const { content, stopReason } = await runTurn(convo, onText);
    convo.push({ role: 'assistant', content });

    if (stopReason !== 'tool_use') {
      await onEvent({ type: 'done', stop_reason: stopReason });
      return;
    }

    const toolUses = content.filter((b) => b.type === 'tool_use');
    const results = await Promise.all(
      toolUses.map(async (tu) => {
        await onEvent({ type: 'tool', name: tu.name! });
        let result: unknown;
        try {
          result = await dispatch(tu.name!, tu.input ?? {});
        } catch (err) {
          result = { error: String((err as Error)?.message ?? err) };
        }
        const directive = directiveFor?.(tu.name!, result);
        if (directive) await onEvent(directive);
        log?.(`[tool] ${tu.name} ${JSON.stringify(tu.input ?? {})} -> ${truncate(JSON.stringify(result))}`);
        // Strip `_`-prefixed keys (e.g. map geometry) from what the model sees — it's only for the
        // client directive, and keeping it out of context saves tokens.
        return { type: 'tool_result' as const, tool_use_id: tu.id, content: JSON.stringify(stripPrivate(result)) };
      }),
    );
    convo.push({ role: 'user', content: results });
  }

  // Iteration cap hit — degrade gracefully rather than looping forever.
  await onText("\n\nI couldn't finish working that out — try narrowing the question.");
  await onEvent({ type: 'done', stop_reason: 'max_iterations' });
}

function truncate(s: string, n = 300): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// Drop top-level keys starting with `_` (client-only payloads like map geometry) from a tool result.
function stripPrivate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (!k.startsWith('_')) out[k] = v;
  return out;
}

// Real turn implementation: stream a Claude response, push text deltas through onText, and assemble
// the final assistant content (text + tool_use blocks with their accumulated JSON input).
export function makeRunTurn(anthropic: Anthropic, model: string, system: string, tools: unknown[]): RunTurn {
  return async (messages, onText) => {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      stream: true,
    });

    const blocks: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; _json: string }> = [];
    let stopReason: string | null = null;

    for await (const event of resp as AsyncIterable<Record<string, any>>) {
      if (event.type === 'content_block_start') {
        blocks[event.index] =
          event.content_block.type === 'tool_use'
            ? { type: 'tool_use', id: event.content_block.id, name: event.content_block.name, _json: '' }
            : { type: 'text', text: '' };
      } else if (event.type === 'content_block_delta') {
        const b = blocks[event.index];
        if (!b) continue;
        if (event.delta.type === 'text_delta' && b.type === 'text') {
          b.text += event.delta.text;
          await onText(event.delta.text);
        } else if (event.delta.type === 'input_json_delta' && b.type === 'tool_use') {
          b._json += event.delta.partial_json;
        }
      } else if (event.type === 'message_delta') {
        stopReason = event.delta?.stop_reason ?? stopReason;
      }
    }

    const content: AssistantBlock[] = blocks
      .filter(Boolean)
      .filter((b) => !(b.type === 'text' && !b.text.trim()))
      .map((b) =>
        b.type === 'tool_use'
          ? { type: 'tool_use', id: b.id, name: b.name, input: safeJson(b._json) }
          : { type: 'text', text: b.text },
      );

    return { content, stopReason };
  };
}

function safeJson(s: string): Record<string, unknown> {
  if (!s || !s.trim()) return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
