/** Where a question came from — shown to the learner so AI-made items are never mistaken for real 기출. */
export type QuestionSource = 'restored' | 'ai-mock' | 'ai-trend';

/** How the question is framed; used for drills and weakness analysis. */
export type QuestionStyle =
  | 'concept'   // 개념/정의
  | 'term'      // 설명 → 용어 맞히기
  | 'compare'   // 비교/구분 (A vs B)
  | 'calc'      // 계산
  | 'case'      // 사례 적용
  | 'law'       // 법/제도/가이드라인
  | 'interpret'; // 그래프/표/출력 해석

export interface Question {
  id: string;
  session: string;
  sessionId: string;
  /**
   * 과목 as printed on the exam paper. Composed sets (모의고사·약점·토픽, src/lib/compose.ts) hand out copies
   * relabelled with the 2027 출제기준 subject of `topics[0]` (criteriaSubjectOf), `subjectName` included.
   */
  subject: number;
  subjectName: string;
  number: number;
  question: string;
  options: string[];
  /** 1-based index into `options` */
  answer: number;
  explanation: string;
  /** 2027 출제기준 세세항목 ids (e.g. '3.1.2.6'), most relevant first — topics[0] decides the 2027 subject */
  topics?: string[];
  style?: QuestionStyle;
  keywords?: string[];
  /** One short rationale per option, same order/length as `options` */
  optionNotes?: string[];
  /** Options reference positions (e.g. "①, ② 모두") — never shuffle */
  noShuffle?: boolean;
  /** Set when the restored answer key is doubtful; shown as a warning */
  answerDispute?: string;
}

export interface ExamSession {
  id: string;
  name: string;
  year: number;
  round: number;
  questionCount: number;
  source: QuestionSource;
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

/**
 * The slice of a question that analytics need — available without loading the bank (src/data/meta.ts).
 * `subject` here is the 2027 출제기준 subject: Number(topics[0].split('.')[0]) when the question is tagged
 * (and that names a subject of the tree), else the question's own subject — criteriaSubjectOf in
 * src/data/criteria.ts, applied by scripts/build-meta.mjs; composed mock exams use the same rule.
 */
export type QuestionMeta = Pick<Question, 'id' | 'sessionId' | 'subject' | 'topics'>;

/** importance: 3 = 핵심/빈출, 2 = 보통, 1 = 지엽(peripheral but fair game) */
export type Importance = 1 | 2 | 3;

export interface ConceptCard {
  id: string;
  /** 출제기준 세세항목 id */
  topic: string;
  term: string;
  /** 1–2 sentence definition; must not contain `term` verbatim (used for 용어 퀴즈) */
  summary: string;
  points?: string[];
  /** 헷갈리는 비교 포인트 */
  confusions?: string[];
  /** KaTeX source without surrounding $ */
  formula?: string;
  importance: Importance;
  /** Reported in 2026 (12·13회) exams */
  trend?: boolean;
}

export type CardMeta = Pick<ConceptCard, 'id' | 'topic' | 'importance'>;
