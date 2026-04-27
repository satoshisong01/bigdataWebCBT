'use client';

import { useMemo } from 'react';
import { ExamRecord } from '@/lib/storage';
import { SUBJECTS } from '@/data/subjects';
import { getAllQuestions } from '@/data';

interface DashboardProps {
  history: ExamRecord[];
  /** Map<examKey, Record<questionId, answerNum>> — answers persisted from localStorage */
  answersMap: Record<string, Record<string, number>>;
}

interface SubjectStat {
  id: number;
  name: string;
  total: number;
  correct: number;
  accuracy: number;
  passed: boolean;
}

export default function Dashboard({ history, answersMap }: DashboardProps) {
  const allQuestions = useMemo(() => getAllQuestions(), []);
  const questionMap = useMemo(() => {
    const m = new Map<string, { subject: number; answer: number }>();
    for (const q of allQuestions) {
      m.set(q.id, { subject: q.subject, answer: q.answer });
    }
    return m;
  }, [allQuestions]);

  /** Compute per-subject accuracy across ALL persisted attempts (most recent answer per question wins) */
  const subjectStats = useMemo<SubjectStat[]>(() => {
    const latest: Record<string, number> = {};
    for (const ans of Object.values(answersMap)) {
      Object.assign(latest, ans);
    }

    const totals: Record<number, { correct: number; total: number }> = {};
    for (const [qId, picked] of Object.entries(latest)) {
      const meta = questionMap.get(qId);
      if (!meta) continue;
      if (!totals[meta.subject]) totals[meta.subject] = { correct: 0, total: 0 };
      totals[meta.subject].total += 1;
      if (picked === meta.answer) totals[meta.subject].correct += 1;
    }

    return SUBJECTS.map(s => {
      const t = totals[s.id] ?? { correct: 0, total: 0 };
      const accuracy = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        total: t.total,
        correct: t.correct,
        accuracy,
        passed: t.total === 0 ? true : accuracy >= 40,
      };
    });
  }, [answersMap, questionMap]);

  /** Last 7 session-mode records sorted by date (oldest first) */
  const trend = useMemo(() => {
    const sessionRecords = history
      .filter(r => r.key.startsWith('session-'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
    return sessionRecords.map(r => ({
      label: r.key.replace('session-', '제') + '회',
      score: r.score,
      passed: r.passed,
    }));
  }, [history]);

  /** Pass prediction: average of (recent session score) AND penalize subjects with <40 (potential 과락) */
  const prediction = useMemo(() => {
    const recentSessionScores = history
      .filter(r => r.key.startsWith('session-'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map(r => r.score);

    const recentAvg = recentSessionScores.length
      ? recentSessionScores.reduce((sum, s) => sum + s, 0) / recentSessionScores.length
      : 0;

    const subjectAvg = subjectStats.filter(s => s.total > 0).map(s => s.accuracy);
    const subjectMean = subjectAvg.length
      ? subjectAvg.reduce((sum, s) => sum + s, 0) / subjectAvg.length
      : 0;

    // Weighted: 60% recent session avg + 40% subject mean across all attempts
    const blended =
      recentSessionScores.length > 0
        ? Math.round(recentAvg * 0.6 + subjectMean * 0.4)
        : Math.round(subjectMean);

    const failingSubject = subjectStats.find(s => s.total > 0 && s.accuracy < 40);

    let status: 'pass-likely' | 'borderline' | 'fail-likely' | 'unknown';
    if (subjectAvg.length === 0 && recentSessionScores.length === 0) status = 'unknown';
    else if (failingSubject) status = 'fail-likely';
    else if (blended >= 70) status = 'pass-likely';
    else if (blended >= 60) status = 'borderline';
    else status = 'fail-likely';

    return { score: blended, status, failingSubject };
  }, [history, subjectStats]);

  const hasData =
    subjectStats.some(s => s.total > 0) || trend.length > 0;

  if (!hasData) return null;

  return (
    <section className="space-y-3 sm:space-y-4">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100">학습 대시보드</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Pass prediction */}
        <div
          className={`p-4 sm:p-6 rounded-xl border ${
            prediction.status === 'pass-likely'
              ? 'bg-green-50 border-green-200'
              : prediction.status === 'borderline'
                ? 'bg-yellow-50 border-yellow-200'
                : prediction.status === 'fail-likely'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 mb-2">
            합격 예측
          </div>
          <div
            className={`text-3xl sm:text-4xl font-black ${
              prediction.status === 'pass-likely'
                ? 'text-green-600'
                : prediction.status === 'borderline'
                  ? 'text-yellow-600'
                  : prediction.status === 'fail-likely'
                    ? 'text-red-600'
                    : 'text-gray-500 dark:text-slate-400'
            }`}
          >
            {prediction.status === 'unknown' ? '-' : `${prediction.score}점`}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-2">
            {prediction.status === 'pass-likely' && '합격권 — 페이스 유지'}
            {prediction.status === 'borderline' && '경계권 — 약점 보강 필요'}
            {prediction.status === 'fail-likely' && (
              prediction.failingSubject
                ? `${prediction.failingSubject.name} 과락 위험`
                : '아직 합격선 미달'
            )}
            {prediction.status === 'unknown' && '데이터 부족'}
          </div>
        </div>

        {/* Recent score trend */}
        <div className="p-4 sm:p-6 rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 lg:col-span-2">
          <div className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 mb-3">
            최근 회차별 성적 (최대 7회)
          </div>
          {trend.length === 0 ? (
            <div className="text-xs sm:text-sm text-gray-400 dark:text-slate-500 py-6 text-center">
              아직 풀이 기록이 없어요
            </div>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-2 h-28 sm:h-32">
              {trend.map((t, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-slate-300">
                    {t.score}
                  </div>
                  <div className="w-full bg-gray-100 rounded-t flex items-end h-full">
                    <div
                      className={`w-full rounded-t transition-all ${
                        t.passed ? 'bg-green-500' : 'bg-red-400'
                      }`}
                      style={{ height: `${Math.max(t.score, 4)}%` }}
                    />
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 truncate w-full text-center">
                    {t.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per-subject accuracy */}
      <div className="p-4 sm:p-6 rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
        <div className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 mb-3">
          과목별 정답률 (누적 풀이 기준)
        </div>
        <div className="space-y-2 sm:space-y-3">
          {subjectStats.map(s => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 w-32 sm:w-40 truncate">
                {s.id}과목 · {s.name}
              </div>
              <div className="flex-1 h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.total === 0
                      ? 'bg-gray-200'
                      : s.accuracy >= 60
                        ? 'bg-green-500'
                        : s.accuracy >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  }`}
                  style={{ width: s.total === 0 ? '0%' : `${s.accuracy}%` }}
                />
              </div>
              <div
                className={`text-xs sm:text-sm font-bold w-14 sm:w-16 text-right ${
                  s.total === 0
                    ? 'text-gray-300 dark:text-slate-600'
                    : s.passed
                      ? 'text-blue-600'
                      : 'text-red-600'
                }`}
              >
                {s.total === 0 ? '-' : `${s.accuracy}점`}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-3">
          과목당 40점 미만은 과락 위험. 합격: 평균 60 + 모든 과목 40 이상.
        </div>
      </div>
    </section>
  );
}
