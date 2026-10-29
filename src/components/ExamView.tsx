'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useExamLoader } from '@/hooks/useExamLoader';
import { useExamSession } from '@/hooks/useExamSession';
import type { ExamRun } from '@/hooks/exam/run';
import ExamHeader from './ExamHeader';
import QuestionNav from './QuestionNav';
import QuestionCard from './QuestionCard';
import ResultView from './ResultView';
import ExamActions from './exam/ExamActions';
import MobileQuestionGrid from './exam/MobileQuestionGrid';
import { ExamEmpty, ExamError, ExamLoading } from './exam/ExamStatus';

/** Client-only (see app/exam/page.tsx): storage is read during the first render. */
export default function ExamView() {
  const searchParams = useSearchParams();
  const loader = useExamLoader(searchParams.toString());

  switch (loader.status) {
    case 'loading':
      return <ExamLoading />;
    case 'error':
      return <ExamError detail={loader.detail} onRetry={loader.reload} />;
    case 'empty':
      return (
        <ExamEmpty
          reason={loader.reason}
          topic={loader.params.source.kind === 'topic' ? loader.params.source.topic : undefined}
        />
      );
    case 'ready':
      return <ExamRunner key={loader.loadId} initialRun={loader.run} />;
  }
}

interface ExamRunnerProps {
  initialRun: ExamRun;
}

/** Holds the current attempt; 다시 풀기 swaps in a new run and remounts the screen with fresh state. */
function ExamRunner({ initialRun }: ExamRunnerProps) {
  const [attempt, setAttempt] = useState({ run: initialRun, n: 0 });
  const restart = (run: ExamRun) => setAttempt(prev => ({ run, n: prev.n + 1 }));
  return <ExamScreen key={attempt.n} run={attempt.run} onRestart={restart} />;
}

interface ExamScreenProps {
  run: ExamRun;
  onRestart: (next: ExamRun) => void;
}

function ExamScreen({ run, onRestart }: ExamScreenProps) {
  const router = useRouter();
  const exam = useExamSession(run, onRestart);
  const { state, item, actions } = exam;
  const mainRef = useRef<HTMLElement>(null);
  const displayQuestions = useMemo(() => run.items.map(i => i.display), [run.items]);
  const ids = useMemo(() => run.items.map(i => i.original.id), [run.items]);

  // A new question starts at the top of the scroll area (explanations can be long).
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [state.index]);

  const goHome = () => {
    const inProgress = state.phase === 'exam' && (exam.answeredCount > 0 || state.passed.size > 0);
    if (inProgress && !window.confirm('제출하지 않고 나가면 이번 풀이의 답안과 점수는 저장되지 않아요. 나갈까요?')) return;
    router.push('/');
  };

  if (state.phase === 'result' && state.result) {
    return (
      <ResultView
        result={state.result}
        wrongCount={exam.wrongCount}
        wrongTopics={exam.wrongTopics}
        strict={run.strict}
        shuffled={run.shuffled}
        isRetry={run.retryContext !== null}
        saveFailed={state.saveFailed}
        onReview={actions.review}
        onRetry={actions.retry}
        onRetryWrong={actions.retryWrong}
        onHome={() => router.push('/')}
      />
    );
  }

  const id = item.original.id;
  const reviewing = state.phase === 'review';
  const showTally = !run.strict && !reviewing && (state.checked.size > 0 || state.passed.size > 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950">
      <ExamHeader
        title={run.title}
        currentIndex={state.index}
        totalQuestions={state.total}
        timeRemaining={exam.timeRemaining}
        answeredCount={exam.answeredCount}
        checkedCorrect={exam.tally.correct}
        checkedWrong={exam.tally.wrong}
        strict={run.strict}
        isSubmitted={reviewing}
        onSubmit={actions.submit}
        onHome={goHome}
        onShowResult={actions.showResult}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 p-4 overflow-y-auto hidden lg:block">
          <QuestionNav
            questions={displayQuestions}
            currentIndex={state.index}
            states={exam.navStates}
            unsure={state.unsure}
            onNavigate={actions.goTo}
            isSubmitted={reviewing}
          />
        </aside>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-8">
          <div className="max-w-3xl mx-auto">
            <QuestionCard
              key={id}
              question={item.display}
              displayNumber={state.index + 1}
              selectedAnswer={exam.displayPick}
              onAnswer={actions.pick}
              revealed={exam.revealed}
              locked={exam.locked}
            />

            {showTally && (
              <div className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm">
                <span className="text-gray-500 dark:text-slate-400">확인 {state.checked.size + state.passed.size}문제</span>
                <span className="text-green-600 dark:text-green-400 font-bold">O {exam.tally.correct}</span>
                <span className="text-red-600 dark:text-red-400 font-bold">X {exam.tally.wrong}</span>
              </div>
            )}

            <ExamActions
              reviewing={reviewing}
              strict={run.strict}
              isFirst={state.index === 0}
              isLast={exam.isLast}
              hasAnswer={state.answers[id] !== undefined}
              checked={state.checked.has(id)}
              passed={state.passed.has(id)}
              shown={state.shown.has(id)}
              unsure={state.unsure.has(id)}
              unsureLocked={exam.unsureLocked}
              onPrev={actions.prev}
              onNext={actions.next}
              onSubmit={actions.submit}
              onToggleExplanation={actions.toggleExplanation}
              onToggleUnsure={actions.toggleUnsure}
              onPass={actions.pass}
              onCheck={actions.check}
            />
          </div>
        </main>
      </div>

      <MobileQuestionGrid
        ids={ids}
        currentIndex={state.index}
        states={exam.navStates}
        unsure={state.unsure}
        onNavigate={actions.goTo}
      />
    </div>
  );
}
