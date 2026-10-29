'use client';

import Link from 'next/link';
import type { ExamResult } from '@/types';
import type { WrongTopic } from '@/hooks/exam/results';

interface ResultViewProps {
  result: ExamResult;
  wrongCount: number;
  /** most-missed 세세항목 of this run (top 5) */
  wrongTopics: readonly WrongTopic[];
  strict: boolean;
  shuffled: boolean;
  /** 틀린 문제만 다시 풀기 run: the score includes earlier correct answers */
  isRetry: boolean;
  /** some records could not be saved */
  saveFailed: boolean;
  onReview: () => void;
  onRetry: () => void;
  onRetryWrong: () => void;
  onHome: () => void;
}

function modeNote(strict: boolean, shuffled: boolean, isRetry: boolean): string {
  if (isRetry) return '틀린 문제 재풀이 점수예요. 이전에 맞힌 문제가 합산돼 있어 실제 실력보다 높게 나와요.';
  if (strict) return '실전 모드 · 보기 섞기 — 해설 없이 푼 점수라 실제 시험에 가장 가까워요. 합격 준비도에 반영됩니다.';
  if (shuffled) return '학습 모드 · 보기 섞기 — 해설을 보며 푼 점수예요. 실력 점검은 실전 모드 모의고사로 해 보세요.';
  return '학습 모드 · 보기 순서 고정 — 같은 문제를 반복하면 보기 위치를 외워 점수가 높게 나올 수 있어요. 설정에서 보기 섞기를 켜 보세요.';
}

export default function ResultView({
  result,
  wrongCount,
  wrongTopics,
  strict,
  shuffled,
  isRetry,
  saveFailed,
  onReview,
  onRetry,
  onRetryWrong,
  onHome,
}: ResultViewProps) {
  const minutes = Math.floor(result.timeTaken / 60);
  const seconds = result.timeTaken % 60;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-8 sm:pt-4">
      <div className="max-w-xl w-full space-y-4 sm:space-y-6 py-4">
        <div
          className={`text-center p-6 sm:p-8 rounded-2xl border-2 ${
            result.passed
              ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900'
              : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
          }`}
        >
          <div
            className={`text-4xl sm:text-5xl font-black ${
              result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {result.passed ? '합격' : '불합격'}
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-slate-100 mt-3 sm:mt-4">{result.score}점</div>
          <div className="text-gray-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
            {result.correctCount} / {result.totalQuestions} 정답
          </div>
          <div className="text-xs sm:text-sm text-gray-400 dark:text-slate-500 mt-1">
            소요시간 {minutes}분 {seconds}초
          </div>
        </div>

        <p
          className={`text-xs sm:text-sm p-3 rounded-lg border ${
            strict && !isRetry
              ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200'
              : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
          }`}
        >
          {modeNote(strict, shuffled, isRetry)}
        </p>

        {saveFailed && (
          <p
            role="alert"
            className="text-xs sm:text-sm p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200"
          >
            일부 기록을 저장하지 못했어요. 브라우저 저장 공간이 부족하거나 사생활 보호 모드일 수 있어요.
          </p>
        )}

        <div className="space-y-2 sm:space-y-3">
          <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-slate-100">과목별 성적</h3>
          {result.subjectScores.map(s => (
            <div
              key={s.subject}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base text-gray-800 dark:text-slate-100 truncate">{s.subjectName}</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  {s.correct} / {s.total} 정답
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className={`text-lg sm:text-xl font-bold ${
                    s.passed ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {s.score}점
                </div>
                {!s.passed && <div className="text-xs text-red-500 dark:text-red-400 font-medium">과락</div>}
              </div>
              <div className="w-16 sm:w-20 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.score >= 60 ? 'bg-green-500' : s.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {wrongTopics.length > 0 && <WrongTopicList topics={wrongTopics} />}

        <div className="text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-slate-800">
          <div className="font-medium text-gray-700 dark:text-slate-300 mb-1">합격 기준</div>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
            <li>전 과목 평균 60점 이상</li>
            <li>과목당 40점 이상 (과락 기준)</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onReview}
            className="py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition"
          >
            해설 보기
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="py-2.5 sm:py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition"
          >
            다시 풀기
          </button>
          {wrongCount > 0 && (
            <button
              type="button"
              onClick={onRetryWrong}
              className="col-span-2 py-2.5 sm:py-3 bg-red-500 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-red-600 active:bg-red-700 transition"
            >
              틀린 문제만 다시 풀기 ({wrongCount}문제)
            </button>
          )}
          <button
            type="button"
            onClick={onHome}
            className="col-span-2 py-2.5 sm:py-3 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 text-sm sm:text-base font-bold rounded-lg hover:bg-gray-300 active:bg-gray-400 dark:hover:bg-slate-600 dark:active:bg-slate-500 transition"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}

interface WrongTopicListProps {
  topics: readonly WrongTopic[];
}

function WrongTopicList({ topics }: WrongTopicListProps) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div>
        <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-slate-100">이번에 틀린 세세항목</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">개념 카드로 바로 메워 두세요.</p>
      </div>
      <ul className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
        {topics.map(t => (
          <li key={t.topic}>
            <Link
              href={`/concepts?topic=${encodeURIComponent(t.topic)}`}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm sm:text-base font-medium text-gray-800 dark:text-slate-100 truncate">{t.name}</span>
                <span className="block text-xs text-gray-400 dark:text-slate-500">{t.topic}</span>
              </span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0">{t.count}문제</span>
              <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">개념 보기 &rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
