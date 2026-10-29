'use client';

import MathText from '@/components/MathText';

interface OptionListProps {
  /** display order */
  options: readonly string[];
  /** correct option, display numbering */
  answer: number;
  /** learner's pick, display numbering */
  selected: number | undefined;
  /** per-option rationale in display order (question.optionNotes) */
  notes?: readonly string[];
  revealed: boolean;
  locked: boolean;
  onPick: (option: number) => void;
}

type Tone = 'correct' | 'picked-wrong' | 'other';

function toneOf(option: number, answer: number, selected: number | undefined): Tone {
  if (option === answer) return 'correct';
  return option === selected ? 'picked-wrong' : 'other';
}

const BASE = 'w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all flex items-start gap-2.5 sm:gap-3';

function optionClass(option: number, props: OptionListProps): string {
  const pressable = props.locked ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]';
  if (!props.revealed) {
    return props.selected === option
      ? `${BASE} ${pressable} border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40`
      : `${BASE} ${pressable} border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/20`;
  }
  switch (toneOf(option, props.answer, props.selected)) {
    case 'correct':
      return `${BASE} ${pressable} border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/40`;
    case 'picked-wrong':
      return `${BASE} ${pressable} border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/40`;
    case 'other':
      return `${BASE} ${pressable} border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900`;
  }
}

const NOTE_CLASS: Readonly<Record<Tone, string>> = {
  correct: 'text-green-700 dark:text-green-400',
  'picked-wrong': 'text-red-700 dark:text-red-400',
  other: 'text-gray-500 dark:text-slate-400',
};

export default function OptionList(props: OptionListProps) {
  const { options, answer, selected, notes, revealed, locked, onPick } = props;
  const showNotes = revealed && notes !== undefined && notes.length === options.length;

  return (
    <div className="space-y-2 sm:space-y-3">
      {options.map((option, idx) => {
        const n = idx + 1;
        const tone = toneOf(n, answer, selected);
        const muted = revealed && tone === 'other';
        return (
          <button
            key={n}
            type="button"
            onClick={() => {
              if (!locked) onPick(n);
            }}
            disabled={locked}
            aria-pressed={selected === n}
            className={optionClass(n, props)}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold flex-shrink-0 ${
                muted ? 'opacity-60' : ''
              }`}
            >
              {n}
            </span>
            <span className="flex-1 min-w-0">
              <MathText
                text={option}
                className={`block text-sm sm:text-base text-gray-800 dark:text-slate-100 pt-0.5 ${muted ? 'opacity-60' : ''}`}
              />
              {showNotes && notes[idx] && (
                <MathText text={notes[idx]} className={`block mt-1 text-xs sm:text-sm leading-relaxed ${NOTE_CLASS[tone]}`} />
              )}
            </span>
            {revealed && tone === 'correct' && (
              <span className="ml-auto text-green-600 dark:text-green-400 font-bold flex-shrink-0">O</span>
            )}
            {revealed && tone === 'picked-wrong' && (
              <span className="ml-auto text-red-600 dark:text-red-400 font-bold flex-shrink-0">X</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
