/** A simulated browser (own storage, cookie jar, clock-driven engine and auth client) for sync tests. */
import { createAuthClient, type AuthClient } from '@/lib/auth';
import { createSyncEngine, type SyncDeps, type SyncEngine } from '../engine';
import { SYNC_EVENT, type SyncEventDetail } from '../events';
import type { FakeClient, FakeServer } from './fakeServer';
import { createMemoryStorage, type MemoryStorage } from './memoryStorage';

export interface TestClock {
  /** epoch ms */
  now(): number;
  set(iso: string): void;
  advance(ms: number): void;
}

export function createClock(iso: string): TestClock {
  let t = Date.parse(iso);
  return {
    now: () => t,
    set: next => {
      t = Date.parse(next);
    },
    advance: ms => {
      t += ms;
    },
  };
}

export interface TestDevice {
  readonly storage: MemoryStorage;
  readonly client: FakeClient;
  readonly engine: SyncEngine;
  readonly auth: AuthClient;
  /** `applied` of every SYNC_EVENT, in order */
  readonly syncEvents: number[];
  /** every dispatched event type, in order */
  readonly events: string[];
  setOnline(online: boolean): void;
  /** parsed JSON stored under `key` (undefined when missing) */
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

/** `overrides` receives the device's own fake client, e.g. to wrap its fetch. */
export function createDevice(
  server: FakeServer,
  clock: TestClock,
  name: string,
  overrides: (client: FakeClient) => Partial<SyncDeps> = () => ({}),
): TestDevice {
  const storage = createMemoryStorage();
  const client = server.client();
  const syncEvents: number[] = [];
  const events: string[] = [];
  let online = true;
  const engine = createSyncEngine({
    fetch: client.fetch,
    now: () => new Date(clock.now()),
    isOnline: () => online,
    storage: () => storage,
    newDeviceId: () => `device-${name}`,
    dispatch: (type, detail) => {
      events.push(type);
      if (type === SYNC_EVENT) syncEvents.push((detail as SyncEventDetail).applied);
    },
    runExclusive: task => task(),
    ...overrides(client),
  });
  return {
    storage,
    client,
    engine,
    auth: createAuthClient(engine),
    syncEvents,
    events,
    setOnline: next => {
      online = next;
    },
    get: key => {
      const raw = storage.getItem(key);
      return raw === null ? undefined : (JSON.parse(raw) as unknown);
    },
    set: (key, value) => storage.setItem(key, JSON.stringify(value)),
  };
}
