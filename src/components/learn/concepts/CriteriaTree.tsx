'use client';

import Link from 'next/link';
import { CRITERIA, type CriteriaSub } from '@/data/criteria';
import type { TopicStat } from '@/lib/mastery';
import type { CardCount } from './conceptIndex';
import NodeStats from './NodeStats';
import { conceptsHref } from '../links';
import { CARD, LINK, MUTED } from '../ui';

type Counts = ReadonlyMap<string, CardCount> | null;

interface CriteriaTreeProps {
  /** null while the cards are loading */
  cardCounts: Counts;
  topicStats: ReadonlyMap<string, TopicStat>;
}

function countOf(counts: Counts, id: string): CardCount | null | undefined {
  return counts === null ? null : counts.get(id);
}

/** 출제기준 tree: 과목 → 주요항목 → 세부항목 (expandable) → 세세항목, each linking to its card list. */
export default function CriteriaTree({ cardCounts, topicStats }: CriteriaTreeProps) {
  return (
    <div className="space-y-4">
      <p className={`text-xs leading-relaxed ${MUTED}`}>
        카드 = 학습한 카드/전체 · 첫풀이 = 그 범위 문항을 처음 풀었을 때의 정답률(다시 풀어 맞힌 건 빼고 계산해요)
      </p>
      {CRITERIA.map(subject => {
        const id = String(subject.id);
        return (
          <section key={id} className={CARD}>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={conceptsHref(id)}
                className="flex-1 min-w-0 text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <span className="mr-1.5 text-blue-600 dark:text-blue-400">과목 {id}</span>
                {subject.name}
              </Link>
              <NodeStats cards={countOf(cardCounts, id)} stat={topicStats.get(id)} />
            </div>
            <div className="mt-3 space-y-4">
              {subject.majors.map(major => (
                <div key={major.id}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Link
                      href={conceptsHref(major.id)}
                      className="flex-1 min-w-0 text-sm font-bold text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {major.name}
                    </Link>
                    <NodeStats cards={countOf(cardCounts, major.id)} stat={topicStats.get(major.id)} />
                  </div>
                  <ul className="space-y-1.5">
                    {major.subs.map(sub => (
                      <SubRow key={sub.id} sub={sub} cardCounts={cardCounts} topicStats={topicStats} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

interface SubRowProps extends CriteriaTreeProps {
  sub: CriteriaSub;
}

function SubRow({ sub, cardCounts, topicStats }: SubRowProps) {
  return (
    <li>
      <details className="group rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/30">
        <summary className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-gray-100 dark:hover:bg-slate-800/70">
          <span aria-hidden className="text-gray-400 dark:text-slate-500 transition-transform group-open:rotate-90">
            ›
          </span>
          <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-slate-100">{sub.name}</span>
          <NodeStats cards={countOf(cardCounts, sub.id)} stat={topicStats.get(sub.id)} />
        </summary>
        <ul className="px-2 pb-2 space-y-0.5">
          {sub.leaves.map(leaf => (
            <li key={leaf.id}>
              <Link
                href={conceptsHref(leaf.id)}
                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-white dark:hover:bg-slate-900"
              >
                <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-slate-300">{leaf.name}</span>
                <NodeStats cards={countOf(cardCounts, leaf.id)} stat={topicStats.get(leaf.id)} />
              </Link>
            </li>
          ))}
          <li className="px-2 pt-1">
            <Link href={conceptsHref(sub.id)} className={`text-xs ${LINK}`}>
              세부항목 전체 카드 보기 →
            </Link>
          </li>
        </ul>
      </details>
    </li>
  );
}
