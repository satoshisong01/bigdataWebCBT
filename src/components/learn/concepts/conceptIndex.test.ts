import { describe, it, expect } from 'vitest';
import type { ConceptCard } from '@/types';
import {
  buildSearchIndex,
  cardsByIds,
  countCardsByNode,
  countStudied,
  groupCardsByLeaf,
  hasStat,
  levelLabel,
  nextStudyTopic,
  searchCards,
  statOf,
  topicAncestors,
  topicChildren,
  topicDepth,
} from './conceptIndex';

function card(id: string, topic: string, extra: Partial<ConceptCard> = {}): ConceptCard {
  return { id, topic, term: `용어${id}`, summary: `${id} 설명`, importance: 2, ...extra };
}

const A = card('a', '1.1.1.1', { term: '3V', summary: '규모·다양성·속도로 설명한다.' });
const B = card('b', '1.1.1.2', { term: '데이터 가치', summary: '측정이 어렵다.', points: ['재사용', '융합'] });
const C = card('c', '3.1.1.4', { term: '인공신경망(ANN)', summary: '뉴런을 모사한 모델', points: ['역전파'] });
const D = card('d', '3.1.1.4', { term: '활성화 함수', summary: '시그모이드 등 비선형 변환으로 가치 있는 표현을 만든다.' });
const E = card('e', '3.1.10.1', { term: '고아 카드' }); // not a real 세세항목
const CARDS: readonly ConceptCard[] = [A, B, C, D, E];
const STAT = { srs: { box: 1, due: '2026-10-30' }, n: 1, again: 0, last: '2026-10-29T00:00:00.000Z' };

describe('criteria helpers', () => {
  it('lists ancestors, depth and level labels', () => {
    expect(topicAncestors('3.1.1.4')).toEqual(['3', '3.1', '3.1.1', '3.1.1.4']);
    expect(topicDepth('3')).toBe(1);
    expect(topicDepth('3.1.1.4')).toBe(4);
    expect(levelLabel('3')).toBe('과목');
    expect(levelLabel('3.1')).toBe('주요항목');
    expect(levelLabel('3.1.1')).toBe('세부항목');
    expect(levelLabel('3.1.1.4')).toBe('세세항목');
  });

  it('returns direct children only', () => {
    expect(topicChildren('1').map(n => n.id)).toEqual(['1.1', '1.2', '1.3', '1.4']);
    expect(topicChildren('1.1.1').map(n => n.name)).toEqual([
      '빅데이터의 특징',
      '빅데이터의 가치',
      '빅데이터 산업환경',
      '빅데이터 조직 및 인력',
    ]);
    expect(topicChildren('1.1.1.1')).toEqual([]);
    expect(topicChildren('9')).toEqual([]);
  });
});

describe('countCardsByNode', () => {
  it('counts each card once per ancestor, with studied = has CStat', () => {
    const counts = countCardsByNode(CARDS, { a: STAT, c: STAT });
    expect(counts.get('1')).toEqual({ total: 2, studied: 1 });
    expect(counts.get('1.1.1.2')).toEqual({ total: 1, studied: 0 });
    expect(counts.get('3.1.1')).toEqual({ total: 2, studied: 1 });
    expect(counts.get('3.1')).toEqual({ total: 3, studied: 1 });
    expect(counts.get('2')).toBeUndefined();
    expect(countStudied(CARDS, { a: STAT, c: STAT })).toBe(2);
  });

  it('ignores inherited object keys', () => {
    expect(hasStat({}, 'toString')).toBe(false);
    expect(hasStat({ a: STAT }, 'a')).toBe(true);
    expect(statOf({ a: STAT }, 'a')).toBe(STAT);
    expect(statOf<typeof STAT>({}, 'constructor')).toBeUndefined();
  });
});

describe('groupCardsByLeaf', () => {
  it('groups by 세세항목 in criteria order, unknown topics last', () => {
    const groups = groupCardsByLeaf([E, D, B, C, A], '1');
    expect(groups.map(g => g.id)).toEqual(['1.1.1.1', '1.1.1.2']);
    const modeling = groupCardsByLeaf([E, D, B, C, A], '3.1');
    expect(modeling.map(g => [g.id, g.cards.map(c => c.id)])).toEqual([
      ['3.1.1.4', ['d', 'c']],
      ['3.1.10.1', ['e']],
    ]);
    expect(modeling[0].name).toBe('인공신경망');
  });

  it('does not treat 3.1.10.x as part of 3.1.1', () => {
    expect(groupCardsByLeaf(CARDS, '3.1.1').map(g => g.id)).toEqual(['3.1.1.4']);
    expect(groupCardsByLeaf(CARDS, '4')).toEqual([]);
  });
});

describe('searchCards', () => {
  const index = buildSearchIndex(CARDS);

  it('matches term, summary and points ignoring case and spaces', () => {
    expect(searchCards(index, 'ann').map(c => c.id)).toEqual(['c']);
    expect(searchCards(index, '인공 신경망').map(c => c.id)).toEqual(['c']);
    expect(searchCards(index, '역전파').map(c => c.id)).toEqual(['c']);
    expect(searchCards(index, '  ')).toEqual([]);
    expect(searchCards(index, '없는말')).toEqual([]);
  });

  it('ranks exact term, then term, then summary, then points', () => {
    const extra = buildSearchIndex([
      card('p', '1.1.1.1', { term: '기타', summary: '...', points: ['가치 사슬'] }),
      D,
      B,
      card('x', '1.1.1.1', { term: '가치' }),
    ]);
    expect(searchCards(extra, '가치').map(c => c.id)).toEqual(['x', 'b', 'd', 'p']);
  });
});

describe('cardsByIds / nextStudyTopic', () => {
  it('keeps id order and skips unknown ids', () => {
    expect(cardsByIds(CARDS, ['d', 'zzz', 'a']).map(c => c.id)).toEqual(['d', 'a']);
  });

  it('suggests the first 세부항목 with unstudied cards', () => {
    expect(nextStudyTopic(CARDS, {})).toEqual({ id: '1.1.1', name: '빅데이터 개요 및 활용' });
    expect(nextStudyTopic(CARDS, { a: STAT, b: STAT })).toEqual({ id: '3.1.1', name: '기초 분석기법' });
    expect(nextStudyTopic(CARDS, { a: STAT, b: STAT, c: STAT, d: STAT })).toBeUndefined();
    expect(nextStudyTopic([], {})).toBeUndefined();
  });
});
