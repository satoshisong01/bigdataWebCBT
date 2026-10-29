'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { isTopicId } from '@/data/criteria';
import { getCStats, gradeCard } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import { todayKey } from '@/lib/date';
import { useSyncRefresh } from '@/hooks/useSyncRefresh';
import { useConcepts } from '../useConcepts';
import { EmptyBlock } from '../StatusBlocks';
import { BTN_PRIMARY, MAIN, PAGE } from '../ui';
import type { ConceptsViewProps } from './types';
import { readTopicStats } from './topicStats';
import ConceptsHome from './ConceptsHome';
import TopicView from './TopicView';
import TermQuiz from './TermQuiz';

/**
 * /concepts (client-only). Views by query: default = criteria tree + search,
 * ?topic=<any level id> = that range's cards, ?quiz=1[&topic=] = 용어 퀴즈.
 */
export default function ConceptsContent() {
  const params = useSearchParams();
  const topic = params.get('topic') || null;
  const quiz = params.get('quiz') === '1';

  const concepts = useConcepts();
  const [today] = useState(todayKey);
  const [cstats, setCStats] = useState(getCStats);
  const [topicStats, setTopicStats] = useState(readTopicStats);

  // After a sync brought in another device's records, the criteria tree re-reads storage (state adjusted
  // during render). Open topic cards and quizzes keep their session and catch up when the tree shows again.
  const syncVersion = useSyncRefresh();
  const [seenSync, setSeenSync] = useState(syncVersion);
  if (topic === null && !quiz && seenSync !== syncVersion) {
    setSeenSync(syncVersion);
    setCStats(getCStats());
    setTopicStats(readTopicStats());
  }

  const handleGrade = (cardId: string, grade: Grade) => {
    gradeCard(cardId, grade);
    setCStats(getCStats());
  };

  if (topic !== null && !isTopicId(topic)) return <UnknownTopic />;
  if (quiz) return <TermQuiz key={topic ?? 'all'} topic={topic} concepts={concepts} onGrade={handleGrade} />;

  const view: ConceptsViewProps = { concepts, cstats, topicStats, today, onGrade: handleGrade };
  return topic ? <TopicView key={topic} topic={topic} {...view} /> : <ConceptsHome {...view} />;
}

function UnknownTopic() {
  return (
    <div className={PAGE}>
      <PageHeader title="개념 학습" backHref="/concepts" />
      <main className={MAIN}>
        <EmptyBlock title="알 수 없는 출제기준 범위예요" description="주소가 바뀌었거나 잘못된 링크일 수 있어요.">
          <Link href="/concepts" className={BTN_PRIMARY}>
            출제기준 트리 보기
          </Link>
        </EmptyBlock>
      </main>
    </div>
  );
}
