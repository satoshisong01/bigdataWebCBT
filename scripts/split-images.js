const fs = require('fs');
const path = require('path');

const imagesPath = path.join(__dirname, '..', 'src', 'data', 'images.ts');
const content = fs.readFileSync(imagesPath, 'utf8');

// Parse the existing data by evaluating the structure
// Extract all entries using regex
const entries = {};
const re = /'(\d+-\d+)':\s*\[\s*([\s\S]*?)\s*\]/g;
let match;
while ((match = re.exec(content)) !== null) {
  const key = match[1];
  const urls = [];
  const urlRe = /'(https:\/\/[^']+)'/g;
  let urlMatch;
  while ((urlMatch = urlRe.exec(match[2])) !== null) {
    urls.push(urlMatch[1]);
  }
  entries[key] = urls;
}

// Split into question images and explanation images
const questionImgs = {};
const explanationImgs = {};

for (const [key, urls] of Object.entries(entries)) {
  if (urls.length >= 2) {
    // First URL = question image, last URL = explanation image
    questionImgs[key] = [urls[0]];
    explanationImgs[key] = [urls[urls.length - 1]];
  } else if (urls.length === 1) {
    // Single image = explanation image only
    explanationImgs[key] = [urls[0]];
  }
}

// Generate new TS file
let ts = '// Image URLs for exam questions (from machuda.kr)\n';
ts += '// Key format: "sessionId-questionNumber"\n\n';

ts += '// Images shown with the question text (tables, graphs, formulas)\n';
ts += 'export const questionImages: Record<string, string[]> = {\n';
for (const [key, urls] of Object.entries(questionImgs)) {
  ts += `  '${key}': [${urls.map(u => `'${u}'`).join(', ')}],\n`;
}
ts += '};\n\n';

ts += '// Images shown with the explanation (해설)\n';
ts += 'export const explanationImages: Record<string, string[]> = {\n';
for (const [key, urls] of Object.entries(explanationImgs)) {
  ts += `  '${key}': [${urls.map(u => `'${u}'`).join(', ')}],\n`;
}
ts += '};\n';

fs.writeFileSync(imagesPath, ts);
console.log(`Question images: ${Object.keys(questionImgs).length}`);
console.log(`Explanation images: ${Object.keys(explanationImgs).length}`);
