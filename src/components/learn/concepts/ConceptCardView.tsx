'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ConceptCard } from '@/types';
import type { CStat } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import { topicName } from '@/data/criteria';
import { CardBadges, ConceptBody } from '../ConceptParts';
import GradeButtons from '../GradeButtons';
import { formatDayShort, formatDue } from '../format';
import { conceptsHref } from '../links';
import { BTN_GHOST, CARD, LINK, MUTED } from '../ui';

const CARD_GRADES: readonly Grade[] = ['good', 'hard', 'again'];

const RECORDED: Readonly<Record<Grade, string>> = {
  again: '모름으로',
  hard: '애매로',
  good: '앎으로',
  easy: '쉬움으로',
};

interface ConceptCardViewProps {
  card: ConceptCard;
  stat: CStat | undefined;
  today: string;
  onGrade: (cardId: string, grade: Grade) => void;
  /** show the 세세항목 as a link (search results) */
  showTopic?: boolean;
}

/** A concept card with 앎/애매/모름 self-grading; after grading the buttons fold away to avoid double taps. */
export default function ConceptCardView({ card, stat, today, onGrade, showTopic = false }: ConceptCardViewProps) {
  const [graded, setGraded] = useState<Grade | null>(null);
  const nextReview = stat ? `${formatDue(today, stat.srs.due)}(${formatDayShort(stat.srs.due)})` : null;

  const grade = (g: Grade) => {
    onGrade(card.id, g);
    setGraded(g);
  };

  return (
    <article className={`${CARD} space-y-3`}>
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">{card.term}</h3>
          <CardBadges card={card} studied={stat !== undefined} />
        </div>
        {showTopic && (
          <Link href={conceptsHref(card.topic)} className={`text-xs ${LINK}`}>
            {topicName(card.topic)}
          </Link>
        )}
      </header>
      <ConceptBody card={card} />
      <footer className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
        {graded ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
              {RECORDED[graded]} 기록했어요{nextReview && ` · 다음 복습 ${nextReview}`}
            </p>
            <button type="button" onClick={() => setGraded(null)} className={BTN_GHOST}>
              다시 평가
            </button>
          </div>
        ) : (
          <>
            <p className={`text-xs ${MUTED}`}>
              {stat ? `학습 ${stat.n}회 · 다음 복습 ${nextReview}` : '이 개념, 얼마나 알고 있나요?'}
            </p>
            <GradeButtons grades={CARD_GRADES} onGrade={grade} />
          </>
        )}
      </footer>
    </article>
  );
}
