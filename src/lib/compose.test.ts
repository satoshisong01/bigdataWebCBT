import { describe, it, expect } from 'vitest';
import type { Question } from '@/types';
import type { QStat } from '@/lib/stats';
import type { TopicStat } from '@/lib/mastery';
import { seededRandom } from '@/lib/rng';
import {
  composeMockExam,
  composeWeakSet,
  questionsForTopic,
  shuffleQuestionOptions,
  toOriginalOption,
  withCriteriaSubject,
} from '@/lib/compose';

function question(id: string, subject: number, topics?: string[], patch: Partial<Question> = {}): Question {
  const cut = id.lastIndexOf('-');
  return {
    id,
    session: '테스트',
    sessionId: id.slice(0, cut),
    subject,
    subjectName: `${subject}과목`,
    number: Number(id.slice(cut + 1)),
    question: `문제 ${id}`,
    options: ['가', '나', '다', '라'],
    answer: 2,
    explanation: '해설',
    ...(topics ? { topics } : {}),
    ...patch,
  };
}

/** `count` questions `${prefix}-1..count` of `subject`, all tagged `topic` (untagged when omitted). */
function many(prefix: string, subject: number, count: number, topic?: string): Question[] {
  return Array.from({ length: count }, (_, i) => question(`${prefix}-${i + 1}`, subject, topic ? [topic] : undefined));
}

function qstat(patch: Partial<QStat> = {}): QStat {
  return { n: 1, c: 1, first: true, ok: true, unsure: false, last: '2026-10-01T00:00:00.000Z', ...patch };
}

const WRONG = qstat({ c: 0, first: false, ok: false });
const UNSURE = qstat({ first: false, unsure: true });

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function repeat<T>(value: T, n: number): T[] {
  return Array.from({ length: n }, () => value);
}

function topicStat(topic: string): TopicStat {
  return { topic, questions: 5, attempted: 5, correct: 1, firstCorrect: 1, accuracy: 20, firstAccuracy: 20 };
}

const ids = (qs: readonly Question[]): string[] => qs.map(q => q.id);
const subOf = (q: Question): string => (q.topics?.[0] ?? 'untagged').split('.').slice(0, 3).join('.');

function countBy(qs: readonly Question[], key: (q: Question) => string): Record<string, number> {
  return qs.reduce<Record<string, number>>((acc, q) => ({ ...acc, [key(q)]: (acc[key(q)] ?? 0) + 1 }), {});
}

describe('shuffleQuestionOptions', () => {
  const base = question('s-1', 1, ['1.1.1.1'], {
    options: ['A', 'B', 'C', 'D'],
    answer: 2,
    optionNotes: ['note A', 'note B', 'note C', 'note D'],
  });

  it('moves options, answer and notes together without mutating the input', () => {
    const q: Question = { ...base, options: [...base.options], optionNotes: [...(base.optionNotes ?? [])] };
    Object.freeze(q.options);
    Object.freeze(q.optionNotes);
    Object.freeze(q);
    const before = JSON.stringify(q);
    for (const seed of range(1, 30)) {
      const { question: shuffled, order } = shuffleQuestionOptions(q, seededRandom(seed));
      expect(shuffled).not.toBe(q);
      expect([...order].sort()).toEqual([1, 2, 3, 4]);
      order.forEach((original, i) => {
        expect(shuffled.options[i]).toBe(q.options[original - 1]);
        expect(shuffled.optionNotes?.[i]).toBe(q.optionNotes?.[original - 1]);
      });
      expect(shuffled.options[shuffled.answer - 1]).toBe('B');
      expect(toOriginalOption(order, shuffled.answer)).toBe(2);
    }
    expect(JSON.stringify(q)).toBe(before);
  });

  it('really shuffles and is reproducible from the seed', () => {
    const answerPositions = new Set(range(1, 50).map(seed => shuffleQuestionOptions(base, seededRandom(seed)).question.answer));
    expect(answerPositions).toEqual(new Set([1, 2, 3, 4]));
    expect(shuffleQuestionOptions(base, seededRandom(9))).toEqual(shuffleQuestionOptions(base, seededRandom(9)));
  });

  it('keeps identity order for noShuffle and single-option questions, still as a new object', () => {
    const fixed = question('s-2', 1, undefined, { noShuffle: true });
    const result = shuffleQuestionOptions(fixed, seededRandom(3));
    expect(result.order).toEqual([1, 2, 3, 4]);
    expect(result.question).not.toBe(fixed);
    expect(result.question).toEqual(fixed);
    expect('optionNotes' in result.question).toBe(false);
    const single = question('s-3', 1, undefined, { options: ['only'], answer: 1 });
    expect(shuffleQuestionOptions(single, seededRandom(3)).order).toEqual([1]);
  });
});

