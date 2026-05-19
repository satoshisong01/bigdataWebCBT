const fs = require('fs');
const path = require('path');

// Parse 3-8 image data from tool result
const resultPath = path.join(
  'C:', 'Users', 'jungm', '.claude', 'projects',
  'c--Users-jungm-Desktop-myprojects-bigdata',
  'c57ef308-7534-4214-8c86-19e2eec79b9d',
  'tool-results', 'toolu_01JaJkRkndBUrz6PcvPfrb99.json'
);

const raw = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const text = raw[0].text;
const m = text.indexOf('### Result');
const e = text.indexOf('### Ran');
const jsonPart = text.substring(m + 11, e).trim();
const data = JSON.parse(JSON.parse(jsonPart));

// Session 2 data (from earlier scrape)
const s2Path = path.join(
  'C:', 'Users', 'jungm', '.claude', 'projects',
  'c--Users-jungm-Desktop-myprojects-bigdata',
  'c57ef308-7534-4214-8c86-19e2eec79b9d',
  'tool-results', 'mcp-playwright-browser_run_code-1775201174678.txt'
);

// We'll hardcode session 2 image data since it was already collected
// For now, write 3-8 and handle 2 separately

// Write as a TS data file
const outPath = path.join(__dirname, '..', 'src', 'data', 'images.ts');

let ts = '// Image URLs for exam questions (from machuda.kr)\n';
ts += '// Key format: "sessionId-questionNumber"\n';
ts += 'export const questionImages: Record<string, string[]> = {\n';

for (const [sessionId, questions] of Object.entries(data)) {
  for (const [qNum, imgs] of Object.entries(questions)) {
    const key = `${sessionId}-${qNum}`;
    ts += `  '${key}': [\n`;
    for (const img of imgs) {
      ts += `    '${img}',\n`;
    }
    ts += '  ],\n';
  }
}

ts += '};\n';

fs.writeFileSync(outPath, ts);

// Count
let total = 0;
for (const [k, v] of Object.entries(data)) {
  const count = Object.keys(v).length;
  total += count;
  console.log(`Session ${k}: ${count} questions with images`);
}
console.log(`Total: ${total} -> ${outPath}`);
