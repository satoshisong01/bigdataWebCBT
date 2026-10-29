/**
 * CONTRACT — user settings (localStorage key: bigdata-cbt-settings).
 * Reads validate every field and fall back to defaults field-by-field.
 */
import { isDayKey, todayKey } from './date';

export interface Settings {
  /** target 필기 date (day key) */
  examDate: string;
  /** false while examDate is our estimate (official 2027 schedule not yet confirmed) */
  examDateConfirmed: boolean;
  /** day the 4-phase plan starts (set on first visit) */
  planStart: string;
  /** shuffle options in study mode (실전 모드 always shuffles) */
  shuffleOptions: boolean;
  dailyQuestionGoal: number;
  dailyCardGoal: number;
}

/** First Saturday of April — the slot used for the 1st written exam in 2023–2026. */
export const ESTIMATED_EXAM_DATE = '2027-04-03';

export const DEFAULT_SETTINGS: Readonly<Omit<Settings, 'planStart'>> = {
  examDate: ESTIMATED_EXAM_DATE,
  examDateConfirmed: false,
  shuffleOptions: true,
  dailyQuestionGoal: 40,
  dailyCardGoal: 30,
};

const SETTINGS_KEY = 'bigdata-cbt-settings';
const MAX_DAILY_GOAL = 500;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isGoal(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_DAILY_GOAL;
}

/** Keeps only the fields that pass validation (unknown keys are dropped). */
function validFields(src: Readonly<Record<string, unknown>>): Partial<Settings> {
  const { examDate, examDateConfirmed, planStart, shuffleOptions, dailyQuestionGoal, dailyCardGoal } = src;
  return {
    ...(isDayKey(examDate) ? { examDate } : {}),
    ...(typeof examDateConfirmed === 'boolean' ? { examDateConfirmed } : {}),
    ...(isDayKey(planStart) ? { planStart } : {}),
    ...(typeof shuffleOptions === 'boolean' ? { shuffleOptions } : {}),
    ...(isGoal(dailyQuestionGoal) ? { dailyQuestionGoal } : {}),
    ...(isGoal(dailyCardGoal) ? { dailyCardGoal } : {}),
  };
}

/**
 * Only explicitly chosen (valid) values are stored, so unchanged fields keep following
 * DEFAULT_SETTINGS — e.g. a corrected ESTIMATED_EXAM_DATE reaches users who never edited it.
 */
function readStored(): Partial<Settings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    return isRecord(parsed) ? validFields(parsed) : {};
  } catch {
    return {};
  }
}

function writeStored(stored: Partial<Settings>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
  } catch { /* quota exceeded / storage disabled */ }
}

function withPlanStart(stored: Partial<Settings>): Partial<Settings> & Pick<Settings, 'planStart'> {
  return { ...stored, planStart: stored.planStart ?? todayKey() };
}

/** planStart defaults to today (and is persisted the first time it is read). */
export function getSettings(): Settings {
  const stored = readStored();
  const started = withPlanStart(stored);
  if (stored.planStart === undefined) writeStored(started); // fixed on first read so the plan doesn't drift
  return { ...DEFAULT_SETTINGS, ...started };
}

/** Validates the patch (ignores invalid fields), persists, returns the merged result. */
export function saveSettings(patch: Partial<Settings>): Settings {
  const next = withPlanStart({ ...readStored(), ...validFields({ ...patch }) });
  writeStored(next);
  return { ...DEFAULT_SETTINGS, ...next };
}