describe('toOriginalOption', () => {
  it('maps a picked display position back to the original option number', () => {
    expect(toOriginalOption([3, 1, 4, 2], 1)).toBe(3);
    expect(toOriginalOption([3, 1, 4, 2], 4)).toBe(2);
    expect(toOriginalOption([1, 2, 3, 4], 2)).toBe(2);
  });
});

describe('withCriteriaSubject', () => {
  it('relabels a copy with the 2027 subject of its first topic and leaves untagged questions on their own subject', () => {
    const moved = question('3-41', 3, ['1.3.3.1', '3.1.1.1']); // 분석모형 선정: 과목3 on the paper, 2027 과목1
    const copy = withCriteriaSubject(moved);
    expect(copy).not.toBe(moved);
    expect(copy).toEqual({ ...moved, subject: 1, subjectName: '빅데이터 분석 기획' });
    expect(moved.subject).toBe(3);
    expect(withCriteriaSubject(question('3-61', 4, ['4.2.2.3']))).toMatchObject({ subject: 4, subjectName: '빅데이터 결과 해석' });
    expect(withCriteriaSubject(question('3-21', 2))).toMatchObject({ subject: 2, subjectName: '빅데이터 탐색' });
    expect(withCriteriaSubject(question('3-22', 2, ['9.1.1.1']))).toMatchObject({ subject: 2, subjectName: '빅데이터 탐색' });
  });
});

