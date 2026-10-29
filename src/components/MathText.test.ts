import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MathText from './MathText';

function html(text: string): string {
  return renderToStaticMarkup(createElement(MathText, { text }));
}

describe('MathText', () => {
  it('keeps an unmatched $ as plain text instead of looping forever', () => {
    expect(html('가격은 $5')).toBe('<span>가격은 $5</span>');
    expect(html('$')).toBe('<span>$</span>');
    expect(html('1 < 2 $')).toBe('<span>1 &lt; 2 $</span>');
    expect(html('a $x$ b $')).toMatch(/class="katex".* b \$<\/span>$/);
  });

  it('renders paired $...$ with KaTeX and escapes the plain text around it', () => {
    const out = html('<b> $x^2$ 끝');
    expect(out).toContain('&lt;b&gt; ');
    expect(out).toContain('class="katex"');
    expect(out).toMatch(/ 끝<\/span>$/);
  });
});
