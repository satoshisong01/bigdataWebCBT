'use client';

import Link from 'next/link';
import { DRILL_GENERATORS, type DrillItem } from '@/lib/drills';
import { ScoreBanner } from '../SessionParts';
import { countCorrect } from '../choiceRun';
import { accuracyTone, percent } from '../format';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, MUTED, TONE_TEXT } from '../ui';
import { kindBreakdown } from './drillPlan';

const TITLES: ReadonlyMap<string, string> = new Map(DRILL_GENERATORS.map(g => [g.kind, g.title]));

interface DrillResultProps {
  items: readonly DrillItem[];
  picks: readonly number[];
  onRestart: () => void;
  onSetup: () => void;
}

export default function DrillResult({ items, picks, onRestart, onSetup }: DrillResultProps) {
  const answered = Math.min(picks.length, items.length);
  const breakdown = kindBreakdown(items, picks, TITLES);

  return (
    <div className="space-y-4">
      <ScoreBanner correct={countCorrect(items, picks)} total={answered} label="계산 드릴 결과" />
      {breakdown.length > 0 && (
        <section className={`${CARD} space-y-2`}>
          <h2 className="font-bold text-gray-900 dark:text-slate-100">종류별 결과</h2>
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {breakdown.map(k => (
              <li key={k.kind} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800 dark:text-slate-100">{k.title}</span>
                <span className={`text-sm font-bold ${TONE_TEXT[accuracyTone(percent(k.correct, k.total))]}`}>
                  {k.correct}/{k.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {answered > 0 && (
        <p className={`text-center text-xs ${MUTED}`}>오늘 학습 기록에 계산 {answered}문제를 더했어요.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" onClick={onRestart} className={BTN_PRIMARY}>
          새 문제로 다시
        </button>
        <button type="button" onClick={onSetup} className={BTN_SECONDARY}>
          종류·개수 바꾸기
        </button>
        <Link href="/" className={BTN_SECONDARY}>
          홈으로
        </Link>
      </div>
    </div>
  );
}
