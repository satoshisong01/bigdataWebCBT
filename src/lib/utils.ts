import { Question, ExamResult, SubjectScore } from '@/types';
import { SUBJECTS } from '@/data/subjects';
import { RetryContext } from '@/lib/storage';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function buildRetryContext(
  questions: readonly Question[],
  answers: Readonly<Record<string, number>>,
  current: RetryContext | null,
): RetryContext {
  if (current) {
    const newBaseCorrect = { ...current.baseCorrect };
    for (const q of questions) {
      if (answers[q.id] === q.answer) {
        newBaseCorrect[q.subject] = (newBaseCorrect[q.subject] ?? 0) + 1;
      }
    }
    return { totals: current.totals, baseCorrect: newBaseCorrect };
  }
  const totals: Record<number, number> = {};
  const baseCorrect: Record<number, number> = {};
  for (const q of questions) {
    totals[q.subject] = (totals[q.subject] ?? 0) + 1;
    if (answers[q.id] === q.answer) {
      baseCorrect[q.subject] = (baseCorrect[q.subject] ?? 0) + 1;
    }
  }
  return { totals, baseCorrect };
}

export function calculateResult(
  questions: readonly Question[],
  answers: Readonly<Record<string, number>>,
  timeTaken: number,
  retryCtx?: RetryContext,
): ExamResult {
  const subjectMap = new Map<number, { name: string; total: number; correct: number }>();

  for (const q of questions) {
    const entry = subjectMap.get(q.subject) ?? { name: q.subjectName, total: 0, correct: 0 };
    entry.total += 1;
    if (answers[q.id] === q.answer) {
      entry.correct += 1;
    }
    subjectMap.set(q.subject, entry);
  }

  let subjectScores: SubjectScore[];

  if (retryCtx) {
    subjectScores = SUBJECTS
      .filter(s => retryCtx.totals[s.id] !== undefined)
      .map(s => {
        const origTotal = retryCtx.totals[s.id];
        const base = retryCtx.baseCorrect[s.id] ?? 0;
        const retryData = subjectMap.get(s.id);
        const retryCorrect = retryData?.correct ?? 0;
        const finalCorrect = base + retryCorrect;
        const score = origTotal > 0 ? Math.round((finalCorrect / origTotal) * 100) : 0;
        return {
          subject: s.id,
          subjectName: retryData?.name ?? s.name,
          total: origTotal,
          correct: finalCorrect,
          score,
          passed: score >= 40,
        };
      });
  } else {
    subjectScores = SUBJECTS
      .filter(s => subjectMap.has(s.id))
      .map(s => {
        const data = subjectMap.get(s.id)!;
        const score = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        return {
          subject: s.id,
          subjectName: data.name,
          total: data.total,
          correct: data.correct,
          score,
          passed: score >= 40,
        };
      });
  }

  const totalCorrect = subjectScores.reduce((sum, s) => sum + s.correct, 0);
  const totalQuestions = retryCtx
    ? Object.values(retryCtx.totals).reduce((sum, t) => sum + t, 0)
    : questions.length;
  const totalScore = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;
  const allSubjectsPassed = subjectScores.every(s => s.passed);

  return {
    totalQuestions,
    correctCount: totalCorrect,
    score: totalScore,
    subjectScores,
    passed: totalScore >= 60 && allSubjectsPassed,
    timeTaken,
  };
}

export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
