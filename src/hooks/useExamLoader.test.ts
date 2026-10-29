import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Question } from '@/types';
import { createRun, type ExamRun } from './exam/run';

const { router, nav } = vi.hoisted(() => {
  const router = { replace: vi.fn() };
  return { router, nav: { fresh: false } };
});

// `fresh` simulates a router whose identity changes on every render.
vi.mock('next/navigation', () => ({ useRouter: () => (nav.fresh ? { replace: router.replace } : router) }));
vi.mock('./exam/sources', () => ({ loadExam: vi.fn() }));
vi.mock('@/data/bank', () => ({ loadQuestionsByIds: vi.fn() }));

import { loadQuestionsByIds } from '@/data/bank';
import { loadExam } from './exam/sources';
import { useExamLoader, type ExamLoaderState } from './useExamLoader';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RUN = { examKey: 'session-5', title: '제5회', items: [] } as unknown as ExamRun;
const COMPOSED_KEY = 'bigdata-cbt-composed';

/** A bank question as stored (paper subject); `topics[0]` decides its 2027 subject. */
function question(id: string, subject: number, topics?: string[]): Question {
  return {
    id,
    session: '제5회',
    sessionId: id.slice(0, id.lastIndexOf('-')),
    subject,
    subjectName: `${subject}과목`,
    number: Number(id.slice(id.lastIndexOf('-') + 1)),
    question: `문제 ${id}`,
    options: ['가', '나', '다', '라'],
    answer: 1,
    explanation: '',
    ...(topics ? { topics } : {}),
  };
}

/** What loadExam hands back for a composed set (options shuffled with `seed`, like the real loader). */
function composedRun(examKey: string, questions: readonly Question[], seed: number): ExamRun {
  return createRun({
    examKey,
    title: '랜덤 모의고사',
    strict: false,
    shuffleSetting: true,
    questions,
    initialAnswers: {},
    retryContext: null,
    seed,
  });
}

function readyRun(state: ExamLoaderState): ExamRun {
  if (state.status !== 'ready') throw new Error(`expected ready, got ${state.status}`);
  return state.run;
}

const itemIds = (run: ExamRun): string[] => run.items.map(item => item.original.id);

function pins(): unknown {
  const raw = localStorage.getItem(COMPOSED_KEY);
  return raw === null ? null : JSON.parse(raw);
}

const probe: { state: ExamLoaderState | null } = { state: null };
let root: Root;

function Harness({ query }: { query: string }) {
  const state = useExamLoader(query);
  useEffect(() => {
    probe.state = state;
  });
  return null;
}

/** The hook's state after the last committed render. */
function latest(): ExamLoaderState {
  if (!probe.state) throw new Error('not rendered');
  return probe.state;
}

async function mount(query: string) {
  root = createRoot(document.createElement('div'));
  await act(async () => root.render(createElement(Harness, { query })));
}

async function navigate(query: string) {
  await act(async () => root.render(createElement(Harness, { query })));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  nav.fresh = false;
});

afterEach(() => {
  act(() => root.unmount());
});

describe('useExamLoader', () => {
  it('pins a seed into the URL before loading a seeded pool', async () => {
    await mount('pool=mock&strict=1');
    expect(latest().status).toBe('loading');
    expect(loadExam).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledTimes(1);
    const [url, options] = router.replace.mock.calls[0];
    expect(url).toMatch(/^\/exam\?pool=mock&strict=1&seed=\d+$/);
    expect(options).toEqual({ scroll: false });
  });

  it('becomes ready with the loaded run', async () => {
    vi.mocked(loadExam).mockResolvedValue({ kind: 'ready', run: RUN });
    await mount('mode=session&id=5');
    expect(loadExam).toHaveBeenCalledWith({ source: { kind: 'session', sessionId: '5' }, strict: false });
    const state = latest();
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;
    expect(state.run).toBe(RUN);
    expect(state.loadId).toBe('mode=session&id=5#0');
  });

  it('reports empty pools with their reason', async () => {
    vi.mocked(loadExam).mockResolvedValue({ kind: 'empty', reason: 'review' });
    await mount('pool=review');
    expect(latest()).toMatchObject({ status: 'empty', reason: 'review' });
  });

  it('pins a new seed when a seedless URL is visited again', async () => {
    vi.mocked(loadExam).mockResolvedValue({ kind: 'ready', run: RUN });
    await mount('pool=weak');
    await navigate('pool=weak&seed=5');
    expect(latest().status).toBe('ready');
    await navigate('pool=weak');
    expect(router.replace).toHaveBeenCalledTimes(2);
    expect(latest().status).toBe('loading');
  });

  it('loads once even if the router identity changes between renders', async () => {
    nav.fresh = true;
    vi.mocked(loadExam).mockResolvedValue({ kind: 'ready', run: RUN });
    await mount('mode=session&id=5');
    await navigate('mode=session&id=5');
    expect(loadExam).toHaveBeenCalledTimes(1);
    expect(latest().status).toBe('ready');
  });

  it('shows an error and loads again on reload', async () => {
    vi.mocked(loadExam).mockRejectedValueOnce(new Error('Failed to fetch chunk')).mockResolvedValue({ kind: 'ready', run: RUN });
    await mount('mode=all');
    const failed = latest();
    expect(failed).toMatchObject({ status: 'error', detail: 'Failed to fetch chunk' });
    if (failed.status !== 'error') return;
    await act(async () => failed.reload());
    expect(loadExam).toHaveBeenCalledTimes(2);
    const state = latest();
    expect(state.status).toBe('ready');
    if (state.status === 'ready') expect(state.loadId).toBe('mode=all#1');
  });
});