describe('composeMockExam', () => {
  const BANK: Question[] = [
    ...many('a', 1, 30, '1.1.1.1'),
    ...many('b', 1, 30, '1.1.1.2'), // same 세부항목 as 'a' → group 1.1.1 has 60
    ...many('c', 1, 30, '1.2.1.1'),
    ...many('d', 1, 10, '1.3.1.1'),
    ...many('e', 2, 50), // fully untagged subject
    ...many('f', 3, 50, '3.1.1.1'),
    ...many('g', 3, 50), // half tagged
    ...many('h', 4, 7, '4.1.1.1'), // fewer than perSubject
  ];

  it('picks perSubject per subject, ordered by subject, with no duplicates', () => {
    const exam = composeMockExam(BANK, {}, 42);
    expect(exam.map(q => q.subject)).toEqual([...repeat(1, 20), ...repeat(2, 20), ...repeat(3, 20), ...repeat(4, 7)]);
    expect(new Set(ids(exam)).size).toBe(exam.length);
  });

  it('is deterministic for the seed and differs across seeds', () => {
    expect(ids(composeMockExam(BANK, {}, 7))).toEqual(ids(composeMockExam(BANK, {}, 7)));
    expect(ids(composeMockExam(BANK, {}, 7))).not.toEqual(ids(composeMockExam(BANK, {}, 8)));
  });

  it('spreads seats over 세부항목 by largest remainder', () => {
    for (const seed of [1, 2, 3]) {
      expect(countBy(composeMockExam(BANK, {}, seed).filter(q => q.subject === 1), subOf))
        .toEqual({ '1.1.1': 12, '1.2.1': 6, '1.3.1': 2 });
    }
    // quotas 3.5 / 2.1 / 1.4 → floors 3 / 2 / 1, the spare seat goes to the largest remainder
    const bank = [...many('x', 2, 50, '2.1.1.1'), ...many('y', 2, 30, '2.2.1.1'), ...many('z', 2, 20, '2.3.1.1')];
    for (const seed of [1, 2, 3]) {
      expect(countBy(composeMockExam(bank, {}, seed, { perSubject: 7 }), subOf)).toEqual({ '2.1.1': 4, '2.2.1': 2, '2.3.1': 1 });
    }
  });

  it('treats untagged questions as one group, alone or mixed with tagged groups', () => {
    const exam = composeMockExam(BANK, {}, 5);
    expect(exam.filter(q => q.subject === 2)).toHaveLength(20);
    expect(countBy(exam.filter(q => q.subject === 3), subOf)).toEqual({ '3.1.1': 10, untagged: 10 });
  });

  it('allocates by the 2027 subject of the first topic and returns relabelled copies', () => {
    const bank = [
      ...many('p', 3, 25, '1.3.3.1'), // 분석모형 설계 moved from 과목3 to 과목1 in 2027
      ...many('q', 3, 25, '3.1.1.1'),
      ...many('r', 2, 5), // untagged → stays on its paper subject
      ...many('s', 3, 4, '2.1.2.6'), // 데이터 분할 moved from 과목3 to 과목2
    ];
    for (const seed of [1, 2, 3]) {
      const exam = composeMockExam(bank, {}, seed);
      expect(exam.map(q => q.subject)).toEqual([...repeat(1, 20), ...repeat(2, 9), ...repeat(3, 20)]);
      expect(exam.filter(q => q.subject === 1).every(q => q.id.startsWith('p-'))).toBe(true);
      expect(exam.filter(q => q.subject === 3).every(q => q.id.startsWith('q-'))).toBe(true);
      expect(new Set(exam.map(q => `${q.subject}:${q.subjectName}`))).toEqual(
        new Set(['1:빅데이터 분석 기획', '2:빅데이터 탐색', '3:빅데이터 모델링']),
      );
      expect(exam.every(q => !bank.includes(q))).toBe(true);
    }
    expect(bank.every(q => q.subjectName === `${q.subject}과목`)).toBe(true);
  });

  it('takes every question of a small subject, in shuffled order', () => {
    const small = ids(many('h', 4, 7, '4.1.1.1'));
    const subject4 = (seed: number): string[] => ids(composeMockExam(BANK, {}, seed).filter(q => q.subject === 4));
    expect([...subject4(1)].sort()).toEqual([...small].sort());
    expect(range(1, 5).some(seed => subject4(seed).join() !== small.join())).toBe(true);
  });

  it('prefers never-attempted, then last-wrong/unsure, then the rest', () => {
    const bank = many('t', 1, 40, '1.1.1.1');
    const qstats: Record<string, QStat> = Object.fromEntries([
      ...range(16, 20).map((i): [string, QStat] => [`t-${i}`, WRONG]),
      ...range(21, 25).map((i): [string, QStat] => [`t-${i}`, UNSURE]),
      ...range(26, 40).map((i): [string, QStat] => [`t-${i}`, qstat()]),
    ]);
    for (const seed of [1, 2, 3]) {
      const picked = new Set(ids(composeMockExam(bank, qstats, seed)));
      expect(picked.size).toBe(20);
      range(1, 15).forEach(i => expect(picked.has(`t-${i}`)).toBe(true)); // all 15 fresh
      range(26, 40).forEach(i => expect(picked.has(`t-${i}`)).toBe(false)); // 5 of the 10 missed fill the rest
    }
  });

  it('never repeats an id, even when the bank does', () => {
    const exam = composeMockExam([...many('u', 1, 25, '1.1.1.1'), ...many('u', 1, 25, '1.1.1.1')], {}, 2);
    expect(exam).toHaveLength(20);
    expect(new Set(ids(exam)).size).toBe(20);
  });

  it('filters by source through the session catalog', () => {
    const bank = [...many('2', 1, 30, '1.1.1.1'), ...many('1', 1, 30, '1.1.1.1'), ...many('t1', 1, 30, '1.1.1.1')];
    const trend = composeMockExam(bank, {}, 4, { sources: ['ai-trend'] });
    expect(trend).toHaveLength(20);
    expect(trend.every(q => q.sessionId === 't1')).toBe(true);
    expect(composeMockExam(bank, {}, 4, { sources: ['restored', 'ai-mock'] }).some(q => q.sessionId === 't1')).toBe(false);
  });

  it('leaves the bank untouched and returns [] for a non-positive perSubject', () => {
    const before = JSON.stringify(BANK);
    composeMockExam(BANK, {}, 9);
    expect(JSON.stringify(BANK)).toBe(before);
    expect(composeMockExam(BANK, {}, 9, { perSubject: 0 })).toEqual([]);
  });
});

