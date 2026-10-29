'use client';

import Link from 'next/link';
import { ESTIMATED_EXAM_DATE } from '@/lib/settings';
import type { Settings } from '@/lib/settings';
import { diffDays } from '@/lib/date';
import { ddayLabel } from '@/components/home/homeLogic';

interface StudySettingsProps {
  settings: Settings;
  today: string;
  onChange: (patch: Partial<Settings>) => void;
}

const CARD = 'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6';
const TITLE = 'text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100';
const HINT = 'text-xs text-gray-500 dark:text-slate-400';
const FIELD =
  'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 dark:scheme-dark focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500';

const QUESTION_GOALS: readonly number[] = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200];
const CARD_GOALS: readonly number[] = [10, 20, 30, 40, 50, 60, 80, 100, 150];

/** Preset options plus the stored value when it is not one of them (e.g. restored from a backup). */
function goalOptions(presets: readonly number[], current: number): number[] {
  return presets.includes(current) ? [...presets] : [...presets, current].sort((a, b) => a - b);
}

function ExamDateCard({ settings, today, onChange }: StudySettingsProps) {
  const daysLeft = diffDays(today, settings.examDate);
  const restartPlan = () => {
    if (window.confirm(`플랜 시작일을 오늘(${today})로 바꾸고 남은 기간을 4단계로 다시 나눌까요?`)) {
      onChange({ planStart: today });
    }
  };
  return (
    <section className={CARD} aria-labelledby="exam-date-title">
      <h2 id="exam-date-title" className={TITLE}>
        시험 일정
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor="exam-date" className="text-sm font-medium text-gray-700 dark:text-slate-200">
          필기 시험일
        </label>
        <input
          id="exam-date"
          type="date"
          value={settings.examDate}
          min={today}
          onChange={e => {
            if (e.target.value) onChange({ examDate: e.target.value });
          }}
          className={FIELD}
        />
        <span className="text-sm font-bold text-blue-700 dark:text-blue-300 tabular-nums">{ddayLabel(daysLeft)}</span>
      </div>
      {daysLeft <= 0 && (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          시험일이 오늘이거나 이미 지났어요. 다음 시험일로 바꿔 주세요.
        </p>
      )}
      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={settings.examDateConfirmed}
          onChange={e => onChange({ examDateConfirmed: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
        />
        공식 일정 확정
      </label>
      <p className={`mt-2 ${HINT}`}>
        기본값({ESTIMATED_EXAM_DATE})은 4월 첫 토요일로 잡은 예상 일정이에요(2023~2026년 상반기 필기 기준).
        데이터자격검정 사이트에 2027년 일정이 공고되면 날짜를 고치고 확정에 체크하세요.
      </p>
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700 dark:text-slate-200">
          플랜 시작일 <span className="font-bold tabular-nums">{settings.planStart}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={restartPlan}
            disabled={settings.planStart === today}
            className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            오늘부터 다시 시작
          </button>
          <Link
            href="/plan"
            className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
          >
            플랜 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}

interface GoalSelectProps {
  id: string;
  label: string;
  unit: string;
  value: number;
  presets: readonly number[];
  onSelect: (value: number) => void;
}

function GoalSelect({ id, label, unit, value, presets, onSelect }: GoalSelectProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-slate-200">
        {label}
      </label>
      <select id={id} value={value} onChange={e => onSelect(Number(e.target.value))} className={FIELD}>
        {goalOptions(presets, value).map(n => (
          <option key={n} value={n}>
            {n}
            {unit}
          </option>
        ))}
      </select>
    </div>
  );
}

function GoalsCard({ settings, onChange }: StudySettingsProps) {
  return (
    <section className={CARD} aria-labelledby="goals-title">
      <h2 id="goals-title" className={TITLE}>
        일일 목표
      </h2>
      <p className={`mt-1 ${HINT}`}>홈의 &lsquo;오늘의 학습&rsquo; 목표량이에요. 복습할 문제·카드는 목표와 별개로 추가돼요.</p>
      <div className="mt-3 space-y-3">
        <GoalSelect
          id="goal-questions"
          label="문제 풀이"
          unit="문제"
          value={settings.dailyQuestionGoal}
          presets={QUESTION_GOALS}
          onSelect={n => onChange({ dailyQuestionGoal: n })}
        />
        <GoalSelect
          id="goal-cards"
          label="개념 카드"
          unit="장"
          value={settings.dailyCardGoal}
          presets={CARD_GOALS}
          onSelect={n => onChange({ dailyCardGoal: n })}
        />
      </div>
    </section>
  );
}

function ShuffleCard({ settings, onChange }: StudySettingsProps) {
  const on = settings.shuffleOptions;
  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="shuffle-title" className={TITLE}>
            보기 섞기
          </h2>
          <p className={`mt-1 ${HINT}`}>
            학습 모드에서 보기 순서를 섞어요. &lsquo;3번이 정답&rsquo;처럼 위치로 외우는 암기 착시를 막아 실력을 정직하게 잴 수
            있어요. 실전 모드는 항상 섞어요.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="shuffle-title"
          onClick={() => onChange({ shuffleOptions: !on })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
            on ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white dark:bg-slate-100 shadow transition-transform ${
              on ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </section>
  );
}

/** 시험 일정 · 일일 목표 · 보기 섞기 — every change is saved immediately via the parent's saveSettings. */
export default function StudySettings(props: StudySettingsProps) {
  return (
    <>
      <ExamDateCard {...props} />
      <GoalsCard {...props} />
      <ShuffleCard {...props} />
    </>
  );
}
