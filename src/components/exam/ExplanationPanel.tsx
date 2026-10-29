'use client';

import type { Question } from '@/types';
import { explanationImages } from '@/data/images';
import { topicName, topicPath } from '@/data/criteria';
import MathText from '@/components/MathText';
import RelatedConcepts from './RelatedConcepts';

interface ExplanationPanelProps {
  question: Question;
}

/** 해설 영역: 정답 논란 경고 + 해설(+이미지) + 출제기준 칩 + 관련 개념 카드. Per-option notes live in OptionList. */
export default function ExplanationPanel({ question }: ExplanationPanelProps) {
  const images = explanationImages[question.id] ?? [];
  const topics = question.topics ?? [];

  return (
    <div className="space-y-3">
      {question.answerDispute && (
        <div
          role="note"
          className="p-3 sm:p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
        >
          <div className="font-bold text-red-700 dark:text-red-300 text-sm mb-1">⚠ 정답 논란 주의</div>
          <MathText
            text={question.answerDispute}
            className="block text-sm text-red-800 dark:text-red-200 leading-relaxed"
          />
        </div>
      )}

      <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg space-y-3">
        <div className="font-bold text-amber-800 dark:text-amber-300 text-sm sm:text-base">해설</div>
        <MathText
          text={question.explanation}
          className="text-amber-900 dark:text-amber-100 leading-relaxed text-sm sm:text-base block"
        />
        {images.length > 0 && (
          <div className="space-y-2 pt-2">
            {images.map((url, idx) => (
              <div
                key={`${idx}:${url}`}
                className="rounded-lg overflow-hidden border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote figures of unknown size */}
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

      {topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-slate-400 mr-1">출제기준</span>
          {topics.map(topic => (
            <span
              key={topic}
              title={topicPath(topic).join(' › ')}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            >
              {topicName(topic)}
            </span>
          ))}
        </div>
      )}

      {topics.length > 0 && <RelatedConcepts topics={topics} />}
    </div>
  );
}