describe('composeWeakSet', () => {
  const A = '3.1.1.1';
  const B = '3.1.1.2';
  const bank = [...many('wa', 3, 5, A), ...many('wb', 3, 5, B), ...many('wc', 3, 5, '3.1.1.3')];
  const weak = [topicStat(A), topicStat(B)];

  it('returns [] when there are no weak topics', () => {
    expect(composeWeakSet(bank, {}, [], 1)).toEqual([]);
  });

  it('interleaves the weak topics round-robin in rank order', () => {
    expect(composeWeakSet(bank, {}, weak, 1, 6).map(q => q.topics?.[0])).toEqual([A, B, A, B, A, B]);
  });

  it('prefers last-wrong/unsure, then never-attempted, then the rest', () => {
    const qstats = { 'wd-1': qstat(), 'wd-2': qstat(), 'wd-3': WRONG, 'wd-4': UNSURE };
    const set = ids(composeWeakSet(many('wd', 3, 6, A), qstats, [topicStat(A)], 3));
    expect(set.slice(0, 2).sort()).toEqual(['wd-3', 'wd-4']);
    expect(set.slice(2, 4).sort()).toEqual(['wd-5', 'wd-6']);
    expect(set.slice(4).sort()).toEqual(['wd-1', 'wd-2']);
  });

  it('never repeats a question tagged with several weak topics', () => {
    const shared = [question('ws-1', 3, [A, B]), question('ws-2', 3, [A, B]), question('ws-3', 3, [B])];
    expect(ids(composeWeakSet(shared, {}, weak, 5, 10)).sort()).toEqual(['ws-1', 'ws-2', 'ws-3']);
  });

  it('caps the size (default 20) and is deterministic for the seed', () => {
    const big = many('wz', 3, 30, A);
    expect(composeWeakSet(big, {}, [topicStat(A)], 8)).toHaveLength(20);
    expect(composeWeakSet(big, {}, [topicStat(A)], 8, 5)).toHaveLength(5);
    expect(ids(composeWeakSet(big, {}, [topicStat(A)], 8))).toEqual(ids(composeWeakSet(big, {}, [topicStat(A)], 8)));
  });

  it('matches weak topics by id prefix without crossing sibling numbers', () => {
    const tagged = [question('wp-1', 3, ['3.1.1.4']), question('wp-2', 3, ['3.1.10.1'])];
    expect(ids(composeWeakSet(tagged, {}, [topicStat('3.1.1')], 1))).toEqual(['wp-1']);
  });

  it('returns copies relabelled with the 2027 subject', () => {
    const moved = [question('wm-1', 3, ['1.3.3.2']), question('wm-2', 3, ['1.3.3.2'])];
    const set = composeWeakSet(moved, {}, [topicStat('1.3.3.2')], 2);
    expect(set.map(q => [q.subject, q.subjectName])).toEqual(repeat([1, '빅데이터 분석 기획'], 2));
    expect(set.every(q => !moved.includes(q))).toBe(true);
    expect(moved.map(q => q.subject)).toEqual([3, 3]);
  });
});

describe('questionsForTopic', () => {
  const bank = [
    question('t-1', 3, ['3.1.1.4']),
    question('t-2', 3, ['3.1.10.1']),
    question('t-3', 3, ['2.3.2.3', '3.1.1.1']),
    question('t-4', 3),
    question('t-5', 3, ['3.1.2.6']),
  ];

  it('matches the prefix or its descendants, in bank order', () => {
    expect(ids(questionsForTopic(bank, '3.1'))).toEqual(['t-1', 't-2', 't-3', 't-5']);
    expect(ids(questionsForTopic(bank, '3.1.1'))).toEqual(['t-1', 't-3']); // not '3.1.10.1'
    expect(ids(questionsForTopic(bank, '3.1.2.6'))).toEqual(['t-5']);
    expect(questionsForTopic(bank, '9')).toEqual([]);
  });

  it('returns copies relabelled with the 2027 subject of each first topic', () => {
    const set = questionsForTopic(bank, '3.1');
    expect(set.map(q => q.subject)).toEqual([3, 3, 2, 3]); // t-3 is tagged 2.3.2.3 first
    expect(set[2].subjectName).toBe('빅데이터 탐색');
    expect(set.every(q => !bank.includes(q))).toBe(true);
    expect(bank[2].subject).toBe(3);
  });
});
