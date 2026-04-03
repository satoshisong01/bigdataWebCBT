import { Question, ExamResult, SubjectScore } from '@/types';
import { SUBJECTS } from '@/data/subjects';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function calculateResult(
  questions: readonly Question[],
  answers: Readonly<Record<string, number>>,
  timeTaken: number
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

  const subjectScores: SubjectScore[] = SUBJECTS
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

  const totalCorrect = subjectScores.reduce((sum, s) => sum + s.correct, 0);
  const totalScore = questions.length > 0
    ? Math.round((totalCorrect / questions.length) * 100)
    : 0;
  const allSubjectsPassed = subjectScores.every(s => s.passed);

  return {
    totalQuestions: questions.length,
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
