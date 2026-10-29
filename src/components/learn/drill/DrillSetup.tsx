'use client';

import type { ReactNode } from 'react';
import type { DrillGenerator } from '@/lib/drills';
import { topicName } from '@/data/criteria';
import { ErrorBlock } from '../StatusBlocks';
import { BTN_PRIMARY, CARD, MUTED } from '../ui';
import { DRILL_COUNTS, type DrillCount } from './drillPlan';

interface DrillSetupProps {
  generators: readonly DrillGenerator[];
  selected: ReadonlySet<string>;
  count: DrillCount;
  error: string | null;
  onChangeKinds: (kinds: ReadonlySet<string>) => void;
  onChangeCount: (count: DrillCount) => void;
  onStart: () => void;
}

export default function DrillSetup({
  generators,
  selected,
  count,
  error,
  onChangeKinds,
  onChangeCount,
  onStart,
}: DrillSetupProps) {
  const chosen = generators.filter(g => selected.has(g.kind)).length;
  const allOn = chosen === generators.length;

  const toggle = (kind: string) => {
    onChangeKinds(selected.has(kind) ? new Set([...selected].filter(k => k !== kind)) : new Set([...selected, kind]));
  };
  const toggleAll = () => onChangeKinds(allOn ? new Set<string>() : new Set(generators.map(g => g.kind)));

  return (
    <section className={`${CARD} space-y-5`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">문제 종류</h2>
          <span className={`text-xs ${MUTED}`}>
            {chosen}/{generators.length} 선택
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip on={allOn} onClick={toggleAll}>
            전체
          </Chip>
          {generators.map(g => (
            <Chip key={g.kind} on={selected.has(g.kind)} onClick={() => toggle(g.kind)} title={topicName(g.topic)}>
              {g.title}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">문제 수</h2>
        <div className="flex gap-2">
          {DRILL_COUNTS.map(n => (
            <Chip key={n} on={count === n} onClick={() => onChangeCount(n)}>
              {n}문제
            </Chip>
          ))}
        </div>
      </div>
      {error && <ErrorBlock message={error} />}
      <button type="button" onClick={onStart} disabled={chosen === 0} className={`${BTN_PRIMARY} w-full`}>
        {chosen === 0 ? '종류를 하나 이상 고르세요' : `${count}문제 시작`}
      </button>
      <p className={`text-xs leading-relaxed ${MUTED}`}>
        시험장엔 계산기가 없어요. 손으로 풀리는 숫자로 매번 새로 만들어지니, 틀린 문제는 풀이 순서를 그대로 따라 써 보세요.
      </p>
    </section>
  );
}

interface ChipProps {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}

function Chip({ on, onClick, children, title }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
        on
          ? 'bg-blue-600 dark:bg-blue-600 border-blue-600 dark:border-blue-500 text-white dark:text-white'
          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
    >
      {children}
    </button>
  );
}
