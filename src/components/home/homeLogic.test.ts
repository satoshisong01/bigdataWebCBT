import { describe, it, expect } from 'vitest';
import type { CardMeta } from '@/types';
import type { CStat } from '@/lib/stats';
import { SESSIONS } from '@/data/catalog';
import { SUBS } from '@/data/criteria';
import {
  SESSION_GROUPS,
  daysLeftInPhase,
  ddayLabel,
  findNextTopic,
  formatMonthDay,
  heatTone,
  isSubStudied,
  liveStreak,
  phaseLength,
  phaseStatus,
  planProgressPercent,
  sessionsInGroupOrder,
  subCardProgress,
  subIdOf,
} from './homeLogic';

const STAT: CStat = { srs: { box: 2, due: '2026-11-01' }, n: 1, again: 0, last: '2026-10-29T00:00:00.000Z' };

function card(id: string, topic: string): CardMeta {
  return { id, topic, importance: 2 };
}

describe('subIdOf', () => {
  it('cuts a 세세항목 id down to its 세부항목', () => {
    expect(subIdOf('3.2.2.6')).toBe('3.2.2');
    expect(subIdOf('1.1.1')).toBe('1.1.1');
  });

  it('rejects ids above 세부항목 level', () => {
    expect(subIdOf('3.2')).toBeUndefined();
    expect(subIdOf('')).toBeUndefined();
  });
});

describe('subCardProgress / isSubStudied', () => {
  const cards = [card('a', '1.1.1.1'), card('b', '1.1.1.2'), card('c', '1.1.1.3'), card('d', '1.1.2.1'), card('x', '9')];

  it('counts cards and graded cards per 세부항목, skipping malformed topics', () => {
    const progress = subCardProgress(cards, { a: STAT });
    expect(progress.get('1.1.1')).toEqual({ total: 3, studied: 1 });
    expect(progress.get('1.1.2')).toEqual({ total: 1, studied: 0 });
    expect(progress.size).toBe(2);
  });

  it('ignores inherited object keys in cstats', () => {
    const progress = subCardProgress([card('constructor', '1.1.1.1')], {});
    expect(progress.get('1.1.1')).toEqual({ total: 1, studied: 0 });
  });

  it('marks a 세부항목 studied only when every 세세항목 is in the studiedLeaves set', () => {
    const sub = { leaves: [{ id: '1.1.2.1', name: 'a' }, { id: '1.1.2.2', name: 'b' }] };
    expect(isSubStudied(sub, new Set(['1.1.2.1']))).toBe(false);
    expect(isSubStudied(sub, new Set(['1.1.2.1', '1.1.2.2']))).toBe(true);
    expect(isSubStudied({ leaves: [] }, new Set(['1.1.2.1']))).toBe(false);
  });
});

describe('findNextTopic', () => {
  const OVERVIEW = { id: '1.1.1', name: '빅데이터 개요 및 활용' };
  const overviewLeaves = SUBS[0].leaves.map(l => l.id);

  it('returns the first 세부항목 in criteria order that has cards and is not fully studied', () => {
    const cards = [card('a', '1.1.1.1'), card('b', '1.1.2.1'), card('c', '2.1.1.1')];
    const progress = subCardProgress(cards, { a: STAT });
    expect(findNextTopic(progress, new Set())).toEqual(OVERVIEW);
    // every 세세항목 but one studied is not enough
    expect(findNextTopic(progress, new Set(overviewLeaves.slice(1)))).toEqual(OVERVIEW);
    expect(findNextTopic(progress, new Set(overviewLeaves))).toEqual({ id: '1.1.2', name: '빅데이터 관련 법제' });
  });

  it('skips 세부항목 without cards and returns undefined when everything is studied', () => {
    expect(findNextTopic(new Map(), new Set())).toBeUndefined();
    const last = SUBS[SUBS.length - 1];
    const progress = subCardProgress([card('a', `${last.id}.1`)], { a: STAT });
    expect(findNextTopic(progress, new Set(last.leaves.map(l => l.id)))).toBeUndefined();
  });
});

