'use client';

import { Question } from '@/types';
import { questionImages } from '@/data/images';

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

  const getOptionClass = (optionNum: number): string => {
    const base = 'w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-3';

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
    <div className="space-y-6">
      <div className="text-lg leading-relaxed text-gray-900">
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
                className="w-full h-auto max-h-96 object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const optionNum = idx + 1;
          return (
            <button
              key={idx}
              onClick={() => !isSubmitted && onAnswer(optionNum)}
              disabled={isSubmitted}
              className={getOptionClass(optionNum)}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-bold flex-shrink-0">
                {optionNum}
              </span>
              <span className="text-gray-800 pt-0.5">{option}</span>
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
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="font-bold text-amber-800 mb-1">해설</div>
          <div className="text-amber-900 leading-relaxed whitespace-pre-wrap">
            {question.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
