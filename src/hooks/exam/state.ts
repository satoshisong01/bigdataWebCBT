/**
 * Pure exam-session state machine. Answers are keyed by question id and always hold
 * ORIGINAL option numbers. Side effects (stats, storage) live in useExamSession.
 */
import type { ExamResult } from '@/types';
import type { AnswerEvent } from '@/lib/stats';
import type { ExamItem, ExamRun } from './run';

export type ExamPhase = 'exam' | 'result' | 'review';

export interface ExamState {
  phase: ExamPhase;
  index: number;
  total: number;
  answers: Readonly<Record<string, number>>;
  /** picked during this run (restored answers are not, so they are never re-recorded) */
  touched: ReadonlySet<string>;
  /** 확인 pressed (학습 모드) */
  checked: ReadonlySet<string>;
  passed: ReadonlySet<string>;
  /** 해설 toggled open */
  shown: ReadonlySet<string>;
  /** 헷갈림 */
  unsure: ReadonlySet<string>;
  /** already sent to recordAnswers in this run */
  recorded: ReadonlySet<string>;
  result: ExamResult | null;
  /** some result writes failed (e.g. storage full) */
  saveFailed: boolean;
}

export type ExamAction =
  | { type: 'goto'; index: number }
  | { type: 'step'; delta: number }
  | { type: 'pick'; id: string; option: number }
  | { type: 'toggle-explanation'; id: string }
  | { type: 'toggle-unsure'; id: string }
  | { type: 'check'; id: string; recorded: boolean }
  | { type: 'pass'; id: string; recorded: boolean }
  | { type: 'finish'; result: ExamResult; saveFailed: boolean }
  | { type: 'review' }
  | { type: 'show-result' };

const NONE: ReadonlySet<string> = new Set<string>();

function withId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return set.has(id) ? set : new Set([...set, id]);
}

function withoutId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return set.has(id) ? new Set([...set].filter(x => x !== id)) : set;
}

function toggleId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return set.has(id) ? withoutId(set, id) : withId(set, id);
}

function clampIndex(index: number, total: number): number {
  return Math.min(Math.max(0, index), Math.max(0, total - 1));
}

/** Keeps only restored answers that belong to this run and point at an existing option. */
export function initialExamState(run: Pick<ExamRun, 'items' | 'initialAnswers'>): ExamState {
  const optionCount = new Map(run.items.map(i => [i.original.id, i.original.options.length]));
  const answers = Object.fromEntries(
    Object.entries(run.initialAnswers).filter(([id, pick]) => {
      const count = optionCount.get(id);
      return count !== undefined && Number.isInteger(pick) && pick >= 1 && pick <= count;
    }),
  );
  return {
    phase: 'exam',
    index: 0,
    total: run.items.length,
    answers,
    touched: NONE,
    checked: NONE,
    passed: NONE,
    shown: NONE,
    unsure: NONE,
    recorded: NONE,
    result: null,
    saveFailed: false,
  };
}

/** 헷갈림 can no longer change once the answer was revealed or recorded. */
export function isUnsureLocked(state: ExamState, id: string): boolean {
  return state.phase !== 'exam' || state.checked.has(id) || state.passed.has(id) || state.recorded.has(id);
}

export function isAnswerLocked(state: ExamState, id: string): boolean {
  return state.phase !== 'exam' || state.checked.has(id);
}

export function isRevealed(state: ExamState, id: string, strict: boolean): boolean {
  if (state.phase === 'review') return true;
  return !strict && state.phase === 'exam' && (state.shown.has(id) || state.checked.has(id));
}

function dropAnswer(answers: Readonly<Record<string, number>>, id: string): Record<string, number> {
  return Object.fromEntries(Object.entries(answers).filter(([key]) => key !== id));
}

