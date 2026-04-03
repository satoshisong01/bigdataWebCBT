'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SESSIONS } from '@/data';
import { SUBJECTS } from '@/data/subjects';
import { getHistory, getWrongIds, ExamRecord } from '@/lib/storage';

export default function HomePage() {
  const [history, setHistory] = useState<ExamRecord[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const getRecord = (key: string) => history.find(r => r.key === key);

  const totalQuestions = SESSIONS.reduce((sum, s) => sum + s.questionCount, 0);
  const completedCount = history.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            빅데이터분석기사 필기 CBT
          </h1>
          <p className="text-gray-500 mt-3 text-lg">기출문제 풀이 및 해설</p>
          <div className="flex justify-center gap-8 mt-6 text-sm text-gray-400">
            <span>{SESSIONS.length}회차</span>
            <span>4과목</span>
            <span>총 {totalQuestions}문항</span>
          </div>
          {completedCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
              {completedCount}개 완료
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* 회차별 풀기 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">회차별 풀기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SESSIONS.map(session => {
              const examKey = `session-${session.id}`;
              const record = getRecord(examKey);
              const wrongIds = getWrongIds(examKey);
              return (
                <div
                  key={session.id}
                  className={`p-6 bg-white rounded-xl border transition relative ${
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
                    <div className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition">
                      {session.name}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {session.questionCount}문항 &middot; 120분
                    </div>
                  </Link>
                  {record && wrongIds.length > 0 && (
                    <Link
                      href={`/exam?wrong=${encodeURIComponent(examKey)}`}
                      className="inline-block mt-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
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
          <h2 className="text-xl font-bold text-gray-800 mb-4">과목별 풀기</h2>
          <div className="space-y-4">
            {SUBJECTS.map(subject => (
              <div
                key={subject.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-blue-600 font-bold">{subject.id}과목</span>
                  <span className="text-base font-bold text-gray-800">
                    {subject.name}
                  </span>
                  <span className="text-xs text-gray-400">회차당 20문항</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SESSIONS.map(session => {
                    const subjectKey = `subject-${subject.id}-${session.id}`;
                    const record = getRecord(subjectKey);
                    const wrongIds = getWrongIds(subjectKey);
                    return (
                      <div key={session.id} className="flex items-center gap-1">
                        <Link
                          href={`/exam?mode=subject&id=${subject.id}&session=${session.id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                            record
                              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                          }`}
                        >
                          {session.name}
                          {record && (
                            <span className="text-xs opacity-75">{record.score}점</span>
                          )}
                        </Link>
                        {record && wrongIds.length > 0 && (
                          <Link
                            href={`/exam?wrong=${encodeURIComponent(subjectKey)}`}
                            className="px-1.5 py-2 text-xs font-bold text-red-500 hover:text-red-700 transition"
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
        <section className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3">시험 안내</h3>
          <div className="text-sm text-gray-500 space-y-1.5">
            <p>- 시험 시간: 120분 (80문항, 4과목)</p>
            <p>- 합격 기준: 전 과목 평균 60점 이상, 과목당 40점 이상</p>
            <p>- 풀이 중 해설 확인 가능 (학습 모드)</p>
            <p>- 키보드 지원: 1~4번으로 답변, 좌우 화살표로 이동</p>
            <p>- 풀이 기록은 브라우저에 자동 저장됩니다</p>
          </div>
        </section>

        {/* 주의사항 */}
        <section className="bg-amber-50 p-6 rounded-xl border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-3">주의사항</h3>
          <div className="text-sm text-amber-900 space-y-1.5">
            <p>- 본 사이트의 모든 문제(제1회~제11회)는 <strong>AI가 생성한 모의문제</strong>입니다.</p>
            <p>- 실제 빅데이터분석기사 필기 기출문제가 아니며, 출제범위와 난이도를 참고하여 제작되었습니다.</p>
            <p>- 일부 문제의 정답이나 해설이 정확하지 않을 수 있으니, 학습 참고용으로만 활용해주세요.</p>
            <p>- 실제 시험 합격을 위해서는 공인 교재 및 기출복원 자료를 병행하시길 권장합니다.</p>
          </div>
        </section>

        {/* 기록 초기화 */}
        {completedCount > 0 && (
          <div className="text-center">
            <button
              onClick={() => {
                if (confirm('모든 풀이 기록을 초기화하시겠습니까?')) {
                  localStorage.removeItem('bigdata-cbt-history');
                  setHistory([]);
                }
              }}
              className="text-sm text-gray-400 hover:text-red-500 transition"
            >
              풀이 기록 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
