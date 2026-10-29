'use client';

import Link from 'next/link';
import { SOURCE_LABELS, sessionsBySource } from '@/data/catalog';
import type { QuestionSource } from '@/types';

const SOURCE_NOTES: ReadonlyArray<{ source: QuestionSource; text: string }> = [
  {
    source: 'restored',
    text: '수험생 복원 기반의 실제 기출이에요. 원문과 일부 다를 수 있고, 정답이 의심되는 문항은 정답을 바꾸지 않고 경고만 표시해요.',
  },
  {
    source: 'ai-mock',
    text: '출제기준과 난이도를 참고해 AI가 만든 모의문제예요.',
  },
  {
    source: 'ai-trend',
    text: '2026년 12·13회 후기에 나온 키워드와 기존 문항이 없던 세세항목을 중심으로 AI가 만든 문제예요.',
  },
];

/** 시험 안내 · 주의사항 — exam rules, what the source labels mean, and the 2026 trend one-liner. */
export default function ExamNotice() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-slate-800">
        <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-2 sm:mb-3 text-sm sm:text-base">시험 안내</h3>
        <ul className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 space-y-1 sm:space-y-1.5">
          <li>- 시험 시간: 120분 (80문항, 4과목 × 20문항)</li>
          <li>- 합격 기준: 전 과목 평균 60점 이상, 과목당 40점 이상</li>
          <li>- 학습 모드: 풀면서 해설·선지별 해설 확인, 보기 섞기는 설정에서 변경</li>
          <li>- 실전 모드: 해설 없이 시간 제한, 보기 항상 섞기 · 제출 후 해설 공개</li>
          <li>- 키보드: 1~4번으로 답 선택(화면에 보이는 순서), 좌우 화살표로 이동</li>
          <li>
            - 기록은 이 브라우저에만 저장돼요 ·{' '}
            <Link href="/settings" className="underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300">
              설정에서 백업
            </Link>
          </li>
        </ul>
      </section>

      <section className="bg-amber-50 dark:bg-amber-950/30 p-4 sm:p-6 rounded-xl border border-amber-200 dark:border-amber-900">
        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2 sm:mb-3 text-sm sm:text-base">주의사항</h3>
        <ul className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1.5 sm:space-y-2">
          {SOURCE_NOTES.map(note => (
            <li key={note.source}>
              - <strong>{SOURCE_LABELS[note.source]}</strong> ({sessionsBySource(note.source).length}회분): {note.text}
            </li>
          ))}
          <li>
            - AI가 만든 문항은 독립 검증을 거쳤지만 오류가 있을 수 있어요. 해설이 이상하면 공인 교재로 확인하세요.
          </li>
          <li>
            - 2026년 필기는 지엽적이고 처음 보는 용어가 많아 기출 회독만으로는 부족했어요.{' '}
            <Link
              href="/guide"
              className="font-bold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
            >
              2026 출제 경향과 합격 전략 보기 →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
