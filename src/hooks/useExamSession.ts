'use client';

import { useState } from 'react';
import { buildRetryContext, calculateResult } from '@/lib/utils';
import { recordAnswers, type AnswerEvent } from '@/lib/stats';
import { clearExamAnswers, clearRetryContext } from '@/lib/storage';
import { toOriginalOption } from '@/lib/compose';
import { newSeed } from '@/lib/rng';
import { useExamTimer } from './useExamTimer';
import { useExamKeyboard } from './useExamKeyboard';
import { restartRun, toDisplayOption, type ExamItem, type ExamRun } from './exam/run';
import { wrongTopicCounts, type WrongTopic } from './exam/results';
import { persistExamResult } from './exam/persist';
import {
  answerEventFor,
  examReducer,
  initialExamState,
  isAnswerLocked,
  isRevealed,
  isUnsureLocked,
  navCellStates,
  pendingAnswerEvents,
  tallyChecked,
  type CheckTally,
  type ExamAction,
  type ExamState,
  type NavCellState,
} from './exam/state';

export interface ExamActions {
  goTo: (index: number) => void;
  prev: () => void;
  next: () => void;
  /** 1-based display position */
  pick: (displayOption: number) => void;
  toggleExplanation: () => void;
  toggleUnsure: () => void;
  pass: () => void;
  check: () => void;
  /** asks for confirmation, then grades and saves */
  submit: () => void;
  review: () => void;
  showResult: () => void;
  retry: () => void;
  retryWrong: () => void;
}

export interface ExamSession {
  run: ExamRun;
  state: ExamState;
  item: ExamItem;
  isLast: boolean;
  /** current pick as a display position */
  displayPick: number | undefined;
  revealed: boolean;
  locked: boolean;
  unsureLocked: boolean;
  answeredCount: number;
  tally: CheckTally;
  navStates: Record<string, NavCellState>;
  wrongCount: number;
  wrongTopics: WrongTopic[];
  timeRemaining: number;
  actions: ExamActions;
}

/** Recording right away keeps 확인/패스 results even if the learner never submits. */
function recordNow(events: readonly AnswerEvent[]): boolean {
  try {
    recordAnswers(events);
    return true;
  } catch {
    return false; // left unrecorded → retried with the batch at submit
  }
}

/**
 * State + handlers for one run. The owner remounts this (key) for a new run, so every
 * piece of state starts from `run` through lazy initialisers.
 */
export function useExamSession(run: ExamRun, onRestart: (next: ExamRun) => void): ExamSession {
  const [state, setState] = useState<ExamState>(() => initialExamState(run));
  const total = run.items.length;
  const item = run.items[state.index];
  const id = item.original.id;
  const isLast = state.index === total - 1;
  const questions = run.items.map(i => i.original);

  const apply = (action: ExamAction) => setState(prev => examReducer(prev, action));

  const finish = (base: ExamState, elapsed: number) => {
    if (base.phase !== 'exam') return;
    const result = calculateResult(questions, base.answers, elapsed, run.retryContext ?? undefined);
    const saved = persistExamResult({
      run,
      answers: base.answers,
      result,
      events: pendingAnswerEvents(base, run.items),
      now: new Date(),
    });
    setState(examReducer(base, { type: 'finish', result, saveFailed: !saved }));
  };

  const { timeElapsed, timeRemaining } = useExamTimer({
    active: state.phase === 'exam',
    timeLimit: run.timeLimit,
    onTimeout: () => finish(state, run.timeLimit),
  });

  const pick = (displayOption: number) => {
    apply({ type: 'pick', id, option: toOriginalOption(item.order, displayOption) });
  };

  const check = () => {
    if (run.strict || state.phase !== 'exam' || state.answers[id] === undefined) return;
    if (state.checked.has(id)) {
      if (isLast) finish(state, timeElapsed);
      else apply({ type: 'step', delta: 1 });
      return;
    }
    const recorded = state.recorded.has(id) || recordNow([answerEventFor(state, item)]);
    setState(examReducer(state, { type: 'check', id, recorded }));
  };

  const pass = () => {
    if (run.strict || isAnswerLocked(state, id) || state.passed.has(id)) return;
    const recorded = state.recorded.has(id) || recordNow([{ id, correct: false, unsure: state.unsure.has(id) }]);
    const passedState = examReducer(state, { type: 'pass', id, recorded });
    if (isLast) finish(passedState, timeElapsed);
    else setState(examReducer(passedState, { type: 'step', delta: 1 }));
  };

  const submit = () => {
    if (state.phase !== 'exam') return;
    const answered = Object.keys(state.answers).length;
    const message =
      answered < total ? `${answered}/${total} 문제만 답변했습니다. 제출하시겠습니까?` : '제출하시겠습니까?';
    if (window.confirm(message)) finish(state, timeElapsed);
  };

  const retry = () => {
    clearExamAnswers(run.examKey);
    clearRetryContext(run.examKey);
    onRestart(restartRun(run, questions, null, newSeed()));
  };

  const retryWrong = () => {
    const wrong = questions.filter(q => state.answers[q.id] !== q.answer);
    if (wrong.length === 0) return;
    const context = buildRetryContext(questions, state.answers, run.retryContext);
    onRestart(restartRun(run, wrong, context, newSeed()));
  };

  const prev = () => apply({ type: 'step', delta: -1 });
  const next = () => apply({ type: 'step', delta: 1 });
  const locked = isAnswerLocked(state, id);

  useExamKeyboard({
    active: state.phase !== 'result',
    acceptAnswerKeys: !locked,
    optionCount: item.display.options.length,
    onPrev: prev,
    onNext: next,
    onAnswerKey: pick,
  });

  return {
    run,
    state,
    item,
    isLast,
    displayPick: toDisplayOption(item.order, state.answers[id]),
    revealed: isRevealed(state, id, run.strict),
    locked,
    unsureLocked: isUnsureLocked(state, id),
    answeredCount: Object.keys(state.answers).length,
    tally: tallyChecked(state, run.items),
    navStates: navCellStates(state, run.items),
    wrongCount: questions.filter(q => state.answers[q.id] !== q.answer).length,
    wrongTopics: state.result ? wrongTopicCounts(questions, state.answers) : [],
    timeRemaining,
    actions: {
      goTo: index => apply({ type: 'goto', index }),
      prev,
      next,
      pick,
      toggleExplanation: () => {
        if (!run.strict) apply({ type: 'toggle-explanation', id });
      },
      toggleUnsure: () => apply({ type: 'toggle-unsure', id }),
      pass,
      check,
      submit,
      review: () => apply({ type: 'review' }),
      showResult: () => apply({ type: 'show-result' }),
      retry,
      retryWrong,
    },
  };
}
