import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('reduced motion support (Epic E5.1)', () => {
  it('disables non-essential animation under prefers-reduced-motion', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    const block = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/)?.[0] || '';
    expect(block).toContain('animation-duration');
    expect(block).toContain('animation-iteration-count');
    expect(block).toContain('transition-duration');
  });
});
