'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Question, ExamResult } from '@/types';
import { calculateResult } from '@/lib/utils';
import { getQuestionsBySession, getQuestionsBySubject, getQuestionsBySubjectAndSession, getQuestionsByIds, getAllQuestions } from '@/data';
import { saveRecord, saveWrongIds, getWrongIds } from '@/lib/storage';
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

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('exam');
  const [shownExplanations, setShownExplanations] = useState<Set<string>>(new Set());
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);

  const submitRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (wrongOf) {
      const ids = getWrongIds(wrongOf);
      setQuestions(getQuestionsByIds(ids));
      return;
    }

    let loaded: Question[] = [];
    if (mode === 'session') {
      loaded = getQuestionsBySession(id);
    } else if (mode === 'subject') {
      if (sessionParam) {
        loaded = getQuestionsBySubjectAndSession(parseInt(id, 10), sessionParam);
      } else {
        loaded = getQuestionsBySubject(parseInt(id, 10));
      }
    } else {
      loaded = getAllQuestions();
    }
    setQuestions(loaded);
  }, [mode, id, sessionParam, wrongOf]);

  const examKey = useMemo(() => {
    if (wrongOf) return wrongOf;
    if (mode === 'session') return `session-${id}`;
    if (mode === 'subject' && sessionParam) return `subject-${id}-${sessionParam}`;
    return 'all';
  }, [mode, id, sessionParam, wrongOf]);

  const doSubmit = useCallback(() => {
    if (questions.length === 0) return;
    const r = calculateResult(questions, answers, timeElapsed);
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
  }, [questions, answers, timeElapsed, examKey]);

  submitRef.current = doSubmit;

  useEffect(() => {
    if (phase !== 'exam' || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        if (prev + 1 >= TIME_LIMIT) {
          submitRef.current?.();
          return prev + 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, questions.length]);

  useEffect(() => {
    if (phase !== 'exam' && phase !== 'review') return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
      } else if (phase === 'exam' && ['1', '2', '3', '4'].includes(e.key)) {
        const q = questions[currentIndex];
        if (q) {
          setAnswers(prev => ({ ...prev, [q.id]: parseInt(e.key, 10) }));
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, questions, currentIndex]);

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

  const handleCheck = useCallback(() => {
    const q = questions[currentIndex];
    if (!q || answers[q.id] === undefined) return;

    if (checkedQuestions.has(q.id)) {
      setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
    } else {
      setCheckedQuestions(prev => {
        const next = new Set(prev);
        next.add(q.id);
        return next;
      });
    }
  }, [questions, currentIndex, answers, checkedQuestions]);

  const { checkedCorrect, checkedWrong } = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    for (const qId of checkedQuestions) {
      const q = questions.find(item => item.id === qId);
      if (q) {
        if (answers[qId] === q.answer) correct++;
        else wrong++;
      }
    }
    return { checkedCorrect: correct, checkedWrong: wrong };
  }, [checkedQuestions, questions, answers]);

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

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentIndex];
  const timeRemaining = Math.max(0, TIME_LIMIT - timeElapsed);

  const title = useMemo(() => {
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
  }, [mode, questions, sessionParam, wrongOf]);

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
        onRetry={() => router.push(currentUrl)}
        onRetryWrong={() => router.push(`/exam?wrong=${encodeURIComponent(examKey)}`)}
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
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-sm text-blue-600 font-medium mb-4">
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

            {phase === 'exam' && checkedQuestions.size > 0 && (
              <div className="flex items-center gap-4 mt-6 text-sm">
                <span className="text-gray-500">확인 {checkedQuestions.size}문제</span>
                <span className="text-green-600 font-bold">O {checkedCorrect}</span>
                <span className="text-red-600 font-bold">X {checkedWrong}</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-6 border-t border-gray-200">
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
                    <button
                      onClick={handleCheck}
                      disabled={answers[currentQuestion.id] === undefined}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                        checkedQuestions.has(currentQuestion.id)
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {checkedQuestions.has(currentQuestion.id) ? '다음 문제 →' : '확인'}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))
                }
                disabled={currentIndex === questions.length - 1}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                다음 &rarr;
              </button>
            </div>
          </div>
        </main>
      </div>

      <div className="lg:hidden bg-white border-t border-gray-200 p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max px-1">
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
            } else if (isCurrent) {
              cls = 'bg-blue-600 text-white';
            } else if (isAnswered) {
              cls = 'bg-blue-100 text-blue-800';
            }
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-8 h-8 text-xs font-bold rounded transition ${cls}`}
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
