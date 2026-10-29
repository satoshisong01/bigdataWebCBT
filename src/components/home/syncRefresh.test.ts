/**
 * useSyncRefresh adoption: a 'bigdata-cbt-synced' event makes storage-backed screens re-read
 * localStorage (here /review's due counts and the home hub), using real storage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { todayKey } from '@/lib/date';
import { SYNC_EVENT } from '@/lib/sync/events';
import ReviewContent from '@/components/learn/review/ReviewContent';
import HomeHub from './HomeHub';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(''), useRouter: () => ({}) }));
vi.mock('@/data/bank', () => ({
  loadConcepts: () => Promise.resolve([]),
  loadAllQuestions: () => Promise.resolve([]),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement;

function seedDue(ids: readonly string[]): void {
  const today = todayKey();
  const stats = Object.fromEntries(ids.map(id => [id, {
    n: 1, c: 0, first: false, ok: false, unsure: false, last: '2026-10-01T00:00:00.000Z', srs: { box: 1, due: today },
  }]));
  localStorage.setItem('bigdata-cbt-qstats', JSON.stringify(stats));
}

async function mount(component: ComponentType): Promise<void> {
  await act(async () => {
    root = createRoot(host);
    root.render(createElement(component));
  });
}

async function syncArrived(): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { applied: 1 } }));
  });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('bigdata-cbt-migrated-v2', '1');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host.remove();
});

describe('screens re-read storage after a sync', () => {
  it('/review due counts', async () => {
    seedDue(['2-1']);
    await mount(ReviewContent);
    expect(host.textContent).toContain('복습할 문항1개');
    seedDue(['2-1', '2-2', '2-3']);
    expect(host.textContent).toContain('복습할 문항1개'); // no event yet: snapshot kept
    await syncArrived();
    expect(host.textContent).toContain('복습할 문항3개');
  });

  it('home hub', async () => {
    seedDue(['2-1']);
    await mount(HomeHub);
    const before = host.textContent ?? '';
    seedDue(['2-1', '2-2', '2-3', '2-4']);
    await syncArrived();
    expect(host.textContent).not.toBe(before);
  });
});
