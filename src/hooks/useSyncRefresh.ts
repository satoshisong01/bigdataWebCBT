import { useEffect, useState } from 'react';
import { SYNC_EVENT } from '@/lib/sync/events';

/**
 * A number that goes up whenever a sync wrote records from another device into localStorage.
 * Put it in the deps of whatever re-reads storage (home, plan, concepts, review lists, settings);
 * screens with work in progress (exam, drill, quiz) should simply not use it.
 */
export function useSyncRefresh(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = (): void => setVersion(v => v + 1);
    window.addEventListener(SYNC_EVENT, bump);
    return () => window.removeEventListener(SYNC_EVENT, bump);
  }, []);
  return version;
}

export default useSyncRefresh;
