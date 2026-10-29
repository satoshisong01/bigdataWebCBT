'use client';

import { useEffect, useState } from 'react';
import type { ConceptCard } from '@/types';
import { loadConcepts } from '@/data/bank';

export type ConceptsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; cards: readonly ConceptCard[] };

export interface UseConcepts {
  state: ConceptsState;
  /** re-requests the chunk after a failed (e.g. offline) import */
  retry: () => void;
}

/** Loads the concept cards chunk (cached by the bank after the first success). */
export function useConcepts(): UseConcepts {
  const [state, setState] = useState<ConceptsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadConcepts().then(
      cards => {
        if (active) setState({ status: 'ready', cards });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt(a => a + 1);
  };

  return { state, retry };
}

/** The loaded cards, or null while loading / after an error. */
export function readyCards(state: ConceptsState): readonly ConceptCard[] | null {
  return state.status === 'ready' ? state.cards : null;
}
