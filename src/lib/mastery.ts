/**
 * CONTRACT — pure analytics over the bank + stats (no storage access here).
 * Topic ids follow src/data/criteria.ts: subject 'S', 주요항목 'S.M', 세부항목 'S.M.U', 세세항목 'S.M.U.L'.
 */
import type { QuestionMeta, CardMeta } from '@/types';
import { CRITERIA, LEAVES, SUBS } from '@/data/criteria';
import type { QStat, CStat, MockRecord } from './stats';

export interface TopicStat {
  topic: string;
  /** bank questions tagged with this topic (or a descendant, after rollup) */
  questions: number;
  /** questions attempted at least once */
  attempted: number;
  /** of attempted, last attempt correct */
  correct: number;
  /** of attempted, first attempt correct (memorization-proof signal) */
  firstCorrect: number;
  /** 0–100, or -1 when attempted === 0 */
  accuracy: number;
  /** 0–100, or -1 when attempted === 0 */
  firstAccuracy: number;
}

interface Counts {
  questions: number;
  attempted: number;
  correct: number;
  firstCorrect: number;
}

const EMPTY: Counts = { questions: 0, attempted: 0, correct: 0, firstCorrect: 0 };
const LEAF_IDS: ReadonlySet<string> = new Set(LEAVES.map(l => l.id));
const LEVEL_DEPTH: Readonly<Record<'subject' | 'major' | 'sub', number>> = { subject: 1, major: 2, sub: 3 };

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : -1;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function plus(a: Counts, b: Counts): Counts {
  return {
    questions: a.questions + b.questions,
    attempted: a.attempted + b.attempted,
    correct: a.correct + b.correct,
    firstCorrect: a.firstCorrect + b.firstCorrect,
  };
}

/** One bank question's contribution; it counts as attempted once it has a recorded attempt. */
function countsOf(stat: QStat | undefined): Counts {
  if (!stat || !(stat.n > 0)) return { ...EMPTY, questions: 1 };
  return { questions: 1, attempted: 1, correct: stat.ok ? 1 : 0, firstCorrect: stat.first ? 1 : 0 };
}

function toStatMap(counts: ReadonlyMap<string, Counts>): Map<string, TopicStat> {
  return new Map(Array.from(counts, ([topic, c]): [string, TopicStat] => [topic, {
    topic,
    questions: c.questions,
    attempted: c.attempted,
    correct: c.correct,
    firstCorrect: c.firstCorrect,
    accuracy: percent(c.correct, c.attempted),
    firstAccuracy: percent(c.firstCorrect, c.attempted),
  }]));
}

/** Keyed by 세세항목 id. A question tagged with several topics counts toward each. Untagged questions are ignored. */
export function leafStats(bank: readonly QuestionMeta[], qstats: Readonly<Record<string, QStat>>): Map<string, TopicStat> {
  // Every 세세항목 is present, in criteria order (zeros when nothing is tagged with it); unknown ids are ignored.
  const counts = new Map(LEAVES.map((l): [string, Counts] => [l.id, EMPTY]));
  for (const q of bank) {
    const own = countsOf(qstats[q.id]);
    for (const topic of new Set(q.topics ?? [])) {
      const prev = counts.get(topic);
      if (prev) counts.set(topic, plus(prev, own));
    }
  }
  return toStatMap(counts);
}

function levelIds(level: 'subject' | 'major' | 'sub'): string[] {
  if (level === 'subject') return CRITERIA.map(s => String(s.id));
  if (level === 'major') return CRITERIA.flatMap(s => s.majors.map(m => m.id));
  return SUBS.map(u => u.id);
}

/** Aggregates leaf stats to 'subject' ('S'), 'major' ('S.M') or 'sub' ('S.M.U') keys; every criteria node is present even with 0 questions. */
export function rollup(leaves: ReadonlyMap<string, TopicStat>, level: 'subject' | 'major' | 'sub'): Map<string, TopicStat> {
  const depth = LEVEL_DEPTH[level];
  const counts = new Map(levelIds(level).map((id): [string, Counts] => [id, EMPTY]));
  for (const [id, stat] of leaves) {
    if (!LEAF_IDS.has(id)) continue;
    const key = id.split('.').slice(0, depth).join('.');
    const prev = counts.get(key);
    if (prev) counts.set(key, plus(prev, stat));
  }
  return toStatMap(counts);
}

