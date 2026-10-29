/** KaTeX snippet builders (the results go inside $...$). */
import { formatNum } from '../util';

/** '3, 7, 12' */
export function texList(xs: readonly number[]): string {
  return xs.map(x => formatNum(x)).join(', ');
}

/** Wraps negatives in parentheses for products/subtractions: -3 → '(-3)'. */
export function paren(x: number): string {
  return x < 0 ? `(${formatNum(x)})` : formatNum(x);
}

/** '+ 3' / '- 3' for appending a constant term. */
export function signed(x: number): string {
  return x < 0 ? `- ${formatNum(-x)}` : `+ ${formatNum(x)}`;
}

/** '4 + 1 - 2 + 0' — a sum of terms written without '+ -'. */
export function joinSum(terms: readonly number[]): string {
  return terms.map((t, i) => (i === 0 ? formatNum(t) : signed(t))).join(' ');
}

/** base^{e}, omitting the exponent 1. */
export function power(base: string, e: number): string {
  return e === 1 ? base : `${base}^{${e}}`;
}

/** Korean text inside math mode. */
export function txt(s: string): string {
  return String.raw`\text{${s}}`;
}

/** Two-row table such as x / P(X = x). Cells are KaTeX snippets. */
export function texRows(rows: readonly (readonly [string, readonly string[]])[]): string {
  const width = rows[0][1].length;
  const body = rows.map(([label, cells]) => [label, ...cells].join(' & ')).join(String.raw` \\ \hline `);
  return String.raw`\begin{array}{c|${'c'.repeat(width)}} ${body} \end{array}`;
}

/** Contingency table with row/column totals. */
export function texContingency(rowLabels: readonly string[], colLabels: readonly string[], cells: readonly (readonly number[])[]): string {
  const rowTotals = cells.map(r => r.reduce((a, b) => a + b, 0));
  const colTotals = colLabels.map((_, j) => cells.reduce((a, r) => a + r[j], 0));
  const total = rowTotals.reduce((a, b) => a + b, 0);
  const header = ['', ...colLabels.map(txt), txt('합계')].join(' & ');
  const lines = cells.map((r, i) => [txt(rowLabels[i]), ...r.map(v => formatNum(v)), formatNum(rowTotals[i])].join(' & '));
  const footer = [txt('합계'), ...colTotals.map(v => formatNum(v)), formatNum(total)].join(' & ');
  const nl = String.raw` \\ `;
  return String.raw`\begin{array}{c|${'c'.repeat(colLabels.length)}|c} ${header}${nl}\hline ${lines.join(nl)}${nl}\hline ${footer} \end{array}`;
}
