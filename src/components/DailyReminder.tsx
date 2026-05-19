'use client';

import { useEffect, useState } from 'react';

const PREF_KEY = 'bigdata-cbt-reminder';
const LAST_FIRED_KEY = 'bigdata-cbt-reminder-last';

interface ReminderPref {
  enabled: boolean;
  hour: number; // 0-23
}

function loadPref(): ReminderPref {
  if (typeof window === 'undefined') return { enabled: false, hour: 20 };
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { enabled: false, hour: 20 };
    const parsed = JSON.parse(raw) as ReminderPref;
    return {
      enabled: !!parsed.enabled,
      hour: typeof parsed.hour === 'number' ? parsed.hour : 20,
    };
  } catch {
    return { enabled: false, hour: 20 };
  }
}

function savePref(pref: ReminderPref): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
  } catch { /* ignore */ }
}

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fireReminder(): Promise<void> {
  if (Notification.permission !== 'granted') return;
  const today = todayDateStr();
  const last = localStorage.getItem(LAST_FIRED_KEY);
  if (last === today) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: 'SHOW_REMINDER',
      body: '오늘의 학습 시간이에요! 5문제만 풀어볼까요?',
    });
    localStorage.setItem(LAST_FIRED_KEY, today);
  } catch { /* ignore */ }
}

export default function DailyReminder() {
  const [mounted, setMounted] = useState(false);
  const [pref, setPref] = useState<ReminderPref>({ enabled: false, hour: 20 });
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setSupported(false);
      return;
    }
    setPref(loadPref());
    setPermission(Notification.permission);
  }, []);

  // Check every minute whether it's time to fire today's reminder
  useEffect(() => {
    if (!mounted || !supported || !pref.enabled || permission !== 'granted') return;

    const check = () => {
      const now = new Date();
      if (now.getHours() === pref.hour && now.getMinutes() < 5) {
        fireReminder();
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [mounted, supported, pref.enabled, pref.hour, permission]);

  if (!mounted) return null;
  if (!supported) {
    return (
      <div className="text-xs sm:text-sm text-gray-400 dark:text-slate-500">
        이 브라우저는 알림을 지원하지 않습니다.
      </div>
    );
  }

  const handleToggle = async () => {
    if (pref.enabled) {
      const next = { ...pref, enabled: false };
      setPref(next);
      savePref(next);
      return;
    }
    let perm = permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (perm !== 'granted') return;
    const next = { ...pref, enabled: true };
    setPref(next);
    savePref(next);
  };

  const handleHourChange = (hour: number) => {
    const next = { ...pref, hour };
    setPref(next);
    savePref(next);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100">
            오늘의 학습 알림
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            설정한 시간에 브라우저 알림으로 학습을 리마인드합니다.
            {permission === 'denied' && (
              <span className="block text-red-500 mt-1">
                알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={pref.hour}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            disabled={!pref.enabled}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 disabled:opacity-50"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, '0')}:00
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleToggle}
            disabled={permission === 'denied'}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition ${
              pref.enabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pref.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </section>
  );
}
