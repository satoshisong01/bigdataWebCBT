'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useSyncRefresh } from '@/hooks/useSyncRefresh';
import { todayKey } from '@/lib/date';
import { getSettings, saveSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';
import AccountPanel from './AccountPanel';
import BackupPanel from './BackupPanel';
import ResetPanel from './ResetPanel';
import StudySettings from './StudySettings';

/** /settings — client-only (rendered with ssr: false); storage is read in lazy initializers. */
export default function SettingsContent() {
  // A sync that brought in another device's records remounts the storage-backed sections;
  // the account panel stays mounted so a half-typed password change is kept.
  const syncVersion = useSyncRefresh();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <PageHeader title="설정" subtitle="계정·동기화 · 시험일 · 일일 목표 · 백업 · 초기화" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">
        <AccountPanel />
        <StoredSettings key={syncVersion} />
      </main>
    </div>
  );
}

function StoredSettings() {
  const [today] = useState<string>(todayKey);
  const [settings, setSettings] = useState<Settings>(getSettings);
  // Bumped after an import so panels holding their own snapshot (reset counts) re-read storage.
  const [dataVersion, setDataVersion] = useState(0);

  const update = (patch: Partial<Settings>) => setSettings(saveSettings(patch));
  const reload = () => setSettings(getSettings());
  const reloadAll = () => {
    reload();
    setDataVersion(v => v + 1);
  };

  return (
    <>
      <StudySettings settings={settings} today={today} onChange={update} />
      <BackupPanel onImported={reloadAll} />
      <ResetPanel key={dataVersion} onReset={reload} />
    </>
  );
}
