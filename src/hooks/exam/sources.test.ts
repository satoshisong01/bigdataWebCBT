import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Question } from '@/types';
import type { TopicStat } from '@/lib/mastery';

vi.mock('@/data/bank', () => ({
  loadSession: vi.fn(),
  loadAllQuestions: vi.fn(),
  loadQuestionsByIds: vi.fn(),
}));
vi.mock('@/lib/stats', () => ({
  getDueQuestionIds: vi.fn(),
  getDeckQuestionIds: vi.fn(),
  getQStats: vi.fn(() => ({})),
}));
vi.mock('@/lib/mastery', () => ({
  leafStats: vi.fn(() => new Map()),
  weakestTopics: vi.fn(() => []),
}));
vi.mock('@/lib/compose', () => ({
  shuffleQuestionOptions: (q: Question) => ({ question: q, order: q.options.map((_, i) => i + 1) }),
  composeMockExam: vi.fn(),
  composeWeakSet: vi.fn(),
  questionsForTopic: vi.fn(),
}));
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(() => ({ shuffleOptions: false })) }));

import * as bank from '@/data/bank';
import * as stats from '@/lib/stats';
import * as mastery from '@/lib/mastery';
import * as compose from '@/lib/compose';
import { seededRandom } from '@/lib/rng';
import { parseExamParams } from './params';
import { fewestAttemptedLeaves, loadExam } from './sources';

function question(id: string, subject = 1): Question {
  const [sessionId, n] = id.split('-');
  return {
    id,
    session: `제${sessionId}회`,
    sessionId,
    subject,
    subjectName: '과목',
    number: Number(n),
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    answer: 1,
    explanation: '',
  };
}

function topicStat(topic: string, questions: number, attempted: number): TopicStat {
  return { topic, questions, attempted, correct: 0, firstCorrect: 0, accuracy: -1, firstAccuracy: -1 };
}

