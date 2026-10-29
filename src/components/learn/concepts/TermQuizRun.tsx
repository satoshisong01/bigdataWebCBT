'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ConceptCard } from '@/types';
import type { Grade } from '@/lib/srs';
import { buildTermQuiz, type TermQuizFilter } from '@/lib/termQuiz';
import { newSeed } from '@/lib/rng';
import { topicName } from '@/data/criteria';
import MathText from '@/components/MathText';
import ChoiceList from '../ChoiceList';
import { ConceptBody } from '../ConceptParts';
import { AnswerBar, ProgressBar } from '../SessionParts';
import { EmptyBlock } from '../StatusBlocks';
import { START_RUN, advanceRun, countCorrect, finishRun, isAnswered, pickChoice, type ChoiceRun } from '../choiceRun';
import { useChoiceHotkeys } from '../useHotkeys';
import { conceptsHref, topicExamHref } from '../links';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, CARD, LINK } from '../ui';
import TermQuizResult from './TermQuizResult';

const QUIZ_SIZE = 20;

interface QuizRound {
  seed: number;
  /** retrying missed terms only; null = the whole range */
  cardIds: readonly string[] | null;
}

function quizFilter(round: QuizRound, topic: string | null): TermQuizFilter | undefined {
  if (round.cardIds) return { cardIds: round.cardIds };
  return topic ? { topicPrefix: topic } : undefined;
}

interface TermQuizRunProps {
  cards: readonly ConceptCard[];
  topic: string | null;
  /** correct → 'good', wrong → 'again' */
  onGrade: (cardId: string, grade: Grade) => void;
}

export default function TermQuizRun({ cards, topic, onGrade }: TermQuizRunProps) {
  const [round, setRound] = useState<QuizRound>(() => ({ seed: newSeed(), cardIds: null }));
  const [run, setRun] = useState<ChoiceRun>(START_RUN);
  const items = useMemo(
    () => buildTermQuiz(cards, round.seed, round.cardIds?.length ?? QUIZ_SIZE, quizFilter(round, topic)),
    [cards, round, topic],
  );
  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);

  const current = items[run.index];
  const picked = isAnswered(run) ? run.picks[run.index] : undefined;
  const isLast = run.index + 1 >= items.length;

  const pick = (option: number) => {
    if (!current || run.done || picked !== undefined) return;
    onGrade(current.cardId, option === current.answer ? 'good' : 'again');
    setRun(r => pickChoice(r, option));
  };
  const next = () => setRun(r => advanceRun(r, items.length));
  const restart = (cardIds: readonly string[] | null) => {
    setRound({ seed: newSeed(), cardIds });
    setRun(START_RUN);
  };

  useChoiceHotkeys({
    optionCount: current?.options.length ?? 0,
    answered: picked !== undefined,
    onPick: pick,
    onNext: next,
    enabled: !run.done && current !== undefined,
  });

  if (items.length === 0) {
    return (
      <EmptyBlock
        title="개념 카드를 준비 중이에요"
        description="이 범위에는 아직 퀴즈로 낼 카드가 없어요. 그동안 문제 풀이로 학습해 보세요."
      >
        {topic && (
          <Link href={topicExamHref(topic)} className={BTN_PRIMARY}>
            이 범위 문제 풀기
          </Link>
        )}
        <Link href="/concepts" className={BTN_SECONDARY}>
          개념 학습으로
        </Link>
      </EmptyBlock>
    );
  }

  if (run.done || !current) {
    return (
      <TermQuizResult
        items={items}
        picks={run.picks}
        cardById={cardById}
        topic={topic}
        onRetryMissed={restart}
        onRestart={() => restart(null)}
      />
    );
  }

  const card = cardById.get(current.cardId);

  return (
    <div className="space-y-4">
      <ProgressBar
        value={run.picks.length}
        total={items.length}
        label={`${run.index + 1} / ${items.length}`}
        aside={`정답 ${countCorrect(items, run.picks)}`}
      />
      <section className={`${CARD} space-y-4`}>
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">다음 설명에 해당하는 용어는?</p>
        <MathText
          text={current.prompt}
          className="block text-base sm:text-lg leading-relaxed text-gray-900 dark:text-slate-100"
        />
        <ChoiceList options={current.options} answer={current.answer} picked={picked} onPick={pick} />
        {picked !== undefined && <AnswerBar correct={picked === current.answer} isLast={isLast} onNext={next} />}
      </section>
      {picked !== undefined && card && (
        <section className={`${CARD} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-gray-900 dark:text-slate-100">{card.term}</h3>
            <Link href={conceptsHref(card.topic)} className={`text-xs ${LINK}`}>
              {topicName(card.topic)} 개념 보기
            </Link>
          </div>
          <ConceptBody card={card} />
        </section>
      )}
      <div className="flex items-center justify-between gap-2">
        {run.picks.length > 0 ? (
          <button type="button" onClick={() => setRun(finishRun)} className={BTN_GHOST}>
            그만하고 결과 보기
          </button>
        ) : (
          <span />
        )}
        <p className="hidden sm:block text-xs text-gray-400 dark:text-slate-500">키보드 1–4 선택 · Enter 다음</p>
      </div>
    </div>
  );
}
