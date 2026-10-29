'use client';

import MathText from '@/components/MathText';

interface ChoiceListProps {
  options: readonly string[];
  /** 1-based correct option */
  answer: number;
  /** 1-based picked option; once set the list locks and shows the result */
  picked?: number;
  onPick: (option: number) => void;
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'rest';

const ROW_CLASS: Readonly<Record<ChoiceState, string>> = {
  idle:
    'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 active:scale-[0.99]',
  correct: 'border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-950/40',
  wrong: 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/40',
  rest: 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60',
};

const NUM_CLASS: Readonly<Record<ChoiceState, string>> = {
  idle: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300',
  correct: 'bg-green-600 dark:bg-green-500 text-white dark:text-white',
  wrong: 'bg-red-600 dark:bg-red-500 text-white dark:text-white',
  rest: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
};

function stateOf(option: number, answer: number, picked: number | undefined): ChoiceState {
  if (picked === undefined) return 'idle';
  if (option === answer) return 'correct';
  return option === picked ? 'wrong' : 'rest';
}

/** Multiple-choice options for 용어 퀴즈 and 계산 드릴 (keyboard 1–4 is wired by the parent). */
export default function ChoiceList({ options, answer, picked, onPick }: ChoiceListProps) {
  const locked = picked !== undefined;
  return (
    <ol className="space-y-2">
      {options.map((text, i) => {
        const option = i + 1;
        const state = stateOf(option, answer, picked);
        return (
          <li key={option}>
            <button
              type="button"
              disabled={locked}
              onClick={() => onPick(option)}
              className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition flex items-start gap-3 disabled:cursor-default ${ROW_CLASS[state]}`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${NUM_CLASS[state]}`}
              >
                {option}
              </span>
              <MathText
                text={text}
                className="flex-1 min-w-0 break-words text-sm sm:text-base text-gray-800 dark:text-slate-100 pt-0.5"
              />
              {state === 'correct' && (
                <span className="flex-shrink-0 text-xs font-bold text-green-700 dark:text-green-400 pt-1">정답</span>
              )}
              {state === 'wrong' && (
                <span className="flex-shrink-0 text-xs font-bold text-red-700 dark:text-red-400 pt-1">내 답</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
