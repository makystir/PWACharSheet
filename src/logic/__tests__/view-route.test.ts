import { describe, it, expect } from 'vitest';
import { VIEW_ROUTE_PREFIX, parseViewRoute, formatViewHref } from '../view-route';

describe('parseViewRoute', () => {
  it('returns the opaque payload after view/ with a leading #', () => {
    expect(parseViewRoute('#view/ABC123')).toBe('ABC123');
  });

  it('returns the opaque payload after view/ without a leading #', () => {
    expect(parseViewRoute('view/ABC123')).toBe('ABC123');
  });

  it('returns an empty string for a bare view/ route', () => {
    expect(parseViewRoute('#view/')).toBe('');
  });

  it('does not decode or validate the payload (returns it verbatim)', () => {
    expect(parseViewRoute('#view/not-base64url!!/with-slashes')).toBe('not-base64url!!/with-slashes');
  });

  it('returns null for non-view routes', () => {
    expect(parseViewRoute('#character')).toBeNull();
    expect(parseViewRoute('#combat/weapons')).toBeNull();
    expect(parseViewRoute('')).toBeNull();
    expect(parseViewRoute('#viewer/abc')).toBeNull();
  });
});

describe('formatViewHref', () => {
  it('builds origin + pathname + #view/<encoded>', () => {
    expect(formatViewHref('https://example.io', '/PWACharSheet/', 'ABC')).toBe(
      'https://example.io/PWACharSheet/#view/ABC'
    );
  });

  it('round-trips with parseViewRoute', () => {
    const href = formatViewHref('https://x.io', '/p/', 'payload-123');
    const hash = href.slice(href.indexOf('#'));
    expect(parseViewRoute(hash)).toBe('payload-123');
  });

  it('uses VIEW_ROUTE_PREFIX', () => {
    expect(formatViewHref('', '', 'x')).toBe(`#${VIEW_ROUTE_PREFIX}/x`);
  });
});
