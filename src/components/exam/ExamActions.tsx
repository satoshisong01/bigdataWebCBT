'use client';

type Size = 'sm' | 'md';

/** mobile buttons stretch in a row; desktop buttons size to their label */
const SIZE: Readonly<Record<Size, string>> = {
  sm: 'flex-1 py-2.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

const NAV_SIZE: Readonly<Record<Size, string>> = {
  sm: 'flex-1 py-2.5 text-sm',
  md: 'px-5 py-2.5',
};

const PREV_CLASS =
  'bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition';
const NEXT_CLASS =
  'bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition';
const SUBMIT_CLASS = 'bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 active:bg-red-700 transition';
const TOGGLE_OFF =
  'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

interface ExamActionsProps {
  /** after submit (해설 보기): navigation only */
  reviewing: boolean;
  /** 실전 모드: no 해설/패스/확인 */
  strict: boolean;
  isFirst: boolean;
  isLast: boolean;
  hasAnswer: boolean;
  checked: boolean;
  passed: boolean;
  shown: boolean;
  unsure: boolean;
  unsureLocked: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onToggleExplanation: () => void;
  onToggleUnsure: () => void;
  onPass: () => void;
  onCheck: () => void;
}

interface ButtonsProps extends ExamActionsProps {
  size: Size;
}

function ExplanationButton({ size, shown, onToggleExplanation }: ButtonsProps) {
  const label = shown ? '해설 숨기기' : size === 'sm' ? '해설' : '해설 보기';
  const tone = shown
    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800'
    : TOGGLE_OFF;
  return (
    <button type="button" onClick={onToggleExplanation} aria-pressed={shown} className={`${SIZE[size]} rounded-lg font-medium transition ${tone}`}>
      {label}
    </button>
  );
}

function UnsureButton({ size, unsure, unsureLocked, onToggleUnsure }: ButtonsProps) {
  const tone = unsure
    ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800'
    : TOGGLE_OFF;
  return (
    <button
      type="button"
      onClick={onToggleUnsure}
      disabled={unsureLocked}
      aria-pressed={unsure}
      title="맞혀도 확신이 없으면 표시하세요. 복습 덱에 들어가 다시 나와요."
      className={`${SIZE[size]} rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${tone}`}
    >
      {unsure ? '헷갈림 ✓' : '헷갈림'}
    </button>
  );
}

function PassButton({ size, passed, checked, onPass }: ButtonsProps) {
  if (checked) return null;
  if (passed) {
    return (
      <span
        className={`${SIZE[size]} rounded-lg font-bold text-center bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900`}
      >
        패스됨
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onPass}
      className={`${SIZE[size]} rounded-lg font-bold bg-gray-400 text-white hover:bg-gray-500 active:bg-gray-600 dark:bg-slate-600 dark:hover:bg-slate-500 transition`}
    >
      패스
    </button>
  );
}

function CheckButton({ size, checked, isLast, hasAnswer, onCheck }: ButtonsProps) {
  const tone = checked
    ? isLast
      ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
      : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
    : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed';
  const nextLabel = size === 'sm' ? '다음 문제' : '다음 문제 →';
  return (
    <button type="button" onClick={onCheck} disabled={!hasAnswer} className={`${SIZE[size]} rounded-lg font-bold transition ${tone}`}>
      {checked ? (isLast ? '제출' : nextLabel) : '확인'}
    </button>
  );
}

function StudyTools(props: ButtonsProps) {
  if (props.reviewing) return null;
  return (
    <>
      {!props.strict && <ExplanationButton {...props} />}
      <UnsureButton {...props} />
      {!props.strict && <PassButton {...props} />}
      {!props.strict && <CheckButton {...props} />}
    </>
  );
}

function PrevButton({ size, isFirst, onPrev }: ButtonsProps) {
  return (
    <button type="button" onClick={onPrev} disabled={isFirst} className={`${NAV_SIZE[size]} ${PREV_CLASS}`}>
      &larr; 이전
    </button>
  );
}

function ForwardButton({ size, reviewing, isLast, onNext, onSubmit }: ButtonsProps) {
  if (!reviewing && isLast) {
    return (
      <button type="button" onClick={onSubmit} className={`${NAV_SIZE[size]} ${SUBMIT_CLASS}`}>
        제출
      </button>
    );
  }
  return (
    <button type="button" onClick={onNext} disabled={isLast} className={`${NAV_SIZE[size]} ${NEXT_CLASS}`}>
      다음 &rarr;
    </button>
  );
}

export default function ExamActions(props: ExamActionsProps) {
  return (
    <div className="mt-4 pt-4 sm:pt-6 border-t border-gray-200 dark:border-slate-800">
      {/* Mobile: tools row + navigation row */}
      <div className="flex sm:hidden flex-col gap-2">
        {!props.reviewing && (
          <div className="flex gap-2">
            <StudyTools {...props} size="sm" />
          </div>
        )}
        <div className="flex gap-2">
          <PrevButton {...props} size="sm" />
          <ForwardButton {...props} size="sm" />
        </div>
      </div>

      {/* Desktop: single row */}
      <div className="hidden sm:flex items-center justify-between gap-2">
        <PrevButton {...props} size="md" />
        <div className="flex items-center gap-2">
          <StudyTools {...props} size="md" />
        </div>
        <ForwardButton {...props} size="md" />
      </div>
    </div>
  );
}
