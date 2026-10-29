'use client';

import type { TopicStat } from '@/lib/mastery';
import type { CardCount } from './conceptIndex';
import { accuracyTone } from '../format';
import { TONE_CHIP } from '../ui';

const CHIP = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap';

interface NodeStatsProps {
  /** null while cards load; undefined when the node has no cards */
  cards: CardCount | null | undefined;
  stat: TopicStat | undefined;
}

function cardChipClass({ total, studied }: CardCount): string {
  if (studied >= total) return 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300';
  return studied > 0
    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
}

/** Compact chips for a criteria node: studied/total cards and first-attempt question accuracy. */
export default function NodeStats({ cards, stat }: NodeStatsProps) {
  const questions = stat?.questions ?? 0;
  const attempted = stat?.attempted ?? 0;
  const first = stat && attempted > 0 ? stat.firstAccuracy : -1;
  return (
    <span className="flex flex-wrap items-center justify-end gap-1 flex-shrink-0">
      {cards === null && (
        <span className={`${CHIP} bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500`}>카드 …</span>
      )}
      {cards && cards.total > 0 && (
        <span title="학습한 카드 / 전체 카드" className={`${CHIP} ${cardChipClass(cards)}`}>
          카드 {cards.studied}/{cards.total}
        </span>
      )}
      {questions > 0 && (
        <span
          title={`문항 ${questions}개 중 ${attempted}개 풀이 · 첫 풀이 정답률`}
          className={`${CHIP} ${TONE_CHIP[accuracyTone(first)]}`}
        >
          {first >= 0 ? `첫풀이 ${first}%` : '미응시'}
        </span>
      )}
    </span>
  );
}
