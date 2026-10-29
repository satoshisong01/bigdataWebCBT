'use client';

import Link from 'next/link';
import type { ConceptCard } from '@/types';
import type { UseConcepts } from '../useConcepts';
import type { TopicNode } from '../concepts/conceptIndex';
import { CONCEPTS_LOAD_ERROR, EmptyBlock, ErrorBlock } from '../StatusBlocks';
import { REVIEW_EXAM_HREF, conceptsHref } from '../links';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, MUTED } from '../ui';

interface ReviewSummaryProps {
  dueQuestions: number;
  /** due cards resolved against the loaded content; null until the cards load */
  dueCards: readonly ConceptCard[] | null;
  /** raw due-card count from the stats (shown before the content loads) */
  dueCardIdCount: number;
  concepts: UseConcepts;
  nextTopic: TopicNode | undefined;
  onStartCards: () => void;
}

export default function ReviewSummary({
  dueQuestions,
  dueCards,
  dueCardIdCount,
  concepts,
  nextTopic,
  onStartCards,
}: ReviewSummaryProps) {
  const cardCount = dueCards?.length ?? dueCardIdCount;

  if (dueQuestions === 0 && cardCount === 0) return <AllDone nextTopic={nextTopic} />;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className={`${CARD} flex flex-col gap-3`}>
          <Tally label="복습할 문항" count={dueQuestions} unit="개" note="틀렸거나 헷갈림으로 표시한 문항" />
          {dueQuestions > 0 ? (
            <Link href={REVIEW_EXAM_HREF} className={BTN_PRIMARY}>
              문항 복습 시작
            </Link>
          ) : (
            <p className={`text-sm ${MUTED}`}>오늘 복습할 문항이 없어요.</p>
          )}
        </section>
        <section className={`${CARD} flex flex-col gap-3`}>
          <Tally label="복습할 개념 카드" count={cardCount} unit="장" note="모름·애매였거나 복습 주기가 돌아온 카드" />
          {cardCount === 0 ? (
            <p className={`text-sm ${MUTED}`}>오늘 복습할 카드가 없어요.</p>
          ) : concepts.state.status === 'error' ? (
            <ErrorBlock message={CONCEPTS_LOAD_ERROR} onRetry={concepts.retry} />
          ) : (
            <button type="button" onClick={onStartCards} disabled={dueCards === null} className={BTN_PRIMARY}>
              {dueCards === null ? '카드 불러오는 중…' : '카드 복습 시작'}
            </button>
          )}
        </section>
      </div>
      <p className={`text-xs leading-relaxed ${MUTED}`}>
        틀리거나 헷갈린 문항과 모름·애매로 평가한 카드는 1·3·7·14·30·60일 간격으로 다시 나와요. 맞힐수록 간격이 길어져요.
      </p>
    </>
  );
}

interface TallyProps {
  label: string;
  count: number;
  unit: string;
  note: string;
}

function Tally({ label, count, unit, note }: TallyProps) {
  return (
    <div>
      <p className={`text-sm ${MUTED}`}>{label}</p>
      <p className="text-3xl font-black text-gray-900 dark:text-slate-100">
        {count}
        <span className={`ml-0.5 text-base font-bold ${MUTED}`}>{unit}</span>
      </p>
      <p className={`text-xs ${MUTED}`}>{note}</p>
    </div>
  );
}

interface AllDoneProps {
  nextTopic: TopicNode | undefined;
}

function AllDone({ nextTopic }: AllDoneProps) {
  return (
    <EmptyBlock
      title="오늘 복습은 모두 끝났어요. 잘하고 있어요!"
      description="복습할 게 없는 날엔 새 개념을 익히거나 계산 드릴로 감을 유지해 보세요."
    >
      {nextTopic && (
        <Link href={conceptsHref(nextTopic.id)} className={BTN_PRIMARY}>
          다음 단원: {nextTopic.name}
        </Link>
      )}
      <Link href="/concepts" className={nextTopic ? BTN_SECONDARY : BTN_PRIMARY}>
        개념 학습
      </Link>
      <Link href="/drill" className={BTN_SECONDARY}>
        계산 드릴
      </Link>
    </EmptyBlock>
  );
}
