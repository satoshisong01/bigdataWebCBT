'use client';

import { useState } from 'react';
import type { Question } from '@/types';
import { questionImages } from '@/data/images';
import { isBookmarked, toggleBookmark } from '@/lib/storage';
import MathText from './MathText';
import QuestionMeta from './exam/QuestionMeta';
import OptionList from './exam/OptionList';
import ExplanationPanel from './exam/ExplanationPanel';

interface QuestionCardProps {
  /** the DISPLAY question (options possibly shuffled, answer/optionNotes remapped) */
  question: Question;
  /** position in this run, 1-based */
  displayNumber: number;
  /** display numbering */
  selectedAnswer: number | undefined;
  onAnswer: (displayOption: number) => void;
  /** show correctness, per-option notes and the explanation */
  revealed: boolean;
  /** options can no longer be picked */
  locked: boolean;
}

/** Render with `key={question.id}` so the bookmark state is read per question. */
export default function QuestionCard({
  question,
  displayNumber,
  selectedAnswer,
  onAnswer,
  revealed,
  locked,
}: QuestionCardProps) {
  const images = questionImages[question.id] ?? [];
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(question.id));

  const handleBookmark = () => {
    setBookmarked(toggleBookmark(question.id));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <QuestionMeta question={question} />

      <div className="flex items-start gap-2">
        <div className="flex-1 text-base sm:text-lg leading-relaxed text-gray-900 dark:text-slate-100">
          <span className="text-blue-600 dark:text-blue-400 font-bold mr-2">Q{displayNumber}.</span>
          <MathText text={question.question} className="font-medium" />
        </div>
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={bookmarked ? '북마크 해제' : '북마크 추가'}
          aria-pressed={bookmarked}
          title={bookmarked ? '북마크 해제' : '북마크 추가'}
          className={`flex-shrink-0 w-9 h-9 rounded-lg border transition flex items-center justify-center text-lg ${
            bookmarked
              ? 'border-yellow-400 bg-yellow-50 text-yellow-500 hover:bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400 dark:hover:bg-yellow-900/40'
              : 'border-gray-200 bg-white text-gray-300 hover:text-yellow-500 hover:border-yellow-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600 dark:hover:text-yellow-400 dark:hover:border-yellow-700'
          }`}
        >
          {bookmarked ? '★' : '☆'}
        </button>
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((url, idx) => (
            <div
              key={`${idx}:${url}`}
              className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote figures of unknown size */}
              <img
                src={url}
                alt={`문제 ${question.number} 참고 이미지 ${idx + 1}`}
                className="w-full h-auto max-h-64 sm:max-h-96 object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      <OptionList
        options={question.options}
        answer={question.answer}
        selected={selectedAnswer}
        notes={question.optionNotes}
        revealed={revealed}
        locked={locked}
        onPick={onAnswer}
      />

      {revealed && <ExplanationPanel question={question} />}
    </div>
  );
}
