// ─── Fuzzy Match Algorithm ────────────────────────────────────────────────────
//
// A lightweight scoring function for the command palette search.
// Checks if query characters appear in order within the target (subsequence match),
// then scores based on consecutive character matches, word-boundary bonuses,
// and prefix bonuses.
//
// Operates on pre-lowercased strings for performance.
// Returns null for no match, or { score, ranges } for matches.

const MAX_QUERY_LENGTH = 200;

// Scoring constants
const CONSECUTIVE_BONUS = 5;
const WORD_BOUNDARY_BONUS = 10;
const PREFIX_BONUS = 15;
const BASE_MATCH_SCORE = 1;

export interface FuzzyMatchResult {
  score: number;
  ranges: [number, number][];
}

/**
 * Determines if a character at a given position in text is at a word boundary.
 * A word boundary is: the start of the string, or preceded by a space, hyphen,
 * underscore, slash, or period.
 */
function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === '.' || prev === '(';
}

/**
 * Core subsequence matching with scoring.
 * Query characters must appear in order within the target text.
 * Returns null if no subsequence match is found.
 */
function subsequenceMatch(query: string, text: string): FuzzyMatchResult | null {
  if (query.length === 0) return null;
  if (text.length === 0) return null;

  const queryLen = query.length;
  const textLen = text.length;

  // Quick check: if query is longer than text, no match possible
  if (queryLen > textLen) return null;

  // Find best match using a greedy approach that prefers word boundaries
  // and consecutive matches
  const matchPositions: number[] = [];
  let score = 0;
  let queryIdx = 0;
  let lastMatchIdx = -1;

  // First pass: try to match at word boundaries preferentially
  const wordBoundaryPositions: number[] = [];
  for (let i = 0; i < textLen && queryIdx < queryLen; i++) {
    if (text[i] === query[queryIdx]) {
      if (isWordBoundary(text, i) || i === lastMatchIdx + 1) {
        matchPositions.push(i);
        lastMatchIdx = i;
        queryIdx++;
      } else {
        wordBoundaryPositions.push(i);
      }
    }
  }

  // If word-boundary pass didn't match all query chars, fill from remaining candidates
  if (queryIdx < queryLen) {
    // Reset and do a simple greedy match
    matchPositions.length = 0;
    queryIdx = 0;
    lastMatchIdx = -1;

    for (let i = 0; i < textLen && queryIdx < queryLen; i++) {
      if (text[i] === query[queryIdx]) {
        matchPositions.push(i);
        lastMatchIdx = i;
        queryIdx++;
      }
    }
  }

  // If we couldn't match all query characters, no match
  if (queryIdx < queryLen) return null;

  // Calculate score based on match positions
  score = 0;
  let consecutiveCount = 0;

  for (let i = 0; i < matchPositions.length; i++) {
    const pos = matchPositions[i];

    // Base score for each matched character
    score += BASE_MATCH_SCORE;

    // Prefix bonus: matching at the very start of the text
    if (pos === i) {
      score += PREFIX_BONUS;
    }

    // Word boundary bonus
    if (isWordBoundary(text, pos)) {
      score += WORD_BOUNDARY_BONUS;
    }

    // Consecutive match bonus
    if (i > 0 && pos === matchPositions[i - 1] + 1) {
      consecutiveCount++;
      score += CONSECUTIVE_BONUS * consecutiveCount;
    } else {
      consecutiveCount = 0;
    }
  }

  // Bonus for query covering a larger portion of the text (tighter matches rank higher)
  const coverage = queryLen / textLen;
  score += Math.round(coverage * 10);

  // Build highlight ranges (merge consecutive positions into ranges)
  const ranges = buildRanges(matchPositions);

  return { score, ranges };
}

/**
 * Merge an array of sorted match positions into contiguous [start, end] ranges.
 * Each range is inclusive: [start, end] means characters at indices start through end.
 */
function buildRanges(positions: number[]): [number, number][] {
  if (positions.length === 0) return [];

  const ranges: [number, number][] = [];
  let start = positions[0];
  let end = positions[0];

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] === end + 1) {
      end = positions[i];
    } else {
      ranges.push([start, end]);
      start = positions[i];
      end = positions[i];
    }
  }
  ranges.push([start, end]);

  return ranges;
}

/**
 * Perform fuzzy matching of a query against a text string.
 *
 * Both query and text should be pre-lowercased for performance.
 * Queries longer than 200 characters are truncated.
 *
 * @param query - The search query (lowercased)
 * @param text - The target text to match against (lowercased)
 * @returns null if no match, or { score, ranges } for matches
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatchResult | null {
  // Truncate queries longer than 200 characters
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.slice(0, MAX_QUERY_LENGTH);
  }

  // Empty or whitespace-only query → no match
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return null;

  // If query contains spaces, split into tokens and match each
  if (trimmedQuery.includes(' ')) {
    return multiTokenMatch(trimmedQuery, text);
  }

  return subsequenceMatch(trimmedQuery, text);
}

/**
 * Handle multi-token queries (e.g., "lor fire" matching "Lore of Fire").
 * Each token must match as a subsequence somewhere in the text.
 * The total score is the sum of individual token scores.
 */
function multiTokenMatch(query: string, text: string): FuzzyMatchResult | null {
  const tokens = query.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return null;

  let totalScore = 0;
  const allRanges: [number, number][] = [];

  for (const token of tokens) {
    const result = subsequenceMatch(token, text);
    if (result === null) return null; // All tokens must match
    totalScore += result.score;
    allRanges.push(...result.ranges);
  }

  // Sort and merge overlapping ranges
  allRanges.sort((a, b) => a[0] - b[0]);
  const mergedRanges = mergeOverlappingRanges(allRanges);

  return { score: totalScore, ranges: mergedRanges };
}

/**
 * Merge overlapping or adjacent ranges.
 */
function mergeOverlappingRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];

  const merged: [number, number][] = [ranges[0]];

  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const current = ranges[i];

    if (current[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}
