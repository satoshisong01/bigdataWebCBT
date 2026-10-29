'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { CRITERIA_VERSION, LEAVES } from '@/data/criteria';
import type { ConceptsViewProps } from './types';
import { NO_COUNTS, countCardsByNode, countStudied } from './conceptIndex';
import CriteriaTree from './CriteriaTree';
import ConceptSearch from './ConceptSearch';
import { readyCards } from '../useConcepts';
import { CONCEPTS_LOAD_ERROR, EmptyBlock, ErrorBlock } from '../StatusBlocks';
import { ProgressBar } from '../SessionParts';
import { percent } from '../format';
import { quizHref } from '../links';
import { BTN_PRIMARY, CARD, MAIN, MUTED, PAGE } from '../ui';

/** /concepts default view: progress, search and the criteria tree. */
export default function ConceptsHome({ concepts, cstats, topicStats, today, onGrade }: ConceptsViewProps) {
  const cards = readyCards(concepts.state);
  const cardCounts = useMemo(() => (cards ? countCardsByNode(cards, cstats) : null), [cards, cstats]);
  const studied = useMemo(() => (cards ? countStudied(cards, cstats) : 0), [cards, cstats]);
  const failed = concepts.state.status === 'error';
  const tree = <CriteriaTree cardCounts={failed ? NO_COUNTS : cardCounts} topicStats={topicStats} />;

  return (
    <div className={PAGE}>
      <PageHeader title="개념 학습" subtitle={`출제기준 ${LEAVES.length}개 세세항목 · ${CRITERIA_VERSION}`} />
      <main className={MAIN}>
        {failed && <ErrorBlock message={CONCEPTS_LOAD_ERROR} onRetry={concepts.retry} />}
        {cards && cards.length === 0 && (
          <EmptyBlock
            title="개념 카드를 준비 중이에요"
            description="세세항목별 개념 카드를 만들고 있어요. 그동안 아래에서 범위를 골라 문제 풀이로 학습할 수 있어요."
          />
        )}
        {cards && cards.length > 0 ? (
          <>
            <section className={`${CARD} space-y-3`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={`text-sm ${MUTED}`}>학습한 개념 카드</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                    {studied}
                    <span className={`text-base font-bold ${MUTED}`}> / {cards.length}</span>
                  </p>
                </div>
                <Link href={quizHref()} className={BTN_PRIMARY}>
                  전체 용어 퀴즈
                </Link>
              </div>
              <ProgressBar
                value={studied}
                total={cards.length}
                label="카드 학습 진행률"
                aside={`${percent(studied, cards.length)}%`}
              />
            </section>
            <ConceptSearch cards={cards} cstats={cstats} today={today} onGrade={onGrade} idle={tree} />
          </>
        ) : (
          tree
        )}
      </main>
    </div>
  );
}
