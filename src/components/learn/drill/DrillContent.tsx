'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { DRILL_GENERATORS, buildDrillSet, type DrillItem } from '@/lib/drills';
import { newSeed } from '@/lib/rng';
import { EmptyBlock } from '../StatusBlocks';
import { BTN_PRIMARY, BTN_SECONDARY, MAIN, PAGE } from '../ui';
import { parseSeed, resolveKinds, type DrillCount } from './drillPlan';
import DrillSetup from './DrillSetup';
import DrillSession from './DrillSession';

const ALL_KINDS: readonly string[] = DRILL_GENERATORS.map(g => g.kind);
const BUILD_ERROR = '문제를 만들지 못했어요. 다른 종류를 골라 다시 시도해 주세요.';

interface DrillSet {
  /** bumps on every start so the session state resets */
  round: number;
  items: readonly DrillItem[];
}

/** /drill (client-only): pick generator kinds + count, then solve a seeded set. `?seed=` fixes the first set. */
export default function DrillContent() {
  const params = useSearchParams();
  const [pendingSeed, setPendingSeed] = useState<number | null>(() => parseSeed(params.get('seed')));
  const [kinds, setKinds] = useState<ReadonlySet<string>>(() => new Set(ALL_KINDS));
  const [count, setCount] = useState<DrillCount>(10);
  const [drillSet, setDrillSet] = useState<DrillSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    const seed = pendingSeed ?? newSeed();
    let items: DrillItem[];
    try {
      items = buildDrillSet(resolveKinds(kinds, ALL_KINDS), seed, count);
    } catch {
      setError(BUILD_ERROR);
      setDrillSet(null);
      return;
    }
    if (items.length === 0) {
      setError(BUILD_ERROR);
      setDrillSet(null);
      return;
    }
    setPendingSeed(null);
    setError(null);
    setDrillSet(prev => ({ round: (prev?.round ?? 0) + 1, items }));
  };

  return (
    <div className={PAGE}>
      <PageHeader title="계산 드릴" subtitle="계산기 없이 손으로 — 매일 10문제" />
      <main className={MAIN}>
        {ALL_KINDS.length === 0 ? (
          <EmptyBlock
            title="계산 드릴을 준비 중이에요"
            description="통계·모델 평가 계산 문제를 만들고 있어요. 그동안 개념 학습이나 문제 풀이를 해 보세요."
          >
            <Link href="/concepts" className={BTN_PRIMARY}>
              개념 학습
            </Link>
            <Link href="/" className={BTN_SECONDARY}>
              홈으로
            </Link>
          </EmptyBlock>
        ) : drillSet ? (
          <DrillSession
            key={drillSet.round}
            items={drillSet.items}
            onRestart={start}
            onSetup={() => setDrillSet(null)}
          />
        ) : (
          <DrillSetup
            generators={DRILL_GENERATORS}
            selected={kinds}
            count={count}
            error={error}
            onChangeKinds={setKinds}
            onChangeCount={setCount}
            onStart={start}
          />
        )}
      </main>
    </div>
  );
}
