const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'src', 'app', 'page.tsx'),
  path.join(__dirname, '..', 'src', 'components', 'QuestionCard.tsx'),
  path.join(__dirname, '..', 'src', 'components', 'ExamHeader.tsx'),
  path.join(__dirname, '..', 'src', 'components', 'QuestionNav.tsx'),
  path.join(__dirname, '..', 'src', 'components', 'ResultView.tsx'),
  path.join(__dirname, '..', 'src', 'components', 'Dashboard.tsx'),
];

const replacements = [
  // Backgrounds
  ['bg-gray-50', 'bg-gray-50 dark:bg-slate-950'],
  ['bg-white border', 'bg-white dark:bg-slate-900 border'],
  ['bg-white rounded-xl border border-gray-200', 'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800'],
  ['bg-white rounded-lg border border-gray-200', 'bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800'],
  ['bg-white p-4', 'bg-white dark:bg-slate-900 p-4'],
  ['bg-white p-6', 'bg-white dark:bg-slate-900 p-6'],
  ['bg-gray-100 text-gray-600', 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'],
  ['bg-gray-200 text-gray-800', 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100'],

  // Borders
  ['border-gray-200', 'border-gray-200 dark:border-slate-800'],
  ['border-gray-300', 'border-gray-300 dark:border-slate-700'],

  // Text
  ['text-gray-900', 'text-gray-900 dark:text-slate-100'],
  ['text-gray-800', 'text-gray-800 dark:text-slate-100'],
  ['text-gray-700', 'text-gray-700 dark:text-slate-300'],
  ['text-gray-600', 'text-gray-600 dark:text-slate-400'],
  ['text-gray-500', 'text-gray-500 dark:text-slate-400'],
  ['text-gray-400', 'text-gray-400 dark:text-slate-500'],
  ['text-gray-300', 'text-gray-300 dark:text-slate-600'],
];

function ensureDarkVariant(content) {
  let updated = content;
  for (const [from, to] of replacements) {
    if (!from || !to) continue;
    // Skip if the file already contains the substituted form (idempotency check)
    // Replace only standalone occurrences (not where dark: variant already applied)
    const re = new RegExp(escapeRegex(from) + '(?!\\s*dark:)', 'g');
    updated = updated.replace(re, (match, offset, str) => {
      // If the word right before/after contains dark: pointing to same prefix, skip
      const after = str.slice(offset + match.length, offset + match.length + 30);
      if (after.startsWith(' dark:')) return match;
      return to;
    });
  }
  return updated;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP (missing): ${file}`);
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  const after = ensureDarkVariant(before);
  if (before !== after) {
    fs.writeFileSync(file, after);
    console.log(`updated: ${path.basename(file)}`);
  } else {
    console.log(`no change: ${path.basename(file)}`);
  }
}
