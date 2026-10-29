import { describe, it, expect } from 'vitest';
import type { CardMeta, QuestionMeta } from '@/types';
import { CRITERIA, LEAVES, SUBS } from '@/data/criteria';
import type { CStat, MockRecord, QStat } from '@/lib/stats';
import { computeReadiness, leafStats, rollup, studiedLeaves, weakestTopics } from '@/lib/mastery';
import type { ReadinessInput, TopicStat } from '@/lib/mastery';

function meta(id: string, subject: number, topics?: string[]): QuestionMeta {
  return { id, sessionId: id.slice(0, id.lastIndexOf('-')), subject, topics };
}

function qstat(patch: Partial<QStat> = {}): QStat {
  return { n: 1, c: 1, first: true, ok: true, unsure: false, last: '2026-10-01T00:00:00.000Z', ...patch };
}

const WRONG = qstat({ c: 0, first: false, ok: false });

function topicStat(topic: string, attempted: number, accuracy: number): TopicStat {
  return { topic, questions: attempted, attempted, correct: 0, firstCorrect: 0, accuracy, firstAccuracy: accuracy };
}

/** `per` untagged questions for each subject — like today's bank before the topic pipeline. */
function subjectBank(per: number): QuestionMeta[] {
  return [1, 2, 3, 4].flatMap(s => Array.from({ length: per }, (_, i) => meta(`s${s}-${i + 1}`, s)));
}

/** The first `attempted` questions of subject `s` answered; the first `firstCorrect` of them right on the first try. */
function answered(s: number, attempted: number, firstCorrect: number): Record<string, QStat> {
  return Object.fromEntries(Array.from({ length: attempted }, (_, i): [string, QStat] => [
    `s${s}-${i + 1}`,
    i < firstCorrect ? qstat() : WRONG,
  ]));
}

function allAnswered(perSubject: number, firsts: readonly number[]): Record<string, QStat> {
  return firsts.reduce<Record<string, QStat>>((acc, f, i) => ({ ...acc, ...answered(i + 1, perSubject, f) }), {});
}

function input(patch: Partial<ReadinessInput>): ReadinessInput {
  return { bank: [], qstats: {}, cards: [], cstats: {}, mocks: [], ...patch };
}

function mock(date: string, score: number, patch: Partial<MockRecord> = {}): MockRecord {
  return {
    key: `mock-${date}`,
    date,
    score,
    passed: score >= 60,
    subjectScores: [score, score, score, score],
    total: 80,
    correct: Math.round(score * 0.8),
    timeTaken: 3600,
    strict: true,
    shuffled: true,
    ...patch,
  };
}

describe('leafStats', () => {
  it('counts questions, attempts and first-try correctness per 세세항목', () => {
    const bank = [
      meta('a-1', 1, ['1.1.1.1']),
      meta('a-2', 1, ['1.1.1.1']),
      meta('a-3', 1, ['1.1.1.1']),
      meta('a-4', 1, ['1.1.1.1', '1.1.1.2']),
    ];
    const stats = leafStats(bank, { 'a-1': qstat(), 'a-2': WRONG, 'a-4': qstat({ n: 2, c: 1, first: false }) });
    expect(stats.get('1.1.1.1')).toEqual({
      topic: '1.1.1.1', questions: 4, attempted: 3, correct: 2, firstCorrect: 1, accuracy: 67, firstAccuracy: 33,
    });
    expect(stats.get('1.1.1.2')).toMatchObject({ questions: 1, attempted: 1, correct: 1, firstCorrect: 0, accuracy: 100, firstAccuracy: 0 });
  });

  it('ignores untagged questions and unknown ids, counting a repeated tag once', () => {
    const bank = [meta('b-1', 2), meta('b-2', 2, []), meta('b-3', 2, ['2.1.1.1', '2.1.1.1', '9.9.9.9', '2.1.1'])];
    const stats = leafStats(bank, { 'b-1': qstat(), 'b-2': qstat(), 'b-3': qstat() });
    const total = Array.from(stats.values()).reduce((sum, s) => sum + s.questions, 0);
    expect(total).toBe(1);
    expect(stats.get('2.1.1.1')).toMatchObject({ questions: 1, attempted: 1 });
    expect(stats.has('9.9.9.9')).toBe(false);
    expect(stats.has('2.1.1')).toBe(false);
  });

  it('keeps every 세세항목 in criteria order, with -1 accuracy when nothing was attempted', () => {
    const stats = leafStats([meta('c-1', 3, ['3.1.1.1'])], { 'c-1': qstat({ n: 0, c: 0 }) });
    expect(Array.from(stats.keys())).toEqual(LEAVES.map(l => l.id));
    expect(stats.get('3.1.1.1')).toMatchObject({ questions: 1, attempted: 0, accuracy: -1, firstAccuracy: -1 });
  });
});