/** Lowest accuracy first among topics with attempted >= minAttempted; ties → fewer attempted first. */
export function weakestTopics(stats: ReadonlyMap<string, TopicStat>, n: number, minAttempted = 1): TopicStat[] {
  // Array#sort is stable, so remaining ties keep the map's (criteria) order.
  return Array.from(stats.values())
    .filter(s => s.attempted >= minAttempted)
    .sort((a, b) => a.accuracy - b.accuracy || a.attempted - b.attempted)
    .slice(0, Math.max(0, Math.floor(n)));
}

export type SubjectRisk = 'safe' | 'warn' | 'danger' | 'unknown';

export interface SubjectReadiness {
  subject: number;
  /** -1 if unknown */
  firstAccuracy: number;
  /** -1 if unknown */
  accuracy: number;
  attempted: number;
  /** unknown: attempted < 20; danger: firstAccuracy < 50; warn: < 60; safe otherwise */
  risk: SubjectRisk;
}

export interface Readiness {
  status: 'pass-likely' | 'borderline' | 'fail-likely' | 'unknown';
  /** expected exam score 0–100, -1 if unknown */
  expected: number;
  /** which signal `expected` came from */
  basis: 'mock' | 'first-attempt' | 'none';
  subjects: SubjectReadiness[];
  coverage: { studied: number; total: number };
  /** human-readable Korean reasons, most important first */
  reasons: string[];
}

export interface ReadinessInput {
  bank: readonly QuestionMeta[];
  qstats: Readonly<Record<string, QStat>>;
  cards: readonly CardMeta[];
  cstats: Readonly<Record<string, CStat>>;
  mocks: readonly MockRecord[];
}

/** A subject's accuracy is trusted only after this many attempted questions. */
const MIN_SUBJECT_ATTEMPTS = 20;
const DANGER_BELOW = 50;
const WARN_BELOW = 60;
/** 합격 기준: 평균 60 이상 */
const PASS_LINE = 60;
const PASS_LIKELY_FROM = 70;
/** 과락 기준: 과목별 40 미만 */
const SUBJECT_CUTOFF = 40;
const MOCK_WINDOW = 3;
/** A leaf without cards counts as studied after this many attempted questions. */
const MIN_LEAF_ATTEMPTS = 2;

function riskOf(attempted: number, firstAccuracy: number): SubjectRisk {
  if (attempted < MIN_SUBJECT_ATTEMPTS) return 'unknown';
  if (firstAccuracy < DANGER_BELOW) return 'danger';
  if (firstAccuracy < WARN_BELOW) return 'warn';
  return 'safe';
}

/**
 * Per subject, from every bank question of that subject (works whether or not questions are topic-tagged).
 * QuestionMeta.subject is already the 2027 subject (criteriaSubjectOf, see scripts/build-meta.mjs).
 */
function subjectReadiness(bank: readonly QuestionMeta[], qstats: Readonly<Record<string, QStat>>): SubjectReadiness[] {
  return CRITERIA.map(({ id }) => {
    const c = bank.filter(q => q.subject === id).reduce((acc, q) => plus(acc, countsOf(qstats[q.id])), EMPTY);
    const firstAccuracy = percent(c.firstCorrect, c.attempted);
    return {
      subject: id,
      firstAccuracy,
      accuracy: percent(c.correct, c.attempted),
      attempted: c.attempted,
      risk: riskOf(c.attempted, firstAccuracy),
    };
  });
}

/** Latest strict + shuffled mock records, newest first. */
function recentMocks(mocks: readonly MockRecord[]): MockRecord[] {
  const time = (m: MockRecord): number => Date.parse(m.date) || 0;
  return mocks
    .filter(m => m.strict && m.shuffled && Number.isFinite(m.score))
    .sort((a, b) => time(b) - time(a))
    .slice(0, MOCK_WINDOW);
}

/**
 * Leaves (세세항목 ids) that count as studied: >= 50% of the leaf's cards have a CStat,
 * or, when the leaf has no cards, >= 2 of its tagged questions were attempted.
 * Same rule as `computeReadiness().coverage`, exposed for per-leaf views (plan checklist, next topic).
 */
