'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { topicName } from '@/data/criteria';
import type { TopicStat } from '@/lib/mastery';
import type { ConceptsViewProps } from './types';
import {
  NO_COUNTS,
  countCardsByNode,
  groupCardsByLeaf,
  levelLabel,
  statOf,
  topicAncestors,
  topicChildren,
  topicDepth,
  type CardCount,
  type TopicNode,
} from './conceptIndex';
import TopicSummary from './TopicSummary';
import NodeStats from './NodeStats';
import ConceptCardView from './ConceptCardView';
import { readyCards } from '../useConcepts';
import { CONCEPTS_LOAD_ERROR, EmptyBlock, ErrorBlock, LoadingBlock } from '../StatusBlocks';
import { conceptsHref, topicExamHref } from '../links';
import { BTN_PRIMARY, CARD, LINK, MAIN, MUTED, PAGE } from '../ui';

interface TopicViewProps extends ConceptsViewProps {
  topic: string;
}

/** /concepts?topic=<id>: every card in the range, grouped by 세세항목. */
export default function TopicView({ topic, concepts, cstats, topicStats, today, onGrade }: TopicViewProps) {
  const cards = readyCards(concepts.state);
  const counts = useMemo(() => (cards ? countCardsByNode(cards, cstats) : null), [cards, cstats]);
  const groups = useMemo(() => (cards ? groupCardsByLeaf(cards, topic) : null), [cards, topic]);
  const children = topicChildren(topic);
  const showGroupTitles = topicDepth(topic) < 4;
  const failed = concepts.state.status === 'error';

  return (
    <div className={PAGE}>
      <PageHeader title={topicName(topic)} subtitle={levelLabel(topic)} backHref="/concepts" />
      <main className={MAIN}>
        <Breadcrumb topic={topic} />
        <TopicSummary
          topic={topic}
          cards={counts === null ? null : (counts.get(topic) ?? { total: 0, studied: 0 })}
          stat={topicStats.get(topic)}
        />
        {children.length > 0 && (
          <ChildList nodes={children} counts={failed ? NO_COUNTS : counts} topicStats={topicStats} />
        )}

        {concepts.state.status === 'loading' && <LoadingBlock label="개념 카드를 불러오는 중…" />}
        {failed && <ErrorBlock message={CONCEPTS_LOAD_ERROR} onRetry={concepts.retry} />}
        {groups && groups.length === 0 && (
          <EmptyBlock
            title="개념 카드를 준비 중이에요"
            description="이 범위의 개념 카드를 만들고 있어요. 그동안 문제 풀이로 감을 잡아 보세요."
          >
            <Link href={topicExamHref(topic)} className={BTN_PRIMARY}>
              이 범위 문제 풀기
            </Link>
          </EmptyBlock>
        )}
        {groups?.map(group => (
          <section key={group.id} className="space-y-3" aria-label={group.name}>
            {showGroupTitles && (
              <h2 className="flex items-baseline justify-between gap-2 pt-2">
                <Link href={conceptsHref(group.id)} className="font-bold text-gray-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                  {group.name}
                </Link>
                <span className={`text-xs ${MUTED}`}>{group.cards.length}장</span>
              </h2>
            )}
            {group.cards.map(card => (
              <ConceptCardView
                key={card.id}
                card={card}
                stat={statOf(cstats, card.id)}
                today={today}
                onGrade={onGrade}
              />
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

interface BreadcrumbProps {
  topic: string;
}

function Breadcrumb({ topic }: BreadcrumbProps) {
  const ancestors = topicAncestors(topic).slice(0, -1);
  return (
    <nav aria-label="출제기준 위치" className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs ${MUTED}`}>
      <Link href="/concepts" className={LINK}>
        출제기준
      </Link>
      {ancestors.map(id => (
        <span key={id} className="inline-flex items-center gap-1.5">
          <span aria-hidden>›</span>
          <Link href={conceptsHref(id)} className={LINK}>
            {topicName(id)}
          </Link>
        </span>
      ))}
      <span aria-hidden>›</span>
      <span aria-current="page" className="text-gray-700 dark:text-slate-300">
        {topicName(topic)}
      </span>
    </nav>
  );
}

interface ChildListProps {
  nodes: readonly TopicNode[];
  counts: ReadonlyMap<string, CardCount> | null;
  topicStats: ReadonlyMap<string, TopicStat>;
}

function ChildList({ nodes, counts, topicStats }: ChildListProps) {
  return (
    <section className={CARD}>
      <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">하위 {levelLabel(nodes[0].id)}</h2>
      <ul className="mt-2 divide-y divide-gray-100 dark:divide-slate-800">
        {nodes.map(node => (
          <li key={node.id}>
            <Link
              href={conceptsHref(node.id)}
              className="flex items-center gap-2 py-2.5 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <span className="flex-1 min-w-0 text-sm text-gray-800 dark:text-slate-100">{node.name}</span>
              <NodeStats cards={counts === null ? null : counts.get(node.id)} stat={topicStats.get(node.id)} />
              <span aria-hidden className="text-gray-400 dark:text-slate-500">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
