import { describe, it, expect } from 'vitest';
import type { ConceptCard } from '@/types';
import { buildTermQuiz } from '@/lib/termQuiz';

function card(id: string, topic: string, term: string, summary = `${id} 카드의 설명 문장`): ConceptCard {
  return { id, topic, term, summary, importance: 2 };
}

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

const CARDS: ConceptCard[] = [
  card('stem', '2.2.3.3', '어간 추출(Stemming)', 'stemming은 단어의 접사를 떼어 어간만 남기는 처리로, 어간추출 결과는 사전에 없는 형태일 수 있다.'),
  card('lemma', '2.2.3.3', '표제어 추출(Lemmatization)', '품사 정보를 이용해 단어를 사전에 있는 기본형으로 바꾸는 처리'),
  card('stop', '2.2.3.3', '불용어(Stopword)', '분석에 의미가 거의 없어 제거하는 조사·관사 같은 단어'),
  card('token', '2.2.3.3', '토큰화(Tokenization)', '문장을 분석 단위로 쪼개는 전처리'),
  card('moran', '2.2.3.1', '공간 자기상관', '가까운 지역끼리 값이 비슷하게 나타나는 성질'),
  card('splom', '2.2.3.2', '산점도 행렬', '여러 변수 쌍의 산점도를 격자로 배치한 그림'),
  card('mice', '2.1.1.2', '다중 대치법', '결측값을 여러 번 대치하고 결과를 결합하는 방법'),
  card('ols', '3.1.1.1', '최소제곱법', '잔차 제곱합을 최소로 하는 회귀계수 추정 방법'),
];

const termOf = (id: string): string => CARDS.find(c => c.id === id)?.term ?? '';

describe('buildTermQuiz — prompt masking', () => {
  it('masks the term, its Korean base and its alias, ignoring case and spacing', () => {
    const [item] = buildTermQuiz(CARDS, 1, 1, { cardIds: ['stem'] });
    expect(item.prompt).toBe('○○은 단어의 접사를 떼어 어간만 남기는 처리로, ○○ 결과는 사전에 없는 형태일 수 있다.');
    expect(item).toMatchObject({ cardId: 'stem', topic: '2.2.3.3' });
  });

  it('reads a term next to its alias as one blank', () => {
    const [item] = buildTermQuiz([card('s', '2.2.3.3', 'Stemming(어간 추출)', '어간 추출 (stemming)은 접사를 떼어 내는 처리')], 1, 1);
    expect(item.prompt).toBe('○○은 접사를 떼어 내는 처리');
  });

  it('masks ASCII terms only as whole words', () => {
    const [item] = buildTermQuiz([card('ai', '1.2.2.1', 'AI', 'domain 지식을 학습해 사람처럼 추론하는 AI 기술 전반')], 1, 1);
    expect(item.prompt).toBe('domain 지식을 학습해 사람처럼 추론하는 ○○ 기술 전반');
    expect(item.options).toEqual(['AI']);
    expect(item.answer).toBe(1);
  });

  it('skips cards without a usable summary but still uses them as distractors', () => {
    const cards = [
      card('e1', '2.2.3.3', '불용어', '  '),
      card('e2', '2.2.3.3', 'Stopword', 'Stopword'),
      card('e3', '2.2.3.3', 'TF-IDF', '문서 안 단어 빈도와 역문서 빈도를 곱한 가중치'),
    ];
    const quiz = buildTermQuiz(cards, 1, 10);
    expect(quiz.map(i => i.cardId)).toEqual(['e3']);
    expect([...quiz[0].options].sort()).toEqual(['Stopword', 'TF-IDF', '불용어'].sort()); // pool too small → 3 options
  });
});