describe('D-day and plan progress', () => {
  it('labels days left', () => {
    expect(ddayLabel(156)).toBe('D-156');
    expect(ddayLabel(0)).toBe('D-DAY');
    expect(ddayLabel(-3)).toBe('D+3');
  });

  it('measures elapsed share of the plan, clamped to 0–100', () => {
    expect(planProgressPercent('2026-10-29', '2027-04-03', '2026-10-29')).toBe(0);
    expect(planProgressPercent('2026-10-29', '2027-04-03', '2027-01-15')).toBe(50);
    expect(planProgressPercent('2026-10-29', '2027-04-03', '2027-05-01')).toBe(100);
    expect(planProgressPercent('2026-10-29', '2027-04-03', '2026-10-01')).toBe(0);
    expect(planProgressPercent('2027-04-03', '2027-04-03', '2027-04-03')).toBe(100);
  });
});

describe('phase helpers', () => {
  const phase = { start: '2026-11-01', end: '2026-11-10' };

  it('classifies a phase relative to today', () => {
    expect(phaseStatus(phase, '2026-10-31')).toBe('upcoming');
    expect(phaseStatus(phase, '2026-11-01')).toBe('current');
    expect(phaseStatus(phase, '2026-11-10')).toBe('current');
    expect(phaseStatus(phase, '2026-11-11')).toBe('done');
  });

  it('counts days with both ends inclusive', () => {
    expect(phaseLength(phase)).toBe(10);
    expect(daysLeftInPhase(phase, '2026-11-01')).toBe(10);
    expect(daysLeftInPhase(phase, '2026-11-10')).toBe(1);
    expect(daysLeftInPhase(phase, '2026-12-01')).toBe(0);
  });

  it('formats month.day without leading zeros', () => {
    expect(formatMonthDay('2027-04-03')).toBe('4.3');
    expect(formatMonthDay('2026-12-30')).toBe('12.30');
  });
});

describe('heatTone', () => {
  it('is grey until something was attempted', () => {
    expect(heatTone(undefined)).toBe('none');
    expect(heatTone({ attempted: 0, firstAccuracy: -1 })).toBe('none');
  });

  it('buckets by first-attempt accuracy', () => {
    expect(heatTone({ attempted: 5, firstAccuracy: 39 })).toBe('danger');
    expect(heatTone({ attempted: 5, firstAccuracy: 40 })).toBe('low');
    expect(heatTone({ attempted: 5, firstAccuracy: 60 })).toBe('mid');
    expect(heatTone({ attempted: 5, firstAccuracy: 80 })).toBe('high');
    expect(heatTone({ attempted: 5, firstAccuracy: 0 })).toBe('danger');
  });
});

describe('session groups', () => {
  it('lists every catalog session exactly once, grouped 최신경향 → 기출복원 → AI 모의', () => {
    const ordered = sessionsInGroupOrder();
    expect(ordered.map(s => s.id).sort()).toEqual(SESSIONS.map(s => s.id).sort());
    const ranks = ordered.map(s => SESSION_GROUPS.findIndex(g => g.source === s.source));
    expect(ranks.every(r => r >= 0)).toBe(true);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(SESSION_GROUPS.map(g => g.source)).toEqual(['ai-trend', 'restored', 'ai-mock']);
  });
});

describe('liveStreak', () => {
  it('counts back from today when today was studied', () => {
    expect(liveStreak(['2026-10-27', '2026-10-28', '2026-10-29'], '2026-10-29')).toBe(3);
  });

  it('keeps a streak that ended yesterday alive', () => {
    expect(liveStreak(['2026-10-27', '2026-10-28'], '2026-10-29')).toBe(2);
  });

  it('drops to 0 once a whole day was missed', () => {
    expect(liveStreak(['2026-10-01', '2026-10-02', '2026-10-27'], '2026-10-29')).toBe(0);
    expect(liveStreak([], '2026-10-29')).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    expect(liveStreak(['2026-12-31', '2027-01-01'], '2027-01-01')).toBe(2);
  });
});