describe('useExamLoader — composed sets survive a reload', () => {
  const FIRST = [question('5-1', 1, ['1.1.1.1']), question('5-41', 3, ['1.3.3.1']), question('5-61', 4, ['4.1.1.1'])];

  it('pins the first composition and rebuilds exactly that set after the stats changed', async () => {
    vi.mocked(loadExam).mockResolvedValueOnce({ kind: 'ready', run: composedRun('mock-7', FIRST, 7) });
    await mount('pool=mock&seed=7');
    const first = readyRun(latest());
    expect(itemIds(first)).toEqual(['5-1', '5-41', '5-61']);
    expect(pins()).toEqual([{ key: 'mock-7', ids: ['5-1', '5-41', '5-61'] }]);
    expect(loadQuestionsByIds).not.toHaveBeenCalled();
    act(() => root.unmount());

    // new answers changed the stats, so composing again would pick other questions
    vi.mocked(loadExam).mockResolvedValueOnce({ kind: 'ready', run: composedRun('mock-7', [question('6-1', 1, ['1.1.1.2'])], 7) });
    vi.mocked(loadQuestionsByIds).mockResolvedValueOnce(FIRST);
    await mount('pool=mock&seed=7');
    expect(loadQuestionsByIds).toHaveBeenCalledWith(['5-1', '5-41', '5-61']);
    const again = readyRun(latest());
    expect(itemIds(again)).toEqual(itemIds(first));
    expect(again.items.map(item => item.order)).toEqual(first.items.map(item => item.order)); // same seed → same option order
    expect(again).toMatchObject({ examKey: 'mock-7', title: '랜덤 모의고사', strict: false, shuffled: true, initialAnswers: {} });
    expect(again.timeLimit).toBe(first.timeLimit);
    // raw bank questions are relabelled with their 2027 subject, like a fresh composition
    expect(again.items.map(item => [item.original.subject, item.original.subjectName])).toEqual([
      [1, '빅데이터 분석 기획'],
      [1, '빅데이터 분석 기획'],
      [4, '빅데이터 결과 해석'],
    ]);
  });

  it.each([
    ['pool=weak&seed=3', 'pool-weak-3'],
    ['pool=topic&topic=3.1.1', 'pool-topic-3.1.1'],
  ])('pins %s under %s', async (query, examKey) => {
    vi.mocked(loadExam).mockResolvedValueOnce({ kind: 'ready', run: composedRun(examKey, [question('5-50', 3, ['3.1.1.1'])], 3) });
    await mount(query);
    expect(readyRun(latest()).examKey).toBe(examKey);
    expect(pins()).toEqual([{ key: examKey, ids: ['5-50'] }]);
  });

  it.each(['pool=review', 'pool=wrong-pool'])('keeps %s dynamic', async query => {
    localStorage.setItem(COMPOSED_KEY, JSON.stringify([{ key: 'pool-review', ids: ['9-1'] }, { key: 'pool-wrong', ids: ['9-1'] }]));
    vi.mocked(loadExam).mockResolvedValueOnce({ kind: 'ready', run: composedRun('pool-review', [question('5-2', 1)], 1) });
    await mount(query);
    expect(itemIds(readyRun(latest()))).toEqual(['5-2']);
    expect(loadQuestionsByIds).not.toHaveBeenCalled();
    expect(pins()).toEqual([{ key: 'pool-review', ids: ['9-1'] }, { key: 'pool-wrong', ids: ['9-1'] }]);
  });

  it('falls back to (and pins) the fresh composition when no pinned question exists anymore', async () => {
    localStorage.setItem(COMPOSED_KEY, JSON.stringify([{ key: 'pool-topic-3.1.1', ids: ['99-1'] }]));
    vi.mocked(loadExam).mockResolvedValueOnce({ kind: 'ready', run: composedRun('pool-topic-3.1.1', [question('5-50', 3, ['3.1.1.1'])], 2) });
    vi.mocked(loadQuestionsByIds).mockResolvedValueOnce([]);
    await mount('pool=topic&topic=3.1.1');
    expect(itemIds(readyRun(latest()))).toEqual(['5-50']);
    expect(pins()).toEqual([{ key: 'pool-topic-3.1.1', ids: ['5-50'] }]);
  });

  it('does not pin an empty pool', async () => {
    vi.mocked(loadExam).mockResolvedValueOnce({ kind: 'empty', reason: 'weak' });
    await mount('pool=weak&seed=4');
    expect(latest()).toMatchObject({ status: 'empty', reason: 'weak' });
    expect(pins()).toBeNull();
  });
});
