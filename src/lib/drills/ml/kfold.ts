/**
 * 교차 검증 — k-fold 학습/검증 데이터 수, 홀드아웃 + k-fold, LOOCV, 반복 k-fold (출제기준 4.1.1.3 교차 검증).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, type Rand } from '@/lib/rng';
import { uniqueOptions } from '../util';
import { distinctOthers, im, pipeline, roundTo, sampleUntil, tex, withCommas, type DrillBody } from './_shared';

export type KFoldAsk = 'train' | 'valid' | 'holdout' | 'loocv' | 'fits';

export interface KFoldParams {
  ask: KFoldAsk;
  /** total samples */
  n: number;
  /** folds (LOOCV: k = n) */
  k: number;
  /** share split off as a test set before CV (0 when unused) */
  testRatio: number;
  /** k-fold repetitions (1 when unused) */
  repeats: number;
}

export interface KFoldSolution {
  /** samples that enter cross-validation (n minus the test split) */
  pool: number;
  validSize: number;
  trainSize: number;
  /** total model fits */
  fits: number;
}

const ASKS: readonly KFoldAsk[] = ['train', 'valid', 'holdout', 'loocv', 'fits'];
const SIZES = [100, 120, 150, 200, 240, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000, 10000];
const FALLBACKS: Record<KFoldAsk, KFoldParams> = {
  train: { ask: 'train', n: 1000, k: 5, testRatio: 0, repeats: 1 },
  valid: { ask: 'valid', n: 1000, k: 5, testRatio: 0, repeats: 1 },
  holdout: { ask: 'holdout', n: 1200, k: 4, testRatio: 0.2, repeats: 1 },
  loocv: { ask: 'loocv', n: 50, k: 50, testRatio: 0, repeats: 1 },
  fits: { ask: 'fits', n: 1000, k: 5, testRatio: 0, repeats: 3 },
};

export function solve(p: KFoldParams): KFoldSolution {
  const pool = roundTo(p.n * (1 - p.testRatio), 6);
  const validSize = pool / p.k;
  return { pool, validSize, trainSize: pool - validSize, fits: p.k * p.repeats };
}

const count = (x: number): string => `${withCommas(x)}개`;
const times = (x: number): string => `${withCommas(x)}회`;
const loocvText = (fits: number, train: number): string => `${fits}회 · 각 ${train}개`;

/** Correct text plus the classic mistakes, most plausible first. */
function texts(p: KFoldParams, s: KFoldSolution): { correct: string; mistakes: string[] } {
  const { n, k, repeats: r } = p;
  const whole = (xs: number[]): number[] => xs.filter(x => Number.isInteger(x) && x > 0);
  switch (p.ask) {
    case 'train':
      return { correct: count(s.trainSize), mistakes: whole([s.validSize, n - k, n / (k - 1), n * (k - 1)]).map(count) };
    case 'valid':
      return { correct: count(s.validSize), mistakes: whole([s.trainSize, n / (k - 1), n / 10, n / (2 * k)]).map(count) };
    case 'holdout':
      return {
        correct: count(s.trainSize),
        mistakes: whole([(n * (k - 1)) / k, s.pool, s.validSize, roundTo(n * (1 - p.testRatio) ** 2, 6)]).map(count),
      };
    case 'loocv':
      return { correct: loocvText(n, n - 1), mistakes: [loocvText(n - 1, n), loocvText(1, n - 1), loocvText(n, 1), loocvText(n, n)] };
    case 'fits':
      return { correct: times(s.fits), mistakes: whole([k + r, k, (k - 1) * r, r]).map(times) };
  }
}

function isGood(p: KFoldParams): boolean {
  const s = solve(p);
  const { correct, mistakes } = texts(p, s);
  const exact = Number.isInteger(s.pool) && Number.isInteger(s.validSize);
  return exact && distinctOthers(correct, mistakes) >= 3;
}

function draw(rand: Rand, ask: KFoldAsk): KFoldParams {
  if (ask === 'loocv') {
    const n = pick([20, 30, 40, 50, 80, 100, 150, 200], rand);
    return { ask, n, k: n, testRatio: 0, repeats: 1 };
  }
  const n = pick(SIZES, rand);
  if (ask === 'holdout') return { ask, n, k: pick([3, 4, 5], rand), testRatio: pick([0.1, 0.2, 0.25, 0.3], rand), repeats: 1 };
  if (ask === 'fits') return { ask, n, k: pick([3, 5, 10], rand), testRatio: 0, repeats: pick([2, 3, 5, 10], rand) };
  return { ask, n, k: pick([3, 4, 5, 10], rand), testRatio: 0, repeats: 1 };
}

