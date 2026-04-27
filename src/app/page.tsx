'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SESSIONS } from '@/data';
import { SUBJECTS } from '@/data/subjects';
import { getHistory, getWrongIds, getActiveWrongIds, getBookmarks, clearAllWrongStats, ExamRecord } from '@/lib/storage';

export default function HomePage() {
  const [history, setHistory] = useState<ExamRecord[]>([]);
  const [wrongPoolCount, setWrongPoolCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    setHistory(getHistory());
    setWrongPoolCount(getActiveWrongIds().length);
    setBookmarkCount(getBookmarks().length);
  }, []);

  const getRecord = (key: string) => history.find(r => r.key === key);

  const totalQuestions = SESSIONS.reduce((sum, s) => sum + s.questionCount, 0);
  const completedCount = history.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
            빅데이터분석기사 필기 CBT
          </h1>
          <p className="text-gray-500 mt-2 sm:mt-3 text-base sm:text-lg">기출문제 풀이 및 해설</p>
          <div className="flex justify-center gap-4 sm:gap-8 mt-4 sm:mt-6 text-xs sm:text-sm text-gray-400">
            <span>{SESSIONS.length}회차</span>
            <span>4과목</span>
            <span>총 {totalQuestions}문항</span>
          </div>
          {completedCount > 0 && (
            <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 text-xs sm:text-sm font-medium rounded-full">
              {completedCount}개 완료
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* 학습 풀 (오답노트 + 북마크) */}
        {(wrongPoolCount > 0 || bookmarkCount > 0) && (
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">학습 풀</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {wrongPoolCount > 0 && (
                <Link
                  href="/exam?pool=wrong-pool"
                  className="block p-4 sm:p-6 bg-white rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50/30 active:bg-red-50 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base sm:text-lg font-bold text-gray-800 group-hover:text-red-600 transition">
                        오답노트
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 mt-1">
                        전 회차 누적 오답 · 자주 틀린 순 정렬
                      </div>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-red-500">
                      {wrongPoolCount}
                    </span>
                  </div>
                </Link>
              )}
              {bookmarkCount > 0 && (
                <Link
                  href="/exam?pool=bookmarks"
                  className="block p-4 sm:p-6 bg-white rounded-xl border border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50/30 active:bg-yellow-50 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base sm:text-lg font-bold text-gray-800 group-hover:text-yellow-600 transition">
                        ★ 북마크
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 mt-1">
                        문제 풀이 중 ☆ 클릭하여 추가
                      </div>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-yellow-500">
                      {bookmarkCount}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* 회차별 풀기 */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">회차별 풀기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {SESSIONS.map(session => {
              const examKey = `session-${session.id}`;
              const record = getRecord(examKey);
              const wrongIds = getWrongIds(examKey);
              return (
                <div
                  key={session.id}
                  className={`p-4 sm:p-6 bg-white rounded-xl border transition relative ${
                    record
                      ? 'border-green-300'
                      : 'border-gray-200'
                  }`}
                >
                  {record && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          record.passed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {record.score}점
                      </span>
                    </div>
                  )}
                  <Link href={`/exam?mode=session&id=${session.id}`} className="block group">
                    <div className="text-base sm:text-lg font-bold text-gray-800 group-hover:text-blue-600 transition">
                      {session.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400 mt-1">
                      {session.questionCount}문항 &middot; 120분
                    </div>
                  </Link>
                  {record && wrongIds.length > 0 && (
                    <Link
                      href={`/exam?wrong=${encodeURIComponent(examKey)}`}
                      className="inline-block mt-2 sm:mt-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:bg-red-200 transition"
                    >
                      오답 {wrongIds.length}문제 다시풀기
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 과목별 풀기 */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">과목별 풀기</h2>
          <div className="space-y-3 sm:space-y-4">
            {SUBJECTS.map(subject => (
              <div
                key={subject.id}
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-xs sm:text-sm text-blue-600 font-bold">{subject.id}과목</span>
                  <span className="text-sm sm:text-base font-bold text-gray-800">
                    {subject.name}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">회차당 20문항</span>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                  {SESSIONS.map(session => {
                    const subjectKey = `subject-${subject.id}-${session.id}`;
                    const record = getRecord(subjectKey);
                    const wrongIds = getWrongIds(subjectKey);
                    return (
                      <div key={session.id} className="flex items-center gap-0.5 sm:gap-1">
                        <Link
                          href={`/exam?mode=subject&id=${subject.id}&session=${session.id}`}
                          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition w-full sm:w-auto justify-center sm:justify-start ${
                            record
                              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:bg-green-200'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 active:bg-blue-100'
                          }`}
                        >
                          <span className="truncate">{session.name}</span>
                          {record && (
                            <span className="text-xs opacity-75 flex-shrink-0">{record.score}점</span>
                          )}
                        </Link>
                        {record && wrongIds.length > 0 && (
                          <Link
                            href={`/exam?wrong=${encodeURIComponent(subjectKey)}`}
                            className="px-1 sm:px-1.5 py-1.5 sm:py-2 text-xs font-bold text-red-500 hover:text-red-700 active:text-red-800 transition flex-shrink-0"
                            title={`오답 ${wrongIds.length}문제`}
                          >
                            X{wrongIds.length}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 안내 */}
        <section className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">시험 안내</h3>
          <div className="text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-1.5">
            <p>- 시험 시간: 120분 (80문항, 4과목)</p>
            <p>- 합격 기준: 전 과목 평균 60점 이상, 과목당 40점 이상</p>
            <p>- 풀이 중 해설 확인 가능 (학습 모드)</p>
            <p>- 키보드 지원: 1~4번으로 답변, 좌우 화살표로 이동</p>
            <p>- 풀이 기록은 브라우저에 자동 저장됩니다</p>
          </div>
        </section>

        {/* 주의사항 */}
        <section className="bg-amber-50 p-4 sm:p-6 rounded-xl border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-2 sm:mb-3 text-sm sm:text-base">주의사항</h3>
          <div className="text-xs sm:text-sm text-amber-900 space-y-1 sm:space-y-1.5">
            <p>- <strong>제2회~제8회</strong>는 수험생 복원 기반의 <strong>기출복원 문제</strong>입니다. 실제 시험과 일부 차이가 있을 수 있습니다.</p>
            <p>- <strong>제1회, 제9회~제11회</strong>는 출제범위와 난이도를 참고하여 <strong>AI가 생성한 모의문제</strong>입니다.</p>
            <p>- 일부 문제의 정답이나 해설이 정확하지 않을 수 있으니, 학습 참고용으로만 활용해주세요.</p>
            <p>- 실제 시험 합격을 위해서는 공인 교재 및 기출복원 자료를 병행하시길 권장합니다.</p>
          </div>
        </section>

        {/* 기록 초기화 */}
        {(completedCount > 0 || wrongPoolCount > 0) && (
          <div className="text-center pb-4 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
            {completedCount > 0 && (
              <button
                onClick={() => {
                  if (confirm('모든 풀이 기록을 초기화하시겠습니까?')) {
                    localStorage.removeItem('bigdata-cbt-history');
                    setHistory([]);
                  }
                }}
                className="text-xs sm:text-sm text-gray-400 hover:text-red-500 active:text-red-600 transition"
              >
                풀이 기록 초기화
              </button>
            )}
            {wrongPoolCount > 0 && (
              <button
                onClick={() => {
                  if (confirm('오답노트를 초기화하시겠습니까?')) {
                    clearAllWrongStats();
                    setWrongPoolCount(0);
                  }
                }}
                className="text-xs sm:text-sm text-gray-400 hover:text-red-500 active:text-red-600 transition"
              >
                오답노트 초기화
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
