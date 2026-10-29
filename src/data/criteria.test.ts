import { describe, it, expect } from 'vitest';
import {
  CRITERIA,
  CRITERIA_VERSION,
  LEAVES,
  SUBS,
  criteriaSubjectOf,
  isTopicId,
  subjectOfTopic,
  topicMatches,
  topicName,
  topicPath,
} from './criteria';

const leafCount = (subject: (typeof CRITERIA)[number]): number =>
  subject.majors.reduce((n, m) => n + m.subs.reduce((k, u) => k + u.leaves.length, 0), 0);

describe('2027 출제기준 tree', () => {
  it('is the revision for 제14회 onward with 4 subjects, 10 주요항목, 21 세부항목 and 82 세세항목', () => {
    expect(CRITERIA_VERSION).toBe('2027. 1. 1. ~ 2030. 12. 31. 출제기준 (제14회 필기부터)');
    expect(CRITERIA.map(s => [s.id, s.name])).toEqual([
      [1, '빅데이터 분석 기획'],
      [2, '빅데이터 탐색'],
      [3, '빅데이터 모델링'],
      [4, '빅데이터 결과 해석'],
    ]);
    expect(CRITERIA.map(s => s.majors.length)).toEqual([4, 3, 1, 2]);
    expect(SUBS).toHaveLength(21);
    expect(LEAVES).toHaveLength(82);
    expect(CRITERIA.map(leafCount)).toEqual([23, 25, 16, 18]);
  });

  it('numbers every node after its parent, with unique ids', () => {
    const ids = CRITERIA.flatMap(s => [
      String(s.id),
      ...s.majors.flatMap(m => [m.id, ...m.subs.flatMap(u => [u.id, ...u.leaves.map(l => l.id)])]),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of CRITERIA) {
      s.majors.forEach((m, mi) => {
        expect(m.id).toBe(`${s.id}.${mi + 1}`);
        m.subs.forEach((u, ui) => {
          expect(u.id).toBe(`${m.id}.${ui + 1}`);
          u.leaves.forEach((l, li) => expect(l.id).toBe(`${u.id}.${li + 1}`));
        });
      });
    }
  });

  it('has a single 과목3 주요항목 with 기초/심화 분석기법 of 8 leaves each', () => {
    const [major, ...rest] = CRITERIA[2].majors;
    expect(rest).toEqual([]);
    expect(major.name).toBe('분석기법 적용');
    expect(major.subs.map(u => [u.name, u.leaves.length])).toEqual([['기초 분석기법', 8], ['심화 분석기법', 8]]);
  });

  it('places the moved and new 세세항목 where the revision put them', () => {
    expect(topicName('1.2.1.2')).toBe('빅데이터 플랫폼 기술 동향');
    expect(topicName('1.2.2.2')).toBe('인공지능 기술 전망');
    expect(topicName('1.3.3.3')).toBe('분석모형 구축 절차');
    expect(topicName('1.4.1.3')).toBe('데이터 비식별화');
    expect(topicName('2.1.1.4')).toBe('데이터 변환');
    expect(topicName('2.1.1.5')).toBe('데이터 품질 검증');
    expect(topicName('2.1.2.6')).toBe('데이터 분할');
    expect(topicName('3.1.1.8')).toBe('주성분분석');
    expect(topicName('4.2.1.1')).toBe('시공간 시각화');
    expect(topicName('4.2.2.3')).toBe('분석결과 활용 시나리오 개발');
    for (const gone of ['3.2', '3.2.1.1', '3.1.1.9', '4.2.3', '4.2.3.1', '1.3.1.4']) expect(isTopicId(gone), gone).toBe(false);
  });
});

describe('criteria helpers', () => {
  it('names, paths and subjects of topic ids', () => {
    expect(topicPath('3.1.2.5')).toEqual(['빅데이터 모델링', '분석기법 적용', '심화 분석기법', '딥러닝 분석']);
    expect(topicName('9.9')).toBe('9.9');
    expect(isTopicId('4')).toBe(true);
    expect(subjectOfTopic('4.2.2.1')).toBe(4);
  });

  it('matches a prefix and its descendants only', () => {
    expect(topicMatches('3.1.1.4', '3.1.1')).toBe(true);
    expect(topicMatches('3.1', '3.1')).toBe(true);
    expect(topicMatches('3.1.10.1', '3.1.1')).toBe(false);
  });

  it('criteriaSubjectOf takes the subject of topics[0], else the own subject of the question', () => {
    expect(criteriaSubjectOf({ subject: 3, topics: ['1.3.3.1', '3.1.1.1'] })).toBe(1);
    expect(criteriaSubjectOf({ subject: 3, topics: ['2.1.2.6'] })).toBe(2);
    expect(criteriaSubjectOf({ subject: 3 })).toBe(3);
    expect(criteriaSubjectOf({ subject: 2, topics: [] })).toBe(2);
    expect(criteriaSubjectOf({ subject: 2, topics: ['9.1.1.1'] })).toBe(2); // names no subject of the tree
  });
});
