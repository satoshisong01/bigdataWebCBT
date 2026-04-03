import { Question } from '@/types';

export const questions: Question[] = [
  // ===== 과목 1: 빅데이터 분석 기획 (1~20) =====
  {
    id: '11-1',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 1,
    question:
      '설명 가능한 인공지능(XAI)에서 모델의 개별 예측에 대해 각 특성(feature)의 기여도를 게임이론 기반으로 계산하는 기법은?',
    options: ['SHAP', 'LIME', 'Grad-CAM', 'Attention Rollout'],
    answer: 1,
    explanation:
      'SHAP(SHapley Additive exPlanations)은 게임이론의 Shapley 값을 기반으로 각 특성이 개별 예측에 기여하는 정도를 수학적으로 계산합니다. 특성 기여도의 일관성과 공정한 분배를 보장하는 것이 장점입니다.',
  },
  {
    id: '11-2',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 2,
    question:
      'XAI 기법 중 모델에 구애받지 않고(Model-Agnostic) 개별 예측을 해석할 수 있는 방법으로, 해석 대상 인스턴스 주변에 국소적 대리 모델을 적합시키는 기법은?',
    options: [
      'Partial Dependence Plot',
      'LIME',
      'Permutation Importance',
      'Accumulated Local Effects',
    ],
    answer: 2,
    explanation:
      'LIME(Local Interpretable Model-agnostic Explanations)은 해석하려는 예측값 주변의 데이터를 교란하여 생성하고, 이 데이터에 해석 가능한 단순 모델(예: 선형 회귀)을 적합시켜 국소적 설명을 제공합니다. 어떤 모델에도 적용 가능한 Model-Agnostic 기법입니다.',
  },
  {
    id: '11-3',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 3,
    question:
      'EU AI Act에서 규정하는 AI 시스템 위험 분류 4단계 중, 사람의 사회적 점수를 매기는 시스템이 해당하는 위험 등급은?',
    options: [
      '최소 위험(Minimal Risk)',
      '제한적 위험(Limited Risk)',
      '높은 위험(High Risk)',
      '허용 불가 위험(Unacceptable Risk)',
    ],
    answer: 4,
    explanation:
      'EU AI Act에서 사회적 스코어링(Social Scoring) 시스템은 기본권을 심각하게 침해할 수 있어 허용 불가 위험(Unacceptable Risk)으로 분류되며, 원칙적으로 사용이 금지됩니다. 이 외에도 실시간 원격 생체인식 등이 이 등급에 해당합니다.',
  },
  {
    id: '11-4',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 4,
    question:
      'EU AI Act에서 높은 위험(High Risk) AI 시스템에 해당하는 분야로 가장 거리가 먼 것은?',
    options: [
      '채용 및 근로자 관리에 사용되는 AI',
      '법 집행 목적의 AI 시스템',
      '개인 추천 음악 플레이리스트 생성 AI',
      '교육에서 학생 평가에 활용되는 AI',
    ],
    answer: 3,
    explanation:
      'EU AI Act에서 높은 위험 AI에는 채용, 교육, 법 집행, 이민 관리, 신용 평가 등 기본권에 영향을 미치는 분야가 포함됩니다. 개인 음악 추천은 기본권 침해 위험이 낮아 최소 위험 또는 제한적 위험에 해당합니다.',
  },
  {
    id: '11-5',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 5,
    question:
      '데이터 3법 개정의 핵심 내용 중 하나인 가명정보에 대한 설명으로 가장 올바른 것은?',
    options: [
      '가명정보는 통계 작성, 과학적 연구, 공익적 기록보존 목적으로 정보 주체의 동의 없이 활용할 수 있다',
      '가명정보는 어떠한 경우에도 제3자에게 제공할 수 없다',
      '가명정보와 익명정보는 법적으로 동일하게 취급된다',
      '가명정보 처리 시 개인정보보호위원회의 사전 허가를 반드시 받아야 한다',
    ],
    answer: 1,
    explanation:
      '2020년 데이터 3법 개정으로 도입된 가명정보는 추가 정보 없이는 개인을 식별할 수 없도록 처리된 정보입니다. 통계 작성, 과학적 연구, 공익적 기록보존 목적으로는 정보 주체의 동의 없이 활용이 가능하며, 서로 다른 기관 간 가명정보의 결합도 허용됩니다.',
  },
  {
    id: '11-6',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 6,
    question:
      '데이터 3법에 포함되는 법률의 조합으로 올바른 것은?',
    options: [
      '개인정보 보호법, 정보통신망법, 신용정보법',
      '개인정보 보호법, 정보통신망법, 전자서명법',
      '개인정보 보호법, 전자정부법, 신용정보법',
      '정보통신망법, 신용정보법, 전자상거래법',
    ],
    answer: 1,
    explanation:
      '데이터 3법은 개인정보 보호법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률(정보통신망법), 신용정보의 이용 및 보호에 관한 법률(신용정보법)을 의미합니다. 2020년 개정을 통해 데이터 활용과 개인정보 보호의 균형을 도모하였습니다.',
  },
  {
    id: '11-7',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 7,
    question:
      'MLOps 파이프라인에서 모델 학습 후 성능 저하를 감지하여 자동으로 재학습을 트리거하는 구성요소는?',
    options: [
      '피처 스토어(Feature Store)',
      '모델 레지스트리(Model Registry)',
      '모델 모니터링(Model Monitoring)',
      '데이터 카탈로그(Data Catalog)',
    ],
    answer: 3,
    explanation:
      '모델 모니터링은 배포된 모델의 성능을 지속적으로 추적하며, 데이터 드리프트나 모델 성능 저하를 감지합니다. 성능 임계치 이하로 떨어지면 자동으로 재학습 파이프라인을 트리거하여 모델을 최신 상태로 유지합니다.',
  },
  {
    id: '11-8',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 8,
    question:
      'MLOps의 성숙도 수준(Level)에 대한 설명으로 가장 적절한 것은?',
    options: [
      'Level 0은 모든 프로세스가 완전 자동화된 단계이다',
      'Level 1은 수동으로 모델을 학습하고 배포하는 단계이다',
      'Level 2는 CI/CD 파이프라인을 통해 학습과 배포가 자동화된 단계이다',
      'Level 1과 Level 2는 동일한 자동화 수준을 갖는다',
    ],
    answer: 3,
    explanation:
      'MLOps 성숙도는 Level 0(수동 프로세스), Level 1(ML 파이프라인 자동화), Level 2(CI/CD 파이프라인 자동화)로 구분됩니다. Level 2에서는 학습, 검증, 배포의 전 과정이 CI/CD 파이프라인으로 자동화되어 지속적인 모델 개선이 가능합니다.',
  },
  {
    id: '11-9',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 9,
    question:
      '데이터 품질 지표 중 데이터에 누락값이 없이 모든 필수 항목이 채워져 있는 정도를 나타내는 것은?',
    options: [
      '완전성(Completeness)',
      '정확성(Accuracy)',
      '일관성(Consistency)',
      '최신성(Timeliness)',
    ],
    answer: 1,
    explanation:
      '완전성(Completeness)은 데이터에 누락된 값 없이 모든 필수 항목이 채워져 있는 정도를 의미합니다. 데이터 품질의 기본적인 지표로, NULL 값의 비율이나 필수 필드 누락률로 측정할 수 있습니다.',
  },
  {
    id: '11-10',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 10,
    question:
      '데이터 품질 지표인 일관성(Consistency)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '서로 다른 데이터 소스에 저장된 동일 항목이 모순 없이 일치하는 정도를 나타낸다',
      '데이터가 수집 시점으로부터 얼마나 최근의 것인지를 나타낸다',
      '데이터 값이 실제 세계의 참 값과 일치하는 정도를 나타낸다',
      '데이터가 지정된 형식이나 규칙을 따르는 정도를 나타낸다',
    ],
    answer: 1,
    explanation:
      '일관성(Consistency)은 서로 다른 시스템이나 데이터 소스에 저장된 동일 데이터 항목이 모순 없이 일치하는 정도를 의미합니다. 예를 들어, 고객 주소가 CRM과 주문 시스템에서 동일하게 유지되는 것이 일관성의 예입니다.',
  },
  {
    id: '11-11',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 11,
    question:
      '분석 거버넌스 체계에서 데이터 스튜어드(Data Steward)의 역할로 가장 적절한 것은?',
    options: [
      'IT 인프라의 서버 성능 최적화',
      '분석 프로젝트의 예산 승인 및 투자 결정',
      '데이터 품질 관리와 메타데이터 표준 준수 감독',
      '프론트엔드 UI 디자인 및 사용성 테스트',
    ],
    answer: 3,
    explanation:
      '데이터 스튜어드는 분석 거버넌스에서 데이터 품질을 관리하고, 메타데이터 표준 준수를 감독하며, 데이터 정책을 실무 수준에서 이행하는 역할을 담당합니다. 데이터 소유자(Owner)와 사용자(Consumer) 사이에서 데이터 자산을 관리합니다.',
  },
  {
    id: '11-12',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 12,
    question:
      '분석 거버넌스에서 분석 CoE(Center of Excellence)의 주요 기능으로 가장 거리가 먼 것은?',
    options: [
      '분석 역량의 내재화와 교육 프로그램 운영',
      '분석 방법론 및 표준 가이드라인 수립',
      '물리적 데이터센터의 네트워크 장비 유지보수',
      '분석 성과 측정 및 모범 사례 확산',
    ],
    answer: 3,
    explanation:
      '분석 CoE(Center of Excellence)는 조직 전체의 분석 역량을 체계적으로 관리하는 전담 조직으로, 방법론 표준화, 교육, 성과 측정, 모범 사례 확산 등을 담당합니다. 네트워크 장비 유지보수는 IT 인프라 운영 영역에 해당합니다.',
  },
  {
    id: '11-13',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 13,
    question:
      '데이터 웨어하우스(Data Warehouse)와 데이터 레이크(Data Lake)를 비교한 설명으로 가장 적절한 것은?',
    options: [
      '데이터 웨어하우스는 비정형 데이터를 원시 형태로 저장하는 데 최적화되어 있다',
      '데이터 레이크는 Schema-on-Write 방식을 사용한다',
      '데이터 웨어하우스는 정제된 구조화 데이터를 저장하고, 데이터 레이크는 원시 데이터를 다양한 형태로 저장한다',
      '데이터 웨어하우스와 데이터 레이크는 동일한 저장 방식과 용도를 갖는다',
    ],
    answer: 3,
    explanation:
      '데이터 웨어하우스는 ETL 과정을 거쳐 정제된 구조화 데이터를 Schema-on-Write 방식으로 저장합니다. 반면 데이터 레이크는 정형, 반정형, 비정형 데이터를 원시 형태로 저장하고 Schema-on-Read 방식으로 필요 시 스키마를 적용합니다.',
  },
  {
    id: '11-14',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 14,
    question:
      '데이터 레이크하우스(Data Lakehouse)에 대한 설명으로 가장 적절하지 않은 것은?',
    options: [
      '데이터 레이크의 유연성과 데이터 웨어하우스의 관리 기능을 결합한 아키텍처이다',
      'Delta Lake, Apache Iceberg 등이 대표적인 구현 기술이다',
      'ACID 트랜잭션을 지원하여 데이터 무결성을 보장한다',
      '비정형 데이터는 저장할 수 없고 정형 데이터만 처리한다',
    ],
    answer: 4,
    explanation:
      '데이터 레이크하우스는 데이터 레이크의 유연한 저장 능력(비정형 포함)과 데이터 웨어하우스의 관리 기능(ACID, 스키마 관리)을 결합한 아키텍처입니다. 정형, 반정형, 비정형 데이터를 모두 저장하면서도 트랜잭션 무결성을 보장합니다.',
  },
  {
    id: '11-15',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 15,
    question:
      'OLAP과 OLTP를 비교한 설명으로 가장 올바른 것은?',
    options: [
      'OLTP는 대량의 데이터를 분석하여 의사결정을 지원하는 시스템이다',
      'OLAP는 일상적인 트랜잭션 처리를 위해 설계된 시스템이다',
      'OLTP는 짧은 트랜잭션 처리에 최적화되고, OLAP는 복잡한 집계 쿼리에 최적화된다',
      'OLAP와 OLTP는 동일한 데이터 모델과 인덱싱 전략을 사용한다',
    ],
    answer: 3,
    explanation:
      'OLTP(Online Transaction Processing)는 주문, 결제 등 짧은 트랜잭션을 빠르게 처리하도록 설계되며, OLAP(Online Analytical Processing)는 대량 데이터에 대한 복잡한 집계 및 다차원 분석 쿼리에 최적화된 시스템입니다.',
  },
  {
    id: '11-16',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 16,
    question:
      'OLAP 연산 중 상위 수준에서 하위 수준으로 데이터를 세분화하여 보는 것을 무엇이라 하는가?',
    options: [
      'Drill-down',
      'Roll-up',
      'Slice',
      'Pivot',
    ],
    answer: 1,
    explanation:
      'Drill-down은 데이터를 상위 수준(예: 연도)에서 하위 수준(예: 월, 일)으로 세분화하여 상세하게 분석하는 OLAP 연산입니다. 반대로 하위에서 상위로 집계하는 것은 Roll-up이라 합니다.',
  },
  {
    id: '11-17',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 17,
    question:
      '스타 스키마(Star Schema)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '차원 테이블이 정규화되어 여러 단계의 하위 테이블로 분리된 구조이다',
      '모든 테이블이 제3정규형(3NF)으로 설계된 구조이다',
      '차원 테이블 없이 팩트 테이블만으로 구성된 구조이다',
      '중앙의 팩트 테이블과 이를 둘러싼 비정규화된 차원 테이블로 구성된다',
    ],
    answer: 4,
    explanation:
      '스타 스키마는 중앙의 팩트 테이블(사실 테이블)과 이를 둘러싸는 비정규화된 차원 테이블로 구성됩니다. 별 모양의 구조를 가지며, 조인이 단순하여 쿼리 성능이 우수하고 데이터 웨어하우스에서 널리 사용됩니다.',
  },
  {
    id: '11-18',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 18,
    question:
      '스노우플레이크 스키마(Snowflake Schema)의 특징으로 가장 적절한 것은?',
    options: [
      '차원 테이블을 정규화하여 데이터 중복을 줄인 구조이다',
      '스타 스키마보다 쿼리 성능이 항상 우수하다',
      '팩트 테이블이 여러 개의 하위 팩트 테이블로 분리된 구조이다',
      '비정규화를 통해 조인 수를 최소화한 구조이다',
    ],
    answer: 1,
    explanation:
      '스노우플레이크 스키마는 스타 스키마의 차원 테이블을 정규화하여 하위 테이블로 분리한 구조입니다. 데이터 중복이 줄어 저장 공간이 절약되지만, 조인이 많아져 쿼리 성능은 스타 스키마보다 다소 낮을 수 있습니다.',
  },
  {
    id: '11-19',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 19,
    question:
      '데이터 품질 지표 중 최신성(Timeliness)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '데이터 값이 정해진 형식과 규칙에 부합하는 정도',
      '서로 다른 시스템 간 데이터가 모순 없이 일치하는 정도',
      '데이터가 현재 시점의 실제 상태를 얼마나 잘 반영하는지의 정도',
      '필수 데이터 항목에 누락이 없는 정도',
    ],
    answer: 3,
    explanation:
      '최신성(Timeliness)은 데이터가 현재 시점의 실제 상태를 반영하고 있는 정도를 나타냅니다. 데이터 수집 후 시간이 경과하면 최신성이 떨어지며, 실시간 또는 근실시간 데이터 갱신을 통해 최신성을 유지할 수 있습니다.',
  },
  {
    id: '11-20',
    session: '제11회',
    sessionId: '11',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 20,
    question:
      'XAI의 필요성이 가장 높은 분야로 적절한 것은?',
    options: [
      '개인 취향 기반 음악 추천 시스템',
      '의료 진단 AI의 판단 근거 설명',
      '스팸 메일 필터링 시스템',
      '온라인 쇼핑몰 상품 정렬',
    ],
    answer: 2,
    explanation:
      '의료 진단은 환자의 생명과 건강에 직접적인 영향을 미치므로 AI의 판단 근거를 의료진이 이해하고 검증할 수 있어야 합니다. XAI는 의료, 금융, 법률 등 고위험 영역에서 신뢰성과 책임성을 확보하는 데 특히 중요합니다.',
  },

  // ===== 과목 2: 빅데이터 탐색 (21~40) =====
  {
    id: '11-21',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 21,
    question:
      '타겟 인코딩(Target Encoding)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '범주형 변수의 각 범주를 해당 범주의 타겟 변수 평균값으로 대체하는 기법이다',
      '범주형 변수를 0과 1의 이진 벡터로 변환하는 기법이다',
      '연속형 변수를 일정 구간으로 나누어 범주화하는 기법이다',
      '텍스트 데이터를 TF-IDF 값으로 변환하는 기법이다',
    ],
    answer: 1,
    explanation:
      '타겟 인코딩은 범주형 변수의 각 범주를 해당 범주에 속하는 데이터의 타겟(목표) 변수 평균값으로 대체합니다. 고카디널리티 범주형 변수에 효과적이지만, 과적합 위험이 있어 교차검증이나 스무딩 기법을 함께 적용해야 합니다.',
  },
  {
    id: '11-22',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 22,
    question:
      '피처 해싱(Feature Hashing)의 장점으로 가장 적절한 것은?',
    options: [
      '고카디널리티 범주형 변수를 고정된 크기의 벡터로 효율적으로 변환할 수 있다',
      '해싱 충돌이 절대 발생하지 않아 정보 손실이 없다',
      '변환된 특성의 의미를 명확하게 해석할 수 있다',
      '원-핫 인코딩보다 항상 높은 모델 성능을 보장한다',
    ],
    answer: 1,
    explanation:
      '피처 해싱은 해시 함수를 사용하여 범주형 변수를 고정 크기의 벡터로 변환합니다. 고카디널리티(범주 수가 매우 많은) 변수에서 원-핫 인코딩의 차원 폭발 문제를 해결할 수 있으며, 메모리 효율적입니다. 다만 해싱 충돌이 발생할 수 있습니다.',
  },
  {
    id: '11-23',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 23,
    question:
      '다중공선성(Multicollinearity)을 진단하는 지표인 VIF(Variance Inflation Factor)에 대한 설명으로 가장 올바른 것은?',
    options: [
      'VIF 값이 1에 가까울수록 심각한 다중공선성이 존재한다',
      'VIF 값이 10 이상이면 일반적으로 다중공선성이 심각한 것으로 판단한다',
      'VIF는 종속변수와 독립변수 간의 상관계수를 나타낸다',
      'VIF 값은 항상 0과 1 사이의 값을 갖는다',
    ],
    answer: 2,
    explanation:
      'VIF(분산 팽창 인수)는 독립변수 간의 다중공선성 정도를 측정합니다. VIF = 1/(1-R²)로 계산되며, 일반적으로 VIF가 10 이상이면 다중공선성이 심각한 것으로 판단합니다. VIF가 1이면 다중공선성이 없음을 의미합니다.',
  },
  {
    id: '11-24',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 24,
    question:
      '다중공선성이 존재할 때 발생할 수 있는 문제로 가장 적절하지 않은 것은?',
    options: [
      '회귀계수의 분산이 커져 추정이 불안정해진다',
      '회귀계수의 부호가 예상과 반대로 나타날 수 있다',
      '모델의 예측 성능이 반드시 향상된다',
      '독립변수의 개별적 효과를 해석하기 어렵다',
    ],
    answer: 3,
    explanation:
      '다중공선성이 존재하면 회귀계수의 분산이 커지고, 추정이 불안정해지며, 계수의 부호가 뒤바뀔 수 있습니다. 또한 개별 변수의 효과를 분리하여 해석하기 어렵습니다. 다중공선성은 예측 성능을 향상시키는 것이 아니라 모델의 해석을 어렵게 만듭니다.',
  },
  {
    id: '11-25',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 25,
    question:
      '공적분(Cointegration)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '두 시계열이 각각 비정상(non-stationary)이지만, 선형 결합이 정상(stationary)인 관계를 의미한다',
      '두 시계열이 모두 정상 과정일 때만 존재할 수 있다',
      '두 시계열 간의 단기적 상관관계를 나타내는 개념이다',
      '공적분이 존재하면 두 시계열은 항상 같은 방향으로 움직인다',
    ],
    answer: 1,
    explanation:
      '공적분은 각각 비정상(단위근을 가진) 시계열이 특정 선형 결합을 이루면 정상 시계열이 되는 장기 균형 관계를 의미합니다. Engle-Granger 검정이나 Johansen 검정으로 공적분 관계를 확인하며, 오차수정모형(ECM)에서 활용됩니다.',
  },
  {
    id: '11-26',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 26,
    question:
      '시계열 분해(Time Series Decomposition)의 구성 요소가 아닌 것은?',
    options: [
      '추세(Trend) 성분',
      '계절(Seasonal) 성분',
      '잔차(Residual) 성분',
      '공분산(Covariance) 성분',
    ],
    answer: 4,
    explanation:
      '시계열 분해는 원래 시계열을 추세(Trend), 계절(Seasonal), 잔차(Residual)의 세 가지 성분으로 분리합니다. 가법 모형(Y = T + S + R)이나 승법 모형(Y = T × S × R)으로 분해하며, 공분산은 시계열 분해의 구성 요소가 아닙니다.',
  },
  {
    id: '11-27',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 27,
    question:
      '시계열 분해에서 승법 모형(Multiplicative Model)을 적용하는 것이 적절한 경우는?',
    options: [
      '계절 변동의 크기가 추세 수준에 관계없이 일정할 때',
      '시계열에 계절 성분이 존재하지 않을 때',
      '시계열이 완전히 정상 과정일 때',
      '계절 변동의 크기가 추세 수준에 비례하여 변할 때',
    ],
    answer: 4,
    explanation:
      '승법 모형(Y = T × S × R)은 계절 변동의 진폭이 추세 수준에 비례하여 커지거나 작아지는 경우에 적합합니다. 반면 가법 모형(Y = T + S + R)은 계절 변동의 크기가 추세 수준과 무관하게 일정한 경우에 사용합니다.',
  },
  {
    id: '11-28',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 28,
    question:
      '앤드류스 커브(Andrews Curves)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '각 데이터 포인트의 특성값을 푸리에 급수의 계수로 사용하여 곡선으로 표현하는 시각화 기법이다',
      '두 변수 간의 산점도에 회귀선을 추가한 시각화 기법이다',
      '데이터의 상자 그림(Box Plot)을 변형한 시각화 기법이다',
      '히스토그램의 빈(bin) 크기를 자동으로 최적화하는 기법이다',
    ],
    answer: 1,
    explanation:
      '앤드류스 커브는 다차원 데이터의 각 특성값을 푸리에 급수의 계수로 사용하여 하나의 곡선으로 매핑합니다. 유사한 데이터 포인트는 유사한 곡선을 그리므로 군집 패턴이나 이상치를 시각적으로 확인할 수 있습니다.',
  },
  {
    id: '11-29',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 29,
    question:
      '평행좌표 그래프(Parallel Coordinates Plot)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '각 축이 하나의 변수를 나타내며 데이터 포인트를 꺾은선으로 연결하여 다차원 데이터를 표현한다',
      '2차원 데이터만 시각화할 수 있는 기법이다',
      '데이터의 빈도를 막대로 표현하는 기법이다',
      '지리적 데이터를 지도 위에 표시하는 기법이다',
    ],
    answer: 1,
    explanation:
      '평행좌표 그래프는 여러 변수 축을 평행하게 배치하고, 각 데이터 포인트의 값을 축 위의 점으로 표시한 후 꺾은선으로 연결합니다. 다차원 데이터의 패턴, 군집, 이상치를 직관적으로 파악할 수 있는 고차원 데이터 시각화 기법입니다.',
  },
  {
    id: '11-30',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 30,
    question:
      '대응표본 t-검정(Paired Sample t-test)을 적용하기에 가장 적절한 상황은?',
    options: [
      '서로 독립적인 두 집단의 평균을 비교할 때',
      '세 개 이상의 집단 간 평균을 비교할 때',
      '두 범주형 변수 간의 연관성을 검정할 때',
      '동일 대상에 대해 사전-사후 측정값의 차이를 비교할 때',
    ],
    answer: 4,
    explanation:
      '대응표본 t-검정은 동일한 대상에 대해 두 번 측정한 값(예: 처리 전후, 약물 투여 전후)의 차이가 통계적으로 유의한지를 검정합니다. 짝을 이룬(paired) 관측값의 차이에 대해 t-검정을 수행하는 방법입니다.',
  },
  {
    id: '11-31',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 31,
    question:
      '대응표본 t-검정의 가정(assumptions)으로 가장 거리가 먼 것은?',
    options: [
      '두 측정값의 차이(차이점수)가 정규분포를 따른다',
      '관측값은 서로 독립적으로 추출된다',
      '측정 척도는 연속형(등간 또는 비율) 척도이다',
      '두 집단의 분산이 반드시 동일해야 한다',
    ],
    answer: 4,
    explanation:
      '대응표본 t-검정의 주요 가정은 차이점수의 정규성, 관측 쌍의 독립성, 연속형 척도입니다. 두 집단의 등분산 가정은 독립표본 t-검정에서 필요한 것으로, 대응표본 t-검정에서는 차이점수의 정규성이 더 중요합니다.',
  },
  {
    id: '11-32',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 32,
    question:
      '분할표(Contingency Table) 분석에 대한 설명으로 가장 올바른 것은?',
    options: [
      '두 범주형 변수 간의 관계를 교차표로 정리하여 분석하는 방법이다',
      '두 연속형 변수 간의 상관관계를 측정하는 방법이다',
      '시계열 데이터의 추세를 분석하는 방법이다',
      '다변량 데이터의 차원을 축소하는 방법이다',
    ],
    answer: 1,
    explanation:
      '분할표(교차표)는 두 범주형 변수의 빈도를 행과 열로 교차 정리한 표입니다. 관찰 빈도와 기대 빈도를 비교하여 두 변수 간의 연관성(독립성)을 분석하며, 주로 카이제곱 검정과 함께 사용됩니다.',
  },
  {
    id: '11-33',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 33,
    question:
      '카이제곱 적합도 검정(Chi-square Goodness of Fit Test)의 목적으로 가장 올바른 것은?',
    options: [
      '관측된 빈도 분포가 기대되는 이론적 분포와 일치하는지를 검정한다',
      '두 연속형 변수 간의 선형 관계를 검정한다',
      '세 개 이상 집단의 평균 차이를 검정한다',
      '두 범주형 변수 간의 독립성을 검정한다',
    ],
    answer: 1,
    explanation:
      '카이제곱 적합도 검정은 관측된 빈도 분포가 특정 이론적 분포(예: 균등분포, 정규분포)와 일치하는지를 검정합니다. 검정통계량은 χ² = Σ(관측빈도 - 기대빈도)² / 기대빈도로 계산됩니다.',
  },
  {
    id: '11-34',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 34,
    question:
      '카이제곱 독립성 검정(Chi-square Test of Independence)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '하나의 범주형 변수의 분포가 이론적 분포와 맞는지 검정한다',
      '두 연속형 변수 간의 상관계수의 유의성을 검정한다',
      '분할표에서 두 범주형 변수가 서로 독립인지를 검정한다',
      '표본 평균이 모평균과 일치하는지를 검정한다',
    ],
    answer: 3,
    explanation:
      '카이제곱 독립성 검정은 분할표(교차표)의 두 범주형 변수가 서로 독립인지를 검정합니다. 귀무가설은 두 변수가 독립이고, 대립가설은 두 변수 간 연관성이 있다는 것입니다. 자유도는 (행의 수 - 1) × (열의 수 - 1)로 계산됩니다.',
  },
  {
    id: '11-35',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 35,
    question:
      '타겟 인코딩에서 과적합(overfitting) 문제를 완화하기 위한 방법으로 가장 적절한 것은?',
    options: [
      '인코딩 시 학습 데이터 전체의 타겟 평균을 고정값으로 사용한다',
      '범주별 빈도를 무시하고 동일한 값으로 인코딩한다',
      '원-핫 인코딩으로 대체하여 인코딩한다',
      'K-Fold 교차검증을 활용하여 각 폴드의 out-of-fold 데이터로 인코딩한다',
    ],
    answer: 4,
    explanation:
      '타겟 인코딩의 과적합 문제를 해결하기 위해 K-Fold 교차검증 기반 인코딩을 사용합니다. 각 폴드에서 해당 폴드가 아닌 데이터(out-of-fold)의 타겟 평균으로 인코딩하면, 자기 자신의 타겟 값이 인코딩에 직접 반영되는 것을 방지합니다.',
  },
  {
    id: '11-36',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 36,
    question:
      '평행좌표 그래프에서 군집을 효과적으로 식별하기 위한 방법으로 가장 적절한 것은?',
    options: [
      '모든 데이터를 동일한 색상으로 표시한다',
      '축의 순서를 무작위로 배치한다',
      '클래스 레이블이나 군집 결과에 따라 색상을 구분하여 표시한다',
      '데이터 포인트 수를 10개 이하로 제한한다',
    ],
    answer: 3,
    explanation:
      '평행좌표 그래프에서 군집을 효과적으로 식별하려면 클래스 레이블이나 군집 분석 결과에 따라 선의 색상을 구분합니다. 또한 상관관계가 높은 변수를 인접하게 배치하면 패턴을 더 명확하게 관찰할 수 있습니다.',
  },
  {
    id: '11-37',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 37,
    question:
      '공적분 관계가 있는 시계열 변수들을 분석할 때 사용하는 모형으로 가장 적절한 것은?',
    options: [
      '단순 선형 회귀 모형',
      'ARIMA 모형',
      '벡터 오차수정 모형(VECM)',
      '지수 평활법',
    ],
    answer: 3,
    explanation:
      '벡터 오차수정 모형(VECM: Vector Error Correction Model)은 공적분 관계가 있는 비정상 시계열 변수들의 장기 균형과 단기 조정 과정을 동시에 모형화합니다. 공적분 관계를 오차수정항으로 포함하여 장기 균형으로의 수렴을 반영합니다.',
  },
  {
    id: '11-38',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 38,
    question:
      '앤드류스 커브를 활용하여 탐색할 수 있는 분석 목적으로 가장 적절하지 않은 것은?',
    options: [
      '다차원 데이터에서 군집 구조를 시각적으로 확인한다',
      '이상치를 다른 데이터와 구분하여 탐지한다',
      '변수 간의 인과관계를 통계적으로 검정한다',
      '클래스 간 분리 가능성을 시각적으로 판단한다',
    ],
    answer: 3,
    explanation:
      '앤드류스 커브는 다차원 데이터를 곡선으로 시각화하여 군집 구조, 이상치, 클래스 간 분리 가능성을 시각적으로 탐색하는 데 활용됩니다. 그러나 변수 간의 인과관계를 통계적으로 검정하는 것은 앤드류스 커브의 목적이 아닙니다.',
  },
  {
    id: '11-39',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 39,
    question:
      '다중공선성 문제를 해결하기 위한 방법으로 가장 적절하지 않은 것은?',
    options: [
      'VIF가 높은 변수를 제거한다',
      '주성분 분석(PCA)을 통해 독립변수를 변환한다',
      '릿지 회귀(Ridge Regression)를 적용한다',
      '독립변수를 더 추가하여 다중공선성을 희석시킨다',
    ],
    answer: 4,
    explanation:
      '다중공선성 해결 방법으로는 VIF가 높은 변수 제거, PCA를 통한 직교 변환, 릿지 회귀(L2 정규화) 적용 등이 있습니다. 독립변수를 추가하는 것은 오히려 다중공선성을 악화시킬 수 있으므로 적절한 해결 방법이 아닙니다.',
  },
  {
    id: '11-40',
    session: '제11회',
    sessionId: '11',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 40,
    question:
      '카이제곱 검정의 자유도(degrees of freedom)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '적합도 검정에서 자유도는 범주의 수(k)와 같다',
      '자유도가 클수록 카이제곱 분포는 좌측으로 편향된다',
      '자유도는 표본 크기(n)와 항상 동일하다',
      '독립성 검정에서 자유도는 (행의 수 - 1) × (열의 수 - 1)이다',
    ],
    answer: 4,
    explanation:
      '카이제곱 독립성 검정에서 자유도는 (r-1)(c-1)로 계산됩니다(r: 행의 수, c: 열의 수). 적합도 검정에서 자유도는 k-1(k: 범주의 수)입니다. 자유도가 증가하면 카이제곱 분포는 점점 정규분포에 가까워집니다.',
  },

  // ===== 과목 3: 빅데이터 모델링 (41~60) =====
  {
    id: '11-41',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 41,
    question:
      '스태킹(Stacking) 앙상블에 대한 설명으로 가장 올바른 것은?',
    options: [
      '동일한 모델을 부트스트랩 샘플로 여러 번 학습시키는 방법이다',
      '약한 학습기를 순차적으로 학습하며 오분류된 데이터에 가중치를 부여하는 방법이다',
      '데이터를 무작위로 분할하여 각 부분에 서로 다른 모델을 적용하는 방법이다',
      '여러 기본 모델의 예측값을 새로운 특성으로 사용하여 메타 모델을 학습시키는 방법이다',
    ],
    answer: 4,
    explanation:
      '스태킹은 여러 기본 모델(Base Learner)의 예측 결과를 새로운 입력 특성으로 사용하여 메타 모델(Meta Learner)을 학습시키는 앙상블 기법입니다. 서로 다른 모델의 강점을 결합하며, 과적합 방지를 위해 교차검증으로 기본 모델의 예측값을 생성합니다.',
  },
  {
    id: '11-42',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 42,
    question:
      '스태킹 앙상블에서 과적합을 방지하기 위해 기본 모델의 예측값을 생성하는 권장 방법은?',
    options: [
      'K-Fold 교차검증으로 out-of-fold 예측값을 생성한다',
      '학습 데이터 전체에 대해 기본 모델을 학습하고 예측한다',
      '테스트 데이터에 대한 예측값을 메타 모델의 입력으로 사용한다',
      '기본 모델의 학습을 생략하고 랜덤 값을 생성한다',
    ],
    answer: 1,
    explanation:
      '스태킹에서 과적합을 방지하려면 K-Fold 교차검증을 사용하여 각 폴드의 out-of-fold 예측값을 생성합니다. 이렇게 하면 기본 모델이 자신이 학습한 데이터가 아닌 검증 데이터에 대한 예측을 메타 모델의 입력으로 제공하게 됩니다.',
  },
  {
    id: '11-43',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 43,
    question:
      '자기조직화지도(SOM: Self-Organizing Map)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '지도 학습 기반의 분류 알고리즘이다',
      '고차원 데이터를 저차원(주로 2차원) 격자로 매핑하는 비지도 학습 신경망이다',
      '입력 데이터를 확률 분포로 모델링하는 생성 모델이다',
      '역전파 알고리즘을 사용하여 학습한다',
    ],
    answer: 2,
    explanation:
      'SOM(자기조직화지도)은 Kohonen이 제안한 비지도 학습 신경망으로, 고차원 데이터를 2차원 격자에 매핑하여 시각화합니다. 경쟁 학습(Competitive Learning)을 사용하며, 입력 데이터의 위상적 구조를 보존하면서 차원을 축소합니다.',
  },
  {
    id: '11-44',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 44,
    question:
      't-SNE(t-distributed Stochastic Neighbor Embedding)에 대한 설명으로 가장 적절하지 않은 것은?',
    options: [
      '고차원 데이터를 저차원으로 시각화하는 데 주로 사용된다',
      '국소적 구조를 잘 보존하는 비선형 차원 축소 기법이다',
      '새로운 데이터 포인트에 대한 변환이 가능한 매핑 함수를 학습한다',
      '퍼플렉시티(Perplexity) 하이퍼파라미터가 결과에 큰 영향을 미친다',
    ],
    answer: 3,
    explanation:
      't-SNE는 비모수(non-parametric) 기법으로 명시적인 매핑 함수를 학습하지 않습니다. 따라서 새로운 데이터 포인트에 대한 변환이 직접적으로 불가능합니다. 이 한계를 보완하기 위해 parametric t-SNE나 UMAP을 대안으로 사용하기도 합니다.',
  },
  {
    id: '11-45',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 45,
    question:
      'UMAP(Uniform Manifold Approximation and Projection)이 t-SNE 대비 갖는 장점으로 가장 적절한 것은?',
    options: [
      '항상 t-SNE보다 더 정확한 군집 시각화를 보장한다',
      '하이퍼파라미터 설정이 불필요하다',
      '지도 학습만 지원하고 비지도 학습은 지원하지 않는다',
      '계산 속도가 빠르고 대규모 데이터셋에도 확장 가능하며, 전역 구조를 더 잘 보존한다',
    ],
    answer: 4,
    explanation:
      'UMAP은 t-SNE보다 계산 효율성이 높아 대규모 데이터셋에 확장 가능하며, 국소 구조뿐 아니라 데이터의 전역 구조도 비교적 잘 보존합니다. 또한 지도 학습, 반지도 학습 등 다양한 설정에서 활용할 수 있습니다.',
  },
  {
    id: '11-46',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 46,
    question:
      'Transformer 구조에서 Self-Attention 메커니즘의 핵심 구성 요소가 아닌 것은?',
    options: [
      'Query(Q)',
      'Key(K)',
      'Value(V)',
      'Gate(G)',
    ],
    answer: 4,
    explanation:
      'Transformer의 Self-Attention은 Query(Q), Key(K), Value(V) 세 가지 벡터를 사용합니다. Attention(Q,K,V) = softmax(QK^T / √d_k)V로 계산되며, Gate는 LSTM/GRU의 구성 요소로 Transformer의 Self-Attention에는 포함되지 않습니다.',
  },
  {
    id: '11-47',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 47,
    question:
      'Transformer에서 Multi-Head Attention을 사용하는 이유로 가장 적절한 것은?',
    options: [
      '다양한 위치에서 서로 다른 표현 부분공간의 정보를 동시에 학습하기 위해서',
      '모델의 파라미터 수를 줄이기 위해서',
      '순환(recurrent) 구조를 도입하여 시퀀스 순서를 학습하기 위해서',
      '학습 데이터의 크기를 줄이기 위해서',
    ],
    answer: 1,
    explanation:
      'Multi-Head Attention은 여러 개의 Attention Head를 병렬로 수행하여 서로 다른 표현 부분공간(representation subspace)에서의 정보를 동시에 학습합니다. 이를 통해 단일 Attention보다 다양한 관계와 패턴을 포착할 수 있습니다.',
  },
  {
    id: '11-48',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 48,
    question:
      '시퀀스-투-시퀀스(Seq2Seq) 모델에 대한 설명으로 가장 올바른 것은?',
    options: [
      '입력 시퀀스를 고정된 길이의 벡터로 인코딩하고, 이를 디코딩하여 출력 시퀀스를 생성하는 구조이다',
      '입력과 출력의 길이가 반드시 동일해야 한다',
      '분류(classification) 문제에만 사용할 수 있다',
      '단일 레이어로만 구성된 모델이다',
    ],
    answer: 1,
    explanation:
      'Seq2Seq 모델은 인코더(Encoder)가 입력 시퀀스를 고정 길이의 문맥 벡터(context vector)로 변환하고, 디코더(Decoder)가 이를 기반으로 출력 시퀀스를 생성합니다. 기계 번역, 텍스트 요약, 대화 시스템 등에 활용됩니다.',
  },
  {
    id: '11-49',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 49,
    question:
      '강화학습에서 Q-learning에 대한 설명으로 가장 올바른 것은?',
    options: [
      '모델 기반(model-based) 학습 방법으로 환경의 전이 확률을 알아야 한다',
      'Q-learning은 on-policy 알고리즘으로 현재 정책을 따르며 학습한다',
      '연속적인 행동 공간에만 적용 가능한 알고리즘이다',
      '모델 프리(model-free) 기법으로 상태-행동 가치 함수(Q-function)를 학습한다',
    ],
    answer: 4,
    explanation:
      'Q-learning은 모델 프리(model-free) 강화학습 알고리즘으로, 환경의 전이 확률을 모르는 상태에서 상태-행동 가치 함수 Q(s,a)를 학습합니다. off-policy 방식으로 탐욕 정책(greedy policy)의 Q값을 업데이트하며, 이산적 행동 공간에서 주로 사용됩니다.',
  },
  {
    id: '11-50',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 50,
    question:
      '강화학습에서 탐색(Exploration)과 이용(Exploitation)의 균형에 대한 설명으로 가장 적절한 것은?',
    options: [
      '항상 탐색만 수행하면 최적 정책에 수렴한다',
      '항상 이용만 수행하면 가장 빠르게 최적 정책에 도달한다',
      '탐색은 새로운 행동을 시도하여 더 나은 보상을 찾고, 이용은 현재까지 알려진 최선의 행동을 선택한다',
      '탐색과 이용은 서로 동일한 개념이다',
    ],
    answer: 3,
    explanation:
      '탐색(Exploration)은 새로운 행동을 시도하여 잠재적으로 더 높은 보상을 발견하는 것이고, 이용(Exploitation)은 현재까지 학습된 지식을 기반으로 최선의 행동을 선택하는 것입니다. ε-greedy 등의 전략으로 둘의 균형을 조절합니다.',
  },
  {
    id: '11-51',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 51,
    question:
      'GMM(Gaussian Mixture Model)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '각 데이터 포인트를 하나의 군집에 확정적으로 할당하는 경성(hard) 군집화 기법이다',
      '비확률적 접근 방식으로 거리 기반의 군집화만 수행한다',
      '군집의 수를 자동으로 결정하므로 사전 지정이 불필요하다',
      '데이터가 여러 가우시안 분포의 혼합으로 생성되었다고 가정하며, 각 데이터 포인트의 소속 확률을 계산하는 연성(soft) 군집화 기법이다',
    ],
    answer: 4,
    explanation:
      'GMM(가우시안 혼합 모델)은 데이터가 K개의 가우시안 분포의 혼합으로 생성되었다고 가정합니다. EM(Expectation-Maximization) 알고리즘으로 파라미터를 추정하며, 각 데이터 포인트가 각 군집에 속할 확률을 계산하는 연성 군집화입니다.',
  },
  {
    id: '11-52',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 52,
    question:
      '실루엣 계수(Silhouette Coefficient)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '값의 범위는 0에서 1까지이며, 1에 가까울수록 군집화가 잘 된 것이다',
      '값의 범위는 -1에서 1까지이며, 1에 가까울수록 군집 내 응집도가 높고 군집 간 분리도가 높다',
      '값이 음수이면 군집의 수가 너무 적다는 것을 의미한다',
      '계산에 군집 중심(centroid)만 사용하며 데이터 포인트 간 거리는 사용하지 않는다',
    ],
    answer: 2,
    explanation:
      '실루엣 계수는 -1에서 1 사이의 값을 가지며, s(i) = (b(i) - a(i)) / max(a(i), b(i))로 계산됩니다. a(i)는 같은 군집 내 평균 거리, b(i)는 가장 가까운 다른 군집까지의 평균 거리입니다. 1에 가까울수록 군집화 품질이 좋습니다.',
  },
  {
    id: '11-53',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 53,
    question:
      '엘보우 방법(Elbow Method)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '군집 수(K)를 변화시키며 실루엣 계수를 최대화하는 방법이다',
      '항상 정확한 최적 군집 수를 자동으로 결정해 주는 방법이다',
      '지도 학습에서 하이퍼파라미터를 튜닝하는 방법이다',
      '군집 수(K)를 변화시키며 SSE(Sum of Squared Errors)의 감소율이 급격히 줄어드는 지점을 최적 K로 선택한다',
    ],
    answer: 4,
    explanation:
      '엘보우 방법은 군집 수 K를 1부터 증가시키며 SSE(군집 내 제곱합)를 계산하고, SSE 감소율이 급격히 둔화되는 지점(팔꿈치 형태)을 최적 K로 선택합니다. 직관적이지만 명확한 엘보우가 나타나지 않을 수도 있다는 한계가 있습니다.',
  },
  {
    id: '11-54',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 54,
    question:
      'ARIMA(p,d,q) 모형에서 각 파라미터에 대한 설명으로 가장 올바른 것은?',
    options: [
      'p는 차분 차수, d는 자기회귀 차수, q는 이동평균 차수이다',
      'p는 자기회귀(AR) 차수, d는 차분(Differencing) 차수, q는 이동평균(MA) 차수이다',
      'p는 이동평균 차수, d는 계절 주기, q는 자기회귀 차수이다',
      'p, d, q는 모두 계절 성분의 파라미터를 나타낸다',
    ],
    answer: 2,
    explanation:
      'ARIMA(p,d,q)에서 p는 자기회귀(AR: AutoRegressive) 차수로 과거 값의 영향, d는 차분(Differencing) 차수로 비정상 시계열을 정상화하는 횟수, q는 이동평균(MA: Moving Average) 차수로 과거 오차항의 영향을 나타냅니다.',
  },
  {
    id: '11-55',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 55,
    question:
      'ARIMA 모형에서 차분(d)의 목적으로 가장 적절한 것은?',
    options: [
      '시계열의 계절 성분을 제거하기 위해',
      '시계열의 이상치를 제거하기 위해',
      '비정상(non-stationary) 시계열을 정상(stationary) 시계열로 변환하기 위해',
      '시계열의 잡음(noise)을 평활화하기 위해',
    ],
    answer: 3,
    explanation:
      'ARIMA의 차분(Differencing)은 비정상 시계열에서 추세나 수준의 변화를 제거하여 정상 시계열로 변환하는 것이 목적입니다. d=1이면 1차 차분(Y_t - Y_{t-1}), d=2이면 2차 차분을 수행합니다.',
  },
  {
    id: '11-56',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 56,
    question:
      '시계열 데이터에 대한 교차검증 전략으로 가장 적절한 것은?',
    options: [
      '일반적인 K-Fold 교차검증을 무작위 분할로 적용한다',
      '전체 데이터를 랜덤하게 섞은 후 학습/검증 세트로 분할한다',
      'Leave-One-Out 교차검증을 사용한다',
      '시간 순서를 유지하는 시계열 교차검증(Time Series Split)을 사용한다',
    ],
    answer: 4,
    explanation:
      '시계열 데이터는 시간적 의존성이 있으므로 무작위 분할 시 미래 데이터가 과거 예측에 사용되는 데이터 누수(data leakage)가 발생합니다. 시계열 교차검증(Time Series Split)은 시간 순서를 유지하며 학습 데이터를 점진적으로 확장합니다.',
  },
  {
    id: '11-57',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 57,
    question:
      'SOM에서 BMU(Best Matching Unit)란 무엇인가?',
    options: [
      '학습 데이터에서 가장 빈도가 높은 데이터 포인트',
      '출력층에서 가장 큰 활성화 값을 가진 뉴런',
      '역전파 알고리즘에서 오차가 가장 큰 뉴런',
      '입력 벡터와 가중치 벡터의 거리가 가장 가까운 뉴런',
    ],
    answer: 4,
    explanation:
      'BMU(Best Matching Unit)는 SOM에서 입력 벡터와 가중치 벡터 간의 유클리드 거리가 가장 작은 뉴런입니다. BMU와 그 이웃 뉴런의 가중치를 입력 벡터 방향으로 업데이트하여 위상적 구조를 보존하며 학습합니다.',
  },
  {
    id: '11-58',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 58,
    question:
      'Transformer 구조에서 위치 인코딩(Positional Encoding)을 사용하는 이유로 가장 적절한 것은?',
    options: [
      'Transformer는 순환 구조가 없어 시퀀스의 순서 정보를 별도로 주입해야 하기 때문이다',
      '입력 데이터의 차원을 축소하기 위해서이다',
      '과적합을 방지하기 위한 정규화 기법이다',
      '어텐션 가중치를 정규화하기 위해서이다',
    ],
    answer: 1,
    explanation:
      'Transformer는 RNN과 달리 순환 구조가 없어 입력 토큰의 순서 정보를 자체적으로 파악할 수 없습니다. 위치 인코딩(사인/코사인 함수 또는 학습 가능한 임베딩)을 입력에 더하여 토큰의 위치 정보를 모델에 제공합니다.',
  },
  {
    id: '11-59',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 59,
    question:
      'GMM의 파라미터를 추정하는 데 사용되는 알고리즘은?',
    options: [
      '경사하강법(Gradient Descent)',
      'EM(Expectation-Maximization) 알고리즘',
      '유전 알고리즘(Genetic Algorithm)',
      'A* 탐색 알고리즘',
    ],
    answer: 2,
    explanation:
      'GMM의 파라미터(각 가우시안의 평균, 공분산, 혼합 계수)는 EM 알고리즘으로 추정합니다. E-Step에서 각 데이터의 군집 소속 확률을 계산하고, M-Step에서 이를 기반으로 파라미터를 업데이트하는 과정을 수렴할 때까지 반복합니다.',
  },
  {
    id: '11-60',
    session: '제11회',
    sessionId: '11',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 60,
    question:
      '시계열 교차검증에서 Expanding Window 방식과 Sliding Window 방식을 비교한 설명으로 가장 올바른 것은?',
    options: [
      'Expanding Window는 학습 데이터가 매 폴드마다 감소한다',
      '두 방식 모두 미래 데이터를 학습에 포함한다',
      'Expanding Window와 Sliding Window는 동일한 결과를 생성한다',
      'Sliding Window는 학습 데이터의 크기를 일정하게 유지하며 창을 이동시킨다',
    ],
    answer: 4,
    explanation:
      'Expanding Window는 매 폴드마다 학습 데이터를 누적하여 점진적으로 확장하고, Sliding Window는 고정된 크기의 학습 데이터 창을 시간 축을 따라 이동시킵니다. 두 방식 모두 시간 순서를 유지하여 데이터 누수를 방지합니다.',
  },

  // ===== 과목 4: 빅데이터 결과 해석 (61~80) =====
  {
    id: '11-61',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 61,
    question:
      'SHAP Summary Plot에 대한 설명으로 가장 올바른 것은?',
    options: [
      '단일 예측에 대한 특성 기여도만 표시하는 그래프이다',
      '모든 데이터 포인트에 대한 각 특성의 SHAP 값을 요약하여 전역적 특성 중요도와 영향 방향을 동시에 시각화한다',
      '모델의 학습 손실 변화를 시각화하는 그래프이다',
      '하이퍼파라미터 튜닝 결과를 비교하는 그래프이다',
    ],
    answer: 2,
    explanation:
      'SHAP Summary Plot은 모든 데이터 포인트에 대한 각 특성의 SHAP 값을 점으로 표시합니다. x축은 SHAP 값(모델 출력에 대한 기여), 점의 색상은 특성값의 크기를 나타내어 전역적 특성 중요도와 영향 방향을 동시에 파악할 수 있습니다.',
  },
  {
    id: '11-62',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 62,
    question:
      'LIME을 활용한 모델 해석의 장점으로 가장 적절한 것은?',
    options: [
      '모델의 전역적 구조를 완벽하게 설명할 수 있다',
      '어떤 블랙박스 모델에도 적용 가능하며 개별 예측에 대한 직관적 설명을 제공한다',
      '설명의 안정성이 항상 보장되어 동일 입력에 대해 항상 같은 설명을 생성한다',
      '계산 비용이 전혀 들지 않는다',
    ],
    answer: 2,
    explanation:
      'LIME은 Model-Agnostic 기법으로 어떤 블랙박스 모델에도 적용 가능하며, 개별 예측에 대해 해석 가능한 국소 모델을 제공합니다. 다만 교란 데이터 생성의 무작위성으로 인해 설명이 불안정할 수 있고, 국소적 설명이므로 전역적 해석에는 한계가 있습니다.',
  },
  {
    id: '11-63',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 63,
    question:
      'ICE Plot(Individual Conditional Expectation Plot)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '전체 데이터의 평균 효과만을 하나의 선으로 표시하는 그래프이다',
      '개별 데이터 포인트별로 특정 특성 변화에 따른 예측값 변화를 각각의 선으로 표시하는 그래프이다',
      '분류 모델의 ROC 곡선을 여러 임계값에서 그린 그래프이다',
      '시계열 데이터의 자기상관 함수를 시각화하는 그래프이다',
    ],
    answer: 2,
    explanation:
      'ICE Plot은 개별 데이터 포인트마다 특정 특성의 값을 변화시켰을 때 예측값이 어떻게 변하는지를 각각의 선으로 그립니다. PDP(Partial Dependence Plot)가 전체 평균만 보여주는 것과 달리, ICE Plot은 개별적 이질성(heterogeneity)을 파악할 수 있습니다.',
  },
  {
    id: '11-64',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 64,
    question:
      '앙상블 모델을 사용함으로써 기대할 수 있는 효과로 가장 적절하지 않은 것은?',
    options: [
      '개별 모델 대비 예측 분산(variance)을 줄일 수 있다',
      '다양한 모델의 강점을 결합하여 일반화 성능을 향상시킨다',
      '모델의 해석 가능성이 개별 모델보다 항상 향상된다',
      '과적합 위험을 줄이고 안정적인 예측을 제공한다',
    ],
    answer: 3,
    explanation:
      '앙상블 모델은 여러 모델을 결합하여 분산 감소, 일반화 성능 향상, 과적합 위험 감소 등의 효과를 기대할 수 있습니다. 그러나 모델의 복잡도가 증가하여 해석 가능성은 오히려 저하되는 것이 일반적입니다.',
  },
  {
    id: '11-65',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 65,
    question:
      '이익 곡선(Gains Chart)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '모델의 학습 과정에서 손실 함수의 변화를 시각화한다',
      '예측 확률이 높은 순서대로 정렬하여 누적 응답률(반응률)을 시각화하며, 모델의 예측 효용성을 평가한다',
      '두 모델의 ROC 곡선을 비교하는 그래프이다',
      '군집 분석의 결과를 2차원으로 시각화하는 그래프이다',
    ],
    answer: 2,
    explanation:
      '이익 곡선(Gains Chart)은 모델의 예측 확률이 높은 순서대로 데이터를 정렬하고, 상위 n%를 선택했을 때 전체 양성 클래스 중 얼마나 포착할 수 있는지를 시각화합니다. 마케팅 캠페인의 타겟 선정 등에서 모델의 실질적 효용을 평가합니다.',
  },
  {
    id: '11-66',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 66,
    question:
      'PSI(Population Stability Index)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '모델의 분류 정확도를 측정하는 지표이다',
      '학습 시점의 데이터 분포와 적용 시점의 데이터 분포 간 변화를 측정하여 모델 안정성을 평가한다',
      '특성 간의 상관관계를 측정하는 지표이다',
      '모델의 학습 속도를 측정하는 지표이다',
    ],
    answer: 2,
    explanation:
      'PSI는 모델 개발 시점(기준)과 현재 적용 시점의 입력 데이터 분포 변화를 측정합니다. PSI = Σ(실제비율 - 기대비율) × ln(실제비율/기대비율)으로 계산하며, 일반적으로 PSI < 0.1이면 안정, 0.1~0.2이면 주의, 0.2 이상이면 모델 재학습이 필요합니다.',
  },
  {
    id: '11-67',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 67,
    question:
      'PSI 값이 0.25로 나타났을 때 적절한 조치는?',
    options: [
      '모델이 안정적이므로 현재 모델을 계속 사용한다',
      '소폭 변화이므로 모니터링만 강화한다',
      '데이터 분포가 크게 변화했으므로 모델 재학습 또는 교체를 검토한다',
      'PSI 값을 무시하고 정확도만으로 판단한다',
    ],
    answer: 3,
    explanation:
      'PSI가 0.2 이상이면 데이터 분포가 유의미하게 변화한 것으로, 모델의 예측 성능이 저하되었을 가능성이 높습니다. 이 경우 모델 재학습, 피처 재설계, 또는 모델 교체를 적극적으로 검토해야 합니다.',
  },
  {
    id: '11-68',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 68,
    question:
      '코로플레스 맵(Choropleth Map)에 대한 설명으로 가장 올바른 것은?',
    options: [
      '지리적 영역을 데이터 값에 따른 색상 또는 음영으로 구분하여 표현하는 지도 시각화이다',
      '산점도에 밀도 추정을 겹쳐서 표시하는 시각화이다',
      '네트워크 그래프의 노드를 지도 위에 배치한 시각화이다',
      '시계열 데이터를 달력 형태로 표시하는 시각화이다',
    ],
    answer: 1,
    explanation:
      '코로플레스 맵은 행정구역 등 지리적 영역을 데이터 값의 크기에 따라 색상 또는 음영의 농도로 구분하여 표현합니다. 인구 밀도, 소득 수준, 선거 결과 등 지역별 통계 데이터를 직관적으로 비교하는 데 효과적입니다.',
  },
  {
    id: '11-69',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 69,
    question:
      '코로플레스 맵 작성 시 주의해야 할 사항으로 가장 적절한 것은?',
    options: [
      '절대값(총량)을 사용해야 정확한 비교가 가능하다',
      '면적이 큰 지역이 시각적으로 과대 표현될 수 있으므로, 비율 또는 밀도 값을 사용하는 것이 좋다',
      '색상은 가능한 많은 종류를 사용하여 다양성을 높여야 한다',
      '범례는 생략하여 시각적 복잡도를 낮추는 것이 좋다',
    ],
    answer: 2,
    explanation:
      '코로플레스 맵에서 절대값(총량)을 사용하면 면적이 큰 지역이 시각적으로 과대 표현되는 편향이 발생할 수 있습니다. 인구 대비 비율이나 단위 면적당 밀도 등 표준화된 값을 사용하고, 순차적 색상 스케일을 적용하는 것이 권장됩니다.',
  },
  {
    id: '11-70',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 70,
    question:
      '인터랙티브 시각화 도구인 Plotly의 특징으로 가장 적절하지 않은 것은?',
    options: [
      '마우스 호버, 줌, 팬 등 사용자 상호작용 기능을 제공한다',
      'Python, R, JavaScript 등 다양한 언어에서 사용 가능하다',
      '웹 브라우저에서 동작하는 인터랙티브 차트를 생성할 수 있다',
      '정적 이미지만 출력할 수 있으며 웹 기반 상호작용은 지원하지 않는다',
    ],
    answer: 4,
    explanation:
      'Plotly는 웹 기반 인터랙티브 시각화 라이브러리로, 마우스 호버, 줌인/줌아웃, 팬, 선택 등 다양한 상호작용 기능을 지원합니다. Python, R, JavaScript, Julia 등 다양한 언어에서 사용 가능하며, 정적 이미지뿐 아니라 인터랙티브 HTML 출력도 지원합니다.',
  },
  {
    id: '11-71',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 71,
    question:
      'D3.js(Data-Driven Documents)의 특징으로 가장 올바른 것은?',
    options: [
      '서버 사이드에서만 실행되는 시각화 라이브러리이다',
      'HTML, SVG, CSS를 활용하여 데이터를 DOM에 바인딩하고 커스텀 시각화를 생성하는 JavaScript 라이브러리이다',
      '미리 정의된 차트 템플릿만 사용할 수 있어 커스터마이징이 불가능하다',
      'Python 전용 시각화 라이브러리이다',
    ],
    answer: 2,
    explanation:
      'D3.js는 데이터를 DOM 요소에 바인딩하고 HTML, SVG, CSS를 활용하여 고도로 커스터마이징된 시각화를 만들 수 있는 JavaScript 라이브러리입니다. 자유도가 매우 높아 복잡한 인터랙티브 시각화를 구현할 수 있지만, 학습 곡선이 높은 편입니다.',
  },
  {
    id: '11-72',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 72,
    question:
      '경영진에게 분석 결과를 보고할 때 가장 적절한 전략은?',
    options: [
      '분석에 사용한 알고리즘의 수학적 원리를 상세히 설명한다',
      '핵심 인사이트와 비즈니스 임팩트를 중심으로 간결하게 전달하고, 실행 가능한 권고사항을 제시한다',
      '모든 분석 과정을 시간순으로 나열하여 보고한다',
      '통계적 유의성과 p-value를 중심으로 보고한다',
    ],
    answer: 2,
    explanation:
      '경영진 보고에서는 기술적 세부사항보다 비즈니스 관점의 핵심 인사이트와 임팩트를 강조해야 합니다. 의사결정에 직접 활용할 수 있는 실행 가능한 권고사항(Actionable Recommendations)을 포함하고, 시각화를 활용하여 직관적으로 전달하는 것이 효과적입니다.',
  },
  {
    id: '11-73',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 73,
    question:
      '분석 결과를 의사결정에 활용할 때 고려해야 할 사항으로 가장 거리가 먼 것은?',
    options: [
      '분석 결과의 신뢰구간과 불확실성을 함께 전달한다',
      '분석 모델의 전제조건과 한계를 명시한다',
      '분석에 사용한 코드를 전부 공유하여 기술적 세부사항을 모두 전달한다',
      '분석 결과가 기존 도메인 지식과 일관성이 있는지 검증한다',
    ],
    answer: 3,
    explanation:
      '분석 결과의 의사결정 활용 시에는 결과의 불확실성, 모델의 전제조건과 한계, 도메인 지식과의 일관성 등을 고려해야 합니다. 코드를 전부 공유하는 것은 기술팀 간 협업에는 유용하나, 의사결정자에게는 핵심 인사이트 전달이 더 중요합니다.',
  },
  {
    id: '11-74',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 74,
    question:
      'SHAP Summary Plot에서 점의 색상이 빨간색이고 SHAP 값이 양수인 경우의 해석으로 가장 올바른 것은?',
    options: [
      '해당 특성의 높은 값이 예측값을 감소시키는 방향으로 기여한다',
      '해당 특성의 높은 값이 예측값을 증가시키는 방향으로 기여한다',
      '해당 특성이 모델에 영향을 주지 않는다',
      '해당 특성의 낮은 값이 예측값을 증가시키는 방향으로 기여한다',
    ],
    answer: 2,
    explanation:
      'SHAP Summary Plot에서 빨간색은 특성값이 높음을, 파란색은 낮음을 나타냅니다. 빨간색 점이 양의 SHAP 값 영역에 위치하면, 해당 특성의 높은 값이 모델 예측을 증가시키는 방향으로 기여한다는 것을 의미합니다.',
  },
  {
    id: '11-75',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 75,
    question:
      '이익 곡선(Gains Chart)에서 대각선(Baseline)이 의미하는 것은?',
    options: [
      '완벽한 모델의 성능을 나타내는 기준선이다',
      '무작위로 대상을 선택했을 때의 기대 성과를 나타내는 기준선이다',
      '과적합된 모델의 성능을 나타내는 기준선이다',
      '학습 데이터에서의 모델 성능을 나타내는 기준선이다',
    ],
    answer: 2,
    explanation:
      '이익 곡선의 대각선(Baseline)은 모델 없이 무작위로 대상을 선택했을 때의 기대 성과를 나타냅니다. 모델의 곡선이 이 대각선보다 위에 위치할수록 무작위 선택 대비 모델의 예측 효용이 높다는 것을 의미합니다.',
  },
  {
    id: '11-76',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 76,
    question:
      'ICE Plot과 PDP(Partial Dependence Plot)의 관계에 대한 설명으로 가장 올바른 것은?',
    options: [
      'PDP는 ICE Plot의 개별 선들을 평균한 것이다',
      'ICE Plot은 PDP의 분산을 나타내는 그래프이다',
      'PDP와 ICE Plot은 완전히 독립적인 기법이다',
      'ICE Plot은 PDP보다 항상 해석하기 쉽다',
    ],
    answer: 1,
    explanation:
      'PDP(Partial Dependence Plot)는 ICE Plot에서 모든 개별 선들의 평균을 나타낸 것입니다. PDP가 전체 평균 효과만 보여주는 반면, ICE Plot은 개별 데이터 포인트의 이질적 반응을 보여주어 상호작용 효과를 발견하는 데 유용합니다.',
  },
  {
    id: '11-77',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 77,
    question:
      '경영진 보고 시 시각화 활용 전략으로 가장 적절하지 않은 것은?',
    options: [
      '핵심 메시지를 강조하는 단순하고 명확한 차트를 사용한다',
      '차트에 적절한 제목, 축 레이블, 단위를 포함한다',
      '가능한 많은 데이터를 하나의 차트에 담아 정보량을 극대화한다',
      '색상을 전략적으로 활용하여 핵심 정보를 부각시킨다',
    ],
    answer: 3,
    explanation:
      '경영진 보고에서는 정보 과부하를 피하고 핵심 메시지를 명확하게 전달해야 합니다. 하나의 차트에 너무 많은 데이터를 담으면 가독성이 떨어지고 핵심 메시지가 흐려집니다. 하나의 차트에 하나의 메시지를 전달하는 것이 효과적입니다.',
  },
  {
    id: '11-78',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 78,
    question:
      '인터랙티브 시각화가 정적 시각화 대비 갖는 장점으로 가장 적절한 것은?',
    options: [
      '항상 더 빠른 렌더링 속도를 보장한다',
      '사용자가 데이터를 탐색하고 필터링하며 세부 정보를 자유롭게 확인할 수 있다',
      '인쇄 매체에서 더 효과적으로 전달된다',
      '데이터 보안이 자동으로 강화된다',
    ],
    answer: 2,
    explanation:
      '인터랙티브 시각화는 사용자가 줌인/줌아웃, 필터링, 호버 등을 통해 데이터를 능동적으로 탐색할 수 있습니다. 다양한 관점에서 데이터를 살펴볼 수 있어 심층적인 인사이트 발견이 가능하며, 대시보드 형태로 실시간 모니터링에도 활용됩니다.',
  },
  {
    id: '11-79',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 79,
    question:
      '분석 결과의 의사결정 지원 프레임워크에서 분석 결과를 실제 비즈니스 액션으로 전환하기 위해 가장 중요한 요소는?',
    options: [
      '분석에 사용된 하드웨어 사양을 상세히 기술한다',
      '분석 결과에 기반한 구체적인 실행 계획(Action Plan)과 기대 효과(ROI)를 제시한다',
      '가능한 많은 통계적 검정 결과를 나열한다',
      '분석 모델의 소스 코드를 전체 첨부한다',
    ],
    answer: 2,
    explanation:
      '분석 결과를 비즈니스 액션으로 전환하려면 구체적인 실행 계획과 기대 효과(ROI)를 제시해야 합니다. 누가, 언제, 무엇을 해야 하는지를 명확히 하고, 예상되는 비즈니스 임팩트를 정량화하여 의사결정자가 즉시 행동할 수 있도록 지원합니다.',
  },
  {
    id: '11-80',
    session: '제11회',
    sessionId: '11',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 80,
    question:
      '모형 앙상블에서 Blending과 Stacking의 차이점으로 가장 올바른 것은?',
    options: [
      'Blending은 K-Fold 교차검증을 사용하고, Stacking은 Hold-out 검증셋을 사용한다',
      'Blending은 Hold-out 검증셋에 대한 예측값으로 메타 모델을 학습시키고, Stacking은 K-Fold 교차검증의 out-of-fold 예측값을 사용한다',
      'Blending과 Stacking은 완전히 동일한 기법이다',
      'Blending은 단일 모델만 사용하고, Stacking은 여러 모델을 사용한다',
    ],
    answer: 2,
    explanation:
      'Blending은 학습 데이터를 학습용과 검증용으로 한 번만 분할하여, 검증셋에 대한 기본 모델의 예측값으로 메타 모델을 학습합니다. Stacking은 K-Fold 교차검증으로 모든 학습 데이터의 out-of-fold 예측값을 생성하여 메타 모델을 학습시킵니다. Stacking이 데이터를 더 효율적으로 활용합니다.',
  },
];
