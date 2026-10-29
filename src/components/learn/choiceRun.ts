/** Progress through multiple-choice items (용어 퀴즈, 계산 드릴): one pick per item, then advance. Pure. */

export interface ChoiceRun {
  index: number;
  /** picks[i] = 1-based option picked for item i; length = items answered */
  picks: readonly number[];
  done: boolean;
}

export interface ChoiceItem {
  /** 1-based correct option */
  answer: number;
}

export const START_RUN: ChoiceRun = { index: 0, picks: [], done: false };

export function isAnswered(run: ChoiceRun): boolean {
  return run.picks.length > run.index;
}

/** Records the pick for the current item; ignored once it is answered or the run is done. */
export function pickChoice(run: ChoiceRun, option: number): ChoiceRun {
  if (run.done || isAnswered(run)) return run;
  return { ...run, picks: [...run.picks, option] };
}

/** Moves on after the current item was answered; finishes after the last one. */
export function advanceRun(run: ChoiceRun, total: number): ChoiceRun {
  if (run.done || !isAnswered(run)) return run;
  return run.index + 1 >= total ? { ...run, done: true } : { ...run, index: run.index + 1 };
}

/** Stops early, keeping the answers given so far. */
export function finishRun(run: ChoiceRun): ChoiceRun {
  return run.done ? run : { ...run, done: true };
}

export function countCorrect(items: readonly ChoiceItem[], picks: readonly number[]): number {
  return picks.reduce((n, pick, i) => (items[i] !== undefined && pick === items[i].answer ? n + 1 : n), 0);
}

/** Answered items whose pick was wrong, in order. */
export function missedItems<T extends ChoiceItem>(items: readonly T[], picks: readonly number[]): T[] {
  return items.filter((item, i) => i < picks.length && picks[i] !== item.answer);
}
