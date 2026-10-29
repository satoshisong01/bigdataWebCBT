/** A fake server with one account plus helpers to bring devices online (tests only). */
import { createFakeServer, type FakeServer } from './fakeServer';
import { createClock, createDevice, type TestClock, type TestDevice } from './device';
import { PASSWORD, T0, seedFull } from './fixtures';

export interface World {
  clock: TestClock;
  server: FakeServer;
  /** user id of 'alice' (password PASSWORD) */
  alice: number;
}

export function createWorld(pageSize?: number): World {
  const clock = createClock(T0);
  const server = createFakeServer({ now: clock.now, pageSize });
  return { clock, server, alice: server.addUser('alice', PASSWORD) };
}

/** A device logged in (and synced) as alice — seeded with seedFull() first unless `seed` is false. */
export async function loggedInDevice(w: World, name = 'A', seed = true): Promise<TestDevice> {
  const device = createDevice(w.server, w.clock, name);
  if (seed) seedFull(device);
  const res = await device.auth.login('alice', PASSWORD, true);
  if (!res.ok) throw new Error(`login failed: ${res.error}`);
  return device;
}
