import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteReportStore } from './reportStore';

let store: SqliteReportStore;
beforeEach(() => {
  store = new SqliteReportStore(':memory:');
});

describe('capacity aggregation + anti-poisoning dampener', () => {
  it('a single report is not "confident"', () => {
    store.addCapacity('CC', 4, 'r1');
    const [c] = store.capacity('CC');
    expect(c!.reporterCount).toBe(1);
    expect(c!.confident).toBe(false);
    expect(c!.level).toBe(4);
  });

  it('two DISTINCT reporters make it confident', () => {
    store.addCapacity('CC', 3, 'r1');
    store.addCapacity('CC', 3, 'r2');
    const [c] = store.capacity('CC');
    expect(c!.reporterCount).toBe(2);
    expect(c!.confident).toBe(true);
  });

  it('the same reporter twice still counts as one reporter (no self-corroboration)', () => {
    store.addCapacity('CC', 2, 'r1');
    store.addCapacity('CC', 2, 'r1');
    const [c] = store.capacity('CC');
    expect(c!.reportCount).toBe(2);
    expect(c!.reporterCount).toBe(1);
    expect(c!.confident).toBe(false);
  });

  it('median down-weights a single outlier', () => {
    store.addCapacity('CC', 1, 'r1');
    store.addCapacity('CC', 1, 'r2');
    store.addCapacity('CC', 4, 'r3'); // troll says "very full"
    const [c] = store.capacity('CC');
    expect(c!.level).toBe(1); // median of [1,1,4]
  });
});

describe('down corroboration', () => {
  it('a single down report is unconfirmed', () => {
    store.addDown('NWC', 'r1');
    const [d] = store.down();
    expect(d!.confirmed).toBe(false);
  });

  it('two distinct reporters confirm a route is down', () => {
    store.addDown('NWC', 'r1');
    store.addDown('NWC', 'r2');
    const [d] = store.down();
    expect(d!.confirmed).toBe(true);
  });
});

describe('points + seed', () => {
  it('awards +1 for capacity and +2 for down', () => {
    expect(store.addCapacity('CC', 2, 'r1').pointsDelta).toBe(1);
    expect(store.addDown('CC', 'r1').pointsDelta).toBe(2);
  });

  it('seed populates an empty store and is idempotent', () => {
    const routes = ['BE', 'CC', 'CLS', 'ER', 'NWC'];
    store.seed(routes);
    const total1 = store.capacity().length + store.down().length;
    expect(total1).toBeGreaterThan(0);
    store.seed(routes);
    const total2 = store.capacity().length + store.down().length;
    expect(total2).toBe(total1);
  });
});
