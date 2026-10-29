/**
 * 업데이트 소식 — shown by the 🔔 in the top bar. NEWEST FIRST.
 * The scheduled content routine prepends one entry per applied update (date = KST day it shipped).
 * `id` must be unique and never change: unread counts compare against the last id a device has seen.
 */
export interface SiteUpdate {
  id: string;
  /** YYYY-MM-DD (KST) */
  date: string;
  title: string;
  /** Learner-facing summary lines (what changed and why it matters) */
  items: string[];
}

export const SITE_UPDATES: readonly SiteUpdate[] = [
  {
    id: '2026-10-30-overhaul',
    date: '2026-10-30',
    title: '2027 출제기준 대개편',
    items: [
      '분류를 2027 개정 출제기준(제14회부터, 82개 세세항목)으로 바꿨어요. 실전 모의고사도 새 과목 배분(과목별 20문항)으로 나와요.',
      '최신경향 대비 모의고사 3회분(240문항)을 추가했어요. 2026년 시험처럼 낯선 용어·손계산·옳지 않은 것·조합형 위주예요.',
      '세세항목별 개념카드 1,519장과 용어 퀴즈를 추가했어요.',
      '기존 문항에 보기별 해설을 붙이고, 정답 오류 7건을 고치고, 정답 논란 문항에는 안내를 달았어요.',
      '로그인하면 PC·휴대폰의 학습 기록(오답·북마크·복습 일정 등)이 자동으로 동기화돼요.',
    ],
  },
];
