'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with `$...$` (inline) and `$$...$$` (block) LaTeX segments using KaTeX.
 * Plain text is preserved with line breaks via `whitespace-pre-wrap`.
 */
export default function MathText({ text, className }: MathTextProps) {
  const html = useMemo(() => {
    if (!text) return '';
    const parts: string[] = [];
    let i = 0;
    while (i < text.length) {
      // Block math $$...$$
      if (text[i] === '$' && text[i + 1] === '$') {
        const end = text.indexOf('$$', i + 2);
        if (end !== -1) {
          const expr = text.slice(i + 2, end);
          try {
            parts.push(
              katex.renderToString(expr, { displayMode: true, throwOnError: false }),
            );
          } catch {
            parts.push(escapeHtml(expr));
          }
          i = end + 2;
          continue;
        }
      }
      // Inline math $...$
      if (text[i] === '$') {
        const end = text.indexOf('$', i + 1);
        if (end !== -1) {
          const expr = text.slice(i + 1, end);
          try {
            parts.push(
              katex.renderToString(expr, { displayMode: false, throwOnError: false }),
            );
          } catch {
            parts.push(escapeHtml(expr));
          }
          i = end + 1;
          continue;
        }
      }
      // Plain text segment up to next `$`
      const next = text.indexOf('$', i);
      const slice = next === -1 ? text.slice(i) : text.slice(i, next);
      parts.push(escapeHtml(slice).replace(/\n/g, '<br/>'));
      i = next === -1 ? text.length : next;
    }
    return parts.join('');
  }, [text]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
