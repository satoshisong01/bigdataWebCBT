/**
 * CONTRACT — pure study-plan logic (no storage access here).
 */
import { addDays, diffDays, isDayKey } from './date';
import type { DayActivity } from './stats';

export type PhaseId = 1 | 2 | 3 | 4;

export interface PlanPhase {
  id: PhaseId;
  /** e.g. '개념 완성' */
  name: string;
  /** day keys, inclusive */
  start: string;
  end: string;
  /** one-line Korean focus statement */
  focus: string;
  /** concrete Korean activity bullets for this phase */
  activities: string[];
}

interface PhaseTemplate {
  id: PhaseId;
  name: string;
  /** share of the days before the exam, in percent */
  share: number;
  focus: string;
  activities: readonly string[];
}

/** docs/2027-study-overhaul.md §2 — 1 개념 완성 40% · 2 기출·선지 분석 30% · 3 약점·신유형·계산 18% · 4 실전 리허설 12% */
const PHASES: readonly PhaseTemplate[] = [
  {
    id: 1,
    name: '개념 완성',
    share: 40,
    focus: '출제기준 세세항목 전 범위를 개념 카드로 한 바퀴 돌고, 설명만 보고 용어를 떠올릴 수 있게 만든다',
    activities: [
      '세부항목 순서대로 개념 카드 학습 — 카드마다 모름/애매/앎 표시',
      '용어 퀴즈로 처음 보는 용어 대비 (설명 → 용어)',
      '세부항목을 끝낼 때마다 그 범위 문제 풀기',
      '오늘의 복습(간격 반복) 매일 비우기',
    ],
  },
  {
    id: 2,
    name: '기출·선지 분석',
    share: 30,
    focus: '기출복원·AI 모의 회차를 보기 섞기로 풀고, 정답뿐 아니라 모든 보기가 왜 맞고 틀린지 설명할 수 있게 만든다',
    activities: [
      '회차별 풀기(보기 섞기 ON) — 첫 풀이 정답률로 실력 점검',
      '선지별 해설로 오답 보기가 원래 무엇을 뜻하는지 정리',
      '맞혀도 확신이 없으면 헷갈림 표시 → 복습 덱',
      '오늘의 복습으로 오답·헷갈림 반복',
    ],
  },
  {
    id: 3,
    name: '약점·신유형·계산',
    share: 18,
    focus: '정답률 낮은 세세항목과 2026 신유형, 계산 문제를 집중 보강해 지엽·처음 보는 문제에 대비한다',
    activities: [
      '약점 집중 — 정답률 낮은 세세항목 자동 세트',
      '최신경향 대비 1~3회로 처음 보는 유형 연습',
      '계산 드릴 매일 — 계산기 없이 빠르게',
      '지엽 개념 카드 다시 보기',
    ],
  },
  {
    id: 4,
    name: '실전 리허설',
    share: 12,
    focus: '실전 모드(120분·해설 없음·보기 섞기) 모의고사로 시간 배분과 과목별 과락을 점검한다',
    activities: [
      '랜덤 모의고사(과목별 20문항)를 실전 모드로 풀기',
      '틀린 세세항목은 바로 개념 카드로 복기',
      '계산 드릴로 감 유지',
      '새 범위 확장보다 복습 덱 비우기에 집중',
    ],
  },
];

/** Moves single days from the longest phase (earliest on ties) to empty phases; needs sum >= length. */
function ensureEveryPhaseHasADay(lengths: readonly number[]): number[] {
  const empty = lengths.indexOf(0);
  if (empty < 0) return [...lengths];
  const longest = lengths.indexOf(Math.max(...lengths));
  return ensureEveryPhaseHasADay(lengths.map((d, i) => (i === empty ? 1 : i === longest ? d - 1 : d)));
}

/** Largest-remainder split of `days` by `shares`; equal remainders favour the earlier phase. */
function splitDays(days: number, shares: readonly number[]): number[] {
  const total = shares.reduce((sum, s) => sum + s, 0);
  const base = shares.map(s => Math.floor((days * s) / total));
  const remainder = shares.map(s => (days * s) % total);
  const left = days - base.reduce((sum, b) => sum + b, 0);
  const winners = new Set(
    shares
      .map((_, i) => i)
      .sort((a, b) => remainder[b] - remainder[a] || a - b)
      .slice(0, left),
  );
  return ensureEveryPhaseHasADay(base.map((b, i) => (winners.has(i) ? b + 1 : b)));
}

/**
 * Splits [start, examDate - 1] into 4 consecutive phases by share of days:
 *   1 개념 완성 40% · 2 기출·선지 분석 30% · 3 약점·신유형·계산 18% · 4 실전 리허설 12%
 * Each phase gets >= 1 day when there are >= 4 days; with fewer days, drop phases from the front
 * (keep 실전 last). If examDate <= start returns [].
 */
