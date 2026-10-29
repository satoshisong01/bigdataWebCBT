'use client';

import { useState } from 'react';
import type { ConceptCard } from '@/types';
import { loadConcepts } from '@/data/bank';
import { topicMatches } from '@/data/criteria';
import MathText from '@/components/MathText';

const MAX_CARDS = 10;

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; cards: readonly ConceptCard[] };

/** Cards whose 세세항목 matches one of the question's topics; most relevant topic first, then 핵심 first. */
function relatedCards(all: readonly ConceptCard[], topics: readonly string[]): ConceptCard[] {
  const rank = (card: ConceptCard) => topics.findIndex(t => topicMatches(card.topic, t));
  return all
    .filter(card => rank(card) >= 0)
    .sort((a, b) => rank(a) - rank(b) || b.importance - a.importance);
}

interface RelatedConceptsProps {
  topics: readonly string[];
}

/** "관련 개념 카드" disclosure; the concept bank is only downloaded when first opened. */
export default function RelatedConcepts({ topics }: RelatedConceptsProps) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });

  const fetchCards = () => {
    setLoad({ status: 'loading' });
    loadConcepts()
      .then(all => setLoad({ status: 'ready', cards: relatedCards(all, topics) }))
      .catch(() => setLoad({ status: 'error' }));
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && (load.status === 'idle' || load.status === 'error')) fetchCards();
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition"
      >
        <span>관련 개념 카드</span>
        <span className="text-gray-400 dark:text-slate-500" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="px-3 sm:px-4 pb-3 text-sm">
          {load.status === 'loading' && <p className="text-gray-500 dark:text-slate-400">개념 카드를 불러오는 중...</p>}
          {load.status === 'error' && (
            <p className="text-red-600 dark:text-red-400">
              개념 카드를 불러오지 못했어요. 연결을 확인한 뒤{' '}
              <button type="button" onClick={fetchCards} className="underline font-medium">
                다시 시도
              </button>
              해 주세요.
            </p>
          )}
          {load.status === 'ready' && <CardList cards={load.cards} />}
        </div>
      )}
    </div>
  );
}

interface CardListProps {
  cards: readonly ConceptCard[];
}

function CardList({ cards }: CardListProps) {
  if (cards.length === 0) {
    return <p className="text-gray-500 dark:text-slate-400">이 세세항목의 개념 카드가 아직 없어요.</p>;
  }
  const hidden = cards.length - MAX_CARDS;
  return (
    <ul className="space-y-2">
      {cards.slice(0, MAX_CARDS).map(card => (
        <li key={card.id} className="border-l-2 border-blue-300 dark:border-blue-700 pl-3">
          <div className="font-bold text-gray-800 dark:text-slate-100">{card.term}</div>
          <MathText text={card.summary} className="block text-gray-600 dark:text-slate-300 leading-relaxed" />
        </li>
      ))}
      {hidden > 0 && <li className="text-xs text-gray-500 dark:text-slate-400">외 {hidden}개 — 개념 학습에서 모두 볼 수 있어요.</li>}
    </ul>
  );
}
