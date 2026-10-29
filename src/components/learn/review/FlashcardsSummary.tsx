'use client';

import Link from 'next/link';
import type { ConceptCard } from '@/types';
import type { Grade } from '@/lib/srs';
import { topicName } from '@/data/criteria';
import { GRADE_LABELS } from '../GradeButtons';
import { conceptsHref } from '../links';
import { BTN_PRIMARY, CARD, LINK, MUTED } from '../ui';
import { FLASH_GRADES, gradeTally } from './flashcardRun';

const TALLY_TEXT: Readonly<Record<Grade, string>> = {
  again: 'text-red-600 dark:text-red-400',
  hard: 'text-amber-600 dark:text-amber-400',
  good: 'text-green-600 dark:text-green-400',
  easy: 'text-blue-600 dark:text-blue-400',
};

interface FlashcardsSummaryProps {
  cards: readonly ConceptCard[];
  /** grades[i] belongs to cards[i] */
  grades: readonly Grade[];
  onDone: () => void;
}

export default function FlashcardsSummary({ cards, grades, onDone }: FlashcardsSummaryProps) {
  const tally = gradeTally(grades);
  const unknown = cards.filter((_, i) => grades[i] === 'again');
  const finished = grades.length >= cards.length;

  return (
    <div className="space-y-4">
      <section className={`${CARD} text-center space-y-2`}>
        <p className="text-lg font-black text-gray-900 dark:text-slate-100">
          {finished ? '카드 복습 완료!' : `${grades.length}장 복습했어요`}
        </p>
        <p className={`text-sm ${MUTED}`}>
          {grades.length === 0 ? '아직 평가한 카드가 없어요.' : '평가에 따라 카드마다 다음 복습일이 정해졌어요.'}
        </p>
        <ul className="grid grid-cols-4 gap-2 pt-2">
          {FLASH_GRADES.map(g => (
            <li key={g} className="rounded-lg bg-gray-50 dark:bg-slate-800/60 py-2">
              <span className={`block text-xl font-black ${TALLY_TEXT[g]}`}>{tally[g]}</span>
              <span className={`block text-xs ${MUTED}`}>{GRADE_LABELS[g]}</span>
            </li>
          ))}
        </ul>
      </section>
      {unknown.length > 0 && (
        <section className={`${CARD} space-y-2`}>
          <h2 className="font-bold text-gray-900 dark:text-slate-100">모름으로 평가한 카드 {unknown.length}장</h2>
          <p className={`text-xs ${MUTED}`}>내일 다시 나와요. 범위를 눌러 관련 개념을 한 번 더 읽어 두세요.</p>
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {unknown.map(card => (
              <li key={card.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-800 dark:text-slate-100">{card.term}</span>
                <Link href={conceptsHref(card.topic)} className={`text-xs ${LINK}`}>
                  {topicName(card.topic)} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button type="button" onClick={onDone} className={`${BTN_PRIMARY} w-full`}>
        완료
      </button>
    </div>
  );
}
