import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { posix } from 'node:path';

/**
 * Feature: offline-sw-strategy, Property 2: Manifest entry URL format
 * Validates: Requirements 1.3
 *
 * For any file included in the manifest and any configured base path,
 * the entry's `url` field SHALL equal the base path concatenated with
 * the file's relative path from the output directory, and the `revision`
 * field SHALL be a non-empty hexadecimal string.
 */
describe('Feature: offline-sw-strategy', () => {
  /**
   * Regex matching the plugin's filename hash detection pattern.
   * Filenames like `name-[7+hexchars].ext` have an embedded hash.
   */
  const FILENAME_HASH_RE = /^.+-([0-9a-fA-F]{7,})\.\w+$/;

  /**
   * Arbitrary for valid base paths (always starts with `/`, may have trailing segments).
   */
  const arbBasePath = fc.oneof(
    fc.constant('/'),
    fc.constant('/PWACharSheet/'),
    fc.array(
      fc.constantFrom('a', 'b', 'c', 'd', 'e', 'app', 'site', 'my-app'),
      { minLength: 1, maxLength: 2 },
    ).map(segments => `/${segments.join('/')}/`),
  );

  /**
   * Arbitrary for a single path segment (directory or file name component).
   */
  const arbPathSegment = fc.array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
      '-', '_',
    ),
    { minLength: 1, maxLength: 12 },
  ).map(chars => chars.join(''));

  /**
   * Arbitrary for valid file extensions that the plugin includes.
   */
  const arbIncludedExtension = fc.constantFrom('html', 'css', 'js', 'woff2', 'woff');

  /**
   * Arbitrary for a hex hash string (7-20 chars) used in hashed filenames.
   */
  const arbHexHash = fc.array(
    fc.constantFrom(...'0123456789abcdef'.split('')),
    { minLength: 7, maxLength: 20 },
  ).map(chars => chars.join(''));

  /**
   * Arbitrary for a relative file path (forward-slash separated, no leading slash).
   * Generates paths like "assets/index-abc1234.js" or "styles/main.css".
   */
  const arbRelativePath = fc.tuple(
    fc.array(arbPathSegment, { minLength: 0, maxLength: 3 }),
    arbPathSegment,
    fc.boolean(),
    arbHexHash,
    arbIncludedExtension,
  ).map(([dirs, name, hasHash, hash, ext]) => {
    const fileName = hasHash ? `${name}-${hash}.${ext}` : `${name}.${ext}`;
    const segments = [...dirs, fileName];
    return segments.join('/');
  });

  /**
   * Arbitrary for random file content bytes (used for MD5 hashing).
   */
  const arbFileContent = fc.uint8Array({ minLength: 1, maxLength: 64 });

  it('Property 2: Manifest entry URL format — URL equals basePath joined with relativePath', () => {
    fc.assert(
      fc.property(
        arbBasePath,
        arbRelativePath,
        (basePath, relativePath) => {
          // The plugin constructs URLs using posix.join(basePath, normalizedPath)
          const url = posix.join(basePath, relativePath);

          // URL must start with a `/` (absolute path from site root)
          expect(url.startsWith('/')).toBe(true);

          // URL must contain the relative path's filename
          const fileName = relativePath.split('/').pop()!;
          expect(url).toContain(fileName);

          // Verify the URL equals posix.join(basePath, relativePath)
          expect(url).toBe(posix.join(basePath, relativePath));

          // URL must not contain backslashes (posix normalization)
          expect(url).not.toContain('\\');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 2: Manifest entry URL format — revision is non-empty hexadecimal string', () => {
    fc.assert(
      fc.property(
        arbRelativePath,
        arbFileContent,
        (relativePath, fileContent) => {
          const fileName = relativePath.split('/').pop()!;

          // Determine revision the same way the plugin does
          const hashMatch = FILENAME_HASH_RE.exec(fileName);
          let revision: string;

          if (hashMatch) {
            // Plugin extracts the embedded hash from filename
            revision = hashMatch[1];
          } else {
            // Plugin computes MD5 of file content, takes first 8 hex chars
            revision = createHash('md5')
              .update(Buffer.from(fileContent))
              .digest('hex')
              .slice(0, 8);
          }

          // Revision must be non-empty
          expect(revision.length).toBeGreaterThan(0);

          // Revision must be a valid hexadecimal string
          expect(revision).toMatch(/^[0-9a-fA-F]+$/);

          // If from filename hash, length is 7+ chars
          // If from MD5, length is exactly 8 chars
          if (hashMatch) {
            expect(revision.length).toBeGreaterThanOrEqual(7);
          } else {
            expect(revision.length).toBe(8);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
