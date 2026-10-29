/**
 * Render smoke tests for the client-only page bodies (/, /plan, /settings) and the /guide content,
 * against seeded localStorage. Catches runtime errors that type-checking cannot (bad lookups,
 * unexpected undefined) without starting Next.
 */
import { beforeEach, describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { toDayKey } from '@/lib/date';
import HomeHub from './HomeHub';
import PlanContent from '@/app/plan/_components/PlanContent';
import SettingsContent from '@/app/settings/_components/SettingsContent';
import GuideContent from '@/components/guide/GuideContent';
import type { GuideSection } from '@/data/guide';

const today = toDayKey(new Date());

/** Server HTML with React's text-node separators removed, so '{n}점' reads as '55점'. */
function render<P extends object>(component: ComponentType<P>, props?: P): string {
  return renderToString(createElement(component, props)).replace(/<!-- -->/g, '');
}

function seedStudyData(): void {
  localStorage.setItem('bigdata-cbt-migrated-v2', '1');
  localStorage.setItem('bigdata-cbt-history', JSON.stringify([
    { key: 'session-2', score: 55, passed: false, date: '2026-10-01T00:00:00.000Z' },
    { key: 'subject-3-t1', score: 70, passed: true, date: '2026-10-02T00:00:00.000Z' },
  ]));
  localStorage.setItem('bigdata-cbt-wrong', JSON.stringify({ 'session-2': ['2-1', '2-5'], 'subject-3-t1': ['t1-41'] }));
  localStorage.setItem('bigdata-cbt-bookmarks', JSON.stringify(['2-3']));
  localStorage.setItem('bigdata-cbt-streak', JSON.stringify({ days: [today], current: 1, best: 4 }));
  localStorage.setItem('bigdata-cbt-qstats', JSON.stringify({
    '2-1': { n: 1, c: 0, first: false, ok: false, unsure: false, last: '2026-10-01T00:00:00.000Z', srs: { box: 1, due: today } },
    '2-2': { n: 2, c: 2, first: true, ok: true, unsure: false, last: '2026-10-01T00:00:00.000Z' },
  }));
  localStorage.setItem('bigdata-cbt-activity', JSON.stringify({ [today]: { q: 12, c: 9, cards: 5, drills: 0 } }));
}

describe('page bodies render', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('home hub renders for a brand-new visitor', () => {
    localStorage.setItem('bigdata-cbt-migrated-v2', '1');
    const html = render(HomeHub);
    expect(html).toContain('오늘의 학습');
    expect(html).toContain('합격 준비도');
    expect(html).toContain('출제기준 히트맵');
    expect(html).toContain('최신경향 대비');
    expect(html).toContain('과목별 풀기');
    expect(html).toContain('주의사항');
    expect(html).toContain('/concepts?topic=1.1.1');
  });

  it('home hub renders seeded study data (records, 오답 links, due badge, streak)', () => {
    seedStudyData();
    const html = render(HomeHub);
    expect(html).toContain('55점');
    expect(html).toContain('오답 2문제 다시풀기');
    expect(html).toContain('/exam?wrong=subject-3-t1');
    expect(html).toContain('오늘 복습 1개');
    expect(html).toContain('🔥 1일 연속');
    expect(html).toContain('문제 12개 (정답률 75%)');
    expect(html).not.toContain('학습 통계를 준비하는 중');
  });

  it('home hub shows the migration notice while legacy stats are pending', () => {
    const html = render(HomeHub);
    expect(html).toContain('학습 통계를 준비하는 중');
  });

  it('plan renders the timeline and the 세부항목 checklist', () => {
    const html = render(PlanContent);
    expect(html).toContain('단계별 플랜');
    expect(html).toContain('개념 체크리스트');
    expect(html).toContain('/settings');
  });

  it('plan explains an exam date that already passed', () => {
    localStorage.setItem('bigdata-cbt-settings', JSON.stringify({ examDate: '2020-01-04', planStart: '2020-01-01' }));
    const html = render(PlanContent);
    expect(html).toContain('시험일이 지났어요');
    expect(html).toContain('완료');
  });

  it('plan explains an exam date that is not after the plan start', () => {
    localStorage.setItem('bigdata-cbt-settings', JSON.stringify({ examDate: '2020-01-01', planStart: '2020-01-01' }));
    const html = render(PlanContent);
    expect(html).toContain('플랜을 나눌 수 없어요');
  });

  it('settings renders every section', () => {
    seedStudyData();
    const html = render(SettingsContent);
    expect(html).toContain('시험 일정');
    expect(html).toContain('일일 목표');
    expect(html).toContain('보기 섞기');
    expect(html).toContain('백업 내보내기');
    expect(html).toContain('전체 초기화');
    expect(html).toContain('기록 2개');
  });

  it('guide renders every block type with safe links', () => {
    const sections: GuideSection[] = [
      {
        id: 'a',
        title: '첫 섹션',
        blocks: [
          { type: 'p', text: '문단' },
          { type: 'list', items: ['하나', '둘'], ordered: true },
          { type: 'list', items: ['셋'] },
          { type: 'table', head: ['구분', '내용'], rows: [['12회', '어려움']] },
          { type: 'callout', tone: 'warn', text: '경고 문구' },
        ],
      },
      {
        id: 'b',
        title: '둘째 섹션',
        blocks: [
          { type: 'links', items: [{ label: '개념 학습', href: '/concepts' }, { label: '나쁜 링크', href: 'javascript:alert(1)' }] },
          { type: 'sources', items: [{ label: '데이터자격검정', url: 'https://www.dataq.or.kr/' }] },
        ],
      },
    ];
    const html = render(GuideContent, { sections });
    expect(html).toContain('href="#b"');
    expect(html).toContain('<ol');
    expect(html).toContain('<table');
    expect(html).toContain('주의');
    expect(html).toContain('href="/concepts"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('dataq.or.kr');
  });
});
