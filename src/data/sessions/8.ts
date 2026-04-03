import { Question } from '@/types';

export const questions: Question[] = [
  // ===== 과목 1: 빅데이터 분석 기획 (1~20) =====
  {
    id: '8-1',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 1,
    question:
      '하둡(Hadoop) 분산 파일 시스템(HDFS)에서 데이터 블록의 기본 복제 계수(Replication Factor)는?',
    options: ['1', '2', '3', '4'],
    answer: 3,
    explanation:
      'HDFS의 기본 복제 계수는 3입니다. 이는 하나의 데이터 블록이 클러스터 내 3개의 서로 다른 노드에 복제되어 저장됨을 의미하며, 노드 장애 시에도 데이터 가용성과 내결함성을 보장합니다.',
  },
  {
    id: '8-2',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 2,
    question:
      '데이터 레이크(Data Lake)와 데이터 웨어하우스(Data Warehouse)의 차이점으로 가장 적절한 것은?',
    options: [
      '데이터 레이크는 정형 데이터만 저장하고, 데이터 웨어하우스는 비정형 데이터만 저장한다',
      '데이터 레이크는 OLTP 시스템이고, 데이터 웨어하우스는 OLAP 시스템이다',
      '데이터 레이크는 실시간 처리만 가능하고, 데이터 웨어하우스는 배치 처리만 가능하다',
      '데이터 레이크는 스키마 온 리드(Schema on Read) 방식을 사용하고, 데이터 웨어하우스는 스키마 온 라이트(Schema on Write) 방식을 사용한다',
    ],
    answer: 4,
    explanation:
      '데이터 레이크는 원본 데이터를 그대로 저장한 후 분석 시점에 스키마를 정의하는 스키마 온 리드(Schema on Read) 방식을 사용합니다. 반면 데이터 웨어하우스는 데이터 적재 시점에 미리 정의된 스키마에 맞춰 저장하는 스키마 온 라이트(Schema on Write) 방식을 사용합니다.',
  },
  {
    id: '8-3',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 3,
    question: 'ETL과 ELT의 비교 설명으로 가장 옳지 않은 것은?',
    options: [
      'ETL은 데이터를 추출한 후 변환하고 적재하는 순서로 진행된다',
      'ETL은 ELT보다 항상 처리 속도가 빠르므로 모든 상황에서 ETL이 권장된다',
      'ELT는 대용량 데이터를 먼저 적재한 후 타겟 시스템에서 변환을 수행한다',
      'ELT는 클라우드 데이터 웨어하우스의 컴퓨팅 파워를 활용할 수 있어 대규모 데이터에 유리하다',
    ],
    answer: 2,
    explanation:
      'ETL이 항상 ELT보다 빠르다는 것은 잘못된 설명입니다. 대용량 데이터의 경우 ELT가 타겟 시스템(예: 클라우드 DW)의 강력한 컴퓨팅 자원을 활용하여 더 빠르게 처리할 수 있습니다. ETL은 데이터 품질 통제가 중요한 경우에 유리하고, ELT는 빅데이터 환경에서 유연성과 확장성이 요구될 때 적합합니다.',
  },
  {
    id: '8-4',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 4,
    question:
      '메타데이터(Metadata) 관리의 중요성에 대한 설명으로 가장 적절하지 않은 것은?',
    options: [
      '데이터의 출처, 변환 이력, 품질 정보를 체계적으로 관리할 수 있다',
      '데이터 리니지(Data Lineage)를 통해 데이터의 흐름을 추적할 수 있다',
      '메타데이터 관리는 데이터 저장 용량을 직접적으로 줄여주는 것이 주목적이다',
      '데이터 카탈로그 구축을 통해 데이터 검색과 활용을 효율화할 수 있다',
    ],
    answer: 3,
    explanation:
      '메타데이터 관리의 주목적은 데이터 저장 용량을 줄이는 것이 아닙니다. 메타데이터 관리는 데이터의 의미, 구조, 품질, 출처 등의 정보를 체계적으로 관리하여 데이터 활용성과 신뢰성을 높이는 것이 주된 목적입니다.',
  },
  {
    id: '8-5',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 5,
    question: 'Apache Spark의 핵심 데이터 구조인 RDD(Resilient Distributed Dataset)의 특성으로 가장 옳지 않은 것은?',
    options: [
      '불변성(Immutability)을 가지며 변환(Transformation) 시 새로운 RDD가 생성된다',
      '지연 평가(Lazy Evaluation)를 통해 액션(Action)이 호출될 때까지 실제 연산이 실행되지 않는다',
      '파티션(Partition) 단위로 분산 저장되어 병렬 처리가 가능하다',
      'RDD는 디스크에만 데이터를 저장하므로 인메모리 처리가 불가능하다',
    ],
    answer: 4,
    explanation:
      'Spark의 RDD는 인메모리(In-Memory) 처리를 핵심 특성으로 합니다. 데이터를 메모리에 캐싱하여 반복적인 연산에서 디스크 I/O를 줄이고 처리 속도를 크게 향상시킵니다. 이것이 MapReduce 대비 Spark의 가장 큰 장점 중 하나입니다.',
  },
  {
    id: '8-6',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 6,
    question:
      '데이터 표준화(Data Standardization)의 주요 활동으로 가장 거리가 먼 것은?',
    options: [
      '데이터 용어 사전 작성 및 관리',
      '데이터 코드 표준 정의',
      '데이터 명명 규칙 수립',
      '데이터 분석 알고리즘 선택',
    ],
    answer: 4,
    explanation:
      '데이터 표준화는 데이터 용어 사전 작성, 코드 표준 정의, 명명 규칙 수립, 도메인 정의 등 데이터의 일관성과 품질을 확보하기 위한 활동입니다. 분석 알고리즘 선택은 데이터 분석 단계의 활동으로, 데이터 표준화와는 직접적인 관련이 없습니다.',
  },
  {
    id: '8-7',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 7,
    question:
      'MDM(Master Data Management)에 대한 설명으로 가장 적절한 것은?',
    options: [
      'MDM은 조직 내 핵심 데이터(고객, 제품 등)의 단일 버전을 유지하여 데이터 일관성을 확보하는 관리 체계이다',
      'MDM은 비정형 데이터의 실시간 스트리밍 처리를 위한 기술이다',
      'MDM은 데이터베이스의 물리적 저장 구조를 최적화하는 기술이다',
      'MDM은 데이터 암호화와 접근 제어를 전담하는 보안 솔루션이다',
    ],
    answer: 1,
    explanation:
      'MDM(Master Data Management)은 조직 전체에서 사용되는 핵심 마스터 데이터(고객, 제품, 공급업체 등)의 단일하고 정확한 버전(Single Version of Truth)을 생성하고 유지하는 관리 체계입니다. 이를 통해 데이터 일관성과 품질을 보장합니다.',
  },
  {
    id: '8-8',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 8,
    question:
      '빅데이터 분석 프로젝트의 ROI(Return on Investment) 산정 시 고려해야 할 요소로 가장 거리가 먼 것은?',
    options: [
      '분석을 통한 비용 절감 효과',
      '분석 인프라 구축 및 운영 비용',
      '분석 결과의 매출 증대 기여도',
      '분석팀 구성원의 개인 학습 시간',
    ],
    answer: 4,
    explanation:
      'ROI 산정 시 투자 비용(인프라, 인력, 소프트웨어 비용)과 기대 효과(비용 절감, 매출 증대, 리스크 감소 등)를 종합적으로 고려합니다. 개인의 학습 시간은 직접적인 ROI 산정 요소로 포함되지 않습니다.',
  },
  {
    id: '8-9',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 9,
    question:
      '분석 성숙도 모델에서 기업의 분석 수준을 단계별로 분류할 때, 가장 높은 성숙도 단계에 해당하는 것은?',
    options: [
      '스프레드시트를 이용한 수동 보고서 작성 단계',
      '단순 대시보드를 통해 KPI를 모니터링하는 단계',
      '기술 통계 분석 중심으로 과거 데이터를 요약하는 단계',
      '실시간 데이터를 기반으로 자동화된 의사결정 최적화가 이루어지는 단계',
    ],
    answer: 4,
    explanation:
      '분석 성숙도 모델은 일반적으로 기술 분석(Descriptive) → 진단 분석(Diagnostic) → 예측 분석(Predictive) → 처방 분석(Prescriptive) → 자동화/최적화(Automated/Optimized) 단계로 발전합니다. 실시간 데이터 기반의 자동화된 의사결정 최적화가 가장 높은 성숙도 단계에 해당합니다.',
  },
  {
    id: '8-10',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 10,
    question:
      '데이터 카탈로그(Data Catalog)의 주요 기능으로 가장 적절하지 않은 것은?',
    options: [
      '조직 내 데이터 자산의 검색 및 탐색 기능 제공',
      '데이터의 비즈니스 용어 및 기술 메타데이터 관리',
      '데이터 리니지(Data Lineage) 추적 및 시각화',
      '데이터베이스의 물리적 인덱스 자동 최적화',
    ],
    answer: 4,
    explanation:
      '데이터 카탈로그는 조직의 데이터 자산을 체계적으로 관리하고 검색할 수 있는 도구로, 메타데이터 관리, 데이터 검색, 리니지 추적, 데이터 품질 정보 제공 등의 기능을 수행합니다. 물리적 인덱스 최적화는 데이터베이스 관리 시스템(DBMS)의 기능입니다.',
  },
  {
    id: '8-11',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 11,
    question:
      '클라우드 서비스 모델 중 IaaS(Infrastructure as a Service)에 해당하는 것은?',
    options: [
      'AWS EC2, Azure Virtual Machines',
      'Google Gmail, Microsoft 365',
      'Salesforce CRM, Google Workspace',
      'Heroku, Google App Engine',
    ],
    answer: 1,
    explanation:
      'IaaS는 서버, 스토리지, 네트워크 등 IT 인프라를 클라우드로 제공하는 서비스 모델입니다. AWS EC2, Azure Virtual Machines가 대표적인 IaaS 서비스이며, Gmail과 Microsoft 365는 SaaS, Heroku와 Google App Engine은 PaaS에 해당합니다.',
  },
  {
    id: '8-12',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 12,
    question:
      '하둡 에코시스템에서 YARN(Yet Another Resource Negotiator)의 역할로 가장 적절한 것은?',
    options: [
      '분산 파일 저장 및 관리',
      'SQL 쿼리 실행 엔진',
      '클러스터 자원 관리 및 작업 스케줄링',
      '실시간 스트리밍 데이터 처리',
    ],
    answer: 3,
    explanation:
      'YARN은 하둡 2.0부터 도입된 클러스터 자원 관리 프레임워크로, ResourceManager와 NodeManager를 통해 클러스터의 CPU, 메모리 등 자원을 관리하고 애플리케이션의 작업 스케줄링을 담당합니다. HDFS가 파일 저장, Hive가 SQL 쿼리 실행을 담당합니다.',
  },
  {
    id: '8-13',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 13,
    question:
      '데이터 레이크하우스(Data Lakehouse) 아키텍처에 대한 설명으로 가장 적절한 것은?',
    options: [
      '데이터 레이크의 유연한 저장과 데이터 웨어하우스의 관리 기능을 결합한 아키텍처이다',
      '오직 정형 데이터만 처리할 수 있는 전통적인 RDBMS 기반 시스템이다',
      '실시간 스트리밍 처리만을 위한 전용 플랫폼이다',
      '온프레미스 환경에서만 구현 가능한 폐쇄형 아키텍처이다',
    ],
    answer: 1,
    explanation:
      '데이터 레이크하우스는 데이터 레이크의 저비용 유연 저장 능력과 데이터 웨어하우스의 ACID 트랜잭션, 스키마 관리, 거버넌스 기능을 결합한 최신 아키텍처입니다. Delta Lake, Apache Iceberg, Apache Hudi 등이 대표적인 구현 기술입니다.',
  },
  {
    id: '8-14',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 14,
    question:
      '빅데이터 분석 기획 시 KPI(Key Performance Indicator) 설정 원칙인 SMART 기준에 해당하지 않는 것은?',
    options: [
      'Specific(구체적)',
      'Measurable(측정 가능)',
      'Random(무작위적)',
      'Time-bound(기한이 있는)',
    ],
    answer: 3,
    explanation:
      'SMART 기준은 Specific(구체적), Measurable(측정 가능), Achievable(달성 가능), Relevant(관련성 있는), Time-bound(기한이 있는)의 약자입니다. Random(무작위적)은 SMART 기준에 포함되지 않으며, A는 Achievable을 의미합니다.',
  },
  {
    id: '8-15',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 15,
    question:
      'Spark에서 DataFrame과 RDD의 비교 설명으로 가장 옳지 않은 것은?',
    options: [
      'DataFrame은 스키마 정보를 가지고 있어 최적화된 실행 계획을 수립할 수 있다',
      'DataFrame은 Catalyst 옵티마이저를 통해 쿼리를 자동 최적화한다',
      'RDD는 타입 안전성(Type Safety)을 제공하여 컴파일 시점에 오류를 발견할 수 있다',
      'DataFrame은 RDD보다 항상 메모리를 더 많이 사용한다',
    ],
    answer: 4,
    explanation:
      'DataFrame은 Tungsten 실행 엔진과 Catalyst 옵티마이저를 통해 메모리 사용을 최적화하므로, 일반적으로 RDD보다 메모리를 더 효율적으로 사용합니다. DataFrame의 컬럼 기반 저장 형식과 코드 생성 기술이 메모리 효율성에 기여합니다.',
  },
  {
    id: '8-16',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 16,
    question:
      '데이터 거버넌스(Data Governance)의 핵심 구성 요소로 가장 거리가 먼 것은?',
    options: [
      '데이터 품질 관리 정책 수립',
      '데이터 보안 및 프라이버시 관리',
      '데이터 소유권 및 책임 체계 정의',
      '서버 하드웨어의 물리적 배치 설계',
    ],
    answer: 4,
    explanation:
      '데이터 거버넌스는 데이터 품질 관리, 보안 및 프라이버시, 소유권 및 책임 체계, 데이터 표준, 메타데이터 관리 등을 포함합니다. 서버 하드웨어의 물리적 배치 설계는 IT 인프라 관리의 영역으로, 데이터 거버넌스의 직접적인 구성 요소가 아닙니다.',
  },
  {
    id: '8-17',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 17,
    question:
      '빅데이터 분석 방법론 중 CRISP-DM의 단계 순서로 올바른 것은?',
    options: [
      '업무 이해 → 데이터 이해 → 데이터 준비 → 모델링 → 평가 → 배포',
      '데이터 수집 → 데이터 정제 → 탐색적 분석 → 모델링 → 시각화',
      '요구사항 분석 → 설계 → 구현 → 테스트 → 유지보수',
      '데이터 이해 → 업무 이해 → 모델링 → 데이터 준비 → 평가 → 배포',
    ],
    answer: 1,
    explanation:
      'CRISP-DM(Cross-Industry Standard Process for Data Mining)은 업무 이해(Business Understanding) → 데이터 이해(Data Understanding) → 데이터 준비(Data Preparation) → 모델링(Modeling) → 평가(Evaluation) → 배포(Deployment)의 6단계로 구성됩니다.',
  },
  {
    id: '8-18',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 18,
    question:
      '클라우드 네이티브 데이터 플랫폼 구축 시 컨테이너 오케스트레이션 도구로 가장 널리 사용되는 것은?',
    options: ['Apache Mesos', 'Docker Swarm', 'Kubernetes', 'Vagrant'],
    answer: 3,
    explanation:
      'Kubernetes(K8s)는 컨테이너화된 애플리케이션의 배포, 확장, 관리를 자동화하는 오픈소스 오케스트레이션 플랫폼으로, 클라우드 네이티브 환경에서 사실상 표준(de facto standard)으로 사용됩니다. Google에서 개발하여 CNCF에 기증하였습니다.',
  },
  {
    id: '8-19',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 19,
    question: '데이터 품질 관리의 핵심 차원(Dimension)에 해당하지 않는 것은?',
    options: [
      '정확성(Accuracy)',
      '완전성(Completeness)',
      '일관성(Consistency)',
      '복잡성(Complexity)',
    ],
    answer: 4,
    explanation:
      '데이터 품질의 핵심 차원은 정확성(Accuracy), 완전성(Completeness), 일관성(Consistency), 적시성(Timeliness), 유효성(Validity), 유일성(Uniqueness) 등입니다. 복잡성(Complexity)은 데이터 품질의 차원이 아니라 데이터 구조의 특성입니다.',
  },
  {
    id: '8-20',
    session: '제8회',
    sessionId: '8',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 20,
    question:
      '다음 중 데이터 파이프라인 오케스트레이션 도구로 가장 적절한 것은?',
    options: [
      'Apache Airflow',
      'Apache Cassandra',
      'Redis',
      'Elasticsearch',
    ],
    answer: 1,
    explanation:
      'Apache Airflow는 DAG(Directed Acyclic Graph) 기반으로 데이터 파이프라인의 스케줄링, 모니터링, 오케스트레이션을 수행하는 도구입니다. Cassandra는 NoSQL DB, Redis는 인메모리 캐시/DB, Elasticsearch는 검색 엔진입니다.',
  },
  // ===== 과목 2: 빅데이터 탐색 (21~40) =====
  {
    id: '8-21',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 21,
    question:
      '결측값(Missing Value) 처리 방법 중 다중 대체법(Multiple Imputation)의 특징으로 가장 적절한 것은?',
    options: [
      '결측값을 하나의 고정 값으로만 대체한다',
      '결측값이 있는 행을 모두 삭제한다',
      '결측값을 여러 번 대체하여 복수의 완전한 데이터셋을 생성한 후 결과를 통합한다',
      '결측값을 0으로만 대체하는 방법이다',
    ],
    answer: 3,
    explanation:
      '다중 대체법(Multiple Imputation)은 결측값을 하나의 값이 아닌 여러 개의 값으로 대체하여 복수의 완전한 데이터셋을 생성하고, 각 데이터셋에서 분석을 수행한 후 결과를 통합합니다. 이를 통해 단일 대체법의 불확실성 과소평가 문제를 해결합니다.',
  },
  {
    id: '8-22',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 22,
    question:
      '결측값 대체 방법으로 KNN(K-Nearest Neighbors) 대체법의 장점으로 가장 적절한 것은?',
    options: [
      '유사한 관측값의 패턴을 반영하여 결측값을 더 정확하게 추정할 수 있다',
      '계산 비용이 매우 낮아 대용량 데이터에 항상 적합하다',
      '모든 변수가 범주형일 때만 사용 가능하다',
      '데이터의 분포를 변형시키지 않는 유일한 대체 방법이다',
    ],
    answer: 1,
    explanation:
      'KNN 대체법은 결측값이 있는 관측치와 가장 유사한 K개의 이웃 관측치를 찾아 그들의 값으로 결측값을 추정합니다. 변수 간의 관계와 패턴을 반영하므로 단순 평균/중앙값 대체보다 정확한 추정이 가능합니다. 다만 대규모 데이터에서 계산 비용이 높을 수 있습니다.',
  },
  {
    id: '8-23',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 23,
    question:
      'IQR(Interquartile Range) 방법을 이용한 이상치 탐지에서, Q1=20, Q3=40일 때 이상치로 판별되는 상한 경계값은?',
    options: ['50', '60', '70', '80'],
    answer: 3,
    explanation:
      'IQR = Q3 - Q1 = 40 - 20 = 20입니다. 이상치 판별을 위한 상한 경계값은 Q3 + 1.5 × IQR = 40 + 1.5 × 20 = 40 + 30 = 70입니다. 따라서 70을 초과하는 값은 이상치로 판별됩니다.',
  },
  {
    id: '8-24',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 24,
    question:
      'Z-score를 이용한 이상치 탐지에서, 일반적으로 이상치로 판단하는 Z-score의 절대값 기준은?',
    options: ['|Z| > 1', '|Z| > 2', '|Z| > 3', '|Z| > 4'],
    answer: 3,
    explanation:
      'Z-score 방법에서는 일반적으로 Z-score의 절대값이 3을 초과하는 경우(|Z| > 3) 이상치로 판단합니다. 이는 정규분포에서 평균으로부터 표준편차의 3배 이상 떨어진 값으로, 전체 데이터의 약 0.3%에 해당합니다.',
  },
  {
    id: '8-25',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 25,
    question:
      'Min-Max 정규화에서 원래 값이 30이고, 최솟값이 10, 최댓값이 50일 때 정규화된 값은?',
    options: ['0.25', '0.6', '0.5', '0.75'],
    answer: 3,
    explanation:
      'Min-Max 정규화 공식은 (X - Min) / (Max - Min)입니다. (30 - 10) / (50 - 10) = 20 / 40 = 0.5입니다. Min-Max 정규화는 데이터를 0~1 범위로 변환하며, 피처의 스케일이 다를 때 유용합니다.',
  },
  {
    id: '8-26',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 26,
    question:
      'Z-score 표준화(Standardization)의 수식으로 올바른 것은?',
    options: [
      '(X - Min) / (Max - Min)',
      'X / Max',
      '(X - 중앙값) / IQR',
      '(X - 평균) / 표준편차',
    ],
    answer: 4,
    explanation:
      'Z-score 표준화는 Z = (X - μ) / σ로 계산합니다. 여기서 μ는 평균, σ는 표준편차입니다. 변환된 데이터는 평균이 0, 표준편차가 1인 표준정규분포를 따르게 됩니다. 이상치에 민감하지 않은 강건한 표준화가 필요한 경우 중앙값과 IQR을 사용할 수 있습니다.',
  },
  {
    id: '8-27',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 27,
    question:
      '원-핫 인코딩(One-Hot Encoding)에 대한 설명으로 가장 옳지 않은 것은?',
    options: [
      '범주형 변수를 이진 벡터로 변환하는 방법이다',
      '범주의 수가 많으면 차원이 크게 증가하는 문제가 있다',
      '연속형 수치 변수에 적용하면 더 좋은 성능을 얻을 수 있다',
      '변환된 변수 간에 순서나 크기 관계가 부여되지 않는다',
    ],
    answer: 3,
    explanation:
      '원-핫 인코딩은 범주형 변수를 이진(0/1) 벡터로 변환하는 방법으로, 연속형 수치 변수에 적용하는 것은 적절하지 않습니다. 연속형 변수는 이미 수치로 표현되어 있으므로 정규화나 표준화가 더 적합한 전처리 방법입니다.',
  },
  {
    id: '8-28',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 28,
    question:
      '피처 스케일링(Feature Scaling)이 필요한 알고리즘으로 가장 적절한 것은?',
    options: [
      '의사결정나무(Decision Tree)',
      'K-최근접 이웃(KNN)',
      '랜덤 포레스트(Random Forest)',
      '규칙 기반 분류(Rule-based Classification)',
    ],
    answer: 2,
    explanation:
      'KNN은 거리 기반 알고리즘으로, 피처의 스케일이 다르면 특정 변수가 거리 계산에 과도한 영향을 미칩니다. 따라서 피처 스케일링이 필수적입니다. 의사결정나무와 랜덤 포레스트는 분할 기준으로 정보 이득이나 지니 불순도를 사용하므로 스케일에 영향을 받지 않습니다.',
  },
  {
    id: '8-29',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 29,
    question: '왜도(Skewness)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '왜도가 0이면 데이터가 완전히 비대칭이다',
      '왜도가 음수이면 분포의 오른쪽 꼬리가 길다',
      '왜도는 데이터의 중심 경향을 측정하는 지표이다',
      '왜도가 양수이면 분포의 오른쪽 꼬리가 길다(Right-skewed)',
    ],
    answer: 4,
    explanation:
      '왜도(Skewness)는 분포의 비대칭 정도를 측정합니다. 왜도가 양수이면 오른쪽 꼬리가 긴 양의 왜도(Right-skewed), 음수이면 왼쪽 꼬리가 긴 음의 왜도(Left-skewed)를 나타냅니다. 왜도가 0이면 대칭 분포를 의미합니다.',
  },
  {
    id: '8-30',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 30,
    question: '첨도(Kurtosis)가 3보다 큰 분포의 특성으로 가장 적절한 것은?',
    options: [
      '정규분포보다 꼬리가 두껍고 중심이 뾰족하다(Leptokurtic)',
      '정규분포보다 꼬리가 얇고 중심이 평평하다',
      '정규분포와 동일한 모양이다',
      '균등분포(Uniform Distribution)와 동일한 형태이다',
    ],
    answer: 1,
    explanation:
      '첨도가 3보다 큰 분포를 첨예(Leptokurtic) 분포라고 하며, 정규분포보다 꼬리가 두껍고 중심이 뾰족한 형태를 갖습니다. 이는 극단값(이상치)이 발생할 확률이 정규분포보다 높음을 의미합니다. 첨도가 3이면 정규분포(Mesokurtic)입니다.',
  },
  {
    id: '8-31',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 31,
    question:
      '베이즈 정리에서 P(A|B) = P(B|A) × P(A) / P(B)일 때, P(A)를 무엇이라 하는가?',
    options: [
      '사후 확률(Posterior Probability)',
      '우도(Likelihood)',
      '사전 확률(Prior Probability)',
      '주변 확률(Marginal Probability)',
    ],
    answer: 3,
    explanation:
      '베이즈 정리에서 P(A)는 사전 확률(Prior Probability)로, 증거(B)를 관찰하기 전에 A가 발생할 확률입니다. P(A|B)는 사후 확률, P(B|A)는 우도(Likelihood), P(B)는 증거(Evidence) 또는 주변 확률입니다.',
  },
  {
    id: '8-32',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 32,
    question: '중심극한정리(Central Limit Theorem)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '모집단이 정규분포를 따를 때만 성립한다',
      '표본의 크기가 작을수록 더 잘 성립한다',
      '표본의 크기가 충분히 크면 표본 평균의 분포는 모집단의 분포와 무관하게 정규분포에 근사한다',
      '모집단의 분산이 무한대여야 성립한다',
    ],
    answer: 3,
    explanation:
      '중심극한정리는 모집단의 분포 형태와 관계없이, 표본의 크기(n)가 충분히 크면(일반적으로 n ≥ 30) 표본 평균의 분포가 정규분포에 근사한다는 정리입니다. 이는 통계적 추론의 기초가 되는 중요한 정리입니다.',
  },
  {
    id: '8-33',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 33,
    question:
      '95% 신뢰구간(Confidence Interval)의 올바른 해석은?',
    options: [
      '모수가 이 구간 안에 있을 확률이 95%이다',
      '데이터의 95%가 이 구간 안에 포함된다',
      '표본 평균이 모평균과 95% 일치한다',
      '동일한 방법으로 100번 구간을 구성하면 약 95번은 모수를 포함한다',
    ],
    answer: 4,
    explanation:
      '95% 신뢰구간의 올바른 해석은 "동일한 방법으로 반복 표본추출하여 신뢰구간을 구성하면 그 중 약 95%가 모수(모평균)를 포함한다"입니다. 특정 구간이 모수를 포함할 확률이 95%라는 해석은 빈도주의 통계학에서는 부정확합니다.',
  },
  {
    id: '8-34',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 34,
    question:
      '데이터 정제(Data Cleansing) 과정에서 중복 데이터 처리 방법으로 가장 적절하지 않은 것은?',
    options: [
      '레코드 간 유사도 기반 매칭을 통해 중복을 식별한다',
      '기본 키(Primary Key)를 활용하여 정확한 중복을 탐지한다',
      '중복 의심 레코드 중 가장 최신이거나 완전한 레코드를 선택한다',
      '중복 데이터는 항상 무조건 모두 삭제하는 것이 최선이다',
    ],
    answer: 4,
    explanation:
      '중복 데이터를 무조건 삭제하면 유효한 데이터까지 손실될 수 있습니다. 올바른 접근은 중복 탐지 후 가장 완전하고 최신인 레코드를 선택하거나, 여러 레코드의 정보를 병합(Merge)하여 하나의 골든 레코드(Golden Record)를 생성하는 것입니다.',
  },
  {
    id: '8-35',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 35,
    question:
      '결측값이 완전 무작위 결측(MCAR, Missing Completely At Random)일 때의 특성으로 가장 적절한 것은?',
    options: [
      '결측 발생이 어떤 변수와도 관련이 없이 완전히 무작위적이다',
      '결측 발생이 관측된 변수의 값에 의존한다',
      '결측 발생이 결측값 자체에 의존한다',
      '결측값은 특정 패턴을 따라 발생한다',
    ],
    answer: 1,
    explanation:
      'MCAR(Missing Completely At Random)은 결측의 발생이 관측된 데이터나 결측된 데이터 어디에도 의존하지 않는 완전 무작위 결측입니다. MAR(Missing At Random)은 관측된 변수에 의존, MNAR(Missing Not At Random)은 결측값 자체에 의존합니다.',
  },
  {
    id: '8-36',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 36,
    question:
      '로버스트 스케일링(Robust Scaling)의 특징으로 가장 적절한 것은?',
    options: [
      '평균과 표준편차를 사용하여 변환한다',
      '중앙값과 IQR을 사용하여 이상치에 강건한 스케일링을 수행한다',
      '최솟값과 최댓값을 사용하여 0~1 범위로 변환한다',
      '로그 변환을 통해 왜도를 줄이는 방법이다',
    ],
    answer: 2,
    explanation:
      '로버스트 스케일링은 (X - 중앙값) / IQR 공식을 사용합니다. 중앙값과 사분위범위(IQR)는 이상치에 영향을 덜 받는 통계량이므로, 이상치가 있는 데이터에도 강건한 스케일링을 수행할 수 있습니다.',
  },
  {
    id: '8-37',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 37,
    question: '탐색적 데이터 분석(EDA)에서 상관분석의 피어슨 상관계수(r)가 -0.85일 때의 해석으로 가장 적절한 것은?',
    options: [
      '두 변수 간에 상관관계가 거의 없다',
      '두 변수 간에 강한 음의 선형 상관관계가 있다',
      '두 변수 간에 강한 양의 선형 상관관계가 있다',
      '두 변수 간에 비선형 관계가 있다',
    ],
    answer: 2,
    explanation:
      '피어슨 상관계수는 -1 ~ 1 범위의 값을 가지며, -0.85는 강한 음의 선형 상관관계를 의미합니다. 일반적으로 |r| ≥ 0.7이면 강한 상관, 0.4 ≤ |r| < 0.7이면 중간 상관, |r| < 0.4이면 약한 상관으로 해석합니다.',
  },
  {
    id: '8-38',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 38,
    question:
      '레이블 인코딩(Label Encoding)과 원-핫 인코딩의 비교 설명으로 가장 적절한 것은?',
    options: [
      '레이블 인코딩은 범주에 순서를 부여하므로 명목형 변수보다 순서형 변수에 더 적합하다',
      '원-핫 인코딩은 레이블 인코딩보다 항상 차원이 적다',
      '레이블 인코딩은 차원의 저주 문제를 일으킨다',
      '두 방법 모두 연속형 변수에만 적용 가능하다',
    ],
    answer: 1,
    explanation:
      '레이블 인코딩은 범주를 정수(0, 1, 2...)로 변환하여 순서 관계를 내포합니다. 따라서 순서형 변수(예: 학력: 초등<중등<고등<대학)에 적합합니다. 명목형 변수(예: 색상: 빨강, 파랑, 녹색)에 레이블 인코딩을 적용하면 모델이 잘못된 순서 관계를 학습할 수 있습니다.',
  },
  {
    id: '8-39',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 39,
    question:
      '결측값을 평균으로 대체하는 방법의 단점으로 가장 적절한 것은?',
    options: [
      '계산이 복잡하여 대규모 데이터에 적용할 수 없다',
      '데이터의 분산을 과소추정하여 변동성을 줄이는 문제가 있다',
      '대체 후 데이터의 평균이 크게 변한다',
      '범주형 변수에만 적용 가능하다',
    ],
    answer: 2,
    explanation:
      '결측값을 평균으로 대체하면 대체된 값들이 모두 같은 값(평균)이 되므로 데이터의 변동성(분산)이 실제보다 줄어듭니다. 이로 인해 표준오차가 과소추정되고 통계적 추론의 정확성이 떨어질 수 있습니다. 이를 보완하기 위해 다중 대체법이나 KNN 대체법을 사용합니다.',
  },
  {
    id: '8-40',
    session: '제8회',
    sessionId: '8',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 40,
    question:
      '베이즈 정리를 활용한 나이브 베이즈 분류기의 핵심 가정으로 가장 적절한 것은?',
    options: [
      '모든 특성(Feature)이 서로 종속적이다',
      '모든 특성이 주어진 클래스에 대해 조건부 독립이다',
      '특성의 분포가 반드시 정규분포를 따라야 한다',
      '학습 데이터와 테스트 데이터의 분포가 반드시 동일해야 한다',
    ],
    answer: 2,
    explanation:
      '나이브 베이즈 분류기의 핵심 가정은 "나이브(Naive)" 가정으로, 모든 특성이 주어진 클래스에 대해 조건부 독립(Conditional Independence)이라고 가정합니다. 이 가정 덕분에 계산이 매우 단순해지며, 실제로는 이 가정이 위반되더라도 좋은 분류 성능을 보이는 경우가 많습니다.',
  },
  // ===== 과목 3: 빅데이터 모델링 (41~60) =====
  {
    id: '8-41',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 41,
    question:
      '다중공선성(Multicollinearity)을 진단하는 VIF(Variance Inflation Factor) 값이 10 이상일 때의 해석으로 가장 적절한 것은?',
    options: [
      '해당 변수는 종속변수와 상관관계가 없다',
      '모델의 예측 성능이 완벽하다',
      '해당 변수와 다른 독립변수 간의 다중공선성이 심각한 수준이다',
      '해당 변수의 회귀계수가 통계적으로 유의미하다',
    ],
    answer: 3,
    explanation:
      'VIF가 10 이상이면 해당 독립변수가 다른 독립변수들에 의해 높은 설명력으로 예측될 수 있어 다중공선성이 심각한 것으로 판단합니다. 다중공선성이 높으면 회귀계수의 추정이 불안정해지고 표준오차가 증가하여 개별 변수의 효과를 정확히 파악하기 어렵습니다.',
  },
  {
    id: '8-42',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 42,
    question:
      '릿지 회귀(Ridge Regression)에 대한 설명으로 가장 적절한 것은?',
    options: [
      'L2 규제를 사용하여 계수의 크기를 축소하지만 0으로 만들지는 않는다',
      'L1 규제를 사용하여 일부 변수의 계수를 정확히 0으로 만든다',
      '규제 항이 없는 일반 최소제곱법(OLS)과 동일하다',
      '비선형 관계만 모델링할 수 있는 방법이다',
    ],
    answer: 1,
    explanation:
      '릿지 회귀는 손실 함수에 L2 규제항(λΣβ²)을 추가하여 회귀계수의 크기를 축소합니다. 계수를 0에 가깝게 줄이지만 정확히 0으로 만들지는 않아 변수 선택 기능은 없습니다. L1 규제를 사용하여 변수를 0으로 만드는 것은 라쏘 회귀입니다.',
  },
  {
    id: '8-43',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 43,
    question:
      '라쏘 회귀(Lasso Regression)의 가장 큰 장점은?',
    options: [
      '다중공선성 문제를 완전히 해결한다',
      '불필요한 변수의 계수를 0으로 만들어 자동 변수 선택(Feature Selection) 기능을 수행한다',
      '항상 릿지 회귀보다 예측 성능이 우수하다',
      '규제 강도 하이퍼파라미터가 필요 없다',
    ],
    answer: 2,
    explanation:
      '라쏘 회귀는 L1 규제(λΣ|β|)를 사용하며, 규제 강도가 충분히 크면 일부 변수의 계수를 정확히 0으로 만들 수 있습니다. 이를 통해 자동 변수 선택(Feature Selection)이 가능하며, 해석 가능한 희소(Sparse) 모델을 생성합니다.',
  },
  {
    id: '8-44',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 44,
    question: '엘라스틱넷(Elastic Net)에 대한 설명으로 가장 적절한 것은?',
    options: [
      'L1 규제만 사용하는 방법이다',
      'L1과 L2 규제를 동시에 결합한 방법이다',
      'L2 규제만 사용하는 방법이다',
      '규제를 사용하지 않는 비선형 회귀 방법이다',
    ],
    answer: 2,
    explanation:
      '엘라스틱넷은 라쏘(L1)와 릿지(L2) 규제를 동시에 결합한 방법입니다. 혼합 비율(α)로 두 규제의 비중을 조절하며, 상관관계가 높은 변수 그룹이 있을 때 라쏘보다 안정적인 변수 선택이 가능합니다.',
  },
  {
    id: '8-45',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 45,
    question:
      'XGBoost의 주요 특징으로 가장 옳지 않은 것은?',
    options: [
      '그래디언트 부스팅 기반의 앙상블 학습 방법이다',
      '과적합 방지를 위한 정규화(Regularization)를 지원한다',
      '병렬 처리를 통해 학습 속도를 향상시킨다',
      '단일 의사결정나무만 사용하므로 해석이 매우 용이하다',
    ],
    answer: 4,
    explanation:
      'XGBoost는 단일 의사결정나무가 아닌 여러 약한 학습기(Weak Learner)를 순차적으로 결합하는 앙상블 방법입니다. 그래디언트 부스팅에 L1/L2 정규화, 결측값 자동 처리, 병렬 처리 등의 기능을 추가하여 성능과 속도를 모두 향상시킨 모델입니다.',
  },
  {
    id: '8-46',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 46,
    question:
      'GBM(Gradient Boosting Machine)에서 학습률(Learning Rate)을 낮추면 나타나는 효과로 가장 적절한 것은?',
    options: [
      '더 적은 수의 트리로 높은 성능을 달성할 수 있다',
      '모델의 편향(Bias)이 크게 증가한다',
      '과적합 위험이 줄어들지만 더 많은 트리가 필요하여 학습 시간이 증가한다',
      '변수 중요도를 계산할 수 없게 된다',
    ],
    answer: 3,
    explanation:
      'GBM에서 학습률을 낮추면 각 트리의 기여도가 작아져 과적합 위험이 줄어듭니다. 그러나 충분한 성능을 달성하기 위해 더 많은 트리가 필요하므로 학습 시간이 증가합니다. 일반적으로 낮은 학습률과 많은 트리 수의 조합이 좋은 성능을 보입니다.',
  },
  {
    id: '8-47',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 47,
    question:
      'CNN(Convolutional Neural Network)에서 합성곱 계층(Convolutional Layer)의 역할로 가장 적절한 것은?',
    options: [
      '입력 데이터의 공간적 특성을 추출하는 필터(커널)를 학습한다',
      '특성맵의 크기를 줄여 계산량을 감소시킨다',
      '추출된 특성을 기반으로 최종 클래스를 분류한다',
      '과적합을 방지하기 위해 뉴런을 무작위로 비활성화한다',
    ],
    answer: 1,
    explanation:
      'CNN의 합성곱 계층은 학습 가능한 필터(커널)를 입력 데이터에 슬라이딩하며 적용하여 에지, 텍스처, 패턴 등의 공간적 특성을 추출합니다. 크기 축소는 풀링 계층, 최종 분류는 완전연결 계층, 뉴런 비활성화는 드롭아웃의 역할입니다.',
  },
  {
    id: '8-48',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 48,
    question: 'CNN에서 풀링(Pooling) 계층의 주요 목적으로 가장 적절한 것은?',
    options: [
      '입력 이미지의 색상을 변환한다',
      '특성맵의 공간적 크기를 줄여 계산량을 감소시키고 위치 불변성을 제공한다',
      '학습 가능한 가중치를 통해 새로운 특성을 생성한다',
      '배치 정규화를 통해 학습 속도를 높인다',
    ],
    answer: 2,
    explanation:
      '풀링 계층은 특성맵의 공간적 크기를 줄여(다운샘플링) 계산량과 파라미터 수를 감소시킵니다. 또한 작은 위치 변화에 대한 불변성(Translation Invariance)을 제공하여 모델의 일반화 성능을 향상시킵니다. 최대 풀링(Max Pooling)과 평균 풀링(Average Pooling)이 대표적입니다.',
  },
  {
    id: '8-49',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 49,
    question:
      'RNN(Recurrent Neural Network)이 일반 신경망과 구분되는 핵심 특성은?',
    options: [
      '합성곱 필터를 사용하여 공간적 특성을 추출한다',
      '입력 데이터의 차원을 축소하는 인코더 구조를 가진다',
      '병렬 처리를 통해 모든 시점의 데이터를 동시에 처리한다',
      '은닉 상태(Hidden State)를 통해 이전 시점의 정보를 현재 시점에 전달한다',
    ],
    answer: 4,
    explanation:
      'RNN은 은닉 상태(Hidden State)를 통해 이전 시점의 정보를 현재 시점으로 전달하는 순환 구조를 가집니다. 이를 통해 시퀀스 데이터(시계열, 텍스트 등)의 순서 정보와 문맥을 학습할 수 있습니다. 그러나 긴 시퀀스에서 기울기 소실 문제가 발생합니다.',
  },
  {
    id: '8-50',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 50,
    question:
      'LSTM(Long Short-Term Memory)이 기본 RNN의 한계를 극복하는 핵심 메커니즘은?',
    options: [
      '게이트(Gate) 구조를 통해 장기 의존성(Long-term Dependency)을 학습한다',
      '합성곱 연산을 추가하여 공간적 특성을 학습한다',
      '학습률을 자동으로 조절하는 옵티마이저를 내장하고 있다',
      '드롭아웃을 기본적으로 적용하여 과적합을 방지한다',
    ],
    answer: 1,
    explanation:
      'LSTM은 입력 게이트(Input Gate), 망각 게이트(Forget Gate), 출력 게이트(Output Gate)와 셀 상태(Cell State)를 통해 기울기 소실 문제를 해결하고 장기 의존성을 효과적으로 학습합니다. 게이트가 어떤 정보를 기억하고 잊을지 제어합니다.',
  },
  {
    id: '8-51',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 51,
    question:
      '시계열 데이터의 정상성(Stationarity) 조건으로 가장 적절하지 않은 것은?',
    options: [
      '시간에 따라 평균이 일정하다',
      '시간에 따라 분산이 일정하다',
      '공분산이 시차에만 의존하고 시점에는 의존하지 않는다',
      '시간에 따라 평균이 선형적으로 증가한다',
    ],
    answer: 4,
    explanation:
      '정상 시계열의 조건은 평균이 일정하고, 분산이 일정하며, 자기공분산이 시차(lag)에만 의존하는 것입니다. 평균이 시간에 따라 선형적으로 증가하는 것은 추세(Trend)가 있는 비정상 시계열의 특성입니다. 차분(Differencing)으로 추세를 제거하여 정상성을 확보합니다.',
  },
  {
    id: '8-52',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 52,
    question: 'TF-IDF에서 IDF(Inverse Document Frequency)의 역할로 가장 적절한 것은?',
    options: [
      '문서 내 단어의 출현 빈도를 높인다',
      '문서의 길이를 정규화한다',
      '모든 문서에 공통으로 나타나는 일반적인 단어의 가중치를 낮춘다',
      '단어 간의 유사도를 측정한다',
    ],
    answer: 3,
    explanation:
      'IDF는 특정 단어가 전체 문서 중 얼마나 많은 문서에 등장하는지의 역수(로그)입니다. 많은 문서에 등장하는 일반적인 단어(예: "the", "is")의 가중치를 낮추고, 소수 문서에만 등장하는 특징적인 단어의 가중치를 높여 단어의 변별력을 반영합니다.',
  },
  {
    id: '8-53',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 53,
    question: 'Word2Vec의 학습 방식에 해당하지 않는 것은?',
    options: [
      'CBOW(Continuous Bag of Words)',
      'Skip-gram',
      'Autoregressive Language Model',
      'Negative Sampling',
    ],
    answer: 3,
    explanation:
      'Word2Vec의 학습 방식은 주변 단어로 중심 단어를 예측하는 CBOW와 중심 단어로 주변 단어를 예측하는 Skip-gram입니다. Negative Sampling은 학습 효율을 높이기 위한 최적화 기법입니다. Autoregressive Language Model은 GPT 등 자기회귀 모델의 방식으로 Word2Vec과는 다릅니다.',
  },
  {
    id: '8-54',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 54,
    question:
      'PCA(주성분분석)에서 고유값(Eigenvalue)이 의미하는 것으로 가장 적절한 것은?',
    options: [
      '각 주성분이 설명하는 분산의 크기',
      '원본 데이터의 평균값',
      '데이터 포인트 간의 유클리드 거리',
      '주성분의 방향을 나타내는 벡터',
    ],
    answer: 1,
    explanation:
      'PCA에서 고유값은 해당 주성분(고유벡터 방향)이 설명하는 분산의 크기를 나타냅니다. 고유값이 클수록 해당 주성분이 데이터의 변동성을 더 많이 설명합니다. 주성분의 방향은 고유벡터(Eigenvector)가 나타냅니다.',
  },
  {
    id: '8-55',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 55,
    question:
      '오토인코더(Autoencoder)의 구조에 대한 설명으로 가장 적절한 것은?',
    options: [
      '인코더와 디코더로 구성되며, 입력을 압축한 후 복원하는 비지도 학습 모델이다',
      '입력 데이터를 분류하기 위한 지도 학습 전용 모델이다',
      '강화 학습을 통해 최적의 행동 정책을 학습하는 모델이다',
      '인코더만 존재하며 데이터를 일방향으로만 변환한다',
    ],
    answer: 1,
    explanation:
      '오토인코더는 인코더(입력을 저차원 잠재 공간으로 압축)와 디코더(잠재 표현에서 원본을 복원)로 구성된 비지도 학습 모델입니다. 차원 축소, 이상 탐지, 노이즈 제거 등에 활용되며, 잠재 공간의 표현이 데이터의 핵심 특성을 학습합니다.',
  },
  {
    id: '8-56',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 56,
    question:
      '드롭아웃(Dropout) 규제 기법에 대한 설명으로 가장 적절한 것은?',
    options: [
      '학습 시 무작위로 일부 뉴런을 비활성화하여 과적합을 방지한다',
      '가중치의 크기에 페널티를 부여하여 모델 복잡도를 줄인다',
      '학습 데이터를 증강하여 모델의 일반화 성능을 높인다',
      '조기 종료(Early Stopping)를 자동으로 수행한다',
    ],
    answer: 1,
    explanation:
      '드롭아웃은 학습 과정에서 매 반복마다 무작위로 일부 뉴런의 출력을 0으로 설정(비활성화)하여 특정 뉴런에 대한 과도한 의존을 방지합니다. 이는 앙상블 효과를 내어 과적합을 줄이고 일반화 성능을 향상시킵니다. 추론(테스트) 시에는 드롭아웃을 적용하지 않습니다.',
  },
  {
    id: '8-57',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 57,
    question:
      '시계열 분석에서 ADF(Augmented Dickey-Fuller) 검정의 목적으로 가장 적절한 것은?',
    options: [
      '시계열 데이터의 계절성을 탐지한다',
      '시계열 데이터의 정상성(단위근 존재 여부)을 검정한다',
      '시계열 데이터의 자기상관 함수를 추정한다',
      '시계열 데이터의 최적 ARIMA 모형 차수를 결정한다',
    ],
    answer: 2,
    explanation:
      'ADF 검정은 시계열 데이터에 단위근(Unit Root)이 존재하는지를 검정하여 정상성을 판단합니다. 귀무가설은 "단위근이 존재한다(비정상)"이며, p-value가 유의수준보다 작으면 귀무가설을 기각하여 정상 시계열로 판단합니다.',
  },
  {
    id: '8-58',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 58,
    question:
      'PCA를 수행할 때 주성분의 수를 결정하는 기준으로 가장 적절한 것은?',
    options: [
      '고유값이 0인 주성분까지 모두 선택한다',
      '누적 설명 분산 비율이 일정 수준(예: 80~90%) 이상이 되는 주성분 수를 선택한다',
      '원본 데이터의 변수 수와 동일하게 선택한다',
      '항상 2개의 주성분만 선택한다',
    ],
    answer: 2,
    explanation:
      'PCA에서 주성분 수 결정 시 누적 설명 분산 비율(Cumulative Explained Variance Ratio)이 80~90% 이상이 되는 지점까지의 주성분을 선택합니다. 스크리 플롯(Scree Plot)에서 고유값이 급격히 감소하는 팔꿈치(Elbow) 지점을 참고하기도 합니다.',
  },
  {
    id: '8-59',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 59,
    question:
      'TF-IDF 값이 높은 단어의 특성으로 가장 적절한 것은?',
    options: [
      '모든 문서에서 골고루 높은 빈도로 등장하는 단어이다',
      '특정 문서에서 빈도가 높으면서 다른 문서에서는 드물게 등장하는 단어이다',
      '문서 내 출현 빈도가 매우 낮은 단어이다',
      '불용어(Stop Words)에 해당하는 단어이다',
    ],
    answer: 2,
    explanation:
      'TF-IDF는 TF(단어 빈도)와 IDF(역문서 빈도)의 곱으로, 특정 문서에서 자주 등장하면서(높은 TF) 전체 문서에서는 드물게 등장할수록(높은 IDF) 높은 값을 가집니다. 이러한 단어는 해당 문서를 대표하는 핵심 키워드일 가능성이 높습니다.',
  },
  {
    id: '8-60',
    session: '제8회',
    sessionId: '8',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 60,
    question:
      '배치 정규화(Batch Normalization)의 효과로 가장 적절하지 않은 것은?',
    options: [
      '내부 공변량 변화(Internal Covariate Shift)를 줄여 학습을 안정화한다',
      '더 높은 학습률을 사용할 수 있게 하여 학습 속도를 향상시킨다',
      '약간의 규제 효과를 가져 드롭아웃의 필요성을 줄일 수 있다',
      '모델의 파라미터 수를 대폭 줄여 모델 경량화에 기여한다',
    ],
    answer: 4,
    explanation:
      '배치 정규화는 학습 안정화, 빠른 수렴, 높은 학습률 허용, 약한 규제 효과 등의 장점이 있지만, 오히려 정규화를 위한 추가 파라미터(γ, β)가 필요하므로 파라미터 수를 줄이는 것은 아닙니다. 모델 경량화와는 직접적인 관련이 없습니다.',
  },
  // ===== 과목 4: 빅데이터 결과 해석 (61~80) =====
  {
    id: '8-61',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 61,
    question:
      '제1종 오류(Type I Error)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '귀무가설이 거짓인데 기각하지 못하는 오류',
      '귀무가설이 참인데 기각하는 오류',
      '대립가설이 참인데 채택하는 것',
      '표본 크기가 부족하여 발생하는 오류',
    ],
    answer: 2,
    explanation:
      '제1종 오류(α 오류)는 귀무가설(H₀)이 실제로 참인데 이를 기각하는 오류입니다. 예를 들어 효과가 없는 약을 효과가 있다고 판단하는 경우입니다. 유의수준(α)은 제1종 오류의 최대 허용 확률을 의미합니다.',
  },
  {
    id: '8-62',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 62,
    question:
      '제2종 오류(Type II Error)를 줄이기 위한 방법으로 가장 적절한 것은?',
    options: [
      '유의수준(α)을 낮춘다',
      '신뢰구간을 넓힌다',
      '표본 크기를 늘려 검정력(Power)을 높인다',
      '귀무가설을 변경한다',
    ],
    answer: 3,
    explanation:
      '제2종 오류(β 오류)는 귀무가설이 거짓인데 기각하지 못하는 오류입니다. 검정력(1-β)을 높이면 제2종 오류가 줄어들며, 표본 크기를 늘리는 것이 가장 효과적인 방법입니다. 유의수준을 낮추면 오히려 제2종 오류가 증가할 수 있습니다.',
  },
  {
    id: '8-63',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 63,
    question:
      '이진 분류에서 민감도(Sensitivity, Recall)의 정의로 올바른 것은?',
    options: [
      'TP / (TP + FP)',
      'TN / (TN + FP)',
      '(TP + TN) / (TP + TN + FP + FN)',
      'TP / (TP + FN)',
    ],
    answer: 4,
    explanation:
      '민감도(Sensitivity, Recall, True Positive Rate)는 TP / (TP + FN)으로, 실제 양성(Positive) 중 모델이 올바르게 양성으로 예측한 비율입니다. 질병 진단에서 실제 환자 중 양성으로 정확히 판별한 비율을 의미합니다.',
  },
  {
    id: '8-64',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 64,
    question: '특이도(Specificity)의 정의로 올바른 것은?',
    options: [
      'TP / (TP + FN)',
      'TN / (TN + FP)',
      'TP / (TP + FP)',
      'TN / (TN + FN)',
    ],
    answer: 2,
    explanation:
      '특이도(Specificity, True Negative Rate)는 TN / (TN + FP)로, 실제 음성(Negative) 중 모델이 올바르게 음성으로 예측한 비율입니다. 질병 진단에서 건강한 사람을 정확히 음성으로 판별한 비율을 의미합니다.',
  },
  {
    id: '8-65',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 65,
    question:
      '리프트 차트(Lift Chart)에서 리프트 값이 2.0일 때의 해석으로 가장 적절한 것은?',
    options: [
      '모델이 무작위 선택 대비 2배의 성과를 보인다',
      '모델이 무작위 선택 대비 정확도가 50% 낮다',
      '모델의 정밀도가 정확히 2.0이다',
      '모델의 재현율이 200%이다',
    ],
    answer: 1,
    explanation:
      '리프트(Lift) 값은 모델을 사용한 경우와 무작위로 선택한 경우의 반응률 비율입니다. 리프트 2.0은 모델이 무작위 대비 2배 더 높은 반응률을 보인다는 의미입니다. 리프트가 1보다 크면 모델이 무작위보다 효과적임을 나타냅니다.',
  },
  {
    id: '8-66',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 66,
    question:
      'K-fold 교차 검증에서 K=5일 때의 진행 방법으로 가장 적절한 것은?',
    options: [
      '데이터를 5등분하여 1개를 검증용, 4개를 학습용으로 5회 반복 수행한다',
      '데이터를 5등분하여 1개를 학습용, 4개를 검증용으로 사용한다',
      '전체 데이터에서 무작위로 5개 샘플만 선택하여 검증한다',
      '5개의 서로 다른 모델을 학습하여 앙상블한다',
    ],
    answer: 1,
    explanation:
      '5-fold 교차 검증은 데이터를 5개의 동일 크기 폴드(Fold)로 나누고, 매 반복마다 1개 폴드를 검증 세트, 나머지 4개 폴드를 학습 세트로 사용하여 총 5회 반복합니다. 5회의 성능 지표를 평균하여 모델의 일반화 성능을 추정합니다.',
  },
  {
    id: '8-67',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 67,
    question:
      'Stratified K-fold 교차 검증이 일반 K-fold보다 유리한 상황은?',
    options: [
      '데이터가 매우 큰 경우',
      '클래스 불균형이 심한 분류 문제인 경우',
      '연속형 종속변수를 예측하는 회귀 문제인 경우',
      '피처 수가 매우 적은 경우',
    ],
    answer: 2,
    explanation:
      'Stratified K-fold는 각 폴드의 클래스 비율을 전체 데이터의 클래스 비율과 동일하게 유지합니다. 클래스 불균형이 심한 경우(예: 양성 5%, 음성 95%) 일반 K-fold에서는 일부 폴드에 특정 클래스가 누락될 수 있지만, Stratified K-fold는 이를 방지합니다.',
  },
  {
    id: '8-68',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 68,
    question: '잔차분석에서 잔차의 등분산성(Homoscedasticity) 가정이 위반되었을 때 나타나는 현상은?',
    options: [
      '잔차 플롯에서 잔차가 일정한 띠 형태를 보인다',
      '잔차가 항상 0의 값을 가진다',
      '잔차의 평균이 0이 아닌 값을 가진다',
      '잔차 플롯에서 잔차의 분산이 예측값에 따라 변하는 깔때기 형태를 보인다',
    ],
    answer: 4,
    explanation:
      '등분산성이 위반되면(이분산성, Heteroscedasticity) 잔차 플롯에서 예측값이 커질수록 잔차의 분산이 증가하거나 감소하는 깔때기(Funnel) 형태가 나타납니다. 이 경우 가중최소제곱법(WLS)이나 로그 변환 등을 적용할 수 있습니다.',
  },
  {
    id: '8-69',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 69,
    question:
      '결정계수(R²)가 0.85일 때의 해석으로 가장 적절한 것은?',
    options: [
      '모델이 종속변수 변동의 85%를 설명한다',
      '모델의 정확도가 85%이다',
      '독립변수와 종속변수의 상관계수가 0.85이다',
      '잔차의 평균이 0.85이다',
    ],
    answer: 1,
    explanation:
      '결정계수(R²)는 회귀 모델이 종속변수의 총 변동 중 설명할 수 있는 비율을 나타냅니다. R²=0.85는 모델이 종속변수 변동의 85%를 독립변수로 설명할 수 있음을 의미합니다. 나머지 15%는 모델이 설명하지 못하는 변동입니다.',
  },
  {
    id: '8-70',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 70,
    question:
      '조정 R²(Adjusted R²)가 R²보다 유용한 이유로 가장 적절한 것은?',
    options: [
      '독립변수가 추가될 때 설명력 향상 여부를 반영하여 불필요한 변수 추가에 페널티를 부여한다',
      '항상 R²보다 값이 크므로 모델 성능을 더 잘 보여준다',
      '비선형 모델에서만 사용 가능하다',
      '표본 크기에 영향을 받지 않는다',
    ],
    answer: 1,
    explanation:
      '조정 R²는 독립변수 수를 고려하여 R²에 페널티를 부여합니다. R²는 독립변수를 추가하면 무조건 증가하지만, 조정 R²는 설명력을 실질적으로 향상시키지 않는 변수가 추가되면 오히려 감소합니다. 이를 통해 적절한 변수 선택에 도움을 줍니다.',
  },
  {
    id: '8-71',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 71,
    question:
      'MSE(Mean Squared Error)와 RMSE(Root Mean Squared Error)의 관계로 가장 적절한 것은?',
    options: [
      'RMSE = MSE²',
      'RMSE = √MSE',
      'RMSE = MSE / n',
      'RMSE = 1 / MSE',
    ],
    answer: 2,
    explanation:
      'RMSE는 MSE에 제곱근을 취한 값(RMSE = √MSE)입니다. MSE는 오차의 제곱 평균이므로 원래 단위의 제곱 단위를 가지지만, RMSE는 제곱근을 통해 원래 종속변수와 동일한 단위를 가지므로 해석이 직관적입니다.',
  },
  {
    id: '8-72',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 72,
    question: 'MAE(Mean Absolute Error)의 특성으로 가장 적절한 것은?',
    options: [
      '이상치(Outlier)에 MSE보다 더 민감하다',
      '항상 MSE보다 값이 크다',
      '오차의 절대값 평균으로, 이상치에 MSE보다 덜 민감하다',
      '음수 값을 가질 수 있다',
    ],
    answer: 3,
    explanation:
      'MAE는 오차의 절대값 평균(Σ|y - ŷ| / n)으로, MSE처럼 오차를 제곱하지 않기 때문에 이상치에 덜 민감합니다. MSE는 큰 오차에 제곱으로 더 큰 페널티를 부여하므로 이상치에 더 민감합니다. MAE는 항상 0 이상의 값을 가집니다.',
  },
  {
    id: '8-73',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 73,
    question:
      '편향-분산 트레이드오프(Bias-Variance Tradeoff)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '모델 복잡도를 높이면 편향은 감소하지만 분산은 증가하는 경향이 있다',
      '모델 복잡도를 높이면 편향과 분산이 모두 감소한다',
      '편향과 분산은 서로 독립적이므로 동시에 최소화할 수 있다',
      '편향이 높은 모델은 항상 분산도 높다',
    ],
    answer: 1,
    explanation:
      '편향-분산 트레이드오프는 모델 복잡도가 증가하면 편향(Bias)은 감소하지만 분산(Variance)은 증가하고, 복잡도가 감소하면 반대가 되는 관계를 의미합니다. 최적의 모델은 편향과 분산의 합(총 오차)이 최소화되는 지점에서 달성됩니다.',
  },
  {
    id: '8-74',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 74,
    question:
      '과적합(Overfitting)의 특성으로 가장 적절한 것은?',
    options: [
      '학습 데이터와 테스트 데이터 모두에서 성능이 낮다',
      '모델이 너무 단순하여 데이터의 패턴을 학습하지 못한다',
      '학습 데이터에서 성능이 높지만 테스트 데이터에서 성능이 크게 떨어진다',
      '편향(Bias)이 높고 분산(Variance)이 낮은 상태이다',
    ],
    answer: 3,
    explanation:
      '과적합은 모델이 학습 데이터의 노이즈까지 학습하여 학습 데이터에서는 높은 성능을 보이지만 새로운 데이터(테스트 데이터)에서는 성능이 크게 떨어지는 현상입니다. 낮은 편향, 높은 분산의 특성을 가지며, 규제, 드롭아웃, 조기 종료 등으로 방지합니다.',
  },
  {
    id: '8-75',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 75,
    question:
      '변수 중요도(Feature Importance)를 측정하는 방법으로 가장 적절하지 않은 것은?',
    options: [
      '트리 기반 모델에서 불순도 감소량을 기반으로 측정',
      '순열 중요도(Permutation Importance)로 변수 값을 무작위로 섞어 성능 변화를 측정',
      'SHAP 값을 통해 각 변수의 기여도를 측정',
      '변수의 알파벳 순서에 따라 중요도를 부여',
    ],
    answer: 4,
    explanation:
      '변수의 알파벳 순서는 변수 중요도와 아무런 관련이 없습니다. 변수 중요도 측정 방법으로는 트리 모델의 불순도 감소 기반 중요도, 순열 중요도(변수 값을 섞었을 때 성능 저하 정도), SHAP 값 등이 사용됩니다.',
  },
  {
    id: '8-76',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 76,
    question:
      'SHAP(SHapley Additive exPlanations)의 특성으로 가장 적절한 것은?',
    options: [
      '모델에 독립적으로 적용할 수 없는 모델 특화 기법이다',
      '전역적(Global) 해석만 가능하고 개별 예측의 해석은 불가능하다',
      '게임 이론의 샤플리 값에 기반하여 각 특성의 예측 기여도를 공정하게 분배한다',
      '선형 모델에서만 사용할 수 있다',
    ],
    answer: 3,
    explanation:
      'SHAP은 게임 이론의 샤플리 값(Shapley Value)에 기반하여 각 특성이 개별 예측에 기여하는 정도를 공정하게 분배합니다. 모델에 독립적(Model-agnostic)으로 적용 가능하며, 개별 예측의 지역적(Local) 해석과 전체 모델의 전역적(Global) 해석을 모두 제공합니다.',
  },
  {
    id: '8-77',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 77,
    question:
      'LIME(Local Interpretable Model-agnostic Explanations)에 대한 설명으로 가장 적절한 것은?',
    options: [
      '모델 전체의 전역적 해석을 주로 제공한다',
      '신경망 모델에서만 사용 가능하다',
      '학습 과정에서 모델의 가중치를 직접 조정한다',
      '개별 예측 주변에서 해석 가능한 단순 모델(예: 선형 모델)을 학습하여 지역적 해석을 제공한다',
    ],
    answer: 4,
    explanation:
      'LIME은 설명하고자 하는 개별 예측 주변에서 입력을 미세하게 변형한 데이터를 생성하고, 이를 통해 해석 가능한 단순 모델(예: 선형 회귀)을 학습하여 지역적(Local) 해석을 제공합니다. 어떤 블랙박스 모델에도 적용 가능한 Model-agnostic 방법입니다.',
  },
  {
    id: '8-78',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 78,
    question:
      '잔차분석에서 잔차의 정규성(Normality) 검정에 사용되는 방법으로 가장 적절한 것은?',
    options: [
      'VIF 검정',
      'ADF 검정',
      'Granger 인과 검정',
      'Shapiro-Wilk 검정',
    ],
    answer: 4,
    explanation:
      'Shapiro-Wilk 검정은 데이터가 정규분포를 따르는지 검정하는 대표적인 방법으로, 잔차의 정규성 가정을 확인하는 데 사용됩니다. Q-Q Plot(분위수-분위수 도표)을 시각적으로 확인하는 방법도 함께 사용됩니다. VIF는 다중공선성, ADF는 정상성, Granger는 인과관계 검정입니다.',
  },
  {
    id: '8-79',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 79,
    question:
      'F1 Score에 대한 설명으로 가장 적절한 것은?',
    options: [
      '정확도(Accuracy)와 동일한 지표이다',
      '정밀도와 재현율의 조화 평균으로, 두 지표의 균형을 반영한다',
      '정밀도(Precision)와 재현율(Recall)의 산술 평균이다',
      'ROC 곡선 아래의 면적(AUC)과 동일한 지표이다',
    ],
    answer: 2,
    explanation:
      'F1 Score는 정밀도(Precision)와 재현율(Recall)의 조화 평균으로, F1 = 2 × (Precision × Recall) / (Precision + Recall)입니다. 조화 평균은 두 값 중 작은 값에 더 큰 가중치를 두므로, 정밀도와 재현율이 모두 높아야 F1 Score가 높습니다.',
  },
  {
    id: '8-80',
    session: '제8회',
    sessionId: '8',
    subject: 4,
    subjectName: '빅데이터 결과 해석',
    number: 80,
    question:
      '과소적합(Underfitting)을 해결하기 위한 방법으로 가장 적절한 것은?',
    options: [
      '규제(Regularization) 강도를 높인다',
      '모델의 복잡도를 높이거나 더 많은 특성을 추가한다',
      '학습 데이터의 크기를 줄인다',
      '드롭아웃 비율을 높인다',
    ],
    answer: 2,
    explanation:
      '과소적합은 모델이 너무 단순하여 학습 데이터의 패턴조차 충분히 학습하지 못하는 상태입니다. 이를 해결하기 위해 모델 복잡도를 높이거나(더 많은 레이어, 노드 추가), 더 유용한 특성을 추가하거나, 규제 강도를 낮추는 등의 방법을 사용합니다.',
  },
];