describe('rollup', () => {
  it('sums leaf counts and recomputes accuracy from the sums', () => {
    const bank = [
      meta('d-1', 1, ['1.1.1.1']),
      meta('d-2', 1, ['1.1.1.2']),
      meta('d-3', 1, ['1.1.1.2']),
      meta('d-4', 1, ['1.1.1.2']),
      meta('d-5', 1, ['1.2.1.1']),
    ];
    const leaves = leafStats(bank, { 'd-1': qstat(), 'd-2': WRONG, 'd-3': WRONG, 'd-4': WRONG });
    // leaf accuracies are 100 and 0 — the 세부항목 is 1 of 4, not their mean
    expect(rollup(leaves, 'sub').get('1.1.1')).toEqual({
      topic: '1.1.1', questions: 4, attempted: 4, correct: 1, firstCorrect: 1, accuracy: 25, firstAccuracy: 25,
    });
    expect(rollup(leaves, 'sub').get('1.2.1')).toMatchObject({ questions: 1, attempted: 0, accuracy: -1 });
    expect(rollup(leaves, 'major').get('1.1')).toMatchObject({ questions: 4, attempted: 4, correct: 1 });
    expect(rollup(leaves, 'subject').get('1')).toMatchObject({ questions: 5, attempted: 4, correct: 1, accuracy: 25 });
  });

  it('lists every criteria node of the level in criteria order, even with 0 questions', () => {
    const leaves = leafStats([], {});
    expect(Array.from(rollup(leaves, 'subject').keys())).toEqual(['1', '2', '3', '4']);
    expect(Array.from(rollup(leaves, 'major').keys())).toEqual(CRITERIA.flatMap(s => s.majors.map(m => m.id)));
    expect(Array.from(rollup(leaves, 'sub').keys())).toEqual(SUBS.map(u => u.id));
    expect(Array.from(rollup(leaves, 'sub').values()).every(s => s.questions === 0 && s.accuracy === -1)).toBe(true);
  });
});

describe('weakestTopics', () => {
  const stats = new Map<string, TopicStat>([
    ['1.1.1.1', topicStat('1.1.1.1', 10, 40)],
    ['1.1.1.2', topicStat('1.1.1.2', 4, 40)],
    ['1.1.1.3', topicStat('1.1.1.3', 0, -1)],
    ['1.1.1.4', topicStat('1.1.1.4', 2, 0)],
    ['1.1.2.1', topicStat('1.1.2.1', 5, 90)],
  ]);

  it('orders by accuracy, then fewer attempts; unattempted topics are left out by default', () => {
    expect(weakestTopics(stats, 10).map(s => s.topic)).toEqual(['1.1.1.4', '1.1.1.2', '1.1.1.1', '1.1.2.1']);
  });

  it('applies minAttempted and the count', () => {
    expect(weakestTopics(stats, 2, 4).map(s => s.topic)).toEqual(['1.1.1.2', '1.1.1.1']);
    expect(weakestTopics(stats, 0)).toEqual([]);
    expect(weakestTopics(stats, -3)).toEqual([]);
  });
});

