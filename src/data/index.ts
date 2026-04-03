import { Question, ExamSession } from '@/types';
import { questions as q1 } from './sessions/1';
import { questions as q2 } from './sessions/2';
import { questions as q3 } from './sessions/3';
import { questions as q4 } from './sessions/4';
import { questions as q5 } from './sessions/5';
import { questions as q6 } from './sessions/6';
import { questions as q7 } from './sessions/7';
import { questions as q8 } from './sessions/8';
import { questions as q9 } from './sessions/9';
import { questions as q10 } from './sessions/10';
import { questions as q11 } from './sessions/11';

const ALL_QUESTIONS: readonly Question[] = [
  ...q1, ...q2, ...q3, ...q4, ...q5, ...q6,
  ...q7, ...q8, ...q9, ...q10, ...q11,
];

export const SESSIONS: readonly ExamSession[] = [
  { id: '11', name: '제11회', year: 2025, round: 2, questionCount: q11.length },
  { id: '10', name: '제10회', year: 2025, round: 1, questionCount: q10.length },
  { id: '9', name: '제9회', year: 2024, round: 2, questionCount: q9.length },
  { id: '8', name: '제8회', year: 2024, round: 1, questionCount: q8.length },
  { id: '7', name: '제7회', year: 2023, round: 2, questionCount: q7.length },
  { id: '6', name: '제6회', year: 2023, round: 1, questionCount: q6.length },
  { id: '5', name: '제5회', year: 2022, round: 2, questionCount: q5.length },
  { id: '4', name: '제4회', year: 2022, round: 1, questionCount: q4.length },
  { id: '3', name: '제3회', year: 2021, round: 3, questionCount: q3.length },
  { id: '2', name: '제2회', year: 2021, round: 2, questionCount: q2.length },
  { id: '1', name: '제1회', year: 2021, round: 1, questionCount: q1.length },
];

export function getQuestionsBySession(sessionId: string): Question[] {
  return ALL_QUESTIONS.filter(q => q.sessionId === sessionId);
}

export function getQuestionsBySubject(subjectId: number): Question[] {
  return ALL_QUESTIONS.filter(q => q.subject === subjectId);
}

export function getQuestionsBySubjectAndSession(subjectId: number, sessionId: string): Question[] {
  return ALL_QUESTIONS.filter(q => q.subject === subjectId && q.sessionId === sessionId);
}

export function getAllQuestions(): Question[] {
  return [...ALL_QUESTIONS];
}