export function buildPlan(start: string, examDate: string): PlanPhase[] {
  if (!isDayKey(start) || !isDayKey(examDate)) return [];
  const days = diffDays(start, examDate);
  if (days <= 0) return [];
  const short = days < PHASES.length;
  const kept = short ? PHASES.slice(PHASES.length - days) : PHASES;
  const lengths = short ? kept.map(() => 1) : splitDays(days, kept.map(p => p.share));
  // offsets[i] = days before phase i starts; offsets[kept.length] === days
  const offsets = lengths.reduce<number[]>((acc, len) => [...acc, acc[acc.length - 1] + len], [0]);
  return kept.map((p, i) => ({
    id: p.id,
    name: p.name,
    start: addDays(start, offsets[i]),
    end: addDays(start, offsets[i + 1] - 1),
    focus: p.focus,
    activities: [...p.activities],
  }));
}

export function phaseOn(plan: readonly PlanPhase[], day: string): PlanPhase | undefined {
  // Day keys are zero-padded 'yyyy-mm-dd', so string order is calendar order.
  return plan.find(p => p.start <= day && day <= p.end);
}

export interface DailyTask {
  id: 'review' | 'cards' | 'concept' | 'questions' | 'drill' | 'mock';
  label: string;
  /** app route to start the task */
  href: string;
  target: number;
  done: number;
}

export interface DailyTaskInput {
  today: string;
  phase: PlanPhase | undefined;
  dueQuestions: number;
  dueCards: number;
  activityToday: DayActivity | undefined;
  dailyQuestionGoal: number;
  dailyCardGoal: number;
  /** next 세부항목 to study in phase 1 (first one not yet studied) */
  nextTopic?: { id: string; name: string };
}

/** Phase 3 drills calculation hard; phase 4 only keeps the skill warm. */
const DRILL_TARGET: Readonly<Record<3 | 4, number>> = { 3: 20, 4: 10 };
/** One full mock: 4 subjects × 20 questions. */
const MOCK_QUESTIONS = 80;

/** done is today's count, capped at the target. */
function progress(target: number, done: number | undefined): Pick<DailyTask, 'target' | 'done'> {
  return { target, done: Math.min(target, done ?? 0) };
}

function conceptTask(input: DailyTaskInput): DailyTask {
  const topic = input.nextTopic;
  return {
    id: 'concept',
    label: topic ? `개념 학습 · ${topic.name}` : '개념 학습',
    href: topic ? `/concepts?topic=${encodeURIComponent(topic.id)}` : '/concepts',
    ...progress(input.dailyCardGoal, input.activityToday?.cards),
  };
}

function phaseTasks(input: DailyTaskInput): DailyTask[] {
  const activity = input.activityToday;
  const questions = (label: string): DailyTask => ({
    id: 'questions',
    label,
    href: '/exam?pool=weak',
    ...progress(input.dailyQuestionGoal, activity?.q),
  });
  const drill = (target: number): DailyTask => ({
    id: 'drill',
    label: '계산 드릴',
    href: '/drill',
    ...progress(target, activity?.drills),
  });
  switch (input.phase?.id) {
    case 1:
      return [conceptTask(input), questions('문제 풀기')];
    case 2:
      return [questions('문제 풀기 · 선지 분석')];
    case 3:
      return [questions('약점 집중 문제'), drill(DRILL_TARGET[3])];
    case 4:
      // DayActivity has no mock counter, so today's answered questions stand in for mock progress.
      return [
        { id: 'mock', label: '실전 모의고사 1회', href: '/exam?pool=mock&strict=1', ...progress(MOCK_QUESTIONS, activity?.q) },
        drill(DRILL_TARGET[4]),
      ];
    default:
      return [];
  }
}

/**
 * Always starts with 'review' when dueQuestions > 0 and 'cards' when dueCards > 0.
 * Phase 1 adds 'concept' (nextTopic) + 'questions'; phase 2 'questions'; phase 3 'questions' + 'drill';
 * phase 4 'mock' + 'drill'. Targets come from the goals; done from activityToday.
 * hrefs: /review, /concepts?topic=<id>, /exam?pool=weak, /drill, /exam?pool=mock&strict=1
 */
export function dailyTasks(input: DailyTaskInput): DailyTask[] {
  // Due counts shrink as items are reviewed, so review/cards show what is left (done stays 0).
  const review: DailyTask[] = input.dueQuestions > 0
    ? [{ id: 'review', label: '오답·헷갈림 복습', href: '/review', target: input.dueQuestions, done: 0 }]
    : [];
  const cards: DailyTask[] = input.dueCards > 0
    ? [{ id: 'cards', label: '개념 카드 복습', href: '/review', target: input.dueCards, done: 0 }]
    : [];
  return [...review, ...cards, ...phaseTasks(input)];
}
