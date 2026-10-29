import type { Rand } from '@/lib/rng';
import type { DrillGenerator, DrillItem } from '../types';
import { formatNum, uniqueOptions } from '../util';

/** What a family writes for one problem; options/answer are assembled by toGenerator. */
export interface DrillText {
  prompt: string;
  solution: string;
  /** wrong option texts in priority order (most plausible mistake first); '' entries are skipped */
  distractors: string[];
}

/**
 * One statistics drill family as pure steps, so tests can replay a seed:
 * makeParams(rand) → solve(params) → render(params).
 * makeParams is the first consumer of `rand`; option shuffling and fallbacks use it afterwards.
 */
export interface DrillFamily<P> {
  kind: string;
  title: string;
  /** 출제기준 세세항목 id */
  topic: string;
  makeParams(rand: Rand): P;
  /** the correct value — a number, or an index that `format` turns into text */
  solve(params: P): number;
  /** option text of the solved value; formatNum when omitted */
  format?(value: number, params: P): string;
  render(params: P): DrillText;
  /** one more plausible wrong option when the distractors collapse into duplicates */
  fallback(params: P, rand: Rand): string;
}

/** The option text that must sit at options[answer - 1]. */
export function answerText<P>(family: DrillFamily<P>, params: P): string {
  const value = family.solve(params);
  return family.format ? family.format(value, params) : formatNum(value);
}

export function toGenerator<P>(family: DrillFamily<P>): DrillGenerator {
  return {
    kind: family.kind,
    title: family.title,
    topic: family.topic,
    generate(rand: Rand, id: string): DrillItem {
      const params = family.makeParams(rand);
      const { prompt, solution, distractors } = family.render(params);
      const { options, answer } = uniqueOptions(
        answerText(family, params),
        distractors,
        rand,
        () => family.fallback(params, rand),
      );
      return { id, kind: family.kind, topic: family.topic, title: family.title, prompt, options, answer, solution };
    },
  };
}
