import { describe, expect, it } from 'vitest';
import { withCommas } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { cnnShapeGenerator, makeParams, solve, type CnnParams } from './cnnShape';

const layer = (ask: CnnParams['ask'], size: number, channels: number, kernel: number, stride: number, padding: number, filters: number): CnnParams =>
  ({ ask, size, channels, kernel, stride, padding, filters });

describe('cnn-shape solve (hand-checked)', () => {
  it('conv output (W − F + 2P)/S + 1', () => {
    expect(solve(layer('conv', 32, 3, 5, 1, 0, 16))).toMatchObject({ out: 28, depth: 16 });
    expect(solve(layer('conv', 227, 3, 11, 4, 0, 96)).out).toBe(55); // AlexNet conv1
    expect(solve(layer('conv', 28, 1, 3, 1, 1, 8)).out).toBe(28); // same padding
  });

  it('pooling keeps the channels', () => {
    expect(solve(layer('pool', 28, 16, 2, 2, 0, 0))).toMatchObject({ out: 14, depth: 16 });
    expect(solve(layer('pool', 55, 96, 3, 2, 0, 0)).out).toBe(27);
  });

  it('conv parameters (F·F·C + 1)·K', () => {
    expect(solve(layer('params', 32, 3, 3, 1, 0, 16)).params).toBe(448);
    expect(solve(layer('params', 32, 1, 5, 1, 0, 6)).params).toBe(156);
  });

  it('conv → 2×2 pool', () => {
    expect(solve(layer('stack', 32, 3, 5, 1, 0, 6))).toMatchObject({ out: 28, pooled: 14, depth: 6 });
  });
});

describe('cnn-shape generator', () => {
  it('marks the independently recomputed shape / parameter count', () => {
    eachSeed(cnnShapeGenerator, makeParams, (item, p) => {
      if (p.ask === 'params') {
        expect(answerText(item)).toBe(`${withCommas((p.kernel * p.kernel * p.channels + 1) * p.filters)}개`);
        return;
      }
      const conv = (p.size - p.kernel + 2 * p.padding) / p.stride + 1;
      const pool = (p.size - p.kernel) / p.stride + 1;
      const [size, depth] = {
        conv: [conv, p.filters],
        pool: [pool, p.channels],
        stack: [(conv - 2) / 2 + 1, p.filters],
      }[p.ask];
      expect(Number.isInteger(size) && size >= 2).toBe(true);
      expect(answerText(item)).toBe(`${size}×${size}×${depth}`);
    });
  });
});
