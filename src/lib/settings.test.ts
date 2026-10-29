import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, ESTIMATED_EXAM_DATE, getSettings, saveSettings } from './settings';
import type { Settings } from './settings';

const KEY = 'bigdata-cbt-settings';
const NOW = new Date(2026, 9, 29, 9, 30); // local time → day key 2026-10-29
const TODAY = '2026-10-29';
const DEFAULTS: Settings = { ...DEFAULT_SETTINGS, planStart: TODAY };

function seed(value: unknown): void {
  localStorage.setItem(KEY, typeof value === 'string' ? value : JSON.stringify(value));
}

function stored(): unknown {
  const raw = localStorage.getItem(KEY);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('getSettings', () => {
  it('returns defaults and fixes planStart to the day of the first read', () => {
    expect(getSettings()).toEqual(DEFAULTS);
    expect(DEFAULTS.examDate).toBe(ESTIMATED_EXAM_DATE);
    expect(stored()).toEqual({ planStart: TODAY });
    vi.setSystemTime(new Date(2026, 10, 15, 9));
    expect(getSettings().planStart).toBe(TODAY);
  });

  it('keeps every valid stored field', () => {
    const custom: Settings = {
      examDate: '2027-04-10',
      examDateConfirmed: true,
      planStart: '2026-10-01',
      shuffleOptions: false,
      dailyQuestionGoal: 500,
      dailyCardGoal: 1,
    };
    seed(custom);
    expect(getSettings()).toEqual(custom);
    expect(stored()).toEqual(custom);
  });

  it.each([
    ['examDate', '2027/04/03'],
    ['examDate', 20270403],
    ['examDateConfirmed', 'yes'],
    ['shuffleOptions', 0],
    ['dailyQuestionGoal', 0],
    ['dailyQuestionGoal', 501],
    ['dailyQuestionGoal', 2.5],
    ['dailyCardGoal', '30'],
    ['dailyCardGoal', -1],
    ['dailyCardGoal', null],
  ])('falls back to the default when %s is %j', (field, value) => {
    seed({ planStart: '2026-10-01', [field]: value });
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, planStart: '2026-10-01' });
  });

  it('validates each field independently and repairs planStart', () => {
    seed({
      examDate: 'soon',
      examDateConfirmed: true,
      planStart: '2026/10/01',
      shuffleOptions: 'no',
      dailyQuestionGoal: 25,
      dailyCardGoal: 0,
      theme: 'dark',
    });
    expect(getSettings()).toEqual({ ...DEFAULTS, examDateConfirmed: true, dailyQuestionGoal: 25 });
    expect(stored()).toEqual({ examDateConfirmed: true, dailyQuestionGoal: 25, planStart: TODAY });
  });

  it.each(['{oops', '[]', 'null', '"text"', '7'])('ignores unusable stored JSON %s', raw => {
    seed(raw);
    expect(getSettings()).toEqual(DEFAULTS);
  });
});

describe('saveSettings', () => {
  it('persists valid fields and returns the merged settings', () => {
    getSettings();
    const patch: Partial<Settings> = { examDate: '2027-04-10', examDateConfirmed: true, dailyCardGoal: 50 };
    expect(saveSettings(patch)).toEqual({ ...DEFAULTS, ...patch });
    expect(stored()).toEqual({ planStart: TODAY, ...patch });
    expect(saveSettings({ shuffleOptions: false })).toEqual({ ...DEFAULTS, ...patch, shuffleOptions: false });
    expect(getSettings()).toEqual({ ...DEFAULTS, ...patch, shuffleOptions: false });
  });

  it('ignores invalid patch fields and keeps the previous values', () => {
    saveSettings({ dailyQuestionGoal: 60 });
    const result = saveSettings({ dailyQuestionGoal: 0, examDate: 'tomorrow', planStart: '', shuffleOptions: undefined });
    expect(result).toEqual({ ...DEFAULTS, dailyQuestionGoal: 60 });
    expect(stored()).toEqual({ planStart: TODAY, dailyQuestionGoal: 60 });
  });

  it('sets planStart on the first save and accepts a valid replacement', () => {
    expect(saveSettings({}).planStart).toBe(TODAY);
    vi.setSystemTime(new Date(2026, 10, 1, 9));
    expect(saveSettings({}).planStart).toBe(TODAY);
    expect(saveSettings({ planStart: '2026-11-01' }).planStart).toBe('2026-11-01');
    expect(getSettings().planStart).toBe('2026-11-01');
  });

  it('stores only chosen fields so untouched ones keep following the defaults', () => {
    const patch = { dailyCardGoal: 10, theme: 'dark' } as Partial<Settings>;
    saveSettings(patch);
    expect(stored()).toEqual({ planStart: TODAY, dailyCardGoal: 10 });
  });
});

describe('storage problems and the server', () => {
  it('falls back to defaults when storage cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(getSettings()).toEqual(DEFAULTS);
    expect(saveSettings({ dailyCardGoal: 10 })).toEqual({ ...DEFAULTS, dailyCardGoal: 10 });
  });

  it('works on the server without touching storage', () => {
    vi.stubGlobal('window', undefined);
    expect(getSettings()).toEqual(DEFAULTS);
    expect(saveSettings({ dailyCardGoal: 10 })).toEqual({ ...DEFAULTS, dailyCardGoal: 10 });
    vi.unstubAllGlobals();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