describe('computeReadiness', () => {
  it('is unknown until a subject has 20 attempts or a strict mock exists', () => {
    const r = computeReadiness(input({ bank: subjectBank(30), qstats: answered(1, 19, 19) }));
    expect(r).toMatchObject({ status: 'unknown', expected: -1, basis: 'none' });
    expect(r.subjects.map(s => s.risk)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
    expect(r.subjects[0]).toEqual({ subject: 1, firstAccuracy: 100, accuracy: 100, attempted: 19, risk: 'unknown' });
    expect(r.subjects[1]).toMatchObject({ firstAccuracy: -1, accuracy: -1, attempted: 0 });
    expect(r.coverage).toEqual({ studied: 0, total: LEAVES.length });
    expect(r.reasons[0]).toContain('판단 근거 부족');
  });

  it('rates subjects by first-attempt accuracy and averages only the known subjects', () => {
    const qstats = { ...answered(1, 20, 10), ...answered(2, 19, 19), ...answered(3, 20, 9), ...answered(4, 20, 12) };
    const r = computeReadiness(input({ bank: subjectBank(30), qstats }));
    expect(r.subjects.map(s => [s.subject, s.firstAccuracy, s.risk])).toEqual([
      [1, 50, 'warn'],
      [2, 100, 'unknown'],
      [3, 45, 'danger'],
      [4, 60, 'safe'],
    ]);
    expect(r.basis).toBe('first-attempt');
    expect(r.expected).toBe(52); // mean(50, 45, 60); subject 2 has < 20 attempts
    expect(r.status).toBe('fail-likely');
    expect(r.reasons[0]).toBe('3과목 첫 풀이 정답률 45% — 과락 위험');
    expect(r.reasons[1]).toBe('첫 풀이 정답률 기준 예상 52점 — 합격선(60점) 미달');
    expect(r.reasons).toContain('1과목 첫 풀이 정답률 50% — 60% 미만, 보강 필요');
    expect(r.reasons).toContain('2과목은 풀이 20문항 미만 — 아직 판단 보류');
  });

  it.each([
    [[70, 70, 70, 70], 70, 'pass-likely'],
    [[69, 69, 69, 69], 69, 'borderline'],
    [[60, 60, 60, 60], 60, 'borderline'],
    [[59, 59, 59, 59], 59, 'fail-likely'],
    [[90, 90, 90, 49], 80, 'fail-likely'],
  ] as const)('first accuracies %j → expected %i, %s', (firsts, expected, status) => {
    const r = computeReadiness(input({ bank: subjectBank(100), qstats: allAnswered(100, firsts) }));
    expect(r.expected).toBe(expected);
    expect(r.status).toBe(status);
  });

  it('uses the mean of the latest 3 strict + shuffled mocks when any exist', () => {
    const mocks = [
      mock('2026-11-02T10:00:00.000Z', 90),
      mock('2026-10-01T10:00:00.000Z', 40),
      mock('2026-11-03T10:00:00.000Z', 10, { strict: false }),
      mock('2026-10-20T10:00:00.000Z', 70),
      mock('2026-11-04T10:00:00.000Z', 0, { shuffled: false }),
      mock('2026-11-05T10:00:00.000Z', Number.NaN),
      mock('2026-10-25T10:00:00.000Z', 80),
    ];
    const r = computeReadiness(input({ bank: subjectBank(30), qstats: allAnswered(20, [8, 8, 8, 8]), mocks }));
    expect(r.basis).toBe('mock');
    expect(r.expected).toBe(80); // 90, 80, 70 — the older 40 and non-strict / unshuffled / invalid runs are ignored
    expect(r.subjects.every(s => s.risk === 'danger')).toBe(true); // first attempts still drive subject risk
    expect(r.status).toBe('fail-likely');
  });

  it('puts a mock 과락 subject first and does not call the average 합격권', () => {
    const mocks = [
      mock('2026-11-01T10:00:00.000Z', 72, { subjectScores: [85, 80, 35, 88] }),
      mock('2026-11-02T10:00:00.000Z', 70, { subjectScores: [80, 85, 30, 85] }),
    ];
    const r = computeReadiness(input({ bank: subjectBank(30), qstats: allAnswered(20, [16, 16, 16, 16]), mocks }));
    expect(r).toMatchObject({ basis: 'mock', expected: 71, status: 'borderline' });
    expect(r.reasons[0]).toBe('최근 실전 모의고사 3과목 평균 33점 — 과락(40점 미만)');
    expect(r.reasons[1]).toBe('최근 실전 모의고사 2회 평균 71점 — 평균은 넘지만 과락 위험 과목이 있어요');
    expect(r.reasons.filter(reason => reason.includes('3과목'))).toHaveLength(1); // the average line covers the single miss
  });

  it('is never 합격권 while one of the latest 3 mocks has a subject under 40, even with a safe average', () => {
    const qstats = allAnswered(20, [16, 16, 16, 16]);
    const mocks = [
      mock('2026-11-03T10:00:00.000Z', 80, { subjectScores: [85, 35, 90, 90] }),
      mock('2026-11-02T10:00:00.000Z', 82, { subjectScores: [85, 80, 80, 83] }),
      mock('2026-11-01T10:00:00.000Z', 84, { subjectScores: [85, 85, 80, 86] }),
    ];
    const r = computeReadiness(input({ bank: subjectBank(30), qstats, mocks }));
    expect(r).toMatchObject({ basis: 'mock', expected: 82, status: 'borderline' }); // 과목2 average 67 — only one run failed
    expect(r.reasons[0]).toBe('최근 실전 모의고사에서 2과목 35점 — 과락(40점 미만)이 있어 합격권으로 보지 않아요');
    expect(r.reasons[1]).toBe('최근 실전 모의고사 3회 평균 82점 — 평균은 넘지만 과락 위험 과목이 있어요');
    const low = computeReadiness(input({ bank: subjectBank(30), qstats, mocks: [mock('2026-11-03T10:00:00.000Z', 55, { subjectScores: [70, 35, 60, 55] })] }));
    expect(low.status).toBe('fail-likely'); // the cap never raises a status
  });

  it('only counts real subject scores of the latest 3 strict + shuffled mocks toward the 과락 cap', () => {
    const qstats = allAnswered(20, [16, 16, 16, 16]);
    const mocks = [
      mock('2026-11-04T10:00:00.000Z', 80, { subjectScores: [80, -1, 80, 80] }), // subject absent
      mock('2026-11-03T10:00:00.000Z', 80),
      mock('2026-11-02T10:00:00.000Z', 80),
      mock('2026-11-01T10:00:00.000Z', 80, { subjectScores: [80, 80, 20, 80] }), // 4th newest — outside the window
      mock('2026-11-05T10:00:00.000Z', 80, { subjectScores: [80, 80, 10, 80], strict: false }),
    ];
    const r = computeReadiness(input({ bank: subjectBank(30), qstats, mocks }));
    expect(r.status).toBe('pass-likely');
    expect(r.reasons.some(reason => reason.includes('과락'))).toBe(false);
  });

  it('says 합격권 only when nothing else is wrong', () => {
    const mocks = [mock('2026-11-01T10:00:00.000Z', 78)];
    const r = computeReadiness(input({ bank: subjectBank(30), qstats: allAnswered(20, [16, 16, 16, 16]), mocks }));
    expect(r.status).toBe('pass-likely');
    expect(r.reasons[0]).toBe('최근 실전 모의고사 1회 평균 78점 — 합격권, 실전 감각을 유지하세요');
    expect(r.reasons[1]).toBe(`출제기준 세세항목 0/${LEAVES.length} 학습 — 지엽 출제 대비 범위를 넓히세요`);
  });
});

describe('studiedLeaves / coverage', () => {
  it('counts a leaf from its cards (>= 50% graded), or from 2+ attempted questions when it has no cards', () => {
    const cards: CardMeta[] = [
      { id: 'k1', topic: '1.1.1.1', importance: 3 },
      { id: 'k2', topic: '1.1.1.1', importance: 2 }, // 1 of 2 graded → studied
      { id: 'k3', topic: '1.1.1.2', importance: 3 },
      { id: 'k4', topic: '1.1.1.2', importance: 1 },
      { id: 'k5', topic: '1.1.1.2', importance: 1 }, // 1 of 3 graded → not studied
      { id: 'k6', topic: '1.2.1.1', importance: 2 }, // has a card, none graded → questions do not count
    ];
    const graded: CStat = { srs: { box: 2, due: '2026-11-01' }, n: 1, again: 0, last: '2026-10-29T00:00:00.000Z' };
    const bank = [
      meta('e-1', 1, ['1.1.1.3']),
      meta('e-2', 1, ['1.1.1.3']), // no cards, 2 attempted → studied
      meta('e-3', 1, ['1.1.1.4']),
      meta('e-4', 1, ['1.1.1.4']), // no cards, 1 attempted → not studied
      meta('e-5', 1, ['1.2.1.1']),
      meta('e-6', 1, ['1.2.1.1']),
    ];
    const qstats = { 'e-1': qstat(), 'e-2': WRONG, 'e-3': qstat(), 'e-5': qstat(), 'e-6': qstat() };
    const data = { bank, qstats, cards, cstats: { k1: graded, k3: graded } };
    expect(Array.from(studiedLeaves(data)).sort()).toEqual(['1.1.1.1', '1.1.1.3']);
    expect(computeReadiness(input(data)).coverage).toEqual({ studied: 2, total: 82 });
  });
});
