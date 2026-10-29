'use client';

import PageHeader from '@/components/PageHeader';
import { topicName } from '@/data/criteria';
import type { Grade } from '@/lib/srs';
import type { UseConcepts } from '../useConcepts';
import { CONCEPTS_LOAD_ERROR, ErrorBlock, LoadingBlock } from '../StatusBlocks';
import { conceptsHref } from '../links';
import { MAIN, PAGE } from '../ui';
import TermQuizRun from './TermQuizRun';

interface TermQuizProps {
  /** topic prefix, or null for every card */
  topic: string | null;
  concepts: UseConcepts;
  onGrade: (cardId: string, grade: Grade) => void;
}

/** /concepts?quiz=1[&topic=]: "다음 설명에 해당하는 용어는?" */
export default function TermQuiz({ topic, concepts, onGrade }: TermQuizProps) {
  const { state, retry } = concepts;
  return (
    <div className={PAGE}>
      <PageHeader title="용어 퀴즈" subtitle={topic ? topicName(topic) : '전체 범위'} backHref={conceptsHref(topic)} />
      <main className={MAIN}>
        {state.status === 'loading' && <LoadingBlock label="퀴즈를 준비하는 중…" />}
        {state.status === 'error' && <ErrorBlock message={CONCEPTS_LOAD_ERROR} onRetry={retry} />}
        {state.status === 'ready' && <TermQuizRun cards={state.cards} topic={topic} onGrade={onGrade} />}
      </main>
    </div>
  );
}
