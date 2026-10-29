import { describe, it, expect } from 'vitest';
import {
  START_RUN,
  advanceRun,
  countCorrect,
  finishRun,
  isAnswered,
  missedItems,
  pickChoice,
} from './choiceRun';
import { accuracyTone, formatDayShort, formatDue, percent } from './format';
import { isActivationTarget, isTextTarget } from './useHotkeys';
import { conceptsHref, quizHref, topicExamHref } from './links';

const ITEMS = [{ answer: 1 }, { answer: 2 }, { answer: 3 }];

describe('choiceRun', () => {
  it('records one pick per item and ignores repeated picks', () => {
    const run = pickChoice(START_RUN, 2);
    expect(run.picks).toEqual([2]);
    expect(isAnswered(run)).toBe(true);
    expect(pickChoice(run, 3)).toBe(run);
  });

  it('advances only after answering and finishes after the last item', () => {
    expect(advanceRun(START_RUN, 3)).toBe(START_RUN);
    let run = advanceRun(pickChoice(START_RUN, 1), 3);
    expect(run).toEqual({ index: 1, picks: [1], done: false });
    run = advanceRun(pickChoice(run, 2), 3);
    run = advanceRun(pickChoice(run, 1), 3);
    expect(run).toEqual({ index: 2, picks: [1, 2, 1], done: true });
    expect(pickChoice(run, 4)).toBe(run);
    expect(advanceRun(run, 3)).toBe(run);
  });

  it('finishes early and keeps the answers so far', () => {
    const run = finishRun(pickChoice(START_RUN, 3));
    expect(run).toEqual({ index: 0, picks: [3], done: true });
    expect(finishRun(run)).toBe(run);
  });

  it('scores only answered items', () => {
    expect(countCorrect(ITEMS, [1, 3])).toBe(1);
    expect(missedItems(ITEMS, [1, 3])).toEqual([ITEMS[1]]);
    expect(countCorrect(ITEMS, [])).toBe(0);
    expect(missedItems(ITEMS, [])).toEqual([]);
  });

  it('never mutates the previous state', () => {
    const before = pickChoice(START_RUN, 1);
    const snapshot = JSON.stringify(before);
    advanceRun(before, 3);
    finishRun(before);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(START_RUN).toEqual({ index: 0, picks: [], done: false });
  });
});

describe('format', () => {
  it('formats day keys and due distances', () => {
    expect(formatDayShort('2026-11-05')).toBe('11/5');
    expect(formatDue('2026-10-29', '2026-10-29')).toBe('오늘');
    expect(formatDue('2026-10-29', '2026-10-01')).toBe('오늘');
    expect(formatDue('2026-10-29', '2026-10-30')).toBe('내일');
    expect(formatDue('2026-10-29', '2026-11-05')).toBe('7일 후');
  });

  it('computes percents and pass-rule tones', () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(2, 3)).toBe(67);
    expect(accuracyTone(-1)).toBe('none');
    expect(accuracyTone(100)).toBe('good');
    expect(accuracyTone(60)).toBe('good');
    expect(accuracyTone(59)).toBe('warn');
    expect(accuracyTone(40)).toBe('warn');
    expect(accuracyTone(39)).toBe('bad');
    expect(accuracyTone(0)).toBe('bad');
  });
});

describe('hotkey targets', () => {
  it('treats text fields as typing targets', () => {
    expect(isTextTarget(document.createElement('input'))).toBe(true);
    expect(isTextTarget(document.createElement('textarea'))).toBe(true);
    expect(isTextTarget(document.createElement('select'))).toBe(true);
    expect(isTextTarget(document.createElement('div'))).toBe(false);
    expect(isTextTarget(null)).toBe(false);
  });

  it('leaves Space/Enter to enabled buttons and links', () => {
    const button = document.createElement('button');
    expect(isActivationTarget(button)).toBe(true);
    button.disabled = true;
    expect(isActivationTarget(button)).toBe(false);
    expect(isActivationTarget(document.createElement('a'))).toBe(true);
    expect(isActivationTarget(document.createElement('input'))).toBe(true);
    expect(isActivationTarget(document.body)).toBe(false);
  });
});

describe('links', () => {
  it('builds learning routes', () => {
    expect(conceptsHref()).toBe('/concepts');
    expect(conceptsHref('3.2.1')).toBe('/concepts?topic=3.2.1');
    expect(quizHref()).toBe('/concepts?quiz=1');
    expect(quizHref('2.3')).toBe('/concepts?quiz=1&topic=2.3');
    expect(topicExamHref('4.1.1.1')).toBe('/exam?pool=topic&topic=4.1.1.1');
  });
});
