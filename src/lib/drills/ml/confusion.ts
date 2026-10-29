/**
 * 혼동행렬 → 정확도·정밀도·재현율·특이도·FPR·F1 (출제기준 4.1.1.1 평가 지표).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  block, hasDecimals, im, nearby, pipeline, sampleUntil, tex, texTable, tidyCount, tidyFirst, type DrillBody,
} from './_shared';

export type ConfusionMetric = 'accuracy' | 'precision' | 'recall' | 'specificity' | 'fpr' | 'f1';

export interface ConfusionParams {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  metric: ConfusionMetric;
  /** true: 행 = 실제·열 = 예측, false: 행 = 예측·열 = 실제 */
  actualRows: boolean;
}

export type ConfusionSolution = Record<ConfusionMetric, number> & { value: number };

const METRICS: readonly ConfusionMetric[] = ['accuracy', 'precision', 'recall', 'specificity', 'fpr', 'f1'];

const NAME: Record<ConfusionMetric, string> = {
  accuracy: '정확도(Accuracy)',
  precision: '정밀도(Precision)',
  recall: '재현율(Recall)',
  specificity: '특이도(Specificity)',
  fpr: '거짓 양성률(FPR)',
  f1: 'F1 점수(F1-score)',
};

const FALLBACK_CELLS = { tp: 30, fp: 10, fn: 20, tn: 40 };
const FALLBACK_F1_CELLS = { tp: 30, fp: 10, fn: 30, tn: 30 };

export function solve(p: ConfusionParams): ConfusionSolution {
  const { tp, fp, fn, tn } = p;
  const metrics: Record<ConfusionMetric, number> = {
    accuracy: (tp + tn) / (tp + fp + fn + tn),
    precision: tp / (tp + fp),
    recall: tp / (tp + fn),
    specificity: tn / (tn + fp),
    fpr: fp / (fp + tn),
    f1: (2 * tp) / (2 * tp + fp + fn),
  };
  return { ...metrics, value: metrics[p.metric] };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: ConfusionParams, s: ConfusionSolution): number[] {
  const { tp, fp, fn, tn } = p;
  const total = tp + fp + fn + tn;
  const byMetric: Record<ConfusionMetric, number[]> = {
    accuracy: [1 - s.accuracy, s.precision, s.recall, tp / total],
    precision: [s.recall, 1 - s.precision, s.accuracy, tn / (tn + fn)],
    recall: [s.precision, s.specificity, 1 - s.recall, s.accuracy],
    specificity: [s.recall, s.fpr, tn / (tn + fn), s.precision],
    fpr: [s.specificity, 1 - s.recall, fp / (fp + tp), fp / total],
    f1: [(s.precision + s.recall) / 2, s.precision * s.recall, s.precision, s.recall],
  };
  return byMetric[p.metric];
}

/** Decimals allowed for the answer and the distractors (F1 = 2PR/(P+R) needs one more). */
function digitsFor(metric: ConfusionMetric): number {
  return metric === 'f1' ? 3 : 2;
}

function isGood(p: ConfusionParams): boolean {
  const s = solve(p);
  const clean = p.metric === 'f1'
    ? hasDecimals(s.f1, 3) && hasDecimals(s.precision, 2) && hasDecimals(s.recall, 2)
    : hasDecimals(s.value, 2);
  return clean && s.value > 0 && s.value < 1 && tidyCount(formatNum(s.value), mistakes(p, s), digitsFor(p.metric)) >= 3;
}

export function makeParams(rand: Rand): ConfusionParams {
  const metric = pick(METRICS, rand);
  const actualRows = rand() < 0.7;
  const fallback = { ...(metric === 'f1' ? FALLBACK_F1_CELLS : FALLBACK_CELLS), metric, actualRows };
  const draw = (r: Rand): ConfusionParams => ({
    tp: 5 * randInt(r, 2, 16),
    fp: 5 * randInt(r, 1, 8),
    fn: 5 * randInt(r, 1, 8),
    tn: 5 * randInt(r, 2, 16),
    metric,
    actualRows,
  });
  return sampleUntil(rand, draw, isGood, fallback, 4000);
}

function table(p: ConfusionParams): string {
  const [rowAxis, colAxis] = p.actualRows ? ['실제', '예측'] : ['예측', '실제'];
  const label = (axis: string, positive: boolean): string => tex`\text{${axis} ${positive ? 'Positive' : 'Negative'}}`;
  const cell = (rowPositive: boolean, colPositive: boolean): number => {
    const actual = p.actualRows ? rowPositive : colPositive;
    const predicted = p.actualRows ? colPositive : rowPositive;
    if (actual) return predicted ? p.tp : p.fn;
    return predicted ? p.fp : p.tn;
  };
  return texTable('c|cc', [
    ['', label(colAxis, true), label(colAxis, false)],
    [label(rowAxis, true), cell(true, true), cell(true, false)],
    [label(rowAxis, false), cell(false, true), cell(false, false)],
  ]);
}

