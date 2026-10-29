import { ExamSession, QuestionSource } from '@/types';

/**
 * Light, synchronous session catalog (no question text) so pages can render
 * without pulling the whole bank. `questionCount` is asserted against the real
 * data in tests — update both together.
 */
export const SESSIONS: readonly ExamSession[] = [
  { id: 't1', name: '최신경향 대비 1회', year: 2026, round: 1, questionCount: 80, source: 'ai-trend' },
  { id: 't2', name: '최신경향 대비 2회', year: 2026, round: 2, questionCount: 80, source: 'ai-trend' },
  { id: 't3', name: '최신경향 대비 3회', year: 2026, round: 3, questionCount: 80, source: 'ai-trend' },
  { id: '8', name: '제8회', year: 2024, round: 1, questionCount: 80, source: 'restored' },
  { id: '7', name: '제7회', year: 2023, round: 2, questionCount: 80, source: 'restored' },
  { id: '6', name: '제6회', year: 2023, round: 1, questionCount: 80, source: 'restored' },
  { id: '5', name: '제5회', year: 2022, round: 2, questionCount: 80, source: 'restored' },
  { id: '4', name: '제4회', year: 2022, round: 1, questionCount: 80, source: 'restored' },
  { id: '3', name: '제3회', year: 2021, round: 2, questionCount: 80, source: 'restored' },
  { id: '2', name: '제2회', year: 2021, round: 1, questionCount: 80, source: 'restored' },
  { id: '11', name: 'AI 모의고사 4', year: 2025, round: 4, questionCount: 80, source: 'ai-mock' },
  { id: '10', name: 'AI 모의고사 3', year: 2025, round: 3, questionCount: 80, source: 'ai-mock' },
  { id: '9', name: 'AI 모의고사 2', year: 2024, round: 2, questionCount: 80, source: 'ai-mock' },
  { id: '1', name: 'AI 모의고사 1', year: 2021, round: 1, questionCount: 80, source: 'ai-mock' },
];

export const SOURCE_LABELS: Readonly<Record<QuestionSource, string>> = {
  restored: '기출복원',
  'ai-mock': 'AI 모의',
  'ai-trend': '최신경향(AI)',
};

export function getSession(id: string): ExamSession | undefined {
  return SESSIONS.find(s => s.id === id);
}

export function sessionsBySource(source: QuestionSource): ExamSession[] {
  return SESSIONS.filter(s => s.source === source);
}

/** Question ids are `${sessionId}-${number}`. */
export function sessionIdOf(questionId: string): string {
  const i = questionId.lastIndexOf('-');
  return i > 0 ? questionId.slice(0, i) : questionId;
}

export const TOTAL_QUESTIONS = SESSIONS.reduce((sum, s) => sum + s.questionCount, 0);