export function examReducer(state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case 'goto':
      return { ...state, index: clampIndex(action.index, state.total) };
    case 'step':
      return { ...state, index: clampIndex(state.index + action.delta, state.total) };
    case 'pick':
      if (isAnswerLocked(state, action.id)) return state;
      return {
        ...state,
        answers: { ...state.answers, [action.id]: action.option },
        touched: withId(state.touched, action.id),
      };
    case 'toggle-explanation': {
      // Opening 해설 before answering reveals the key: the attempt is marked 헷갈림 (user can undo).
      const peeking = !state.shown.has(action.id) && !isUnsureLocked(state, action.id);
      return {
        ...state,
        shown: toggleId(state.shown, action.id),
        unsure: peeking ? withId(state.unsure, action.id) : state.unsure,
      };
    }
    case 'toggle-unsure':
      if (isUnsureLocked(state, action.id)) return state;
      return { ...state, unsure: toggleId(state.unsure, action.id) };
    case 'check':
      if (state.phase !== 'exam' || state.answers[action.id] === undefined) return state;
      return {
        ...state,
        checked: withId(state.checked, action.id),
        passed: withoutId(state.passed, action.id),
        recorded: action.recorded ? withId(state.recorded, action.id) : state.recorded,
      };
    case 'pass':
      if (isAnswerLocked(state, action.id)) return state;
      return {
        ...state,
        answers: dropAnswer(state.answers, action.id),
        touched: withoutId(state.touched, action.id),
        passed: withId(state.passed, action.id),
        recorded: action.recorded ? withId(state.recorded, action.id) : state.recorded,
      };
    case 'finish':
      if (state.phase !== 'exam') return state;
      return { ...state, phase: 'result', result: action.result, saveFailed: action.saveFailed };
    case 'review':
      return state.result ? { ...state, phase: 'review', index: 0 } : state;
    case 'show-result':
      return state.result ? { ...state, phase: 'result' } : state;
  }
}

/** The stats event for the current answer of `item` (correctness by original numbering). */
export function answerEventFor(state: ExamState, item: ExamItem): AnswerEvent {
  const id = item.original.id;
  return { id, correct: state.answers[id] === item.original.answer, unsure: state.unsure.has(id) };
}

function pendingEvent(state: ExamState, item: ExamItem): AnswerEvent | null {
  const id = item.original.id;
  if (state.recorded.has(id)) return null;
  if (state.passed.has(id) && !state.checked.has(id)) {
    return { id, correct: false, unsure: state.unsure.has(id) }; // 패스 counts as wrong
  }
  const attempted = state.touched.has(id) || state.checked.has(id);
  return attempted && state.answers[id] !== undefined ? answerEventFor(state, item) : null;
}

/** What still has to go to recordAnswers at submit: answered-or-passed in this run, not yet recorded. */
export function pendingAnswerEvents(state: ExamState, items: readonly ExamItem[]): AnswerEvent[] {
  return items.flatMap(item => {
    const event = pendingEvent(state, item);
    return event ? [event] : [];
  });
}

export interface CheckTally {
  correct: number;
  /** checked-wrong + passed */
  wrong: number;
}

export function tallyChecked(state: ExamState, items: readonly ExamItem[]): CheckTally {
  return items.reduce<CheckTally>(
    (acc, item) => {
      const id = item.original.id;
      if (state.passed.has(id)) return { ...acc, wrong: acc.wrong + 1 };
      if (!state.checked.has(id)) return acc;
      return state.answers[id] === item.original.answer
        ? { ...acc, correct: acc.correct + 1 }
        : { ...acc, wrong: acc.wrong + 1 };
    },
    { correct: 0, wrong: 0 },
  );
}

export type NavCellState = 'idle' | 'answered' | 'passed' | 'correct' | 'wrong' | 'skipped';

function cellState(state: ExamState, item: ExamItem): NavCellState {
  const id = item.original.id;
  const answered = state.answers[id] !== undefined;
  const correct = state.answers[id] === item.original.answer;
  if (state.phase !== 'exam') {
    if (!answered) return 'skipped';
    return correct ? 'correct' : 'wrong';
  }
  if (state.passed.has(id)) return 'passed';
  if (state.checked.has(id)) return correct ? 'correct' : 'wrong';
  return answered ? 'answered' : 'idle';
}

export function navCellStates(state: ExamState, items: readonly ExamItem[]): Record<string, NavCellState> {
  return Object.fromEntries(items.map(item => [item.original.id, cellState(state, item)]));
}
