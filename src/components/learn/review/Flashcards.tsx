'use client';

import { useState } from 'react';
import type { ConceptCard } from '@/types';
import type { CStat } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import { topicName } from '@/data/criteria';
import { CardBadges, ConceptBody } from '../ConceptParts';
import GradeButtons from '../GradeButtons';
import { ProgressBar } from '../SessionParts';
import { isActivationTarget, isTextTarget, useHotkeys } from '../useHotkeys';
import { statOf } from '../concepts/conceptIndex';
import { BTN_GHOST, CARD, MUTED } from '../ui';
import { FLASH_GRADES, START_FLASH, flipCard, gradeCurrent, gradeHints, type FlashRun } from './flashcardRun';
import FlashcardsSummary from './FlashcardsSummary';

interface FlashcardsProps {
  /** snapshot of the due cards taken when the session started */
  cards: readonly ConceptCard[];
  cstats: Readonly<Record<string, CStat>>;
  today: string;
  onGrade: (cardId: string, grade: Grade) => void;
  onDone: () => void;
}

/** Front (term) → tap / Space → back (summary·points) → 모름/애매/앎/쉬움 (keys 1–4) → next card. */
export default function Flashcards({ cards, cstats, today, onGrade, onDone }: FlashcardsProps) {
  const [run, setRun] = useState<FlashRun>(START_FLASH);
  const [stopped, setStopped] = useState(false);
  const current = stopped ? undefined : cards[run.index];

  const flip = () => setRun(flipCard);
  const grade = (g: Grade) => {
    if (!current || !run.flipped) return;
    onGrade(current.id, g);
    setRun(r => gradeCurrent(r, g, cards.length));
  };

  useHotkeys(e => {
    if (!run.flipped && (e.key === ' ' || e.key === 'Enter') && !isActivationTarget(e.target)) {
      e.preventDefault();
      flip();
    } else if (run.flipped && /^[1-4]$/.test(e.key) && !isTextTarget(e.target)) {
      e.preventDefault();
      grade(FLASH_GRADES[Number(e.key) - 1]);
    }
  }, current !== undefined);

  if (!current) return <FlashcardsSummary cards={cards} grades={run.grades} onDone={onDone} />;

  return (
    <div className="space-y-4">
      <ProgressBar
        value={run.index}
        total={cards.length}
        label={`남은 카드 ${cards.length - run.index}장`}
        aside={`${run.index}/${cards.length} 완료`}
      />
      {run.flipped ? <BackFace card={current} /> : <FrontFace card={current} onFlip={flip} />}
      {run.flipped && (
        <GradeButtons
          grades={FLASH_GRADES}
          onGrade={grade}
          hints={gradeHints(statOf(cstats, current.id)?.srs, today)}
          showKeys
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setStopped(true)} className={BTN_GHOST}>
          그만하기
        </button>
        <p className="hidden sm:block text-xs text-gray-400 dark:text-slate-500">
          {run.flipped ? '1 모름 · 2 애매 · 3 앎 · 4 쉬움' : 'Space 뒤집기'}
        </p>
      </div>
    </div>
  );
}

interface FaceProps {
  card: ConceptCard;
}

interface FrontFaceProps extends FaceProps {
  onFlip: () => void;
}

function FrontFace({ card, onFlip }: FrontFaceProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className={`${CARD} w-full min-h-56 flex flex-col items-center justify-center gap-3 text-center transition hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99]`}
    >
      <span className={`text-xs ${MUTED}`}>{topicName(card.topic)}</span>
      <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 break-keep max-w-full">{card.term}</span>
      <CardBadges card={card} />
      <span className="text-xs text-gray-400 dark:text-slate-500">뜻을 떠올린 뒤 탭해서 확인하세요</span>
    </button>
  );
}

function BackFace({ card }: FaceProps) {
  return (
    <article className={`${CARD} space-y-3`}>
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-slate-100">{card.term}</h2>
          <CardBadges card={card} />
        </div>
        <p className={`text-xs ${MUTED}`}>{topicName(card.topic)}</p>
      </header>
      <ConceptBody card={card} />
    </article>
  );
}
