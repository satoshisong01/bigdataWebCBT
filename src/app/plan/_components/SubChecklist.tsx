'use client';

import Link from 'next/link';
import { CRITERIA, SUBS } from '@/data/criteria';
import type { CriteriaSub } from '@/data/criteria';
import { isSubStudied } from '@/components/home/homeLogic';

interface SubChecklistProps {
  /** studied 세세항목 ids: studiedLeaves() from lib/mastery */
  studied: ReadonlySet<string>;
}

interface SubRowProps {
  sub: CriteriaSub;
  studiedLeafIds: ReadonlySet<string>;
}

function SubRow({ sub, studiedLeafIds }: SubRowProps) {
  const studied = isSubStudied(sub, studiedLeafIds);
  const leavesDone = sub.leaves.filter(leaf => studiedLeafIds.has(leaf.id)).length;
  return (
    <li>
      <Link href={`/concepts?topic=${encodeURIComponent(sub.id)}`} className="flex items-center gap-3 py-2 min-h-10 group">
        <span
          className={`w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
            studied
              ? 'bg-green-500 border-green-500 text-white dark:bg-green-600 dark:border-green-600'
              : 'border-gray-300 dark:border-slate-600 text-transparent'
          }`}
          aria-hidden
        >
          ✓
        </span>
        <span className="min-w-0 flex-1 text-sm text-gray-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
          {sub.name}
          <span className="sr-only">{studied ? ' (완료)' : ' (미완료)'}</span>
        </span>
        <span className="text-xs tabular-nums text-gray-500 dark:text-slate-400 flex-shrink-0">
          {leavesDone}/{sub.leaves.length}
          <span className="sr-only"> 세세항목 학습</span>
        </span>
      </Link>
    </li>
  );
}

/** 세부항목 체크리스트 — a 세부항목 is checked once all of its 세세항목 are studied (studiedLeaves). */
export default function SubChecklist({ studied }: SubChecklistProps) {
  const studiedCount = SUBS.filter(sub => isSubStudied(sub, studied)).length;
  const pct = SUBS.length > 0 ? Math.round((studiedCount / SUBS.length) * 100) : 0;
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100">개념 체크리스트</h2>
        <span className="text-sm font-bold tabular-nums text-gray-700 dark:text-slate-200">
          {studiedCount}/{SUBS.length} 세부항목
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
        세부항목의 세세항목을 모두 학습하면 체크돼요. 세세항목은 개념 카드를 절반 이상 학습(모름·애매·앎 표시, 용어 퀴즈,
        복습 포함)하면, 카드가 없는 항목은 관련 문제를 2개 이상 풀면 학습한 것으로 봐요. 1단계가 끝나기 전에 모두 체크하는 것이
        목표예요.
      </p>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden mb-3 sm:mb-4">
        <div className="h-full rounded-full bg-green-500 dark:bg-green-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {CRITERIA.map(subject => (
          <div
            key={subject.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5"
          >
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">
              <span className="text-blue-600 dark:text-blue-400">{subject.id}과목</span> {subject.name}
            </h3>
            <ul className="mt-1 divide-y divide-gray-100 dark:divide-slate-800">
              {subject.majors.flatMap(major => major.subs).map(sub => (
                <SubRow key={sub.id} sub={sub} studiedLeafIds={studied} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
