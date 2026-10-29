import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { withCommas } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { makeParams, paramCount, perceptronGenerator, sigmoid2, solve } from './perceptron';

describe('perceptron solve (hand-checked)', () => {
  it('step: z = 0.5·1 − 1·0 + 0.3·2 − 0.2 = 0.9 → 1', () => {
    const s = solve({ ask: 'step', x: [1, 0, 2], w: [0.5, -1, 0.3], b: -0.2 });
    expect(s.dot).toBeCloseTo(1.1);
    expect(s.z).toBeCloseTo(0.9);
    expect(s.value).toBe(1);
  });

  it('ReLU clips z = −1.4 to 0', () => {
    const s = solve({ ask: 'relu', x: [1, 2, 1], w: [0.5, -1, 0.3], b: -0.2 });
    expect(s.z).toBeCloseTo(-1.4);
    expect(s.value).toBe(0);
  });

  it('sigmoid of z = 1 reads 0.73 from the table', () => {
    expect(solve({ ask: 'sigmoid', x: [1, 2, 0], w: [1, 0.5, -1], b: -1 }).value).toBe(0.73);
    expect([-2, -1, 0, 1, 2].map(sigmoid2)).toEqual([0.12, 0.27, 0.5, 0.73, 0.88]);
  });

  it('dense parameters = Σ (in + 1)·out', () => {
    expect(paramCount([4, 5, 3])).toBe(43); // 25 + 18
    expect(paramCount([784, 10])).toBe(7850);
    expect(paramCount([8, 16, 8, 1])).toBe(289); // 144 + 136 + 9
  });
});

describe('perceptron generator', () => {
  it('marks the independently recomputed output', () => {
    eachSeed(perceptronGenerator, makeParams, (item, p) => {
      if (p.ask === 'params') {
        const total = p.layers.slice(1).reduce((acc, out, i) => acc + (p.layers[i] + 1) * out, 0);
        expect(answerText(item)).toBe(`${withCommas(total)}개`);
        return;
      }
      const z = p.x.reduce((acc, x, i) => acc + x * p.w[i], 0) + p.b;
      expect(Math.abs(z)).toBeGreaterThan(1e-9); // never on the step boundary
      const expected = { step: z >= 0 ? 1 : 0, relu: Math.max(0, z), sigmoid: Math.round(100 / (1 + Math.exp(-z))) / 100 }[p.ask];
      expect(answerText(item)).toBe(formatNum(expected, 2));
      if (p.ask === 'sigmoid') expect(Number.isInteger(Math.round(z * 1e9) / 1e9)).toBe(true);
    });
  });
});