function formulaLines(p: ConfusionParams, s: ConfusionSolution): string[] {
  const { tp, fp, fn, tn } = p;
  const v = formatNum(s.value);
  switch (p.metric) {
    case 'accuracy':
      return [
        '정확도 = 전체 중 맞게 분류한(TP + TN) 비율',
        im(tex`\text{Accuracy} = \frac{TP+TN}{TP+FP+FN+TN} = \frac{${tp}+${tn}}{${tp + fp + fn + tn}} = ${v}`),
        `※ 오분류율(Error rate) = 1 − 정확도 = ${formatNum(1 - s.accuracy)}`,
      ];
    case 'precision':
      return [
        '정밀도 = Positive로 예측한 것 중 실제 Positive의 비율',
        im(tex`\text{Precision} = \frac{TP}{TP+FP} = \frac{${tp}}{${tp}+${fp}} = ${v}`),
        `※ 재현율 ${im(tex`\frac{TP}{TP+FN}`)}과 분모가 다릅니다(정밀도는 예측 기준, 재현율은 실제 기준).`,
      ];
    case 'recall':
      return [
        '재현율(민감도, TPR) = 실제 Positive 중 Positive로 맞힌 비율',
        im(tex`\text{Recall} = \frac{TP}{TP+FN} = \frac{${tp}}{${tp}+${fn}} = ${v}`),
        `※ 정밀도 ${im(tex`\frac{TP}{TP+FP}`)}와 헷갈리지 않기: 재현율의 분모는 실제 Positive 수입니다.`,
      ];
    case 'specificity':
      return [
        '특이도 = 실제 Negative 중 Negative로 맞힌 비율',
        im(tex`\text{Specificity} = \frac{TN}{TN+FP} = \frac{${tn}}{${tn}+${fp}} = ${v}`),
        '※ 1 − 특이도 = FPR(거짓 양성률). 재현율(민감도)과 짝을 이루는 지표입니다.',
      ];
    case 'fpr':
      return [
        'FPR = 실제 Negative 중 Positive로 잘못 예측한 비율 (= 1 − 특이도)',
        im(tex`\text{FPR} = \frac{FP}{FP+TN} = \frac{${fp}}{${fp}+${tn}} = ${v}`),
        '※ ROC 곡선의 x축이 FPR, y축이 TPR(재현율)입니다.',
      ];
    case 'f1': {
      const fP = formatNum(s.precision);
      const fR = formatNum(s.recall);
      const twoPR = formatNum(2 * s.precision * s.recall, 4);
      const pPlusR = formatNum(s.precision + s.recall, 4);
      return [
        '정밀도(P)와 재현율(R)을 먼저 구합니다.',
        `${im(tex`P = \frac{${tp}}{${tp}+${fp}} = ${fP}`)}, ${im(tex`R = \frac{${tp}}{${tp}+${fn}} = ${fR}`)}`,
        `F1은 P와 R의 조화평균: ${im(tex`F_1 = \frac{2PR}{P+R} = \frac{2 \times ${fP} \times ${fR}}{${fP}+${fR}} = \frac{${twoPR}}{${pPlusR}} = ${v}`)}`,
        `(같은 값: ${im(tex`\frac{2TP}{2TP+FP+FN} = \frac{${2 * tp}}{${2 * tp + fp + fn}} = ${v}`)})`,
        `※ 산술평균 ${im(tex`\frac{P+R}{2}`)}이 아니라 조화평균입니다.`,
      ];
    }
  }
}

function render(p: ConfusionParams, s: ConfusionSolution, rand: Rand): DrillBody {
  const correct = formatNum(s.value);
  const candidates = [
    ...tidyFirst(mistakes(p, s), digitsFor(p.metric)),
    ...nearby(s.value, 0.05, x => formatNum(x), x => x > 0 && x < 1),
  ];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  const read = `표 읽기: ${im(`TP = ${p.tp}`)}, ${im(`FP = ${p.fp}`)}, ${im(`FN = ${p.fn}`)}, ${im(`TN = ${p.tn}`)} `
    + '(TP는 실제·예측 모두 Positive, FP는 실제 Negative를 Positive로 예측한 칸)';
  return {
    title: `혼동행렬 · ${NAME[p.metric]}`,
    prompt: `다음 혼동행렬에서 ${NAME[p.metric]} 값은?\n${block(table(p))}`,
    options,
    answer,
    solution: [read, ...formulaLines(p, s)].join('\n'),
  };
}

export const confusionGenerator = pipeline(
  { kind: 'confusion', title: '혼동행렬 지표', topic: '4.1.1.1' },
  makeParams,
  solve,
  render,
);
