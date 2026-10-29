import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ConceptCard, Question } from '@/types';

// Next's app router instance is stable across renders; mirror that.
const nav = vi.hoisted(() => ({ query: '', router: { push: vi.fn(), replace: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => nav.router,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement('a', { href, ...rest }, children),
}));
vi.mock('@/lib/stats', () => ({ recordAnswers: vi.fn(), saveMockRecord: vi.fn() }));
vi.mock('@/lib/compose', () => ({
  toOriginalOption: (order: readonly number[], displayPick: number) => order[displayPick - 1],
  shuffleQuestionOptions: (q: Question) => ({ question: q, order: q.options.map((_, i) => i + 1) }),
}));
vi.mock('@/hooks/exam/sources', () => ({ loadExam: vi.fn() }));
vi.mock('@/data/bank', () => ({ loadConcepts: vi.fn() }));

import * as stats from '@/lib/stats';
import { loadExam } from '@/hooks/exam/sources';
import { loadConcepts } from '@/data/bank';
import { createRun } from '@/hooks/exam/run';
import ExamView from '../ExamView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const Q1: Question = {
  id: '6-1',
  session: '제6회',
  sessionId: '6',
  subject: 1,
  subjectName: '빅데이터 분석 기획',
  number: 1,
  question: '빅데이터 3V에 해당하지 않는 것은?',
  options: ['Volume', 'Velocity', 'Variety', 'Validity'],
  answer: 4,
  explanation: '3V는 규모·속도·다양성이다.',
  optionNotes: ['규모 — 3V', '속도 — 3V', '다양성 — 3V', '유효성 — 3V 아님'],
  topics: ['1.1.1.1'],
  answerDispute: '복원 답안이 엇갈립니다.',
};

const Q2: Question = {
  ...Q1,
  id: '6-21',
  subject: 2,
  subjectName: '빅데이터 탐색',
  number: 21,
  question: '결측값 처리 방법이 아닌 것은?',
  options: ['단순 대치', '다중 대치', '평균 대치', '정규화'],
  answer: 4,
  optionNotes: undefined,
  topics: ['2.1.1.2'],
  answerDispute: undefined,
};

const CARD: ConceptCard = { id: 'c1', topic: '1.1.1.1', term: '3V', summary: '규모, 속도, 다양성', importance: 3 };

function run(strict: boolean) {
  return createRun({
    examKey: 'session-6',
    title: '제6회',
    strict,
    shuffleSetting: true,
    questions: [Q1, Q2],
    initialAnswers: {},
    retryContext: null,
    seed: 1,
  });
}

let root: Root;
let container: HTMLDivElement;

async function mount(query: string) {
  nav.query = query;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(ExamView)));
}

function text(): string {
  return container.textContent ?? '';
}

/** Exact label first (action buttons), else a button containing it (options carry a number badge). */
function button(label: string): HTMLButtonElement {
  const all = [...container.querySelectorAll('button')];
  const found =
    all.find(b => (b.textContent ?? '').trim() === label) ?? all.find(b => (b.textContent ?? '').includes(label));
  if (!found) throw new Error(`button "${label}" not found in: ${text().slice(0, 300)}`);
  return found;
}

function hasButton(label: string): boolean {
  return [...container.querySelectorAll('button')].some(b => (b.textContent ?? '').trim() === label);
}

async function click(label: string) {
  await act(async () => button(label).click());
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('ExamView', () => {
  it('runs a study exam: source badge, 확인, option notes, concepts, result and review', async () => {
    vi.mocked(loadExam).mockResolvedValue({ kind: 'ready', run: run(false) });
    vi.mocked(loadConcepts).mockResolvedValue([CARD]);
    await mount('mode=session&id=6');

    expect(text()).toContain('빅데이터 3V에 해당하지 않는 것은?');
    expect(text()).toContain('기출복원');
    expect(text()).toContain('제6회 · 1번');
    expect(text()).not.toContain('정답 논란 주의');

    await click('Validity');
    await click('확인');
    expect(stats.recordAnswers).toHaveBeenCalledWith([{ id: '6-1', correct: true, unsure: false }]);
    expect(text()).toContain('유효성 — 3V 아님');
    expect(text()).toContain('정답 논란 주의');
    expect(text()).toContain('빅데이터의 특징'); // topic chip for 1.1.1.1

    await click('관련 개념 카드');
    expect(text()).toContain('규모, 속도, 다양성');

    await click('다음 문제 →');
    expect(text()).toContain('결측값 처리 방법이 아닌 것은?');

    await click('단순 대치'); // wrong
    await click('제출');
    expect(window.confirm).toHaveBeenCalled();
    expect(text()).toContain('불합격');
    expect(text()).toContain('이번에 틀린 세세항목');
    expect(text()).toContain('학습 모드 · 보기 섞기');
    const topicLink = container.querySelector('a[href="/concepts?topic=2.1.1.2"]');
    expect(topicLink?.textContent).toContain('결측값 처리');

    await click('해설 보기');
    expect(text()).toContain('3V는 규모·속도·다양성이다.');
    await click('채점 결과 보기');
    expect(text()).toContain('과목별 성적');
  });

  it('hides study tools in 실전 모드', async () => {
    vi.mocked(loadExam).mockResolvedValue({ kind: 'ready', run: run(true) });
    await mount('mode=session&id=6&strict=1');
    expect(text()).toContain('실전 모드');
    expect(hasButton('확인')).toBe(false);
    expect(hasButton('패스')).toBe(false);
    expect(hasButton('해설 보기')).toBe(false);
    expect(hasButton('헷갈림')).toBe(true);
    await click('Validity');
    expect(text()).not.toContain('유효성 — 3V 아님');
    await click('헷갈림');
    expect(hasButton('헷갈림 ✓')).toBe(true);
  });

  it('shows the empty review state with a home link', async () => {
    vi.mocked(loadExam).mockResolvedValue({ kind: 'empty', reason: 'review' });
    await mount('pool=review');
    expect(text()).toContain('오늘 복습할 문제가 없어요');
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('shows a retryable error when loading fails', async () => {
    vi.mocked(loadExam).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ kind: 'ready', run: run(false) });
    await mount('mode=session&id=6');
    expect(text()).toContain('문제를 불러오지 못했어요');
    await click('다시 시도');
    expect(text()).toContain('빅데이터 3V에 해당하지 않는 것은?');
  });
});