describe('buildTermQuiz — options', () => {
  it('gives 4 distinct options with the answer pointing at the card term', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const item of buildTermQuiz(CARDS, seed, 100)) {
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options.map(normalize)).size).toBe(4);
        expect(item.options[item.answer - 1]).toBe(termOf(item.cardId));
      }
    }
  });

  it('draws distractors from the same 세세항목 first', () => {
    const [item] = buildTermQuiz(CARDS, 1, 1, { cardIds: ['stem'] });
    expect([...item.options].sort()).toEqual(['stem', 'lemma', 'stop', 'token'].map(termOf).sort());
  });

  it('falls back to the same 세부항목, then the same subject, then other subjects', () => {
    const tiered = [
      card('a', '1.1.1.1', '빅데이터 5V'),
      card('b', '1.1.1.1', '가트너 3V'),
      card('c', '1.1.1.2', '데이터 가치 측정'),
      card('d', '1.3.1.1', '분석 로드맵'),
      card('e', '1.3.1.2', '하향식 접근법'),
      card('f', '4.1.1.1', '혼동행렬'),
    ];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const [item] = buildTermQuiz(tiered, seed, 1, { cardIds: ['a'] });
      expect(item.options).toContain('가트너 3V');
      expect(item.options).toContain('데이터 가치 측정');
      expect(item.options.filter(o => o === '분석 로드맵' || o === '하향식 접근법')).toHaveLength(1);
      expect(item.options).not.toContain('혼동행렬');
    }
    // 'ols' is alone in subject 3, so distractors come from other subjects rather than leaving 1 option
    const [ols] = buildTermQuiz(CARDS, 1, 1, { cardIds: ['ols'] });
    expect(ols.options).toHaveLength(4);
  });

  it('never offers the same term twice or an alias of the answer', () => {
    const cards = [
      card('k1', '3.1.1.7', 'K-means', '중심점과의 거리로 데이터를 k개 그룹으로 나누는 비계층적 군집 방법'),
      card('k2', '3.1.1.7', 'k-means '),
      card('k3', '3.1.1.7', 'K-평균(K-Means)'),
      card('h1', '3.1.1.7', '계층적 군집'),
      card('h2', '3.1.1.7', 'DBSCAN'),
      card('h3', '3.1.1.7', '계층적  군집'),
      card('h4', '3.1.1.7', '자기조직화지도(SOM)'),
    ];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const [item] = buildTermQuiz(cards, seed, 1, { cardIds: ['k1'] });
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options.map(normalize)).size).toBe(4);
      expect(item.options.filter(o => normalize(o) === 'k-means')).toEqual(['K-means']);
      expect(item.options).not.toContain('K-평균(K-Means)');
      expect(item.options[item.answer - 1]).toBe('K-means');
    }
    // one quiz item per normalized term: k1/k2 and h1/h3 collapse
    const quiz = buildTermQuiz(cards, 1, 10, { topicPrefix: '3.1.1' });
    const asked = quiz.map(i => normalize(cards.find(c => c.id === i.cardId)?.term ?? ''));
    expect(quiz).toHaveLength(5);
    expect(new Set(asked).size).toBe(5);
  });
});

describe('buildTermQuiz — selection', () => {
  it('is deterministic for the seed', () => {
    expect(buildTermQuiz(CARDS, 7, 5)).toEqual(buildTermQuiz(CARDS, 7, 5));
    expect(JSON.stringify(buildTermQuiz(CARDS, 7, 8))).not.toBe(JSON.stringify(buildTermQuiz(CARDS, 8, 8)));
  });

  it('respects the count', () => {
    expect(buildTermQuiz(CARDS, 1, 0)).toEqual([]);
    expect(buildTermQuiz(CARDS, 1, 3)).toHaveLength(3);
    expect(buildTermQuiz(CARDS, 1, 100)).toHaveLength(CARDS.length);
  });

  it('filters by topic prefix (no sibling-number matches) and by card ids', () => {
    const withSibling = [...CARDS, card('fake', '2.2.30.1', '가짜 용어')];
    const sub = buildTermQuiz(withSibling, 1, 100, { topicPrefix: '2.2.3' });
    expect(sub.map(i => i.cardId).sort()).toEqual(['lemma', 'moran', 'splom', 'stem', 'stop', 'token']);
    const both = buildTermQuiz(CARDS, 1, 100, { topicPrefix: '2.2.3', cardIds: ['stem', 'mice'] });
    expect(both.map(i => i.cardId)).toEqual(['stem']);
  });
});
