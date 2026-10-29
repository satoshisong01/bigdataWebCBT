import { describe, expect, it } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SYNC_EVENT } from '@/lib/sync/events';
import { useSyncRefresh } from './useSyncRefresh';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const seen: number[] = [];

function Probe(): null {
  const version = useSyncRefresh();
  useEffect(() => {
    seen.push(version);
  }, [version]);
  return null;
}

function synced(): void {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { applied: 1 } }));
}

describe('useSyncRefresh', () => {
  it('goes up once per sync event while mounted', () => {
    const root = createRoot(document.createElement('div'));
    act(() => root.render(createElement(Probe)));
    expect(seen).toEqual([0]);
    act(synced);
    act(synced);
    expect(seen).toEqual([0, 1, 2]);
    act(() => root.unmount());
    synced();
    expect(seen).toEqual([0, 1, 2]);
  });
});
