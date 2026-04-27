'use client';

import { useEffect, useState } from 'react';
import { Question } from '@/types';
import { questionImages, explanationImages } from '@/data/images';
import { isBookmarked, toggleBookmark } from '@/lib/storage';
import MathText from './MathText';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: number | undefined;
  onAnswer: (answer: number) => void;
  showExplanation: boolean;
  isSubmitted: boolean;
}

export default function QuestionCard({
  question,
  selectedAnswer,
  onAnswer,
  showExplanation,
  isSubmitted,
}: QuestionCardProps) {
  const images = questionImages[question.id] ?? [];
  const explImages = explanationImages[question.id] ?? [];

  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    setBookmarked(isBookmarked(question.id));
  }, [question.id]);

  const handleBookmark = () => {
    const next = toggleBookmark(question.id);
    setBookmarked(next);
  };

  const getOptionClass = (optionNum: number): string => {
    const base = 'w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all flex items-start gap-2.5 sm:gap-3 active:scale-[0.98]';

    if (!isSubmitted && !showExplanation) {
      if (selectedAnswer === optionNum) {
        return `${base} border-blue-500 bg-blue-50`;
      }
      return `${base} border-gray-200 dark:border-slate-800 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer`;
    }

    const isCorrect = optionNum === question.answer;
    const isSelected = selectedAnswer === optionNum;

    if (isCorrect) return `${base} border-green-500 bg-green-50`;
    if (isSelected && !isCorrect) return `${base} border-red-500 bg-red-50`;
    return `${base} border-gray-200 dark:border-slate-800 opacity-60`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start gap-2">
        <div className="flex-1 text-base sm:text-lg leading-relaxed text-gray-900 dark:text-slate-100">
          <span className="text-blue-600 font-bold mr-2">Q{question.number}.</span>
          <MathText text={question.question} className="font-medium" />
        </div>
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={bookmarked ? '북마크 해제' : '북마크 추가'}
          title={bookmarked ? '북마크 해제' : '북마크 추가'}
          className={`flex-shrink-0 w-9 h-9 rounded-lg border transition flex items-center justify-center text-lg ${
            bookmarked
              ? 'border-yellow-400 bg-yellow-50 text-yellow-500 hover:bg-yellow-100'
              : 'border-gray-200 dark:border-slate-800 bg-white text-gray-300 dark:text-slate-600 hover:text-yellow-500 hover:border-yellow-300'
          }`}
        >
          {bookmarked ? '★' : '☆'}
        </button>
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((url, idx) => (
            <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 bg-white">
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

      <div className="space-y-2 sm:space-y-3">
        {question.options.map((option, idx) => {
          const optionNum = idx + 1;
          return (
            <button
              key={idx}
              onClick={() => !isSubmitted && onAnswer(optionNum)}
              disabled={isSubmitted}
              className={getOptionClass(optionNum)}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 text-xs sm:text-sm font-bold flex-shrink-0">
                {optionNum}
              </span>
              <MathText text={option} className="text-sm sm:text-base text-gray-800 dark:text-slate-100 pt-0.5" />
              {(isSubmitted || showExplanation) && optionNum === question.answer && (
                <span className="ml-auto text-green-600 font-bold flex-shrink-0">O</span>
              )}
              {(isSubmitted || showExplanation) &&
                selectedAnswer === optionNum &&
                optionNum !== question.answer && (
                  <span className="ml-auto text-red-600 font-bold flex-shrink-0">X</span>
                )}
            </button>
          );
        })}
      </div>

      {(isSubmitted || showExplanation) && (
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <div className="font-bold text-amber-800 mb-1 text-sm sm:text-base">해설</div>
          <MathText
            text={question.explanation}
            className="text-amber-900 leading-relaxed text-sm sm:text-base block"
          />
          {explImages.length > 0 && (
            <div className="space-y-2 pt-2">
              {explImages.map((url, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden border border-amber-200 bg-white">
                  <img
                    src={url}
                    alt={`문제 ${question.number} 해설 이미지 ${idx + 1}`}
                    className="w-full h-auto max-h-64 sm:max-h-96 object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
