'use client';

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import type { ConceptCard } from '@/types';
import type { CStat } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import { buildSearchIndex, searchCards, statOf } from './conceptIndex';
import ConceptCardView from './ConceptCardView';
import { MUTED } from '../ui';

const MAX_RESULTS = 30;

interface ConceptSearchProps {
  cards: readonly ConceptCard[];
  cstats: Readonly<Record<string, CStat>>;
  today: string;
  onGrade: (cardId: string, grade: Grade) => void;
  /** rendered while the search box is empty (the criteria tree) */
  idle: ReactNode;
}

/** Search over term / summary / points; results are full cards so they can be graded in place. */
export default function ConceptSearch({ cards, cstats, today, onGrade, idle }: ConceptSearchProps) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const index = useMemo(() => buildSearchIndex(cards), [cards]);
  const results = useMemo(() => searchCards(index, deferred), [index, deferred]);
  const trimmed = deferred.trim();

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="concept-search" className="sr-only">
          개념 카드 검색
        </label>
        <input
          id="concept-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="용어·설명 검색 (예: 엔트로피, SMOTE, 가명정보)"
          autoComplete="off"
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-base text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>
      {trimmed ? (
        <section aria-live="polite" className="space-y-3">
          <p className={`text-sm ${MUTED}`}>
            {results.length === 0
              ? `‘${trimmed}’에 맞는 카드가 없어요. 다른 표현이나 영문 약어로 찾아보세요.`
              : `검색 결과 ${results.length}개${results.length > MAX_RESULTS ? ` · 상위 ${MAX_RESULTS}개만 표시` : ''}`}
          </p>
          {results.slice(0, MAX_RESULTS).map(card => (
            <ConceptCardView
              key={card.id}
              card={card}
              stat={statOf(cstats, card.id)}
              today={today}
              onGrade={onGrade}
              showTopic
            />
          ))}
        </section>
      ) : (
        idle
      )}
    </div>
  );
}