const load = (query: string) => loadExam(parseExamParams(new URLSearchParams(query)));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('loadExam', () => {
  it('loads due questions once each for 오늘의 복습, never restoring old answers', async () => {
    vi.mocked(stats.getDueQuestionIds).mockReturnValue(['5-2', '5-1', '5-2']);
    vi.mocked(bank.loadQuestionsByIds).mockResolvedValue([question('5-2'), question('5-1')]);
    localStorage.setItem('bigdata-cbt-answers', JSON.stringify({ 'pool-review': { '5-1': 2 } }));
    const out = await load('pool=review');
    expect(bank.loadQuestionsByIds).toHaveBeenCalledWith(['5-2', '5-1']);
    expect(out.kind).toBe('ready');
    if (out.kind !== 'ready') return;
    expect(out.run.examKey).toBe('pool-review');
    expect(out.run.title).toBe('오늘의 복습');
    expect(out.run.initialAnswers).toEqual({});
  });

  it('reports an empty review deck', async () => {
    vi.mocked(stats.getDueQuestionIds).mockReturnValue([]);
    vi.mocked(bank.loadQuestionsByIds).mockResolvedValue([]);
    expect(await load('pool=review')).toEqual({ kind: 'empty', reason: 'review' });
  });

  it('uses the review deck for 오답노트', async () => {
    vi.mocked(stats.getDeckQuestionIds).mockReturnValue(['2-3']);
    vi.mocked(bank.loadQuestionsByIds).mockResolvedValue([question('2-3')]);
    const out = await load('pool=wrong-pool');
    expect(out.kind === 'ready' && out.run.examKey).toBe('pool-wrong');
  });

  it('restores saved answers for 회차 exams in study mode only', async () => {
    vi.mocked(bank.loadSession).mockResolvedValue([question('5-1'), question('5-2')]);
    localStorage.setItem('bigdata-cbt-answers', JSON.stringify({ 'session-5': { '5-1': 3 } }));
    const study = await load('mode=session&id=5');
    expect(study.kind === 'ready' && study.run.initialAnswers).toEqual({ '5-1': 3 });
    expect(study.kind === 'ready' && study.run.title).toBe('제5회');
    const strict = await load('mode=session&id=5&strict=1');
    expect(strict.kind === 'ready' && strict.run.initialAnswers).toEqual({});
    expect(strict.kind === 'ready' && strict.run.shuffled).toBe(true);
    expect(strict.kind === 'ready' && strict.run.timeLimit).toBe(180);
  });

  it('treats unknown sessions and subjects as empty', async () => {
    expect(await load('mode=session&id=99')).toEqual({ kind: 'empty', reason: 'session' });
    expect(await load('mode=subject&id=9&session=5')).toEqual({ kind: 'empty', reason: 'subject' });
    expect(bank.loadSession).not.toHaveBeenCalled();
  });

  it('filters a 과목 within a 회차', async () => {
    vi.mocked(bank.loadSession).mockResolvedValue([question('5-1', 1), question('5-21', 2)]);
    const out = await load('mode=subject&id=2&session=5');
    expect(out.kind === 'ready' && out.run.items.map(i => i.original.id)).toEqual(['5-21']);
    expect(out.kind === 'ready' && out.run.examKey).toBe('subject-2-5');
    expect(out.kind === 'ready' && out.run.title).toBe('빅데이터 탐색 - 제5회');
  });

  it('retries wrong answers with the saved retry context', async () => {
    localStorage.setItem('bigdata-cbt-wrong', JSON.stringify({ 'session-5': ['5-2'] }));
    const ctx = { totals: { 1: 20 }, baseCorrect: { 1: 19 } };
    localStorage.setItem('bigdata-cbt-retry-ctx', JSON.stringify({ 'session-5': ctx }));
    vi.mocked(bank.loadQuestionsByIds).mockResolvedValue([question('5-2')]);
    const out = await load('wrong=session-5');
    expect(out.kind).toBe('ready');
    if (out.kind !== 'ready') return;
    expect(out.run.examKey).toBe('session-5');
    expect(out.run.retryContext).toEqual(ctx);
    expect(out.run.title).toBe('오답 다시풀기 - 제5회');
  });

  it('rejects unknown topics before loading the bank', async () => {
    expect(await load('pool=topic&topic=9.9')).toEqual({ kind: 'empty', reason: 'topic-invalid' });
    expect(bank.loadAllQuestions).not.toHaveBeenCalled();
  });

  it('builds a topic set from the bank', async () => {
    const all = [question('5-1'), question('5-2')];
    vi.mocked(bank.loadAllQuestions).mockResolvedValue(all);
    vi.mocked(compose.questionsForTopic).mockReturnValue([all[1]]);
    const out = await load('pool=topic&topic=2.1.2.3');
    expect(compose.questionsForTopic).toHaveBeenCalledWith(all, '2.1.2.3');
    expect(out.kind === 'ready' && out.run.title).toBe('파생변수 생성');
    expect(out.kind === 'ready' && out.run.examKey).toBe('pool-topic-2.1.2.3');
  });

  it('composes a seeded mock exam', async () => {
    const all = [question('5-1')];
    vi.mocked(bank.loadAllQuestions).mockResolvedValue(all);
    vi.mocked(compose.composeMockExam).mockReturnValue(all);
    const out = await load('pool=mock&seed=123&strict=1');
    expect(compose.composeMockExam).toHaveBeenCalledWith(all, {}, 123);
    expect(out.kind === 'ready' && out.run.examKey).toBe('mock-123');
    expect(out.kind === 'ready' && out.run.title).toBe('실전 모의고사');
  });

  it('refuses seeded pools without a seed (the loader pins one in the URL first)', async () => {
    await expect(load('pool=mock')).rejects.toThrow();
  });

  it('falls back to the least-practised leaves when no topic is weak yet', async () => {
    const all = [question('5-1')];
    vi.mocked(bank.loadAllQuestions).mockResolvedValue(all);
    vi.mocked(mastery.weakestTopics).mockReturnValue([]);
    vi.mocked(mastery.leafStats).mockReturnValue(
      new Map([
        ['1.1.1.1', topicStat('1.1.1.1', 3, 5)],
        ['1.1.1.2', topicStat('1.1.1.2', 0, 0)],
        ['1.1.1.3', topicStat('1.1.1.3', 2, 0)],
      ]),
    );
    vi.mocked(compose.composeWeakSet).mockReturnValue(all);
    const out = await load('pool=weak&seed=9');
    const [, , topics, seed] = vi.mocked(compose.composeWeakSet).mock.calls[0];
    expect(topics.map(t => t.topic)).toEqual(['1.1.1.3', '1.1.1.1']);
    expect(seed).toBe(9);
    expect(out.kind === 'ready' && out.run.examKey).toBe('pool-weak-9');
  });

  it('propagates loader failures (e.g. offline chunk) so the UI can offer a retry', async () => {
    vi.mocked(bank.loadAllQuestions).mockRejectedValue(new Error('ChunkLoadError'));
    await expect(load('mode=all')).rejects.toThrow('ChunkLoadError');
  });
});

describe('fewestAttemptedLeaves', () => {
  it('is deterministic for a seed and prefers unattempted leaves', () => {
    const stats = new Map(
      ['a', 'b', 'c', 'd', 'e'].map((t, i) => [t, topicStat(t, 1, i < 3 ? 0 : 4)] as const),
    );
    const one = fewestAttemptedLeaves(stats, 3, seededRandom(1)).map(s => s.topic);
    const two = fewestAttemptedLeaves(stats, 3, seededRandom(1)).map(s => s.topic);
    expect(one).toEqual(two);
    expect([...one].sort()).toEqual(['a', 'b', 'c']);
  });
});
