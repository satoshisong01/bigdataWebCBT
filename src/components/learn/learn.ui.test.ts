/**
 * Integration tests: mounts the real /concepts, /review and /drill content in jsdom.
 * Storage-backed lib modules and the Next router are mocked so only UI wiring is under test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ConceptCard } from '@/types';
import type { CStat } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import type { TermQuizItem } from '@/lib/termQuiz';
import type { DrillItem } from '@/lib/drills';
import { addActivity, gradeCard } from '@/lib/stats';
import { buildDrillSet } from '@/lib/drills';
import ConceptsContent from './concepts/ConceptsContent';
import ReviewContent from './review/ReviewContent';
import DrillContent from './drill/DrillContent';

const h = vi.hoisted(() => ({
  search: '',
  cards: [] as ConceptCard[],
  cstats: {} as Record<string, CStat>,
  dueCardIds: [] as string[],
  dueQuestionIds: [] as string[],
  quiz: [] as TermQuizItem[],
  drills: [] as DrillItem[],
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(h.search) }));

vi.mock('next/link', async () => {
  const { createElement: el } = await import('react');
  return {
    default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => el('a', { href, ...rest }, children),
  };
});

vi.mock('@/data/bank', () => ({ loadConcepts: () => Promise.resolve(h.cards) }));

vi.mock('@/lib/stats', () => ({
  getCStats: () => ({ ...h.cstats }),
  getQStats: () => ({}),
  getDueCardIds: () => [...h.dueCardIds],
  getDueQuestionIds: () => [...h.dueQuestionIds],
  addActivity: vi.fn(),
  gradeCard: vi.fn((id: string, grade: Grade) => {
    const box = grade === 'again' ? 1 : 2;
    h.cstats = { ...h.cstats, [id]: { srs: { box, due: '2099-01-03' }, n: 1, again: 0, last: '' } };
  }),
}));

vi.mock('@/lib/mastery', () => ({ leafStats: () => new Map(), rollup: () => new Map() }));
vi.mock('@/lib/termQuiz', () => ({ buildTermQuiz: vi.fn(() => h.quiz) }));
vi.mock('@/lib/drills', () => ({
  DRILL_GENERATORS: [
    { kind: 'mean', title: '평균·분산', topic: '2.3.1.1', generate: () => ({}) },
    { kind: 'f1', title: '정밀도·재현율·F1', topic: '4.1.1.1', generate: () => ({}) },
  ],
  buildDrillSet: vi.fn(() => h.drills),
}));

const CARD_A: ConceptCard = {
  id: 'c1',
  topic: '1.1.1.1',
  term: '3V',
  summary: '규모·다양성·속도로 정의한다.',
  points: ['가치를 더하면 4V'],
  confusions: ['5V와 구분'],
  formula: 'x^2',
  importance: 3,
  trend: true,
};
const CARD_B: ConceptCard = { id: 'c2', topic: '1.1.1.2', term: '가치 측정 난제', summary: '재사용·융합 때문에 어렵다.', importance: 1 };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(h, { search: '', cards: [CARD_A, CARD_B], cstats: {}, dueCardIds: [], dueQuestionIds: [], quiz: [], drills: [] });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const text = (): string => container.textContent ?? '';

async function mount(component: () => ReactNode): Promise<void> {
  await act(async () => root.render(createElement(component)));
  await act(async () => {}); // let loadConcepts() resolve
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes(label));
  if (!found) throw new Error(`no button "${label}" in: ${text()}`);
  return found;
}

const link = (href: string): Element | null => container.querySelector(`a[href="${href}"]`);
const click = (el: HTMLElement): Promise<void> => act(async () => el.click());
const press = (key: string): Promise<void> =>
  act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });

describe('/concepts', () => {
  it('shows the tree with a friendly empty state when no cards exist yet', async () => {
    h.cards = [];
    await mount(ConceptsContent);
    expect(text()).toContain('개념 카드를 준비 중이에요');
    expect(text()).toContain('빅데이터 분석 기획');
    expect(link('/concepts?topic=1.1.1.1')).not.toBeNull();
  });

  it('searches term / summary / points', async () => {
    await mount(ConceptsContent);
    const input = container.querySelector('input') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(input, '재사용');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(text()).toContain('검색 결과 1개');
    expect(text()).toContain('가치 측정 난제');
  });

  it('lists a range with badges, formula and actions, and grades a card', async () => {
    h.search = 'topic=1.1.1';
    await mount(ConceptsContent);
    expect(text()).toContain('빅데이터의 특징');
    expect(text()).toContain('핵심');
    expect(text()).toContain('2026 출제');
    expect(text()).toContain('지엽');
    expect(text()).toContain('헷갈리는 포인트');
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(link('/concepts?quiz=1&topic=1.1.1')).not.toBeNull();
    expect(link('/exam?pool=topic&topic=1.1.1')).not.toBeNull();

    await click(button('앎'));
    expect(gradeCard).toHaveBeenCalledWith('c1', 'good');
    expect(text()).toContain('앎으로 기록했어요');
    expect(text()).toContain('학습함');
    expect(text()).toContain('1 / 2');
  });

  it('rejects unknown topics', async () => {
    h.search = 'topic=9.9';
    await mount(ConceptsContent);
    expect(text()).toContain('알 수 없는 출제기준 범위예요');
  });

  it('runs a term quiz: grade per answer, then score and missed terms', async () => {
    h.search = 'quiz=1&topic=1.1';
    h.quiz = [
      { cardId: 'c1', topic: '1.1.1.1', prompt: '○○는 규모·다양성·속도', options: ['5V', '3V', 'DIKW', '데이터 레이크'], answer: 2 },
      { cardId: 'c2', topic: '1.1.1.2', prompt: '재사용·융합 때문에 어렵다', options: ['3V', '가치 측정 난제', '가명처리', 'ETL'], answer: 2 },
    ];
    await mount(ConceptsContent);
    expect(text()).toContain('다음 설명에 해당하는 용어는?');

    await press('2');
    expect(gradeCard).toHaveBeenLastCalledWith('c1', 'good');
    expect(text()).toContain('정답이에요!');
    await press('3'); // already answered: ignored
    expect(gradeCard).toHaveBeenCalledTimes(1);

    await press('Enter');
    await press('1');
    expect(gradeCard).toHaveBeenLastCalledWith('c2', 'again');
    expect(text()).toContain('틀렸어요');

    await press('Enter');
    expect(text()).toContain('용어 퀴즈 결과');
    expect(text()).toContain('50점');
    expect(text()).toContain('틀린 용어 1개');
    expect(link('/concepts?topic=1.1.1.2')).not.toBeNull();
  });
});

describe('/review', () => {
  it('runs flashcards over due cards with Space and 1–4', async () => {
    h.dueCardIds = ['c1', 'c2'];
    h.dueQuestionIds = ['5-1'];
    await mount(ReviewContent);
    expect(link('/exam?pool=review')).not.toBeNull();
    expect(text()).toContain('2장');

    await click(button('카드 복습 시작'));
    expect(text()).toContain('남은 카드 2장');
    expect(text()).not.toContain('규모·다양성·속도로 정의한다.');

    await press(' ');
    expect(text()).toContain('규모·다양성·속도로 정의한다.');
    await press('1');
    expect(gradeCard).toHaveBeenLastCalledWith('c1', 'again');
    expect(text()).toContain('남은 카드 1장');

    await press('4'); // front side: grades are ignored until the flip
    expect(gradeCard).toHaveBeenCalledTimes(1);
    await click(button('가치 측정 난제'));
    await click(button('쉬움'));
    expect(gradeCard).toHaveBeenLastCalledWith('c2', 'easy');
    expect(text()).toContain('카드 복습 완료!');
    expect(text()).toContain('모름으로 평가한 카드 1장');

    h.dueCardIds = [];
    await click(button('완료'));
    expect(text()).toContain('오늘 복습할 카드가 없어요');
  });

  it('celebrates when nothing is due and suggests the next unit', async () => {
    await mount(ReviewContent);
    expect(text()).toContain('오늘 복습은 모두 끝났어요');
    expect(link('/concepts?topic=1.1.1')).not.toBeNull();
    expect(link('/drill')).not.toBeNull();
  });
});

describe('/drill', () => {
  const ITEMS: DrillItem[] = [
    { id: 'mean-42-0', kind: 'mean', topic: '2.3.1.1', title: '평균', prompt: '$1+1$ = ?', options: ['1', '2', '3', '4'], answer: 2, solution: '1+1=2' },
    { id: 'mean-42-1', kind: 'mean', topic: '2.3.1.1', title: '평균', prompt: '$2+2$ = ?', options: ['1', '2', '3', '4'], answer: 4, solution: '2+2=4' },
  ];

  it('builds from the chosen kinds/count/seed and logs activity once', async () => {
    h.search = 'seed=42';
    h.drills = ITEMS;
    await mount(DrillContent);
    await click(button('20문제'));
    await click(button('정밀도·재현율·F1'));
    expect(text()).toContain('1/2 선택');

    await click(button('20문제 시작'));
    expect(buildDrillSet).toHaveBeenCalledWith(['mean'], 42, 20);

    await press('2');
    expect(text()).toContain('정답이에요!');
    expect(text()).toContain('1+1=2');
    await press('Enter');
    await press('1');
    expect(text()).toContain('틀렸어요');
    expect(addActivity).not.toHaveBeenCalled();

    await click(button('결과 보기'));
    expect(addActivity).toHaveBeenCalledTimes(1);
    expect(addActivity).toHaveBeenCalledWith({ drills: 2 });
    expect(text()).toContain('계산 드릴 결과');
    expect(text()).toContain('50점');

    await click(button('새 문제로 다시'));
    expect(buildDrillSet).toHaveBeenCalledTimes(2);
    expect(vi.mocked(buildDrillSet).mock.calls[1][1]).not.toBe(42);
    expect(text()).toContain('1 / 2');
    expect(addActivity).toHaveBeenCalledTimes(1);
  });

  it("uses 'all' when every kind stays selected", async () => {
    h.drills = ITEMS;
    await mount(DrillContent);
    await click(button('10문제 시작'));
    expect(vi.mocked(buildDrillSet).mock.calls[0][0]).toBe('all');
    expect(vi.mocked(buildDrillSet).mock.calls[0][2]).toBe(10);
  });
});
