'use client';

import Link from 'next/link';
import type { Readiness, SubjectReadiness, SubjectRisk } from '@/lib/mastery';

interface ReadinessCardProps {
  readiness: Readiness;
}

const STATUS: Readonly<Record<Readiness['status'], { label: string; badge: string; score: string }>> = {
  'pass-likely': {
    label: '합격권',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    score: 'text-green-600 dark:text-green-400',
  },
  borderline: {
    label: '경계권',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    score: 'text-amber-600 dark:text-amber-400',
  },
  'fail-likely': {
    label: '합격선 미달',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    score: 'text-red-600 dark:text-red-400',
  },
  unknown: {
    label: '데이터 부족',
    badge: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300',
    score: 'text-gray-400 dark:text-slate-500',
  },
};

const RISK_CHIP: Readonly<Record<SubjectRisk, string>> = {
  safe: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300',
  warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  unknown: 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const BASIS: Readonly<Record<Readiness['basis'], string>> = {
  mock: '근거: 최근 실전 모의고사(보기 섞기) 평균',
  'first-attempt': '근거: 과목별 첫 풀이 정답률 (과목당 20문항 이상)',
  none: '실전 모의고사를 보거나 과목당 20문항 이상 풀면 계산돼요',
};

function chipTitle(s: SubjectReadiness): string {
  if (s.firstAccuracy < 0) return `${s.subject}과목 · 아직 기록이 없어요`;
  return `${s.subject}과목 · 첫 풀이 ${s.firstAccuracy}% · 최근 ${s.accuracy}% · ${s.attempted}문항`;
}

/** 합격 준비도 — computeReadiness() summary: status, expected score + basis, subject risk, coverage, top reasons. */
export default function ReadinessCard({ readiness }: ReadinessCardProps) {
  const status = STATUS[readiness.status];
  const { studied, total } = readiness.coverage;
  const coveragePct = total > 0 ? Math.round((studied / total) * 100) : 0;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100">합격 준비도</h2>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.badge}`}>{status.label}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-3xl sm:text-4xl font-black tabular-nums ${status.score}`}>
          {readiness.expected >= 0 ? `${readiness.expected}점` : '-'}
        </span>
        <span className="text-xs text-gray-500 dark:text-slate-400">{BASIS[readiness.basis]}</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5 sm:gap-2" aria-label="과목별 위험도">
        {readiness.subjects.map(s => (
          <li
            key={s.subject}
            title={chipTitle(s)}
            className={`text-xs font-medium px-2 py-1 rounded-lg border tabular-nums ${RISK_CHIP[s.risk]}`}
          >
            {s.subject}과목 {s.risk === 'unknown' ? '기록 부족' : `${s.firstAccuracy}%`}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-300">
          <span>출제기준 커버리지</span>
          <span className="tabular-nums font-bold">
            {studied}/{total} 세세항목
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${coveragePct}%` }} />
        </div>
      </div>

      {readiness.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs sm:text-sm text-gray-600 dark:text-slate-300 list-disc pl-4">
          {readiness.reasons.slice(0, 2).map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] sm:text-xs text-gray-400 dark:text-slate-500">
        2026년 시험이 기출보다 어려웠던 만큼, 다시 푼 점수가 아니라 첫 풀이 정답률로 보수적으로 계산해요.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/exam?pool=mock&strict=1"
          className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition"
        >
          실전 모의고사
        </Link>
        <Link
          href="/exam?pool=weak"
          className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
        >
          약점 집중
        </Link>
      </div>
    </section>
  );
}
