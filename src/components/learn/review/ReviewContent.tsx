'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { ConceptCard } from '@/types';
import { getCStats, getDueCardIds, getDueQuestionIds, gradeCard } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import { todayKey } from '@/lib/date';
import { useSyncRefresh } from '@/hooks/useSyncRefresh';
import { readyCards, useConcepts } from '../useConcepts';
import { cardsByIds, nextStudyTopic } from '../concepts/conceptIndex';
import { formatDayShort } from '../format';
import { MAIN, PAGE } from '../ui';
import ReviewSummary from './ReviewSummary';
import Flashcards from './Flashcards';

/** /review (client-only): due counts, question review link and the due-card flashcard session. */
export default function ReviewContent() {
  const [today] = useState(todayKey);
  const [dueQuestionCount, setDueQuestionCount] = useState(() => getDueQuestionIds(today).length);
  const [dueCardIds, setDueCardIds] = useState(() => getDueCardIds(today));
  const [cstats, setCStats] = useState(getCStats);
  const [session, setSession] = useState<readonly ConceptCard[] | null>(null);

  // After a sync brought in another device's records, the due counts re-read storage (state adjusted during
  // render) — never while a flashcard session runs; it catches up once the session ends.
  const syncVersion = useSyncRefresh();
  const [seenSync, setSeenSync] = useState(syncVersion);
  if (session === null && seenSync !== syncVersion) {
    setSeenSync(syncVersion);
    setDueQuestionCount(getDueQuestionIds(today).length);
    setDueCardIds(getDueCardIds(today));
    setCStats(getCStats());
  }

  const concepts = useConcepts();
  const cards = readyCards(concepts.state);
  const dueCards = useMemo(() => (cards ? cardsByIds(cards, dueCardIds) : null), [cards, dueCardIds]);
  const nextTopic = useMemo(() => (cards ? nextStudyTopic(cards, cstats) : undefined), [cards, cstats]);

  const handleGrade = (cardId: string, grade: Grade) => {
    gradeCard(cardId, grade);
    setCStats(getCStats());
  };

  const startCards = () => {
    if (dueCards && dueCards.length > 0) setSession(dueCards);
  };

  const endSession = () => {
    setDueCardIds(getDueCardIds(today));
    setSession(null);
  };

  return (
    <div className={PAGE}>
      <PageHeader title="오늘의 복습" subtitle={`${formatDayShort(today)} · 간격 반복 1·3·7·14·30·60일`} />
      <main className={MAIN}>
        {session ? (
          <Flashcards cards={session} cstats={cstats} today={today} onGrade={handleGrade} onDone={endSession} />
        ) : (
          <ReviewSummary
            dueQuestions={dueQuestionCount}
            dueCards={dueCards}
            dueCardIdCount={dueCardIds.length}
            concepts={concepts}
            nextTopic={nextTopic}
            onStartCards={startCards}
          />
        )}
      </main>
    </div>
  );
}
