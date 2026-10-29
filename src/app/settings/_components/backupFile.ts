import { toDayKey } from '@/lib/date';

/** Files larger than this are rejected before reading — localStorage itself only holds ~5 MB. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

/** 'bigdata-cbt-backup-YYYYMMDD.json', using the local calendar date. */
export function backupFileName(now: Date): string {
  return `bigdata-cbt-backup-${toDayKey(now).replace(/-/g, '')}.json`;
}

/** Saves `text` as a download through a temporary object URL. */
export function downloadTextFile(text: string, fileName: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers read the URL after click() returns, so revoke a little later.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