export function makeParams(rand: Rand): KFoldParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 1000);
}

function prompt(p: KFoldParams): string {
  const data = `데이터 ${withCommas(p.n)}개`;
  switch (p.ask) {
    case 'train':
      return `${data}로 ${p.k}-fold 교차검증을 할 때, 각 반복에서 모델 학습에 쓰이는 데이터 수는?`;
    case 'valid':
      return `${data}로 ${p.k}-fold 교차검증을 할 때, 각 반복에서 검증(평가)에 쓰이는 데이터 수는?`;
    case 'holdout':
      return `${data} 중 ${Math.round(p.testRatio * 100)}%를 테스트 데이터로 먼저 떼어 놓고, 나머지로 ${p.k}-fold 교차검증을 한다. `
        + '각 fold에서 학습에 쓰이는 데이터 수는?';
    case 'loocv':
      return `${data}에 LOOCV(Leave-One-Out 교차검증)를 적용할 때, 모델 학습 횟수와 각 학습에 쓰이는 데이터 수는?`;
    case 'fits':
      return `${data}에 ${p.k}-fold 교차검증을 ${p.repeats}회 반복(Repeated K-fold)하면 모델은 총 몇 번 학습되는가?`;
  }
}

function explain(p: KFoldParams, s: KFoldSolution): string[] {
  const kfold = `k-fold는 데이터를 k등분해 1개 fold로 검증하고 나머지 k − 1개 fold로 학습하는 과정을 k번 반복합니다.`;
  const n = withCommas(p.n);
  switch (p.ask) {
    case 'train':
      return [
        kfold,
        im(tex`\text{학습} = N \times \frac{k-1}{k} = ${p.n} \times \frac{${p.k - 1}}{${p.k}} = ${s.trainSize}`),
        `※ 검증 데이터는 ${im(tex`N / k = ${s.validSize}`)}개이며, 모든 데이터가 정확히 한 번씩 검증에 쓰입니다.`,
      ];
    case 'valid':
      return [
        kfold,
        im(tex`\text{검증} = \frac{N}{k} = \frac{${p.n}}{${p.k}} = ${s.validSize}`),
        `※ 학습 데이터(${withCommas(s.trainSize)}개)와 헷갈리지 마세요.`,
      ];
    case 'holdout':
      return [
        `교차검증에 쓰는 데이터 ${im(tex`= ${p.n} \times (1 - ${p.testRatio}) = ${s.pool}`)}`,
        `각 fold 학습 데이터 ${im(tex`= ${s.pool} \times \frac{${p.k - 1}}{${p.k}} = ${s.trainSize}`)}`,
        '※ 테스트 데이터는 교차검증에 섞지 않고 최종 성능 평가에만 사용합니다.',
      ];
    case 'loocv':
      return [
        `LOOCV는 k = N인 k-fold입니다. 데이터를 1개씩 빼서 검증하므로 ${n}번 학습하고, 매번 ${withCommas(p.n - 1)}개로 학습합니다.`,
        '※ 편향은 작지만 데이터 수만큼 학습해야 해 계산 비용이 큽니다.',
      ];
    case 'fits':
      return [
        `한 번의 ${p.k}-fold에서 ${p.k}번 학습 → ${p.repeats}회 반복`,
        im(tex`${p.k} \times ${p.repeats} = ${s.fits}`),
        '※ 반복 k-fold는 fold 분할을 바꿔 가며 k-fold 전체를 여러 번 수행해 평가의 분산을 줄입니다.',
      ];
  }
}

const TITLE: Record<KFoldAsk, string> = {
  train: 'k-fold · 학습 데이터 수',
  valid: 'k-fold · 검증 데이터 수',
  holdout: '홀드아웃 + k-fold',
  loocv: 'LOOCV',
  fits: '반복 k-fold · 학습 횟수',
};

function render(p: KFoldParams, s: KFoldSolution, rand: Rand): DrillBody {
  const { correct, mistakes } = texts(p, s);
  const base = p.ask === 'valid' ? s.validSize : p.ask === 'fits' ? s.fits : s.trainSize;
  const pads = p.ask === 'loocv'
    ? [loocvText(p.n + 1, p.n), loocvText(p.n - 1, p.n - 1)]
    : [0.5, 2, 1.5, 0.25].map(f => Math.round(base * f)).filter(x => x > 0).map(p.ask === 'fits' ? times : count);
  const { options, answer } = uniqueOptions(correct, [...mistakes, ...pads], rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const kfoldGenerator = pipeline(
  { kind: 'kfold', title: 'K-fold 교차검증', topic: '4.1.1.3' },
  makeParams,
  solve,
  render,
);
