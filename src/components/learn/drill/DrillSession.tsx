'use client';

import { useState } from 'react';
import type { DrillItem } from '@/lib/drills';
import { addActivity } from '@/lib/stats';
import { topicName } from '@/data/criteria';
import MathText from '@/components/MathText';
import ChoiceList from '../ChoiceList';
import { AnswerBar, ProgressBar } from '../SessionParts';
import { START_RUN, advanceRun, countCorrect, finishRun, isAnswered, pickChoice, type ChoiceRun } from '../choiceRun';
import { useChoiceHotkeys } from '../useHotkeys';
import { BTN_GHOST, CARD, MUTED } from '../ui';
import DrillResult from './DrillResult';

interface DrillSessionProps {
  items: readonly DrillItem[];
  /** same kinds/count, new seed */
  onRestart: () => void;
  onSetup: () => void;
}

export default function DrillSession({ items, onRestart, onSetup }: DrillSessionProps) {
  const [run, setRun] = useState<ChoiceRun>(START_RUN);
  const current = items[run.index];
  const picked = isAnswered(run) ? run.picks[run.index] : undefined;
  const isLast = run.index + 1 >= items.length;

  /** Ends the session; the answered count is logged exactly once, here (addActivity is additive). */
  const finish = () => {
    if (run.done) return;
    if (run.picks.length > 0) addActivity({ drills: run.picks.length });
    setRun(finishRun);
  };
  const pick = (option: number) => {
    if (!current || run.done || picked !== undefined) return;
    setRun(r => pickChoice(r, option));
  };
  const next = () => {
    if (picked === undefined) return;
    if (isLast) finish();
    else setRun(r => advanceRun(r, items.length));
  };

  useChoiceHotkeys({
    optionCount: current?.options.length ?? 0,
    answered: picked !== undefined,
    onPick: pick,
    onNext: next,
    enabled: !run.done && current !== undefined,
  });

  if (run.done || !current) {
    return <DrillResult items={items} picks={run.picks} onRestart={onRestart} onSetup={onSetup} />;
  }

  return (
    <div className="space-y-4">
      <ProgressBar
        value={run.picks.length}
        total={items.length}
        label={`${run.index + 1} / ${items.length}`}
        aside={`정답 ${countCorrect(items, run.picks)}`}
      />
      <section className={`${CARD} space-y-4`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">
            {current.title}
          </span>
          <span className={MUTED}>{topicName(current.topic)}</span>
        </div>
        <MathText
          text={current.prompt}
          className="block text-base sm:text-lg leading-relaxed text-gray-900 dark:text-slate-100"
        />
        <ChoiceList options={current.options} answer={current.answer} picked={picked} onPick={pick} />
        {picked !== undefined && <AnswerBar correct={picked === current.answer} isLast={isLast} onNext={next} />}
      </section>
      {picked !== undefined && (
        <section className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 sm:p-6 space-y-2">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">풀이</h3>
          <MathText
            text={current.solution}
            className="block overflow-x-auto text-sm sm:text-base leading-relaxed text-amber-950 dark:text-amber-100"
          />
        </section>
      )}
      <div className="flex items-center justify-between gap-2">
        {run.picks.length > 0 ? (
          <button type="button" onClick={finish} className={BTN_GHOST}>
            그만하고 결과 보기
          </button>
        ) : (
          <span />
        )}
        <p className="hidden sm:block text-xs text-gray-400 dark:text-slate-500">키보드 1–4 선택 · Enter 다음</p>
      </div>
    </div>
  );
}
