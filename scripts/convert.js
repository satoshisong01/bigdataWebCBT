const fs = require('fs');
const path = require('path');

const subjectMap = {
  1: '빅데이터 분석 기획',
  2: '빅데이터 탐색',
  3: '빅데이터 모델링',
  4: '빅데이터 결과 해석',
};

function getSubject(num) {
  if (num <= 20) return 1;
  if (num <= 40) return 2;
  if (num <= 60) return 3;
  return 4;
}

function esc(s) {
  if (!s) return '';
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

const sessionsDir = path.join(__dirname, '..', 'src', 'data', 'sessions');

for (const sessionNum of [3, 4, 5, 6, 7, 8]) {
  const jsonPath = '/tmp/machuda_' + sessionNum + '.json';
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const lines = [];
  lines.push("import { Question } from '@/types';");
  lines.push('');
  lines.push('export const questions: Question[] = [');

  for (const q of data) {
    const num = q.n || q.number || 0;
    const subj = getSubject(num);
    const opts = q.opts || q.options || [];
    while (opts.length < 4) opts.push('(선택지 없음)');
    const answer = q.ans || q.answer || 1;
    const qText = esc(q.q || q.question || q.questionText || '');

    lines.push('  {');
    lines.push(`    id: '${sessionNum}-${num}',`);
    lines.push(`    session: '제${sessionNum}회',`);
    lines.push(`    sessionId: '${sessionNum}',`);
    lines.push(`    subject: ${subj},`);
    lines.push(`    subjectName: '${subjectMap[subj]}',`);
    lines.push(`    number: ${num},`);
    lines.push(`    question: '${qText}',`);
    lines.push(`    options: [${opts.map(o => `'${esc(o)}'`).join(', ')}],`);
    lines.push(`    answer: ${answer},`);
    lines.push(`    explanation: '기출복원 문제입니다.',`);
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');

  const outPath = path.join(sessionsDir, sessionNum + '.ts');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Session ${sessionNum}: ${data.length} questions -> ${outPath}`);
}
