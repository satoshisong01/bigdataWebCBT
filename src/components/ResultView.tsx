'use client';

import { ExamResult } from '@/types';

interface ResultViewProps {
  result: ExamResult;
  wrongCount: number;
  onReview: () => void;
  onRetry: () => void;
  onRetryWrong: () => void;
  onHome: () => void;
}

export default function ResultView({ result, wrongCount, onReview, onRetry, onRetryWrong, onHome }: ResultViewProps) {
  const minutes = Math.floor(result.timeTaken / 60);
  const seconds = result.timeTaken % 60;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-8 sm:pt-4">
      <div className="max-w-xl w-full space-y-4 sm:space-y-6">
        <div
          className={`text-center p-6 sm:p-8 rounded-2xl ${
            result.passed
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-red-50 border-2 border-red-200'
          }`}
        >
          <div
            className={`text-4xl sm:text-5xl font-black ${
              result.passed ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {result.passed ? '합격' : '불합격'}
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-800 mt-3 sm:mt-4">{result.score}점</div>
          <div className="text-gray-500 mt-2 text-sm sm:text-base">
            {result.correctCount} / {result.totalQuestions} 정답
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">
            소요시간 {minutes}분 {seconds}초
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h3 className="font-bold text-base sm:text-lg text-gray-800">과목별 성적</h3>
          {result.subjectScores.map(s => (
            <div
              key={s.subject}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base text-gray-800 truncate">{s.subjectName}</div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {s.correct} / {s.total} 정답
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className={`text-lg sm:text-xl font-bold ${
                    s.passed ? 'text-blue-600' : 'text-red-600'
                  }`}
                >
                  {s.score}점
                </div>
                {!s.passed && <div className="text-xs text-red-500 font-medium">과락</div>}
              </div>
              <div className="w-16 sm:w-20 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.score >= 60
                      ? 'bg-green-500'
                      : s.score >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-500 bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <div className="font-medium text-gray-700 mb-1">합격 기준</div>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
            <li>전 과목 평균 60점 이상</li>
            <li>과목당 40점 이상 (과락 기준)</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            onClick={onReview}
            className="py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition"
          >
            해설 보기
          </button>
          <button
            onClick={onRetry}
            className="py-2.5 sm:py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition"
          >
            다시 풀기
          </button>
          {wrongCount > 0 && (
            <button
              onClick={onRetryWrong}
              className="col-span-2 py-2.5 sm:py-3 bg-red-500 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-red-600 active:bg-red-700 transition"
            >
              틀린 문제만 다시 풀기 ({wrongCount}문제)
            </button>
          )}
          <button
            onClick={onHome}
            className="col-span-2 py-2.5 sm:py-3 bg-gray-200 text-gray-800 text-sm sm:text-base font-bold rounded-lg hover:bg-gray-300 active:bg-gray-400 transition"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
