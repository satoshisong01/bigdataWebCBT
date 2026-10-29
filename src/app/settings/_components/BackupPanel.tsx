'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { exportBackup, importBackup } from '@/lib/backup';
import { MAX_BACKUP_BYTES, backupFileName, downloadTextFile } from './backupFile';
import StatusMessage from './StatusMessage';
import type { Status } from './StatusMessage';

interface BackupPanelProps {
  /** called after a successful import so the page re-reads its data */
  onImported: () => void;
}

type ImportMode = 'merge' | 'replace';

interface PendingFile {
  name: string;
  text: string;
}

const CONFIRM: Readonly<Record<ImportMode, string>> = {
  merge: '백업의 기록을 지금 기록에 합칩니다. 같은 항목은 백업 내용으로 덮어써요. 계속할까요?',
  replace: '지금 이 기기의 학습 기록을 모두 지우고 백업 파일의 내용으로 바꿉니다. 되돌릴 수 없어요. 계속할까요?',
};

const BUTTON =
  'px-3 py-2 text-sm font-bold rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition';

/** 백업 내보내기(JSON 다운로드) / 가져오기(파일 → 병합·교체 확인 → importBackup). */
export default function BackupPanel({ onImported }: BackupPanelProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);

  const handleExport = () => {
    const name = backupFileName(new Date());
    try {
      downloadTextFile(exportBackup(), name);
      setStatus({ tone: 'ok', text: `${name} 파일을 저장했어요. 클라우드·메일 등 기기 밖에 보관하세요.` });
    } catch {
      setStatus({ tone: 'error', text: '백업 파일을 만들지 못했어요. 브라우저 저장소나 다운로드가 막혀 있는지 확인해 주세요.' });
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // the same file can be picked again later
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setPending(null);
      setStatus({ tone: 'error', text: '파일이 너무 커요. 이 앱에서 내보낸 백업 파일인지 확인해 주세요.' });
      return;
    }
    file
      .text()
      .then(text => {
        setPending({ name: file.name, text });
        setStatus(null);
      })
      .catch(() => {
        setPending(null);
        setStatus({ tone: 'error', text: '파일을 읽지 못했어요. 다시 선택해 주세요.' });
      });
  };

  const handleImport = (mode: ImportMode) => {
    if (!pending || !window.confirm(CONFIRM[mode])) return;
    const result = importBackup(pending.text, mode);
    setPending(null);
    if (!result.ok) {
      setStatus({ tone: 'error', text: result.error });
      return;
    }
    setStatus({
      tone: 'ok',
      text: `${result.keys}개 항목을 ${mode === 'replace' ? '교체해서' : '병합해서'} 가져왔어요.`,
    });
    onImported();
  };

  return (
    <section
      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6"
      aria-labelledby="backup-title"
    >
      <h2 id="backup-title" className="text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100">
        백업 · 복원
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        기록은 이 브라우저에만 저장돼요. 시험까지 몇 달 쌓일 기록이니 가끔 내보내 두고, 기기를 바꾸면 가져오세요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={handleExport} className={BUTTON}>
          백업 내보내기
        </button>
        <label className={`${BUTTON} cursor-pointer focus-within:ring-2 focus-within:ring-blue-400`}>
          백업 파일 가져오기
          <input type="file" accept=".json,application/json" onChange={handleFile} className="sr-only" />
        </label>
      </div>

      {pending && (
        <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3 sm:p-4">
          <p className="text-sm text-gray-800 dark:text-slate-100">
            <span className="font-bold break-all">{pending.name}</span> — 어떻게 가져올까요?
          </p>
          <ul className="mt-1 text-xs text-gray-600 dark:text-slate-300 space-y-0.5">
            <li>병합: 지금 기록을 유지하고, 같은 항목만 백업 내용으로 덮어써요.</li>
            <li>교체: 지금 기록을 모두 지우고 백업 내용으로 바꿔요.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleImport('merge')}
              className="px-3 py-1.5 text-sm font-bold rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition"
            >
              병합
            </button>
            <button
              type="button"
              onClick={() => handleImport('replace')}
              className="px-3 py-1.5 text-sm font-bold rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              교체
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <StatusMessage status={status} />
    </section>
  );
}
