import { describe, it, expect, vi } from 'vitest';
import { runAgentLoop, toolLogLine, type RunTurn } from './loop';

describe('runAgentLoop', () => {
  it('streams a direct answer and calls no tools', async () => {
    const runTurn: RunTurn = async (_messages, onText) => {
      await onText('Hello.');
      return { content: [{ type: 'text', text: 'Hello.' }], stopReason: 'end_turn' };
    };
    const dispatch = vi.fn();
    const texts: string[] = [];
    const events: unknown[] = [];

    await runAgentLoop({
      messages: [{ role: 'user', content: 'hi' }],
      runTurn,
      dispatch,
      onText: (t) => void texts.push(t),
      onEvent: (e) => void events.push(e),
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(texts.join('')).toBe('Hello.');
    expect(events).toEqual([{ type: 'done', stop_reason: 'end_turn' }]);
  });

  it('executes a tool call, threads the result back, then finishes', async () => {
    const seen: unknown[][] = [];
    const runTurn: RunTurn = async (messages, onText) => {
      seen.push(JSON.parse(JSON.stringify(messages)));
      if (seen.length === 1) {
        return {
          content: [{ type: 'tool_use', id: 't1', name: 'get_capacity', input: { route: 'CC' } }],
          stopReason: 'tool_use',
        };
      }
      await onText('CC is filling up.');
      return { content: [{ type: 'text', text: 'CC is filling up.' }], stopReason: 'end_turn' };
    };
    const dispatch = vi.fn(async (name, input) => ({ ok: true, name, input }));
    const texts: string[] = [];
    const events: Array<{ type: string }> = [];

    await runAgentLoop({
      messages: [{ role: 'user', content: 'how full is CC' }],
      runTurn,
      dispatch,
      onText: (t) => void texts.push(t),
      onEvent: (e) => void events.push(e),
    });

    expect(dispatch).toHaveBeenCalledWith('get_capacity', { route: 'CC' });
    expect(texts.join('')).toContain('filling up');
    expect(events.at(-1)).toEqual({ type: 'done', stop_reason: 'end_turn' });

    // The second turn must see a user turn carrying the tool_result for t1.
    const secondTurnMessages = seen[1] as Array<{ content?: Array<{ type?: string; tool_use_id?: string }> }>;
    const toolResultTurn = secondTurnMessages.find((m) => Array.isArray(m.content) && m.content[0]?.type === 'tool_result');
    expect(toolResultTurn).toBeTruthy();
    expect(toolResultTurn!.content![0]!.tool_use_id).toBe('t1');
  });

  it('runs multiple tool calls in one turn IN PARALLEL', async () => {
    let call = 0;
    const runTurn: RunTurn = async () => {
      call++;
      if (call === 1) {
        return {
          content: [
            { type: 'tool_use', id: 'a', name: 'get_capacity', input: {} },
            { type: 'tool_use', id: 'b', name: 'check_down_buses', input: {} },
          ],
          stopReason: 'tool_use',
        };
      }
      return { content: [{ type: 'text', text: 'done' }], stopReason: 'end_turn' };
    };
    const dispatch = vi.fn(async (name: string) => ({ name }));
    const events: Array<{ type: string; name?: string }> = [];

    await runAgentLoop({
      messages: [{ role: 'user', content: 'status?' }],
      runTurn,
      dispatch,
      onText: () => {},
      onEvent: (e) => void events.push(e),
    });

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(
      events
        .filter((e) => e.type === 'tool')
        .map((e) => e.name)
        .sort(),
    ).toEqual(['check_down_buses', 'get_capacity']);
  });

  it('gives up gracefully at the iteration cap', async () => {
    const runTurn: RunTurn = async () => ({
      content: [{ type: 'tool_use', id: 't', name: 'get_capacity', input: {} }],
      stopReason: 'tool_use',
    });
    const dispatch = async () => ({});
    const texts: string[] = [];
    const events: Array<{ type: string; stop_reason?: string | null }> = [];

    await runAgentLoop({
      messages: [{ role: 'user', content: 'loop forever' }],
      runTurn,
      dispatch,
      onText: (t) => void texts.push(t),
      onEvent: (e) => void events.push(e),
      maxIters: 3,
    });

    expect(events.at(-1)).toEqual({ type: 'done', stop_reason: 'max_iterations' });
    expect(texts.join('')).toMatch(/narrowing/i);
  });

  it('emits a directive over onEvent when directiveFor returns one', async () => {
    let call = 0;
    const runTurn: RunTurn = async () => {
      call++;
      if (call === 1) {
        return {
          content: [{ type: 'tool_use', id: 'p', name: 'submit_capacity_report', input: { route: 'CC', level: 4 } }],
          stopReason: 'tool_use',
        };
      }
      return { content: [{ type: 'text', text: 'Queued for your confirmation.' }], stopReason: 'end_turn' };
    };
    const dispatch = async () => ({ proposed: true, kind: 'capacity', route: 'CC', name: 'Campus Connector', level: 4 });
    const directiveFor = (name: string) =>
      name === 'submit_capacity_report' ? ({ type: 'confirm' as const, action: name, args: { route: 'CC' } }) : null;
    const events: Array<{ type: string; action?: string }> = [];

    await runAgentLoop({
      messages: [{ role: 'user', content: 'report CC very full' }],
      runTurn,
      dispatch,
      directiveFor,
      onText: () => {},
      onEvent: (e) => void events.push(e),
    });

    expect(events.some((e) => e.type === 'confirm' && e.action === 'submit_capacity_report')).toBe(true);
  });
});

describe('toolLogLine (location never reaches server logs)', () => {
  it('redacts coordinate args and the whole result of a call that received them', () => {
    const line = toolLogLine('describe_location', { lat: 40.00123, lng: -83.01987 }, { name: '1739 N High St', address: '1739 N High St, Columbus, OH' });
    expect(line).not.toMatch(/40\.00123|83\.01987|High St/);
    expect(line).toContain('[redacted]');

    const trip = toolLogLine('plan_route', { from_lat: 40.00123, from_lng: -83.01987, to: 'rpac' }, { from: 'Your location', to: 'RPAC' });
    expect(trip).not.toMatch(/40\.00123|83\.01987/);
    expect(trip).toContain('"to":"rpac"'); // non-location args stay debuggable
  });

  it('logs ordinary calls in full, minus private client-only keys', () => {
    const line = toolLogLine('plan_route', { from: 'union', to: 'rpac' }, { walkMin: 9, _geometry: { from: { lat: 39.99785 } } });
    expect(line).toContain('"walkMin":9');
    expect(line).not.toContain('39.99785');
  });
});
