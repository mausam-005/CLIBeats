'use strict';

const Queue = require('../src/core/Queue');

describe('Queue', () => {
  let q;

  beforeEach(() => {
    q = new Queue();
    q.load([{ title: 'A' }, { title: 'B' }, { title: 'C' }]);
  });

  // ── Basic state ────────────────────────────────────────────────────────────

  test('starts at index 0', () => {
    expect(q.index).toBe(0);
    expect(q.current.title).toBe('A');
  });

  test('length is correct', () => {
    expect(q.length).toBe(3);
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('next() advances index and returns current track', () => {
    const track = q.next();
    expect(q.index).toBe(1);
    expect(track.title).toBe('B');
  });

  test('next() returns null at the end of the list', () => {
    q.next(); q.next();
    const result = q.next();
    expect(result).toBeNull();
    expect(q.index).toBe(2); // stays at last
  });

  test('prev() goes back one step', () => {
    q.next(); q.next();
    q.prev();
    expect(q.index).toBe(1);
    expect(q.current.title).toBe('B');
  });

  test('prev() does not go below 0', () => {
    q.prev();
    expect(q.index).toBe(0);
  });

  test('jumpTo() moves to an arbitrary valid index', () => {
    q.jumpTo(2);
    expect(q.current.title).toBe('C');
  });

  test('jumpTo() clamps to valid range', () => {
    q.jumpTo(100);
    expect(q.index).toBe(2);
    q.jumpTo(-5);
    expect(q.index).toBe(0);
  });

  // ── hasNext / hasPrev ──────────────────────────────────────────────────────

  test('hasPrev is false at start, true later', () => {
    expect(q.hasPrev).toBe(false);
    q.next();
    expect(q.hasPrev).toBe(true);
  });

  test('hasNext is true at start, false at end', () => {
    expect(q.hasNext).toBe(true);
    q.jumpTo(2);
    expect(q.hasNext).toBe(false);
  });

  // ── Random ────────────────────────────────────────────────────────────────

  test('random() never returns current index (with enough tracks)', () => {
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      const before = q.index;
      q.random();
      if (q.length > 1) {
        expect(q.index).not.toBe(before);
      }
      seen.add(q.index);
      // Reset for next iteration
      q._index = 0;
    }
    // Should have visited multiple indices
    expect(seen.size).toBeGreaterThan(1);
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  test('add() appends a track', () => {
    q.add({ title: 'D' });
    expect(q.length).toBe(4);
    q.jumpTo(3);
    expect(q.current.title).toBe('D');
  });

  test('remove() deletes a track and adjusts index', () => {
    q.jumpTo(2);
    q.remove(2);
    expect(q.length).toBe(2);
    expect(q.index).toBe(1); // clamped
  });

  test('load() resets index to 0', () => {
    q.jumpTo(2);
    q.load([{ title: 'X' }, { title: 'Y' }]);
    expect(q.index).toBe(0);
    expect(q.current.title).toBe('X');
  });
});
