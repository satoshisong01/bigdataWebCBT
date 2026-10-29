/**
 * 빅데이터분석기사 필기 출제기준 (K-data), 2027 개정판 — 제14회 필기부터 적용.
 * Ids: subject 'S', 주요항목 'S.M', 세부항목 'S.M.U', 세세항목 'S.M.U.L' (82 세세항목).
 * Every question and concept card is tagged with 세세항목 ids from this tree.
 */

export interface CriteriaLeaf {
  id: string;
  name: string;
}

export interface CriteriaSub {
  id: string;
  name: string;
  leaves: readonly CriteriaLeaf[];
}

export interface CriteriaMajor {
  id: string;
  name: string;
  subs: readonly CriteriaSub[];
}

export interface CriteriaSubject {
  id: number;
  name: string;
  majors: readonly CriteriaMajor[];
}

export const CRITERIA_VERSION = '2027. 1. 1. ~ 2030. 12. 31. 출제기준 (제14회 필기부터)';

type Tree = ReadonlyArray<[string, ReadonlyArray<[string, readonly string[]]>]>;

function build(subjectId: number, name: string, tree: Tree): CriteriaSubject {
  return {
    id: subjectId,
    name,
    majors: tree.map(([majorName, subs], mi) => {
      const majorId = `${subjectId}.${mi + 1}`;
      return {
        id: majorId,
        name: majorName,
        subs: subs.map(([subName, leaves], ui) => {
          const subId = `${majorId}.${ui + 1}`;
          return {
            id: subId,
            name: subName,
            leaves: leaves.map((leafName, li) => ({ id: `${subId}.${li + 1}`, name: leafName })),
          };
        }),
      };
    }),
  };
}

export const CRITERIA: readonly CriteriaSubject[] = [
  build(1, '빅데이터 분석 기획', [
    ['빅데이터의 이해', [
      ['빅데이터 개요 및 활용', ['빅데이터의 특징', '빅데이터의 가치', '빅데이터 산업환경', '빅데이터 조직 및 인력']],
      ['빅데이터 관련 법제', ['빅데이터 관련 법·제도', '개인정보 활용']],
    ]],
    ['빅데이터 기술 트랜드 분석', [
      ['빅데이터 플랫폼', ['빅데이터 플랫폼 구조', '빅데이터 플랫폼 기술 동향']],
      ['빅데이터와 인공지능', ['인공지능의 도입', '인공지능 기술 전망']],
    ]],
    ['데이터분석 계획', [
      ['분석방안 수립', ['분석 로드맵 설정', '분석 문제 정의', '데이터 분석 방안']],
      ['분석작업 계획', ['데이터 확보 계획', '분석 절차 및 작업 계획']],
      ['분석모형 설계', ['분석모형 선정', '분석모형 정의', '분석모형 구축 절차']],
    ]],
    ['데이터 수집 및 저장 계획', [
      ['데이터 확보', ['데이터 수집', '데이터 유형 및 속성 파악', '데이터 비식별화']],
      ['데이터 적재 및 저장', ['데이터 적재', '데이터 저장']],
    ]],
  ]),
  build(2, '빅데이터 탐색', [
    ['데이터 전처리', [
      ['데이터 정제', ['데이터 정제', '데이터 결측값 처리', '데이터 이상값 처리', '데이터 변환', '데이터 품질 검증']],
      ['데이터 처리', ['변수 선택', '차원축소', '파생변수 생성', '변수 변환', '불균형 데이터 처리', '데이터 분할']],
    ]],
    ['탐색적 데이터 분석', [
      ['데이터 탐색 기초', ['데이터 탐색 개요', '상관관계 분석', '기초통계량 추출 및 이해', '시각적 데이터 탐색']],
      ['고급 데이터 탐색', ['시공간 데이터 탐색', '다변량 데이터 탐색', '비정형 데이터 탐색']],
    ]],
    ['통계기법 이해', [
      ['기술통계', ['데이터 요약', '표본추출', '확률분포', '표본분포']],
      ['추론통계', ['점추정', '구간추정', '가설검정']],
    ]],
  ]),
  build(3, '빅데이터 모델링', [
    ['분석기법 적용', [
      ['기초 분석기법', ['회귀분석', '로지스틱 회귀분석', '의사결정나무', '인공신경망', '서포트벡터머신', '연관성분석', '군집분석', '주성분분석']],
      ['심화 분석기법', ['범주형 자료 분석', '다변량 분석', '시계열 분석', '베이지안 기법', '딥러닝 분석', '비정형 데이터 분석', '앙상블 분석', '비모수 통계']],
    ]],
  ]),
  build(4, '빅데이터 결과 해석', [
    ['분석모형 평가 및 개선', [
      ['분석모형 평가', ['평가 지표', '분석모형 진단', '교차 검증', '모수 유의성 검정', '적합도 검정']],
      ['분석모형 개선', ['과대적합 방지', '매개변수 최적화', '분석모형 융합', '최종모형 선정']],
    ]],
    ['분석결과 시각화 및 활용', [
      ['분석결과 시각화', ['시공간 시각화', '관계 시각화', '비교 시각화', '인포그래픽']],
      ['분석결과 해석 및 활용', ['분석모형 해석', '분석모형 전개', '분석결과 활용 시나리오 개발', '분석모형 모니터링', '분석모형 리모델링']],
    ]],
  ]),
];

export const LEAVES: readonly CriteriaLeaf[] = CRITERIA.flatMap(s => s.majors.flatMap(m => m.subs.flatMap(u => u.leaves)));
export const SUBS: readonly CriteriaSub[] = CRITERIA.flatMap(s => s.majors.flatMap(m => m.subs));

const NAMES = new Map<string, string>();
for (const s of CRITERIA) {
  NAMES.set(String(s.id), s.name);
  for (const m of s.majors) {
    NAMES.set(m.id, m.name);
    for (const u of m.subs) {
      NAMES.set(u.id, u.name);
      for (const l of u.leaves) NAMES.set(l.id, l.name);
    }
  }
}

const SUBJECT_IDS: ReadonlySet<number> = new Set(CRITERIA.map(s => s.id));

export function isTopicId(id: string): boolean {
  return NAMES.has(id);
}

export function topicName(id: string): string {
  return NAMES.get(id) ?? id;
}

/** Names from subject down to `id`, e.g. ['빅데이터 모델링', '분석기법 적용', '심화 분석기법', '딥러닝 분석']. */
export function topicPath(id: string): string[] {
  const parts = id.split('.');
  return parts.map((_, i) => topicName(parts.slice(0, i + 1).join('.')));
}

export function subjectOfTopic(id: string): number {
  return Number(id.split('.')[0]);
}

/**
 * The 2027 subject a question belongs to: the subject of its most relevant tag (topics[0]),
 * or its own exam-paper subject when it is untagged or topics[0] names no subject of this tree.
 * Composed exams (src/lib/compose.ts) and QuestionMeta.subject (scripts/build-meta.mjs) use this rule.
 */
export function criteriaSubjectOf(q: { subject: number; topics?: readonly string[] }): number {
  const first = q.topics?.[0];
  const subject = first === undefined ? q.subject : subjectOfTopic(first);
  return SUBJECT_IDS.has(subject) ? subject : q.subject;
}

/** True when `id` equals `prefix` or is a descendant of it ('3.1.1' does not match '3.1.10.1'). */
export function topicMatches(id: string, prefix: string): boolean {
  return id === prefix || id.startsWith(prefix + '.');
}
