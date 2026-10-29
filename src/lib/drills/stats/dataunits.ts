import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { nearby } from './shared';

/** index i = 1024^i bytes */
export const UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const PREFIXES = '킬로·메가·기가·테라·페타·엑사·제타·요타';

export type DataUnitsParams =
  /** amount × UNITS[from] expressed in UNITS[from - 1] */
  | { ask: 'convert'; amount: number; from: number }
  /** 1 UNITS[unit] = 2^? bytes */
  | { ask: 'power'; unit: number }
  /** 1 UNITS[big] = 2^? × UNITS[small] */
  | { ask: 'ratio'; big: number; small: number }
  /** answer = index of the largest unit (rendered as its name) */
  | { ask: 'largest'; units: number[] }
  /** answer = index of the unit 1024 times larger (rendered as its name) */
  | { ask: 'next'; unit: number };

const ASKS: readonly DataUnitsParams['ask'][] = ['convert', 'power', 'ratio', 'largest', 'next'];
const isNameAnswer = (p: DataUnitsParams): boolean => p.ask === 'largest' || p.ask === 'next';
const unit = (i: number): string => `\\mathrm{${UNITS[i]}}`;
const ORDER_LINE = `순서: $${UNITS.map((_, i) => unit(i)).join(' < ')}$ (한 단계마다 $2^{10} = 1024$배, ${PREFIXES})`;

function makeParams(rand: Rand): DataUnitsParams {
  const ask = pick(ASKS, rand);
  switch (ask) {
    case 'convert':
      return { ask, amount: randInt(rand, 2, 8), from: randInt(rand, 2, 8) };
    case 'power':
      return { ask, unit: randInt(rand, 1, 8) };
    case 'ratio': {
      const small = randInt(rand, 1, 6);
      return { ask, big: randInt(rand, small + 2, 8), small };
    }
    case 'largest':
      return { ask, units: shuffleWith([3, 4, 5, 6, 7, 8], rand).slice(0, 4) };
    case 'next':
      return { ask, unit: randInt(rand, 2, 7) };
  }
}

function solve(p: DataUnitsParams): number {
  switch (p.ask) {
    case 'convert':
      return p.amount * 1024;
    case 'power':
      return 10 * p.unit;
    case 'ratio':
      return 10 * (p.big - p.small);
    case 'largest':
      return Math.max(...p.units);
    case 'next':
      return p.unit + 1;
  }
}

function render(p: DataUnitsParams): DrillText {
  const ans = solve(p);
  switch (p.ask) {
    case 'convert': {
      const { amount, from } = p;
      return {
        prompt: `$1\\,\\mathrm{KB} = 2^{10}\\,\\mathrm{B} = 1024\\,\\mathrm{B}$(2진 단위) 기준으로 $${amount}\\,${unit(from)}$는 몇 $${unit(from - 1)}$인가?`,
        solution: [
          `$${unit(from)}$는 $${unit(from - 1)}$의 바로 위 단위 → $1024$배`,
          `$${amount}\\,${unit(from)} = ${amount} \\times 1024\\,${unit(from - 1)} = ${ans}\\,${unit(from - 1)}$`,
        ].join('\n'),
        distractors: [formatNum(amount * 1000), formatNum(amount * 1024 * 1024), formatNum(amount * 10)],
      };
    }
    case 'power':
      return {
        prompt: `$1\\,${unit(p.unit)}$는 $2$의 몇 제곱 바이트인가?`,
        solution: [ORDER_LINE, `$${unit(p.unit)}$는 바이트에서 $${p.unit}$단계 위 → $(2^{10})^{${p.unit}} = 2^{${ans}}$ 바이트`].join('\n'),
        distractors: [formatNum(3 * p.unit), formatNum(10 * (p.unit - 1)), formatNum(10 * (p.unit + 1))],
      };
    case 'ratio': {
      const steps = p.big - p.small;
      return {
        prompt: `$1\\,${unit(p.big)}$는 $1\\,${unit(p.small)}$의 $2^k$배이다. $k$는?`,
        solution: [ORDER_LINE, `$${unit(p.big)}$와 $${unit(p.small)}$는 $${steps}$단계 차이 → $(2^{10})^{${steps}} = 2^{${ans}}$`].join('\n'),
        distractors: [formatNum(steps), formatNum(3 * steps), formatNum(10 * (steps + 1)), formatNum(10 * (steps - 1))],
      };
    }
    case 'largest':
      return {
        prompt: '다음 데이터 크기 단위 중 가장 큰 것은?',
        solution: [ORDER_LINE, `→ 가장 큰 단위는 $${unit(ans)}$`].join('\n'),
        distractors: p.units.filter(u => u !== ans).map(u => UNITS[u]),
      };
    case 'next':
      return {
        prompt: `$${unit(p.unit)}$보다 $1024$배 큰, 바로 다음 단위는?`,
        solution: [ORDER_LINE, `→ $${unit(p.unit)}$ 다음은 $${unit(ans)}$`].join('\n'),
        distractors: [p.unit + 2, p.unit - 1, p.unit - 2].filter(i => i >= 0 && i < UNITS.length).map(i => UNITS[i]),
      };
  }
}

export const DATA_UNITS: DrillFamily<DataUnitsParams> = {
  kind: 'data-units',
  title: '데이터 단위 환산',
  topic: '1.1.1.1',
  makeParams,
  solve,
  format: (value, p) => (isNameAnswer(p) ? UNITS[value] : formatNum(value)),
  render,
  fallback: (p, rand) => {
    if (!isNameAnswer(p)) return nearby(solve(p), 10, rand, 1);
    const i = randInt(rand, 1, UNITS.length - 1);
    // never offer the unit named in the "next unit" question itself
    return p.ask === 'next' && i === p.unit ? '' : UNITS[i];
  },
};
