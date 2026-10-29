'use client';

import DailyReminder from '@/components/DailyReminder';
import StreakBadge from '@/components/StreakBadge';
import CriteriaHeatmap from './CriteriaHeatmap';
import DdayBanner from './DdayBanner';
import ExamNotice from './ExamNotice';
import FeatureTiles from './FeatureTiles';
import MigrationNotice from './MigrationNotice';
import ReadinessCard from './ReadinessCard';
import SessionGroups from './SessionGroups';
import SubjectPractice from './SubjectPractice';
import TodayTasks from './TodayTasks';
import { useHomeData } from './useHomeData';

/**
 * The home hub below the header (docs/2027-study-overhaul.md §4.1). Client-only — rendered via
 * next/dynamic with ssr: false — because every section is derived from localStorage. Analytics use
 * QUESTION_META / CARD_META only; the bank is downloaded once, for the legacy-stats migration.
 */
export default function HomeHub() {
  const { view, migration, retryMigration } = useHomeData();
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-10">
      <div className="space-y-3 sm:space-y-4">
        <MigrationNotice state={migration} onRetry={retryMigration} />
        <DdayBanner today={view.today} settings={view.settings} plan={view.plan} phase={view.phase} />
        <TodayTasks tasks={view.tasks} activity={view.activityToday} streak={view.streakNow} />
        <ReadinessCard readiness={view.readiness} />
      </div>
      <FeatureTiles
        dueCount={view.dueQuestions + view.dueCards}
        deckCount={view.deckCount}
        bookmarkCount={view.bookmarkCount}
      />
      <CriteriaHeatmap stats={view.subStats} />
      <SessionGroups history={view.history} wrongCounts={view.wrongCounts} />
      <SubjectPractice history={view.history} wrongCounts={view.wrongCounts} />
      <div className="space-y-3 sm:space-y-4">
        <StreakBadge streak={view.streak} />
        <DailyReminder />
        <ExamNotice />
      </div>
    </main>
  );
}
