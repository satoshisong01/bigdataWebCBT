/**
 * Structural + KaTeX checks for every ML drill family (300 seeds each).
 * Family-specific answer checks live next to each family (e.g. confusion.test.ts).
 */
import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { seededRandom, type Rand } from '@/lib/rng';
import { isTopicId } from '@/data/criteria';
import type { DrillGenerator, DrillItem } from '../types';
import { ML_GENERATORS } from './index';

const SEEDS = 300;
const EXPECTED_KINDS = [
  'confusion', 'reg-metrics', 'r-squared', 'regression', 'odds', 'entropy-gini', 'perceptron', 'assoc-rules',
  'distance', 'kmeans', 'cnn-shape', 'pca-variance', 'moving-average', 'naive-bayes', 'tfidf', 'kfold',
];

const verified = new Set<string>();

/** Math segments exactly as MathText splits them; throws on an unmatched `$`. */
function mathSegments(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '$') {
      i += 1;
      continue;
    }
    const delim = text[i + 1] === '$' ? '$$' : '$';
    const end = text.indexOf(delim, i + delim.length);
    if (end === -1) throw new Error(`unmatched ${delim} in: ${text}`);
    out.push(text.slice(i + delim.length, end));
    i = end + delim.length;
  }
  return out;
}

function renderStrict(expr: string): void {
  if (verified.has(expr)) return;
  katex.renderToString(expr, { throwOnError: true, strict: 'error' });
  verified.add(expr);
}

function hasControlChars(text: string): boolean {
  return [...text].some(ch => {
    const code = ch.charCodeAt(0);
    return code < 32 && code !== 10;
  });
}

function checkText(text: string, where: string): void {
  expect(text.trim(), where).not.toBe('');
  expect(text, where).not.toMatch(/NaN|Infinity|undefined|null|\[object/);
  expect(hasControlChars(text), `${where} has control characters`).toBe(false);
  for (const seg of mathSegments(text)) {
    expect(seg.trim(), `${where}: empty math`).not.toBe('');
    expect(() => renderStrict(seg), `${where}: ${seg}`).not.toThrow();
  }
}

function checkItem(item: DrillItem, gen: DrillGenerator, id: string): void {
  expect(item.id).toBe(id);
  expect(item.kind).toBe(gen.kind);
  expect(item.topic).toBe(gen.topic);
  expect(item.options).toHaveLength(4);
  expect(new Set(item.options.map(o => o.trim())).size, item.options.join(' | ')).toBe(4);
  expect(Number.isInteger(item.answer) && item.answer >= 1 && item.answer <= 4).toBe(true);
  expect(item.prompt).toMatch(/[가-힣]/);
  expect(item.solution).toMatch(/[가-힣]/);
  checkText(item.title, `${id} title`);
  checkText(item.prompt, `${id} prompt`);
  checkText(item.solution, `${id} solution`);
  item.options.forEach((o, i) => {
    checkText(o, `${id} option ${i + 1}`);
    expect(o, `${id} options are plain text`).not.toContain('$');
  });
}

describe('ML_GENERATORS registry', () => {
  it('has every planned family exactly once', () => {
    expect(ML_GENERATORS.map(g => g.kind)).toEqual(EXPECTED_KINDS);
  });

  it('uses valid 세세항목 topics and Korean titles', () => {
    for (const g of ML_GENERATORS) {
      expect(isTopicId(g.topic), g.kind).toBe(true);
      expect(g.topic.split('.')).toHaveLength(4);
      expect(g.title).toMatch(/[가-힣]|[A-Z]/);
    }
  });
});

describe.each(ML_GENERATORS.map(g => [g.kind, g] as const))('%s', (kind, gen) => {
  it(`builds well-formed items with KaTeX-valid text for ${SEEDS} seeds`, () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const id = `${kind}-${seed}-0`;
      checkItem(gen.generate(seededRandom(seed), id), gen, id);
    }
  }, 60_000);

  it('is deterministic for a seed', () => {
    for (const seed of [1, 42, 2027]) {
      expect(gen.generate(seededRandom(seed), 'x')).toEqual(gen.generate(seededRandom(seed), 'x'));
    }
  });

  it('spreads the answer position and varies the numbers', () => {
    const positions = [0, 0, 0, 0];
    const prompts = new Set<string>();
    for (let seed = 0; seed < SEEDS; seed++) {
      const item = gen.generate(seededRandom(seed), 'x');
      positions[item.answer - 1] += 1;
      prompts.add(item.prompt);
    }
    positions.forEach(count => expect(count).toBeGreaterThan(SEEDS / 10));
    expect(prompts.size).toBeGreaterThan(SEEDS / 5);
  });

  it('still builds valid items from degenerate random streams (fallback params)', () => {
    const streams: Rand[] = [() => 0, () => 0.999999, () => 0.5];
    streams.forEach((rand, i) => checkItem(gen.generate(rand, `${kind}-d${i}`), gen, `${kind}-d${i}`));
  });
});
