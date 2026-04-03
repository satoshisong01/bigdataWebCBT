'use client';

import { Question } from '@/types';
import { questionImages, explanationImages } from '@/data/images';

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

  const getOptionClass = (optionNum: number): string => {
    const base = 'w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all flex items-start gap-2.5 sm:gap-3 active:scale-[0.98]';

    if (!isSubmitted && !showExplanation) {
      if (selectedAnswer === optionNum) {
        return `${base} border-blue-500 bg-blue-50`;
      }
      return `${base} border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer`;
    }

    const isCorrect = optionNum === question.answer;
    const isSelected = selectedAnswer === optionNum;

    if (isCorrect) return `${base} border-green-500 bg-green-50`;
    if (isSelected && !isCorrect) return `${base} border-red-500 bg-red-50`;
    return `${base} border-gray-200 opacity-60`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-base sm:text-lg leading-relaxed text-gray-900">
        <span className="text-blue-600 font-bold mr-2">Q{question.number}.</span>
        <span className="font-medium whitespace-pre-wrap">{question.question}</span>
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((url, idx) => (
            <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
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
              <span className="text-sm sm:text-base text-gray-800 pt-0.5">{option}</span>
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
          <div className="text-amber-900 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
            {question.explanation}
          </div>
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
