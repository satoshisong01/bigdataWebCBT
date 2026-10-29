/**
 * CONTRACT — procedurally generated calculation drills (no calculator, exam-style numbers).
 */
import type { Rand } from '@/lib/rng';

export interface DrillItem {
  /** `${kind}-${seed}-${index}` */
  id: string;
  kind: string;
  /** 출제기준 세세항목 id */
  topic: string;
  title: string;
  /** may contain $...$ KaTeX */
  prompt: string;
  /** 4 distinct options; distractors model common mistakes */
  options: string[];
  /** 1-based */
  answer: number;
  /** step-by-step Korean solution, may contain $...$ KaTeX */
  solution: string;
}

export interface DrillGenerator {
  kind: string;
  /** Korean display name, e.g. '정밀도·재현율·F1' */
  title: string;
  topic: string;
  generate(rand: Rand, id: string): DrillItem;
}