export function studiedLeaves(input: Pick<ReadinessInput, 'bank' | 'qstats' | 'cards' | 'cstats'>): Set<string> {
  const leaves = leafStats(input.bank, input.qstats);
  const cardsByLeaf = new Map<string, CardMeta[]>();
  for (const card of input.cards) cardsByLeaf.set(card.topic, [...(cardsByLeaf.get(card.topic) ?? []), card]);
  const studied = LEAVES.filter(({ id }) => {
    const cards = cardsByLeaf.get(id) ?? [];
    if (cards.length === 0) return (leaves.get(id)?.attempted ?? 0) >= MIN_LEAF_ATTEMPTS;
    return cards.filter(c => input.cstats[c.id] !== undefined).length * 2 >= cards.length;
  });
  return new Set(studied.map(l => l.id));
}

interface CutoffFail {
  subject: number;
  average: number;
}

interface CutoffMiss {
  subject: number;
  /** lowest score under the 과락 line among the recent mocks */
  score: number;
}

/** Valid scores of `subject` (1-based) across the mocks; -1 (subject absent) and corrupt values are skipped. */
function subjectScoresOf(mocks: readonly MockRecord[], subject: number): number[] {
  return mocks
    .map(m => m.subjectScores?.[subject - 1])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
}

/** Subjects whose average across the recent mocks is under the 과락 line, worst first. */
function mockCutoffFails(mocks: readonly MockRecord[]): CutoffFail[] {
  return CRITERIA.map(({ id }): CutoffFail => {
    const scores = subjectScoresOf(mocks, id);
    return { subject: id, average: scores.length > 0 ? Math.round(mean(scores)) : -1 };
  })
    .filter(f => f.average >= 0 && f.average < SUBJECT_CUTOFF)
    .sort((a, b) => a.average - b.average);
}

/** Subjects that fell under the 과락 line in at least one of the recent mocks, lowest score first. */
function mockCutoffMisses(mocks: readonly MockRecord[]): CutoffMiss[] {
  return CRITERIA.map(({ id }): CutoffMiss => {
    const scores = subjectScoresOf(mocks, id);
    return { subject: id, score: scores.length > 0 ? Math.min(...scores) : -1 };
  })
    .filter(m => m.score >= 0 && m.score < SUBJECT_CUTOFF)
    .sort((a, b) => a.score - b.score);
}

interface ReasonInput {
  status: Readiness['status'];
  expected: number;
  basis: Readiness['basis'];
  subjects: readonly SubjectReadiness[];
  mocks: readonly MockRecord[];
  /** mockCutoffMisses(mocks) */
  cutoffMisses: readonly CutoffMiss[];
  coverage: Readiness['coverage'];
}

function expectedReason(r: ReasonInput, hasCutoffFail: boolean): string {
  const source = r.basis === 'mock'
    ? `최근 실전 모의고사 ${r.mocks.length}회 평균 ${r.expected}점`
    : `첫 풀이 정답률 기준 예상 ${r.expected}점`;
  if (r.expected < PASS_LINE) return `${source} — 합격선(60점) 미달`;
  if (r.status === 'fail-likely' || hasCutoffFail) return `${source} — 평균은 넘지만 과락 위험 과목이 있어요`;
  if (r.status === 'borderline') return `${source} — 합격선 근처, 10점 이상 여유가 필요해요`;
  return `${source} — 합격권, 실전 감각을 유지하세요`;
}

