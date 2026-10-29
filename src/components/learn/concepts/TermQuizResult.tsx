'use client';

import Link from 'next/link';
import type { ConceptCard } from '@/types';
import type { TermQuizItem } from '@/lib/termQuiz';
import { topicName } from '@/data/criteria';
import { ScoreBanner } from '../SessionParts';
import { countCorrect, missedItems } from '../choiceRun';
import { conceptsHref } from '../links';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LINK, MUTED } from '../ui';

interface TermQuizResultProps {
  items: readonly TermQuizItem[];
  picks: readonly number[];
  cardById: ReadonlyMap<string, ConceptCard>;
  topic: string | null;
  onRetryMissed: (cardIds: readonly string[]) => void;
  onRestart: () => void;
}

export default function TermQuizResult({ items, picks, cardById, topic, onRetryMissed, onRestart }: TermQuizResultProps) {
  const answered = Math.min(picks.length, items.length);
  const missed = missedItems(items, picks);

  return (
    <div className="space-y-4">
      <ScoreBanner correct={countCorrect(items, picks)} total={answered} label="용어 퀴즈 결과" />
      <section className={`${CARD} space-y-2`}>
        <h2 className="font-bold text-gray-900 dark:text-slate-100">틀린 용어 {missed.length}개</h2>
        {missed.length === 0 ? (
          <p className={`text-sm ${MUTED}`}>모두 맞혔어요. 다음 범위로 넘어가 보세요.</p>
        ) : (
          <>
            <p className={`text-xs ${MUTED}`}>틀린 카드는 내일 복습 덱에 다시 나와요. 범위를 눌러 개념을 다시 읽어 보세요.</p>
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {missed.map((item, i) => (
                <li key={`${item.cardId}-${i}`} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-slate-100">
                    {cardById.get(item.cardId)?.term ?? item.options[item.answer - 1]}
                  </span>
                  <Link href={conceptsHref(item.topic)} className={`text-xs ${LINK}`}>
                    {topicName(item.topic)} →
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {missed.length > 0 && (
          <button type="button" onClick={() => onRetryMissed(missed.map(m => m.cardId))} className={BTN_PRIMARY}>
            틀린 용어 다시 풀기
          </button>
        )}
        <button type="button" onClick={onRestart} className={missed.length > 0 ? BTN_SECONDARY : BTN_PRIMARY}>
          새 퀴즈
        </button>
        <Link href={conceptsHref(topic)} className={BTN_SECONDARY}>
          {topic ? '이 범위 개념 보기' : '개념 학습으로'}
        </Link>
      </div>
    </div>
  );
}
