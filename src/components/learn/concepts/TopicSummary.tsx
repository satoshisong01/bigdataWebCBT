'use client';

import Link from 'next/link';
import type { TopicStat } from '@/lib/mastery';
import type { CardCount } from './conceptIndex';
import { ProgressBar } from '../SessionParts';
import { accuracyTone } from '../format';
import { quizHref, topicExamHref } from '../links';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, MUTED, TONE_TEXT } from '../ui';

interface TopicSummaryProps {
  topic: string;
  /** null while the cards load or when they failed to load */
  cards: CardCount | null;
  stat: TopicStat | undefined;
}

/** Range header: card progress, first-attempt accuracy, and the quiz / problem actions. */
export default function TopicSummary({ topic, cards, stat }: TopicSummaryProps) {
  const questions = stat?.questions ?? 0;
  const attempted = stat?.attempted ?? 0;
  const first = stat && attempted > 0 ? stat.firstAccuracy : -1;
  const hasCards = cards !== null && cards.total > 0;

  return (
    <section className={`${CARD} space-y-4`}>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className={`text-xs ${MUTED}`}>학습한 개념 카드</dt>
          <dd className="mt-1 text-xl font-black text-gray-900 dark:text-slate-100">
            {cards === null ? '—' : `${cards.studied} / ${cards.total}`}
          </dd>
        </div>
        <div>
          <dt className={`text-xs ${MUTED}`}>문항 첫풀이 정답률</dt>
          <dd className={`mt-1 text-xl font-black ${TONE_TEXT[accuracyTone(first)]}`}>
            {first >= 0 ? `${first}%` : '—'}
          </dd>
          <dd className={`text-xs ${MUTED}`}>
            {questions > 0 ? `${questions}문항 중 ${attempted}개 풀이` : '연결된 문항이 아직 없어요'}
          </dd>
        </div>
      </dl>
      {hasCards && <ProgressBar value={cards.studied} total={cards.total} label="카드 학습 진행률" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {hasCards ? (
          <Link href={quizHref(topic)} className={BTN_PRIMARY}>
            이 범위 용어 퀴즈
          </Link>
        ) : (
          <button type="button" disabled className={BTN_PRIMARY} title="이 범위의 개념 카드를 준비 중이에요">
            이 범위 용어 퀴즈
          </button>
        )}
        <Link href={topicExamHref(topic)} className={BTN_SECONDARY}>
          이 범위 문제 풀기{questions > 0 && ` (${questions})`}
        </Link>
      </div>
    </section>
  );
}