function buildReasons(r: ReasonInput): string[] {
  const byFirstAccuracy = (a: SubjectReadiness, b: SubjectReadiness): number => a.firstAccuracy - b.firstAccuracy;
  const cutoffFails = r.basis === 'mock' ? mockCutoffFails(r.mocks) : [];
  const averaged = new Set(cutoffFails.map(f => f.subject));
  // A subject whose average is already under 40 is reported once, by its average.
  const misses = r.cutoffMisses.filter(m => !averaged.has(m.subject));
  const mentioned = new Set([...averaged, ...misses.map(m => m.subject)]);
  const danger = r.subjects.filter(s => s.risk === 'danger' && !mentioned.has(s.subject)).sort(byFirstAccuracy);
  const warn = r.subjects.filter(s => s.risk === 'warn').sort(byFirstAccuracy);
  const unknown = r.subjects.filter(s => s.risk === 'unknown').map(s => s.subject);
  const known = r.expected >= 0;
  return [
    ...(known ? [] : ['판단 근거 부족 — 과목별 20문항 이상 풀거나 실전 모의고사를 1회 보세요']),
    ...cutoffFails.map(f => `최근 실전 모의고사 ${f.subject}과목 평균 ${f.average}점 — 과락(40점 미만)`),
    ...misses.map(m => `최근 실전 모의고사에서 ${m.subject}과목 ${m.score}점 — 과락(40점 미만)이 있어 합격권으로 보지 않아요`),
    ...danger.map(s => `${s.subject}과목 첫 풀이 정답률 ${s.firstAccuracy}% — 과락 위험`),
    ...(known ? [expectedReason(r, r.cutoffMisses.length > 0)] : []),
    ...warn.map(s => `${s.subject}과목 첫 풀이 정답률 ${s.firstAccuracy}% — 60% 미만, 보강 필요`),
    ...(known && unknown.length > 0 ? [`${unknown.join('·')}과목은 풀이 20문항 미만 — 아직 판단 보류`] : []),
    ...(r.basis === 'first-attempt' ? ['실전 모의고사(실전 모드·보기 섞기) 기록이 없어 첫 풀이 정답률로 추정했어요'] : []),
    ...(r.coverage.studied < r.coverage.total
      ? [`출제기준 세세항목 ${r.coverage.studied}/${r.coverage.total} 학습 — 지엽 출제 대비 범위를 넓히세요`]
      : []),
  ];
}

/**
 * Heuristic, deliberately conservative because 2026 exams ran harder than past 기출:
 * - expected = mean of the latest 3 strict+shuffled mock scores if any exist (basis 'mock'),
 *   else mean of subject firstAccuracy over subjects with attempted >= 20 (basis 'first-attempt'), else -1.
 * - pass-likely: expected >= 70, no 'danger' subject and no subject under 40 (과락) in any of the latest 3
 *   strict+shuffled mocks; borderline: expected >= 60 and no 'danger' (so a mock 과락 caps the status here);
 *   fail-likely otherwise; unknown when expected === -1.
 * - coverage.total = number of 세세항목; a leaf counts as studied when >= 50% of its cards have a CStat,
 *   or, if it has no cards, when >= 2 of its questions were attempted.
 */
export function computeReadiness(input: ReadinessInput): Readiness {
  const subjects = subjectReadiness(input.bank, input.qstats);
  const mocks = recentMocks(input.mocks);
  const { expected, basis } = expectedScore(mocks, subjects);
  const cutoffMisses = mockCutoffMisses(mocks);
  const status = statusOf(expected, subjects.some(s => s.risk === 'danger'), cutoffMisses.length > 0);
  const coverage = { studied: studiedLeaves(input).size, total: LEAVES.length };
  const reasons = buildReasons({ status, expected, basis, subjects, mocks, cutoffMisses, coverage });
  return { status, expected, basis, subjects, coverage, reasons };
}

function expectedScore(
  mocks: readonly MockRecord[],
  subjects: readonly SubjectReadiness[],
): Pick<Readiness, 'expected' | 'basis'> {
  if (mocks.length > 0) return { expected: Math.round(mean(mocks.map(m => m.score))), basis: 'mock' };
  const known = subjects.filter(s => s.attempted >= MIN_SUBJECT_ATTEMPTS);
  if (known.length > 0) return { expected: Math.round(mean(known.map(s => s.firstAccuracy))), basis: 'first-attempt' };
  return { expected: -1, basis: 'none' };
}

function statusOf(expected: number, hasDanger: boolean, hasMockCutoff: boolean): Readiness['status'] {
  if (expected < 0) return 'unknown';
  if (!hasDanger && !hasMockCutoff && expected >= PASS_LIKELY_FROM) return 'pass-likely';
  if (!hasDanger && expected >= PASS_LINE) return 'borderline';
  return 'fail-likely';
}
