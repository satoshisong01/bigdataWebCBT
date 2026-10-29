/**
 * /exam URL → typed exam source (pure: no storage, no React).
 * Precedence matches the original ExamView: `pool` first, then `wrong`, then `mode`.
 */

export type ExamSource =
  | { kind: 'session'; sessionId: string }
  | { kind: 'subject'; subject: number; sessionId: string | null }
  | { kind: 'wrong'; examKey: string }
  | { kind: 'bookmarks' }
  | { kind: 'wrong-pool' }
  | { kind: 'review' }
  | { kind: 'weak'; seed: number | null }
  | { kind: 'topic'; topic: string }
  | { kind: 'mock'; seed: number | null }
  | { kind: 'all' };

export type ExamSourceKind = ExamSource['kind'];

export interface ExamParams {
  source: ExamSource;
  /** 실전 모드: no 해설/확인/패스 during the exam, options always shuffled */
  strict: boolean;
}

/** 120분 — the real 필기 time for 80 questions. */
export const FULL_EXAM_SECONDS = 7200;
export const FULL_EXAM_QUESTIONS = 80;
/** 실전 모드 pace for sets shorter than a full exam */
export const STRICT_SECONDS_PER_QUESTION = 90;

const MAX_SEED = 0xffffffff;

/** uint32 seed from the URL, or null when missing/invalid. */
export function parseSeed(raw: string | null): number | null {
  if (raw === null || !/^\d{1,10}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= MAX_SEED ? n : null;
}

export function parseExamParams(sp: URLSearchParams): ExamParams {
  const strict = sp.get('strict');
  return { source: parseSource(sp), strict: strict === '1' || strict === 'true' };
}

function parseSource(sp: URLSearchParams): ExamSource {
  switch (sp.get('pool')) {
    case 'review':
      return { kind: 'review' };
    case 'wrong-pool':
      return { kind: 'wrong-pool' };
    case 'bookmarks':
      return { kind: 'bookmarks' };
    case 'weak':
      return { kind: 'weak', seed: parseSeed(sp.get('seed')) };
    case 'topic':
      return { kind: 'topic', topic: (sp.get('topic') ?? '').trim() };
    case 'mock':
      return { kind: 'mock', seed: parseSeed(sp.get('seed')) };
    default:
      break;
  }
  const wrong = sp.get('wrong');
  if (wrong) return { kind: 'wrong', examKey: wrong };
  const mode = sp.get('mode') ?? 'session';
  const id = sp.get('id') ?? '';
  if (mode === 'session') return { kind: 'session', sessionId: id };
  if (mode === 'subject') {
    return { kind: 'subject', subject: Number.parseInt(id, 10), sessionId: sp.get('session') || null };
  }
  return { kind: 'all' };
}

/** Seeded pools must carry their seed in the URL so a refresh reproduces the same set. */
export function needsSeed(source: ExamSource): boolean {
  return (source.kind === 'weak' || source.kind === 'mock') && source.seed === null;
}

/** Storage key for records/answers/retry context. Legacy keys are kept as-is (incl. 'all' for 과목 전체). */
export function examKeyOf(source: ExamSource): string {
  switch (source.kind) {
    case 'wrong-pool':
      return 'pool-wrong';
    case 'bookmarks':
      return 'pool-bookmarks';
    case 'review':
      return 'pool-review';
    case 'weak':
      return `pool-weak-${source.seed}`;
    case 'topic':
      return `pool-topic-${source.topic}`;
    case 'mock':
      return `mock-${source.seed}`;
    case 'wrong':
      return source.examKey;
    case 'session':
      return `session-${source.sessionId}`;
    case 'subject':
      return source.sessionId ? `subject-${source.subject}-${source.sessionId}` : 'all';
    case 'all':
      return 'all';
  }
}

/** Seconds. 학습 모드 keeps the classic 120분; 실전 모드 scales down for short sets (90초/문항). */
export function timeLimitFor(strict: boolean, questionCount: number): number {
  if (!strict || questionCount >= FULL_EXAM_QUESTIONS) return FULL_EXAM_SECONDS;
  return Math.max(1, questionCount) * STRICT_SECONDS_PER_QUESTION;
}
