import { describe, it, expect } from 'vitest';
import {
  SHARE_SOFT_LIMIT,
  SHARE_HARD_LIMIT,
  trimForLink,
  classifyLinkLength,
} from '../share-portrait';
import { formatViewHref } from '../view-route';
import type { Character, LogEvent } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

function makeCharacter(): Character {
  const eventLog: LogEvent[] = [
    { id: '1', timestamp: 1, category: 'system', type: 'test', summary: 'x', payload: {} },
  ];
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Shared',
    portrait: 'data:image/png;base64,AAAA',
    eventLog,
  };
}

describe('trimForLink', () => {
  it('strips portrait and eventLog for the link', () => {
    const trimmed = trimForLink(makeCharacter());
    expect(trimmed.portrait).toBe('');
    expect(trimmed.eventLog).toEqual([]);
  });

  it('does not mutate the input (snapshot keeps portrait and eventLog)', () => {
    const original = makeCharacter();
    trimForLink(original);
    expect(original.portrait).toBe('data:image/png;base64,AAAA');
    expect(original.eventLog).toHaveLength(1);
  });
});

describe('classifyLinkLength', () => {
  it('returns none below the soft limit', () => {
    expect(classifyLinkLength(0)).toBe('none');
    expect(classifyLinkLength(SHARE_SOFT_LIMIT - 1)).toBe('none');
  });

  it('uses >= at the soft limit boundary', () => {
    expect(classifyLinkLength(SHARE_SOFT_LIMIT)).toBe('soft');
  });

  it('returns soft between the limits', () => {
    expect(classifyLinkLength(SHARE_HARD_LIMIT - 1)).toBe('soft');
  });

  it('uses >= at the hard limit boundary', () => {
    expect(classifyLinkLength(SHARE_HARD_LIMIT)).toBe('hard');
    expect(classifyLinkLength(SHARE_HARD_LIMIT + 1000)).toBe('hard');
  });

  it('classifies the full href from formatViewHref', () => {
    const shortHref = formatViewHref('https://x.io', '/p/', 'A'.repeat(10));
    expect(classifyLinkLength(shortHref.length)).toBe('none');

    const longHref = formatViewHref('https://x.io', '/p/', 'A'.repeat(SHARE_HARD_LIMIT));
    expect(classifyLinkLength(longHref.length)).toBe('hard');
  });
});
