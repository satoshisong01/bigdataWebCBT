'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Question, ExamResult } from '@/types';
import { calculateResult, buildRetryContext } from '@/lib/utils';
import {
  saveRecord,
  saveWrongIds,
  saveExamAnswers,
  clearExamAnswers,
  saveRetryContext,
  clearRetryContext,
  recordWrongAnswers,
  RetryContext,
} from '@/lib/storage';
import { useExamLoader } from '@/hooks/useExamLoader';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useExamKeyboard } from '@/hooks/useExamKeyboard';
import QuestionCard from './QuestionCard';
import ExamHeader from './ExamHeader';
import QuestionNav from './QuestionNav';
import ResultView from './ResultView';

type Phase = 'exam' | 'result' | 'review';

const TIME_LIMIT = 7200;

export default function ExamView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode') ?? 'session';
  const id = searchParams.get('id') ?? '';
  const sessionParam = searchParams.get('session');
  const wrongOf = searchParams.get('wrong');
  const pool = searchParams.get('pool'); // 'wrong-pool' | 'bookmarks'

  const { questions: loadedQuestions, initialAnswers, initialRetryContext, examKey } =
    useExamLoader({ mode, id, sessionParam, wrongOf, pool });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('exam');
  const [shownExplanations, setShownExplanations] = useState<Set<string>>(new Set());
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [passedQuestions, setPassedQuestions] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ExamResult | null>(null);
  const [retryContext, setRetryContext] = useState<RetryContext | null>(null);

  const submitRef = useRef<(() => void) | undefined>(undefined);
  const timeElapsedRef = useRef(0);

  // Sync loader output into local state, resetting transient exam state on mode/id change
  useEffect(() => {
    setQuestions(loadedQuestions);
    setAnswers(initialAnswers);
    setRetryContext(initialRetryContext);
    setCurrentIndex(0);
    setPhase('exam');
    setShownExplanations(new Set());
    setCheckedQuestions(new Set());
    setPassedQuestions(new Set());
    setResult(null);
  }, [loadedQuestions, initialAnswers, initialRetryContext]);

  const { timeElapsed, timeRemaining } = useExamTimer({
    active: phase === 'exam' && questions.length > 0,
    timeLimit: TIME_LIMIT,
    onTimeout: () => submitRef.current?.(),
  });

  useEffect(() => {
    timeElapsedRef.current = timeElapsed;
  }, [timeElapsed]);

  const doSubmit = useCallback(() => {
    if (questions.length === 0) return;
    const r = calculateResult(questions, answers, timeElapsedRef.current, retryContext ?? undefined);
    setResult(r);
    setPhase('result');

    saveRecord({
      key: examKey,
      score: r.score,
      passed: r.passed,
      date: new Date().toISOString(),
    });

    const wrongIds = questions
      .filter(q => answers[q.id] !== q.answer)
      .map(q => q.id);
    saveWrongIds(examKey, wrongIds);
    saveExamAnswers(examKey, answers);

    // Update global wrong-stats pool (for spaced repetition)
    const attempted = questions.filter(q => answers[q.id] !== undefined).map(q => q.id);
    recordWrongAnswers(wrongIds, attempted);

    if (wrongIds.length > 0) {
      const ctx = buildRetryContext(questions, answers, retryContext);
      saveRetryContext(examKey, ctx);
    }
  }, [questions, answers, examKey, retryContext]);

  submitRef.current = doSubmit;

  useExamKeyboard({
    active: phase === 'exam' || phase === 'review',
    questionCount: questions.length,
    currentIndex,
    acceptAnswerKeys: phase === 'exam',
    setCurrentIndex,
    onAnswerKey: answer => {
      const q = questions[currentIndex];
      if (q) setAnswers(prev => ({ ...prev, [q.id]: answer }));
    },
  });

  const handleAnswer = useCallback(
    (answer: number) => {
      const q = questions[currentIndex];
      if (!q) return;
      setAnswers(prev => ({ ...prev, [q.id]: answer }));
    },
    [questions, currentIndex],
  );

  const handleSubmitClick = useCallback(() => {
    const answeredCount = Object.keys(answers).length;
    const msg =
      answeredCount < questions.length
        ? `${answeredCount}/${questions.length} 문제만 답변했습니다. 제출하시겠습니까?`
        : '제출하시겠습니까?';
    if (confirm(msg)) {
      doSubmit();
    }
  }, [answers, questions.length, doSubmit]);

  const handlePass = useCallback(() => {
    const q = questions[currentIndex];
    if (!q) return;
    setPassedQuestions(prev => {
      const next = new Set(prev);
      next.add(q.id);
      return next;
    });
    setAnswers(prev => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
    if (currentIndex === questions.length - 1) {
      doSubmit();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [questions, currentIndex, doSubmit]);

  const handleCheck = useCallback(() => {
    const q = questions[currentIndex];
    if (!q || answers[q.id] === undefined) return;

    if (checkedQuestions.has(q.id)) {
      if (currentIndex === questions.length - 1) {
        doSubmit();
      } else {
        setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
      }
    } else {
      if (passedQuestions.has(q.id)) {
        setPassedQuestions(prev => {
          const next = new Set(prev);
          next.delete(q.id);
          return next;
        });
      }
      setCheckedQuestions(prev => {
        const next = new Set(prev);
        next.add(q.id);
        return next;
      });
    }
  }, [questions, currentIndex, answers, checkedQuestions, passedQuestions, doSubmit]);

  const { checkedCorrect, checkedWrong } = useMemo(() => {
    let correct = 0;
    let wrong = passedQuestions.size;
    for (const qId of checkedQuestions) {
      const q = questions.find(item => item.id === qId);
      if (q) {
        if (answers[qId] === q.answer) correct++;
        else wrong++;
      }
    }
    return { checkedCorrect: correct, checkedWrong: wrong };
  }, [checkedQuestions, passedQuestions, questions, answers]);

  const toggleExplanation = useCallback(() => {
    const q = questions[currentIndex];
    if (!q) return;
    setShownExplanations(prev => {
      const next = new Set(prev);
      if (next.has(q.id)) {
        next.delete(q.id);
      } else {
        next.add(q.id);
      }
      return next;
    });
  }, [questions, currentIndex]);

  const correctAnswers = useMemo(() => {
    if (phase !== 'review') return undefined;
    const map: Record<string, boolean> = {};
    for (const q of questions) {
      map[q.id] = answers[q.id] === q.answer;
    }
    return map;
  }, [phase, questions, answers]);

  const checkedAnswersMap = useMemo(() => {
    if (checkedQuestions.size === 0 && passedQuestions.size === 0) return undefined;
    const map: Record<string, boolean> = {};
    for (const qId of passedQuestions) {
      map[qId] = false;
    }
    for (const qId of checkedQuestions) {
      if (passedQuestions.has(qId)) continue;
      const q = questions.find(item => item.id === qId);
      if (q) {
        map[qId] = answers[qId] === q.answer;
      }
    }
    return map;
  }, [checkedQuestions, passedQuestions, questions, answers]);

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentIndex];

  const title = useMemo(() => {
    if (pool === 'wrong-pool') return '오답노트';
    if (pool === 'bookmarks') return '북마크 모음';
    const prefix = wrongOf ? '오답 다시풀기 - ' : '';
    if (wrongOf) {
      const first = questions[0];
      if (!first) return '오답 다시풀기';
      return `${prefix}${first.session}`;
    }
    if (mode === 'session') return `${prefix}${questions[0]?.session ?? ''}`;
    if (mode === 'subject') {
      const subjectName = questions[0]?.subjectName ?? '';
      const session = sessionParam ? questions[0]?.session ?? '' : '전체';
      return `${prefix}${subjectName} - ${session}`;
    }
    return '전체 문제';
  }, [mode, questions, sessionParam, wrongOf, pool]);

  const currentUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('id', id);
    if (sessionParam) params.set('session', sessionParam);
    return `/exam?${params.toString()}`;
  }, [mode, id, sessionParam]);

  const wrongCount = result
    ? result.totalQuestions - result.correctCount
    : 0;

  const handleRetry = useCallback(() => {
    clearExamAnswers(examKey);
    clearRetryContext(examKey);
    setRetryContext(null);
    setQuestions(prev => [...prev]);
    setAnswers({});
    setCurrentIndex(0);
    setPhase('exam');
    setShownExplanations(new Set());
    setCheckedQuestions(new Set());
    setPassedQuestions(new Set());
    setResult(null);
  }, [examKey]);

  const handleRetryWrong = useCallback(() => {
    const ctx = buildRetryContext(questions, answers, retryContext);
    setRetryContext(ctx);

    const wrongQs = questions.filter(q => answers[q.id] !== q.answer);
    setQuestions(wrongQs);
    setAnswers({});
    setCurrentIndex(0);
    setPhase('exam');
    setShownExplanations(new Set());
    setCheckedQuestions(new Set());
    setPassedQuestions(new Set());
    setResult(null);
  }, [questions, answers, retryContext]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <div className="text-gray-500 text-lg">문제를 불러오는 중...</div>
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 hover:underline text-sm"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <ResultView
        result={result}
        wrongCount={wrongCount}
        onReview={() => {
          setCurrentIndex(0);
          setPhase('review');
        }}
        onRetry={handleRetry}
        onRetryWrong={handleRetryWrong}
        onHome={() => router.push('/')}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ExamHeader
        title={title}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        timeRemaining={timeRemaining}
        answeredCount={answeredCount}
        checkedCorrect={checkedCorrect}
        checkedWrong={checkedWrong}
        onSubmit={handleSubmitClick}
        onHome={() => router.push('/')}
        isSubmitted={phase === 'review'}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto hidden lg:block">
          <QuestionNav
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            onNavigate={setCurrentIndex}
            isSubmitted={phase === 'review'}
            correctAnswers={correctAnswers}
            checkedAnswers={checkedAnswersMap}
            passedIds={passedQuestions}
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-3 sm:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs sm:text-sm text-blue-600 font-medium mb-3 sm:mb-4">
              {currentQuestion.subjectName}
            </div>

            <QuestionCard
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswer={handleAnswer}
              showExplanation={
                phase === 'review' ||
                shownExplanations.has(currentQuestion.id) ||
                checkedQuestions.has(currentQuestion.id)
              }
              isSubmitted={phase === 'review' || checkedQuestions.has(currentQuestion.id)}
            />

            {phase === 'exam' && (checkedQuestions.size > 0 || passedQuestions.size > 0) && (
              <div className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm">
                <span className="text-gray-500">확인 {checkedQuestions.size + passedQuestions.size}문제</span>
                <span className="text-green-600 font-bold">O {checkedCorrect}</span>
                <span className="text-red-600 font-bold">X {checkedWrong}</span>
              </div>
            )}

            <div className="mt-4 pt-4 sm:pt-6 border-t border-gray-200">
              {/* Mobile: stacked layout */}
              <div className="flex sm:hidden flex-col gap-2">
                {phase === 'exam' && (
                  <div className="flex gap-2">
                    <button
                      onClick={toggleExplanation}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition ${
                        shownExplanations.has(currentQuestion.id)
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                      }`}
                    >
                      {shownExplanations.has(currentQuestion.id) ? '해설 숨기기' : '해설'}
                    </button>
                    {!checkedQuestions.has(currentQuestion.id) && !passedQuestions.has(currentQuestion.id) && (
                      <button
                        onClick={handlePass}
                        className="flex-1 py-2.5 rounded-lg font-bold text-xs bg-gray-400 text-white active:bg-gray-500 transition"
                      >
                        패스
                      </button>
                    )}
                    {passedQuestions.has(currentQuestion.id) && (
                      <span className="flex-1 py-2.5 rounded-lg font-bold text-xs bg-red-100 text-red-600 text-center border border-red-200">
                        패스됨
                      </span>
                    )}
                    <button
                      onClick={handleCheck}
                      disabled={answers[currentQuestion.id] === undefined}
                      className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition ${
                        checkedQuestions.has(currentQuestion.id)
                          ? currentIndex === questions.length - 1
                            ? 'bg-red-500 text-white active:bg-red-600'
                            : 'bg-green-600 text-white active:bg-green-700'
                          : 'bg-orange-500 text-white active:bg-orange-600 disabled:opacity-40'
                      }`}
                    >
                      {checkedQuestions.has(currentQuestion.id)
                        ? currentIndex === questions.length - 1 ? '제출' : '다음 문제'
                        : '확인'}
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="flex-1 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-700 active:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    &larr; 이전
                  </button>
                  {phase === 'exam' && currentIndex === questions.length - 1 ? (
                    <button
                      onClick={handleSubmitClick}
                      className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-bold text-sm active:bg-red-600 transition"
                    >
                      제출
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))
                      }
                      disabled={currentIndex === questions.length - 1}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      다음 &rarr;
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop: single row */}
              <div className="hidden sm:flex items-center justify-between">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  &larr; 이전
                </button>

                <div className="flex items-center gap-2">
                  {phase === 'exam' && (
                    <>
                      <button
                        onClick={toggleExplanation}
                        className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                          shownExplanations.has(currentQuestion.id)
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {shownExplanations.has(currentQuestion.id) ? '해설 숨기기' : '해설 보기'}
                      </button>
                      {!checkedQuestions.has(currentQuestion.id) && !passedQuestions.has(currentQuestion.id) && (
                        <button
                          onClick={handlePass}
                          className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-400 text-white hover:bg-gray-500 transition"
                        >
                          패스
                        </button>
                      )}
                      {passedQuestions.has(currentQuestion.id) && (
                        <span className="px-4 py-2 rounded-lg font-bold text-sm bg-red-100 text-red-600 border border-red-200">
                          패스됨
                        </span>
                      )}
                      <button
                        onClick={handleCheck}
                        disabled={answers[currentQuestion.id] === undefined}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                          checkedQuestions.has(currentQuestion.id)
                            ? currentIndex === questions.length - 1
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {checkedQuestions.has(currentQuestion.id)
                          ? currentIndex === questions.length - 1 ? '제출' : '다음 문제 →'
                          : '확인'}
                      </button>
                    </>
                  )}
                </div>

                {phase === 'exam' && currentIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitClick}
                    className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
                  >
                    제출
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))
                    }
                    disabled={currentIndex === questions.length - 1}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    다음 &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="lg:hidden bg-white border-t border-gray-200 p-2 overflow-y-auto max-h-28 safe-bottom">
        <div className="grid grid-cols-10 gap-1 px-1">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === currentIndex;
            let cls = 'bg-gray-100 text-gray-600';
            if (phase === 'review' && correctAnswers) {
              cls = correctAnswers[q.id]
                ? 'bg-green-100 text-green-800'
                : isAnswered
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-400';
            } else if (passedQuestions.has(q.id)) {
              cls = isCurrent
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-100 text-yellow-800';
            } else if (checkedAnswersMap && checkedAnswersMap[q.id] !== undefined) {
              if (isCurrent) {
                cls = checkedAnswersMap[q.id]
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white';
              } else {
                cls = checkedAnswersMap[q.id]
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800';
              }
            } else if (isCurrent) {
              cls = 'bg-blue-600 text-white';
            } else if (isAnswered) {
              cls = 'bg-blue-100 text-blue-800';
            }
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-full aspect-square text-xs font-bold rounded transition ${cls}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
