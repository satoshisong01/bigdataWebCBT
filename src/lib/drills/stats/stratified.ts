import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { nearby, retry, sum, tidy } from './shared';

export interface StratifiedParams {
  /** allocation: n_h for the target stratum; total-sample: n from the target stratum's n_h */
  ask: 'allocation' | 'total-sample';
  context: number;
  /** stratum sizes N_h */
  sizes: number[];
  /** total sample size n (proportional allocation gives integer n_h) */
  sample: number;
  target: number;
}

interface Context {
  population: string;
  unit: string;
  /** unit + object particle */
  unitObject: string;
  labels: readonly string[];
}

const CONTEXTS: readonly Context[] = [
  { population: '학생', unit: '명', unitObject: '명을', labels: ['1학년', '2학년', '3학년', '4학년'] },
  { population: '직원', unit: '명', unitObject: '명을', labels: ['영업부', '개발부', '생산부', '관리부'] },
  { population: '가구', unit: '가구', unitObject: '가구를', labels: ['A 지역', 'B 지역', 'C 지역', 'D 지역'] },
];

/** n_h = n · N_h / N */
export function allocate(sizes: readonly number[], sample: number): number[] {
  const total = sum(sizes);
  return sizes.map(s => (sample * s) / total);
}

function makeParams(rand: Rand): StratifiedParams {
  const k = randInt(rand, 3, 4);
  const ratio = pick([5, 10, 20, 25, 50], rand);
  const counts = retry(
    50,
    () => {
      const c = Array.from({ length: k }, () => randInt(rand, 4, 30));
      return new Set(c).size === k ? c : undefined;
    },
    [8, 12, 20, 16].slice(0, k),
  );
  return {
    ask: rand() < 0.7 ? 'allocation' : 'total-sample',
    context: randInt(rand, 0, CONTEXTS.length - 1),
    sizes: counts.map(c => c * ratio),
    sample: sum(counts),
    target: randInt(rand, 0, k - 1),
  };
}

function solve(p: StratifiedParams): number {
  return p.ask === 'allocation' ? allocate(p.sizes, p.sample)[p.target] : p.sample;
}

function render(p: StratifiedParams): DrillText {
  const ctx = CONTEXTS[p.context];
  const total = sum(p.sizes);
  const k = p.sizes.length;
  const alloc = allocate(p.sizes, p.sample);
  const name = ctx.labels[p.target];
  const nh = alloc[p.target];
  const Nh = p.sizes[p.target];
  const neighbour = alloc[(p.target + 1) % k];
  const makeup = `${ctx.population} 구성: ${p.sizes.map((s, i) => `${ctx.labels[i]} $${s}$${ctx.unit}`).join(', ')} (총 $${total}$${ctx.unit})`;
  if (p.ask === 'allocation') {
    return {
      prompt: `${makeup}\n크기 $${p.sample}$의 표본을 층화추출(비례배분)할 때 ${name}에서 뽑을 표본 수는?`,
      solution: [
        '비례배분: $n_h = n \\times \\dfrac{N_h}{N}$ (층 크기에 비례)',
        `$= ${p.sample} \\times \\dfrac{${Nh}}{${total}} = ${formatNum(nh)}$`,
      ].join('\n'),
      distractors: [formatNum(Math.round(p.sample / k)), tidy((100 * Nh) / total), formatNum(neighbour)],
    };
  }
  return {
    prompt: `${makeup}\n비례배분 층화추출로 ${name}에서 $${formatNum(nh)}$${ctx.unitObject} 뽑았다면 전체 표본 크기는?`,
    solution: [
      '비례배분이면 모든 층의 추출 비율이 같다: $\\dfrac{n_h}{N_h} = \\dfrac{n}{N}$',
      `$n = n_h \\times \\dfrac{N}{N_h} = ${formatNum(nh)} \\times \\dfrac{${total}}{${Nh}} = ${p.sample}$`,
    ].join('\n'),
    distractors: [formatNum(nh * k), formatNum(p.sample - nh), formatNum(neighbour)],
  };
}

export const STRATIFIED: DrillFamily<StratifiedParams> = {
  kind: 'stratified',
  title: '층화추출 비례배분',
  topic: '2.3.1.2',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), 1, rand, 1),
};
