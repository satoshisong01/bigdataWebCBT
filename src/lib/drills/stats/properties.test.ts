import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { isTopicId } from '@/data/criteria';
import { seededRandom } from '@/lib/rng';
import type { DrillItem } from '../types';
import { answerText, toGenerator, type DrillFamily } from './family';
import { STATS_FAMILIES, STATS_GENERATORS } from './index';
import { hasDecimals } from './shared';

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
/** control characters other than '\n' — e.g. a '\f' from writing '\frac' without escaping */
const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F]/;
const rendered = new Set<string>();

/**
 * Inline $...$ segments, split the way MathText does. Throws on an unpaired '$'
 * (MathText would loop forever on one) and on '$$' (block math is never used here).
 */
function mathSegments(text: string): string[] {
  if (text.includes('$$')) throw new Error(`block math in: ${text}`);
  const parts = text.split('$');
  if (parts.length % 2 === 0) throw new Error(`unpaired $ in: ${text}`);
  return parts.filter((_, i) => i % 2 === 1);
}

function expectRenders(text: string): void {
  for (const expr of mathSegments(text)) {
    if (rendered.has(expr)) continue;
    expect(() => katex.renderToString(expr, { throwOnError: true, strict: 'error' }), expr).not.toThrow();
    rendered.add(expr);
  }
}

function expectValidItem(item: DrillItem, family: DrillFamily<unknown>, params: unknown): void {
  const correct = answerText(family, params);
  expect(item.options).toHaveLength(4);
  expect(new Set(item.options).size).toBe(4);
  expect(item.answer).toBeGreaterThanOrEqual(1);
  expect(item.answer).toBeLessThanOrEqual(4);
  expect(item.options[item.answer - 1]).toBe(correct);
  // calculator-free: the solved value terminates within 3 decimals and the solution shows it
  expect(hasDecimals(family.solve(params), 3)).toBe(true);
  expect(item.solution).toContain(correct);
  for (const option of item.options) {
    expect(option.trim()).not.toBe('');
    expect(option).not.toContain('$');
  }
  for (const text of [item.title, item.prompt, item.solution, ...item.options]) {
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
    expect(text).not.toMatch(CONTROL_CHARS);
    expectRenders(text);
  }
}

describe('statistics drill registry', () => {
  it('has the 15 families with unique kinds and real 출제기준 topics', () => {
    const kinds = STATS_FAMILIES.map(f => f.kind);
    expect(kinds).toEqual([
      'descriptive', 'variance', 'quartile-iqr', 'scaling', 'cv', 'bayes', 'binomial', 'expectation',
      'stratified', 'std-error-ci', 'sample-size', 'dof', 'chi-expected', 'correlation', 'data-units',
    ]);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const f of STATS_FAMILIES) {
      expect(isTopicId(f.topic), f.kind).toBe(true);
      expect(f.title.trim()).not.toBe('');
    }
    expect(STATS_GENERATORS.map(g => g.kind)).toEqual(kinds);
  });
});

describe.each(STATS_FAMILIES.map(f => [f.kind, f] as const))('%s', (kind, family) => {
  const generator = toGenerator(family);

  it('300 seeds: 4 distinct options, correct answer, clean text, KaTeX renders', () => {
    for (const seed of SEEDS) {
      const id = `${kind}-${seed}-0`;
      const item = generator.generate(seededRandom(seed), id);
      expect(item).toMatchObject({ id, kind, topic: family.topic, title: family.title });
      expectValidItem(item, family, family.makeParams(seededRandom(seed)));
    }
  });

  it('is deterministic per seed and varied across seeds', () => {
    const a = generator.generate(seededRandom(42), 'x');
    const b = generator.generate(seededRandom(42), 'x');
    expect(a).toEqual(b);
    const prompts = new Set(SEEDS.map(seed => generator.generate(seededRandom(seed), 'x').prompt));
    expect(prompts.size).toBeGreaterThanOrEqual(40);
    const answerSlots = new Set(SEEDS.map(seed => generator.generate(seededRandom(seed), 'x').answer));
    expect(answerSlots.size).toBe(4);
  });
});
