'use client';

import { useEffect, useState } from 'react';
import { loadAllQuestions } from '@/data/bank';
import { CARD_META, QUESTION_META } from '@/data/meta';
import { todayKey } from '@/lib/date';
import { computeReadiness, leafStats, rollup, studiedLeaves } from '@/lib/mastery';
import type { Readiness, TopicStat } from '@/lib/mastery';
import { buildPlan, dailyTasks, phaseOn } from '@/lib/plan';
import type { DailyTask, PlanPhase } from '@/lib/plan';
import { getSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';
import {
  getActivity,
  getCStats,
  getDeckQuestionIds,
  getDueCardIds,
  getDueQuestionIds,
  getMockRecords,
  getQStats,
  migrateLegacyStats,
} from '@/lib/stats';
import type { DayActivity } from '@/lib/stats';
import { getBookmarks, getHistory, getStreak, getWrongIds } from '@/lib/storage';
import type { ExamRecord, StreakData } from '@/lib/storage';
import { useSyncRefresh } from '@/hooks/useSyncRefresh';
import { findNextTopic, liveStreak, subCardProgress } from './homeLogic';

/** Set by migrateLegacyStats once legacy data was imported (see src/lib/stats.ts). */
const MIGRATED_FLAG_KEY = 'bigdata-cbt-migrated-v2';

/** Everything the home hub renders, read from localStorage in one pass. */
export interface HomeView {
  today: string;
  settings: Settings;
  plan: PlanPhase[];
  phase: PlanPhase | undefined;
  tasks: DailyTask[];
  activityToday: DayActivity | undefined;
  readiness: Readiness;
  /** keyed by 세부항목 id ('S.M.U') */
  subStats: Map<string, TopicStat>;
  dueQuestions: number;
  dueCards: number;
  deckCount: number;
  bookmarkCount: number;
  history: ExamRecord[];
  /** examKey → wrong ids of its latest record (legacy per-exam 오답 다시풀기) */
  wrongCounts: Record<string, number>;
  streak: StreakData;
  /** streak recomputed for today (StreakData.current goes stale after a missed day) */
  streakNow: number;
}

export function readHomeView(): HomeView {
  const today = todayKey();
  const settings = getSettings();
  const plan = buildPlan(settings.planStart, settings.examDate);
  const phase = phaseOn(plan, today);
  const qstats = getQStats();
  const cstats = getCStats();
  const activityToday: DayActivity | undefined = getActivity()[today];
  const dueQuestions = getDueQuestionIds(today).length;
  const dueCards = getDueCardIds(today).length;
  const rawHistory: unknown = getHistory();
  const history = Array.isArray(rawHistory) ? (rawHistory as ExamRecord[]) : [];
  const streak = getStreak();
  const streakDays = Array.isArray(streak.days) ? streak.days : [];
  return {
    today,
    settings,
    plan,
    phase,
    activityToday,
    dueQuestions,
    dueCards,
    history,
    streak: { ...streak, days: streakDays },
    streakNow: liveStreak(streakDays, today),
    tasks: dailyTasks({
      today,
      phase,
      dueQuestions,
      dueCards,
      activityToday,
      dailyQuestionGoal: settings.dailyQuestionGoal,
      dailyCardGoal: settings.dailyCardGoal,
      nextTopic: findNextTopic(
        subCardProgress(CARD_META, cstats),
        studiedLeaves({ bank: QUESTION_META, qstats, cards: CARD_META, cstats }),
      ),
    }),
    readiness: computeReadiness({ bank: QUESTION_META, qstats, cards: CARD_META, cstats, mocks: getMockRecords() }),
    subStats: rollup(leafStats(QUESTION_META, qstats), 'sub'),
    deckCount: getDeckQuestionIds().length,
    bookmarkCount: getBookmarks().length,
    wrongCounts: Object.fromEntries(history.map(r => [r.key, getWrongIds(r.key).length])),
  };
}

export type MigrationState = 'done' | 'running' | 'error';

function needsMigration(): boolean {
  try {
    return localStorage.getItem(MIGRATED_FLAG_KEY) === null;
  } catch {
    return false; // storage unavailable — nothing to migrate into
  }
}

let inFlight: Promise<void> | null = null;

/**
 * The one place the home downloads the question bank: migrateLegacyStats needs the answer keys.
 * Shared while in flight (StrictMode double effects, quick remounts) and finishes even if the
 * home unmounts, so legacy answers are imported before new-style recording piles up.
 */
function runMigration(): Promise<void> {
  if (!inFlight) {
    inFlight = loadAllQuestions()
      .then(bank => {
        migrateLegacyStats(bank);
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export interface HomeData {
  view: HomeView;
  migration: MigrationState;
  retryMigration: () => void;
}

/** Client-only (the hub is rendered with ssr: false): storage is read in lazy state initializers. */
export function useHomeData(): HomeData {
  const [view, setView] = useState<HomeView>(readHomeView);
  const [migration, setMigration] = useState<MigrationState>(() => (needsMigration() ? 'running' : 'done'));
  // Another device's records arrived (sync) → re-read during render (state-adjust pattern, no remount).
  const syncVersion = useSyncRefresh();
  const [seenSync, setSeenSync] = useState(syncVersion);
  if (seenSync !== syncVersion) {
    setSeenSync(syncVersion);
    setView(readHomeView());
  }

  useEffect(() => {
    if (migration !== 'running') return;
    let active = true;
    runMigration()
      .then(() => {
        if (!active) return;
        setView(readHomeView());
        setMigration('done');
      })
      .catch(() => {
        if (active) setMigration('error');
      });
    return () => {
      active = false;
    };
  }, [migration]);

  // Coming back to the tab (another tab studied, or the day rolled over) → re-read.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setView(readHomeView());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return { view, migration, retryMigration: () => setMigration('running') };
}
