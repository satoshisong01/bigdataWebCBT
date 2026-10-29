import { describe, it, expect } from 'vitest';
import { examKeyOf, needsSeed, parseExamParams, parseSeed, timeLimitFor } from './params';

function parse(query: string) {
  return parseExamParams(new URLSearchParams(query));
}

describe('parseExamParams', () => {
  it('keeps the legacy modes and their exam keys', () => {
    expect(examKeyOf(parse('mode=session&id=5').source)).toBe('session-5');
    expect(examKeyOf(parse('mode=subject&id=3&session=5').source)).toBe('subject-3-5');
    expect(examKeyOf(parse('mode=subject&id=3').source)).toBe('all');
    expect(examKeyOf(parse('mode=all').source)).toBe('all');
    expect(examKeyOf(parse('wrong=subject-2-t1').source)).toBe('subject-2-t1');
    expect(examKeyOf(parse('pool=bookmarks').source)).toBe('pool-bookmarks');
    expect(examKeyOf(parse('pool=wrong-pool').source)).toBe('pool-wrong');
  });

  it('defaults to a session exam when nothing is given (legacy behaviour)', () => {
    expect(parse('').source).toEqual({ kind: 'session', sessionId: '' });
  });

  it('parses the new pools with their keys', () => {
    expect(examKeyOf(parse('pool=review').source)).toBe('pool-review');
    expect(examKeyOf(parse('pool=weak&seed=42').source)).toBe('pool-weak-42');
    expect(examKeyOf(parse('pool=topic&topic=3.2.1.4').source)).toBe('pool-topic-3.2.1.4');
    expect(examKeyOf(parse('pool=mock&seed=7&strict=1').source)).toBe('mock-7');
  });

  it('gives pool precedence over wrong and mode', () => {
    expect(parse('pool=review&wrong=session-1&mode=session&id=2').source.kind).toBe('review');
    expect(parse('wrong=session-1&mode=session&id=2').source).toEqual({ kind: 'wrong', examKey: 'session-1' });
  });

  it('ignores unknown pools', () => {
    expect(parse('pool=nope&mode=session&id=3').source).toEqual({ kind: 'session', sessionId: '3' });
  });

  it('reads strict mode', () => {
    expect(parse('pool=mock&strict=1').strict).toBe(true);
    expect(parse('pool=mock&strict=true').strict).toBe(true);
    expect(parse('pool=mock&strict=0').strict).toBe(false);
    expect(parse('mode=session&id=1').strict).toBe(false);
  });

  it('trims the topic id', () => {
    expect(parse('pool=topic&topic=%203.2%20').source).toEqual({ kind: 'topic', topic: '3.2' });
  });
});

describe('seeds', () => {
  it('accepts uint32 seeds only', () => {
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('4294967295')).toBe(4294967295);
    expect(parseSeed('4294967296')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('1.5')).toBeNull();
    expect(parseSeed('abc')).toBeNull();
    expect(parseSeed('')).toBeNull();
    expect(parseSeed(null)).toBeNull();
  });

  it('asks for a seed only for seeded pools without one', () => {
    expect(needsSeed(parse('pool=weak').source)).toBe(true);
    expect(needsSeed(parse('pool=mock&seed=x').source)).toBe(true);
    expect(needsSeed(parse('pool=mock&seed=12').source)).toBe(false);
    expect(needsSeed(parse('pool=review').source)).toBe(false);
    expect(needsSeed(parse('mode=session&id=1').source)).toBe(false);
  });
});

describe('timeLimitFor', () => {
  it('keeps 120분 in study mode', () => {
    expect(timeLimitFor(false, 10)).toBe(7200);
    expect(timeLimitFor(false, 300)).toBe(7200);
  });

  it('uses 120분 for full strict exams and 90초/문항 for shorter ones', () => {
    expect(timeLimitFor(true, 80)).toBe(7200);
    expect(timeLimitFor(true, 120)).toBe(7200);
    expect(timeLimitFor(true, 79)).toBe(79 * 90);
    expect(timeLimitFor(true, 20)).toBe(1800);
  });
});
