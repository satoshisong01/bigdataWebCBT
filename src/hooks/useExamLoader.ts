'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Question } from '@/types';
import { loadQuestionsByIds } from '@/data/bank';
import { withCriteriaSubject } from '@/lib/compose';
import { getComposedIds, saveComposedIds } from '@/lib/composed';
import { newSeed } from '@/lib/rng';
import { needsSeed, parseExamParams, type ExamParams, type ExamSource, type ExamSourceKind } from './exam/params';
import { loadExam, type EmptyReason, type ExamLoadOutcome } from './exam/sources';
import { createRun, type ExamRun } from './exam/run';

export type ExamLoaderState =
  | { status: 'loading'; params: ExamParams }
  | { status: 'empty'; params: ExamParams; reason: EmptyReason }
  | { status: 'error'; params: ExamParams; detail: string; reload: () => void }
  | { status: 'ready'; params: ExamParams; loadId: string; run: ExamRun };

type Settled =
  | { key: string; kind: 'ready'; run: ExamRun }
  | { key: string; kind: 'empty'; reason: EmptyReason }
  | { key: string; kind: 'error'; detail: string };

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Composed sets whose question list is pinned per exam key. review / wrong-pool stay dynamic on purpose. */
const PINNED_KINDS: ReadonlySet<ExamSourceKind> = new Set<ExamSourceKind>(['mock', 'weak', 'topic']);

/** Seeded pools keep their option order on reload (as loadExam does); a topic set reshuffles each visit. */
function optionSeed(source: ExamSource): number {
  return (source.kind === 'mock' || source.kind === 'weak') && source.seed !== null ? source.seed : newSeed();
}

function withQuestions(run: ExamRun, questions: readonly Question[], seed: number): ExamRun {
  return createRun({
    examKey: run.examKey,
    title: run.title,
    strict: run.strict,
    shuffleSetting: run.shuffled,
    questions,
    initialAnswers: run.initialAnswers,
    retryContext: run.retryContext,
    seed,
  });
}

/**
 * loadExam, plus pinning for composed sets: the first load stores the composed ids under the exam key
 * (src/lib/composed.ts); later loads of that key rebuild the run from those ids — relabelled with the
 * 2027 subject like a fresh composition — instead of recomposing from changed stats. When none of the
 * pinned ids exist anymore the fresh composition is used and pinned instead.
 */
async function loadPinnedExam(params: ExamParams): Promise<ExamLoadOutcome> {
  const outcome = await loadExam(params);
  if (outcome.kind !== 'ready' || !PINNED_KINDS.has(params.source.kind)) return outcome;
  const { run } = outcome;
  const pinnedIds = getComposedIds(run.examKey);
  const pinned = pinnedIds ? (await loadQuestionsByIds(pinnedIds)).map(withCriteriaSubject) : [];
  if (pinned.length === 0) {
    saveComposedIds(run.examKey, run.items.map(item => item.original.id));
    return outcome;
  }
  saveComposedIds(run.examKey, pinned.map(q => q.id)); // a reused set counts as recent again
  return { kind: 'ready', run: withQuestions(run, pinned, optionSeed(params.source)) };
}

/**
 * Turns the /exam query string into a ready run. Seeded pools without a seed get one
 * pinned into the URL first (router.replace), and composed sets (mock / weak / topic) reuse
 * the question list stored for their exam key, so a refresh reproduces the same set.
 * `loading` is derived (no settled result for the current request yet), never set in the effect.
 */
export function useExamLoader(query: string): ExamLoaderState {
  const router = useRouter();
  const params = useMemo(() => parseExamParams(new URLSearchParams(query)), [query]);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const pinnedForRef = useRef<string | null>(null);
  const requestKey = `${query}#${attempt}`;
  const missingSeed = needsSeed(params.source);

  useEffect(() => {
    if (!missingSeed) {
      pinnedForRef.current = null; // a later visit to a seedless URL gets a fresh seed
      return;
    }
    if (pinnedForRef.current === query) return; // one replace per visit, also under StrictMode re-runs
    pinnedForRef.current = query;
    const next = new URLSearchParams(query);
    next.set('seed', String(newSeed()));
    router.replace(`/exam?${next.toString()}`, { scroll: false });
  }, [missingSeed, query, router]);

  useEffect(() => {
    if (missingSeed) return;
    let cancelled = false;
    loadPinnedExam(params)
      .then(outcome => {
        if (cancelled) return;
        setSettled(
          outcome.kind === 'ready'
            ? { key: requestKey, kind: 'ready', run: outcome.run }
            : { key: requestKey, kind: 'empty', reason: outcome.reason },
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) setSettled({ key: requestKey, kind: 'error', detail: describeError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [missingSeed, params, requestKey]);

  if (!settled || settled.key !== requestKey) return { status: 'loading', params };
  switch (settled.kind) {
    case 'ready':
      return { status: 'ready', params, loadId: requestKey, run: settled.run };
    case 'empty':
      return { status: 'empty', params, reason: settled.reason };
    case 'error':
      return { status: 'error', params, detail: settled.detail, reload: () => setAttempt(n => n + 1) };
  }
}
