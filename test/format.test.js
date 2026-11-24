'use strict';

const { formatTime, renderBar, formatVolume, fitStr } = require('../src/utils/format');

describe('format utils', () => {
  describe('formatTime', () => {
    test('formats 0 seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    test('formats sub-minute times with leading zero on seconds', () => {
      expect(formatTime(7)).toBe('0:07');
      expect(formatTime(59)).toBe('0:59');
    });

    test('formats minutes and seconds accurately', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(205)).toBe('3:25');
      expect(formatTime(3600)).toBe('60:00');
    });

    test('handles negative values gracefully', () => {
      expect(formatTime(-10)).toBe('0:00');
    });
  });

  describe('renderBar', () => {
    test('renders 0% bar', () => {
      const bar = renderBar(0, 10);
      expect(bar).toBe('░░░░░░░░░░');
    });

    test('renders 100% bar', () => {
      const bar = renderBar(100, 10);
      expect(bar).toBe('██████████');
    });

    test('renders 50% bar', () => {
      const bar = renderBar(50, 10);
      expect(bar).toBe('█████░░░░░');
    });

    test('clamps percentage to [0, 100]', () => {
      expect(renderBar(-20, 10)).toBe('░░░░░░░░░░');
      expect(renderBar(150, 10)).toBe('██████████');
    });
  });

  describe('formatVolume', () => {
    test('formats normal volume levels', () => {
      expect(formatVolume(75)).toBe('75%');
      expect(formatVolume(0)).toBe('0%');
      expect(formatVolume(100)).toBe('100%');
    });

    test('clamps volume levels to valid [0, 100] bounds', () => {
      expect(formatVolume(-15)).toBe('0%');
      expect(formatVolume(120)).toBe('100%');
    });
  });

  describe('fitStr', () => {
    test('pads short string to width', () => {
      expect(fitStr('Song', 8)).toBe('Song    ');
    });

    test('truncates long string with ellipsis', () => {
      expect(fitStr('A Very Long Song Title Indeed', 10)).toBe('A Very Lo…');
    });

    test('handles empty or null string', () => {
      expect(fitStr('', 5)).toBe('     ');
      expect(fitStr(null, 5)).toBe('     ');
    });
  });
});
