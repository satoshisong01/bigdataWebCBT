import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/sync/engine', () => ({ startAutoSync: vi.fn() }));

import { startAutoSync } from '@/lib/sync/engine';
import { SYNC_EVENT } from '@/lib/sync/events';
import SyncProvider, { SyncProvider as NamedSyncProvider } from './SyncProvider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TOAST = '다른 기기의 학습 기록을 불러왔어요';
const stopAutoSync = vi.fn();
let container: HTMLDivElement;
let root: Root | undefined;

function mount(): void {
  root = createRoot(container);
  act(() => root?.render(createElement(SyncProvider, null, createElement('main', null, '앱 본문'))));
}

function unmount(): void {
  act(() => root?.unmount());
  root = undefined;
}

function synced(detail?: unknown): void {
  act(() => {
    window.dispatchEvent(detail === undefined ? new Event(SYNC_EVENT) : new CustomEvent(SYNC_EVENT, { detail }));
  });
}

function toast(): Element | null {
  return container.querySelector('[role="status"]');
}

beforeEach(() => {
  vi.mocked(startAutoSync).mockReturnValue(stopAutoSync);
  container = document.createElement('div');
  document.body.appendChild(container);
  mount();
});

afterEach(() => {
  unmount();
  container.remove();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('SyncProvider', () => {
  it('starts auto sync once, renders its children and nothing else, and stops on unmount', () => {
    expect(startAutoSync).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe('앱 본문');
    expect(toast()).toBeNull();
    unmount();
    expect(stopAutoSync).toHaveBeenCalledTimes(1);
  });

  it('says so only when records from another device were applied, and can be dismissed', () => {
    synced({ applied: 0 });
    synced();
    synced(null);
    expect(toast()).toBeNull();
    synced({ applied: 3 });
    expect(toast()?.textContent).toContain(TOAST);
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="안내 닫기"]');
    act(() => close?.click());
    expect(toast()).toBeNull();
    expect(container.textContent).toBe('앱 본문');
  });

  it('hides the notice by itself, restarting the timer on every new sync', () => {
    vi.useFakeTimers();
    synced({ applied: 1 });
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    synced({ applied: 2 });
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(toast()).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(toast()).toBeNull();
  });

  it('is also exported by name', () => {
    expect(NamedSyncProvider).toBe(SyncProvider);
  });
});
