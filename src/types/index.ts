export interface Question {
  id: string;
  session: string;
  sessionId: string;
  subject: number;
  subjectName: string;
  number: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface ExamSession {
  id: string;
  name: string;
  year: number;
  round: number;
  questionCount: number;
}

export interface Subject {
  id: number;
  name: string;
  questionRange: string;
}

export interface ExamResult {
  totalQuestions: number;
  correctCount: number;
  score: number;
  subjectScores: SubjectScore[];
  passed: boolean;
  timeTaken: number;
}

export interface SubjectScore {
  subject: number;
  subjectName: string;
  total: number;
  correct: number;
  score: number;
  passed: boolean;
}
