'use client';

import type { ConceptCard, Importance } from '@/types';
import MathText from '@/components/MathText';

const CHIP = 'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold';

const IMPORTANCE: Readonly<Record<Importance, { label: string; className: string }>> = {
  3: {
    label: '핵심',
    className: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300',
  },
  2: {
    label: '보통',
    className: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-300',
  },
  1: {
    label: '지엽',
    className:
      'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900 text-violet-700 dark:text-violet-300',
  },
};

interface ImportanceBadgeProps {
  importance: Importance;
}

export function ImportanceBadge({ importance }: ImportanceBadgeProps) {
  const { label, className } = IMPORTANCE[importance];
  return <span className={`${CHIP} ${className}`}>{label}</span>;
}

export function TrendBadge() {
  return (
    <span
      title="2026년(12·13회) 시험에 나온 것으로 보고된 개념"
      className={`${CHIP} bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300`}
    >
      2026 출제
    </span>
  );
}

export function StudiedBadge() {
  return (
    <span
      className={`${CHIP} bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300`}
    >
      학습함
    </span>
  );
}

interface CardBadgesProps {
  card: ConceptCard;
  studied?: boolean;
}

export function CardBadges({ card, studied = false }: CardBadgesProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <ImportanceBadge importance={card.importance} />
      {card.trend && <TrendBadge />}
      {studied && <StudiedBadge />}
    </span>
  );
}

interface ConceptBodyProps {
  card: ConceptCard;
}

/** Summary, formula (KaTeX), key points and 헷갈리는 포인트 of a concept card. */
export function ConceptBody({ card }: ConceptBodyProps) {
  const points = card.points ?? [];
  const confusions = card.confusions ?? [];
  return (
    <div className="space-y-3 text-sm sm:text-base">
      <MathText text={card.summary} className="block leading-relaxed text-gray-800 dark:text-slate-100" />
      {card.formula && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-3 py-2 text-gray-900 dark:text-slate-100">
          <MathText text={`$${card.formula}$`} />
        </div>
      )}
      {points.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-slate-300">
          {points.map((p, i) => (
            <li key={i}>
              <MathText text={p} />
            </li>
          ))}
        </ul>
      )}
      {confusions.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">헷갈리는 포인트</p>
          <ul className="list-disc pl-5 space-y-1 text-amber-900 dark:text-amber-200">
            {confusions.map((c, i) => (
              <li key={i}>
                <MathText text={c} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
