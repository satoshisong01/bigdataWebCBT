/**
 * Pure view helpers shared by the home hub (/) and the study plan (/plan).
 * No storage access here — callers pass in the data they read.
 */
import type { CardMeta, ExamSession, QuestionSource } from '@/types';
import type { CStat } from '@/lib/stats';
import type { TopicStat } from '@/lib/mastery';
import type { PlanPhase } from '@/lib/plan';
import { sessionsBySource } from '@/data/catalog';
import { SUBS } from '@/data/criteria';
import type { CriteriaSub } from '@/data/criteria';
import { addDays, diffDays } from '@/lib/date';

export interface SessionGroup {
  source: QuestionSource;
  title: string;
  desc: string;
}

/** Home order: new-style practice first, then real 기출, then the older AI mocks. */
export const SESSION_GROUPS: readonly SessionGroup[] = [
  { source: 'ai-trend', title: '최신경향 대비', desc: '2026(12·13회) 출제 키워드 + 기출에 없던 세세항목 · AI 생성·검증' },
  { source: 'restored', title: '기출복원', desc: '수험생 복원 기반 실제 기출 · 원문과 일부 다를 수 있어요' },
  { source: 'ai-mock', title: 'AI 모의고사', desc: '출제범위·난이도를 참고해 AI가 만든 모의문제' },
];

/** Every session in SESSION_GROUPS order (회차별 풀기 sections, 과목별 풀기 buttons). */
export function sessionsInGroupOrder(): ExamSession[] {
  return SESSION_GROUPS.flatMap(g => sessionsBySource(g.source));
}

/** Concept-card progress of one 세부항목 ('S.M.U'). */
export interface SubProgress {
  total: number;
  /** cards graded at least once (they have a CStat) */
  studied: number;
}

/** 세세항목 'S.M.U.L' (or deeper) → its 세부항목 'S.M.U'; undefined for ids above 세부항목 level. */
export function subIdOf(topic: string): string | undefined {
  const parts = topic.split('.');
  return parts.length >= 3 ? parts.slice(0, 3).join('.') : undefined;
}

/** Cards per 세부항목 and how many of them already have a CStat. */
export function subCardProgress(
  cards: readonly CardMeta[],
  cstats: Readonly<Record<string, CStat>>,
): Map<string, SubProgress> {
  const progress = new Map<string, SubProgress>();
  for (const card of cards) {
    const sub = subIdOf(card.topic);
    if (!sub) continue;
    const prev = progress.get(sub) ?? { total: 0, studied: 0 };
    const studied = Object.prototype.hasOwnProperty.call(cstats, card.id) ? 1 : 0;
    progress.set(sub, { total: prev.total + 1, studied: prev.studied + studied });
  }
  return progress;
}

/**
 * A 세부항목 counts as studied once every one of its 세세항목 is studied; `studied` is
 * studiedLeaves() from lib/mastery (the same per-leaf rule as the readiness coverage).
 */
export function isSubStudied(sub: Pick<CriteriaSub, 'leaves'>, studied: ReadonlySet<string>): boolean {
  return sub.leaves.length > 0 && sub.leaves.every(leaf => studied.has(leaf.id));
}

export interface TopicRef {
  id: string;
  name: string;
}

/**
 * First 세부항목 in 출제기준 order that has concept cards (`progress`, from subCardProgress) and is
 * not studied yet (`studied` = studiedLeaves()). 세부항목 without cards are skipped: the task opens its cards.
 */
export function findNextTopic(
  progress: ReadonlyMap<string, SubProgress>,
  studied: ReadonlySet<string>,
): TopicRef | undefined {
  const next = SUBS.find(sub => (progress.get(sub.id)?.total ?? 0) > 0 && !isSubStudied(sub, studied));
  return next ? { id: next.id, name: next.name } : undefined;
}

/** 156 → 'D-156', 0 → 'D-DAY', -3 → 'D+3' */
export function ddayLabel(daysLeft: number): string {
  if (daysLeft > 0) return `D-${daysLeft}`;
  if (daysLeft === 0) return 'D-DAY';
  return `D+${-daysLeft}`;
}

/** Elapsed share of [planStart, examDate] as an integer 0–100 (100 when the range is empty). */
export function planProgressPercent(planStart: string, examDate: string, today: string): number {
  const total = diffDays(planStart, examDate);
  if (!(total > 0)) return 100;
  const elapsed = diffDays(planStart, today);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export type PhaseStatus = 'done' | 'current' | 'upcoming';

/** Day keys are zero-padded 'yyyy-mm-dd', so string order is calendar order. */
export function phaseStatus(phase: Pick<PlanPhase, 'start' | 'end'>, today: string): PhaseStatus {
  if (phase.end < today) return 'done';
  if (phase.start > today) return 'upcoming';
  return 'current';
}

/** Days left in the phase, today included. */
export function daysLeftInPhase(phase: Pick<PlanPhase, 'end'>, today: string): number {
  return Math.max(0, diffDays(today, phase.end) + 1);
}

/** Phase length in days (start and end inclusive). */
export function phaseLength(phase: Pick<PlanPhase, 'start' | 'end'>): number {
  return diffDays(phase.start, phase.end) + 1;
}

/** '2027-04-03' → '4.3' */
export function formatMonthDay(dayKey: string): string {
  const [, month, day] = dayKey.split('-');
  return `${Number(month)}.${Number(day)}`;
}

export type HeatTone = 'none' | 'danger' | 'low' | 'mid' | 'high';

/** Heatmap bucket by 첫 풀이 정답률: <40 과락 위험 · <60 합격선 미달 · <80 합격선 · 80+ 안정; 'none' when unattempted. */
export function heatTone(stat: Pick<TopicStat, 'attempted' | 'firstAccuracy'> | undefined): HeatTone {
  if (!stat || stat.attempted === 0 || stat.firstAccuracy < 0) return 'none';
  if (stat.firstAccuracy < 40) return 'danger';
  if (stat.firstAccuracy < 60) return 'low';
  if (stat.firstAccuracy < 80) return 'mid';
  return 'high';
}

/**
 * Consecutive study days ending today — or ending yesterday, so a streak that is still alive
 * shows before today's first study. A stored `current` goes stale once a day is missed.
 */
export function liveStreak(days: readonly string[], today: string): number {
  const studied = new Set(days);
  let cursor = studied.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (studied.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
