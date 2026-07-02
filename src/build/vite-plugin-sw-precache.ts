import { createHash } from 'node:crypto';
import { readFile, writeFile, stat, unlink } from 'node:fs/promises';
import { join, relative, posix, resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { build as viteBuild } from 'vite';
import type { Plugin, ResolvedConfig } from 'vite';
import type { SWPrecachePluginOptions } from './types';
import type { PrecacheEntry } from '../sw/types';

/**
 * Regex to detect filenames with embedded content hashes.
 * Matches patterns like `name-[hexhash].ext` where the hash is 7+ hex chars.
 */
export const FILENAME_HASH_RE = /^.+-([0-9a-fA-F]{7,})\.\w+$/;

/**
 * Recursively walks a directory and returns all file paths.
 */
async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];

  let dirEntries: { name: string; isDirectory(): boolean; isFile(): boolean }[];
  try {
    dirEntries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of dirEntries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkDirectory(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Determines whether a file path matches any pattern in the given list.
 */
function matchesAny(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

/**
 * Extracts the embedded hash from a filename, or computes MD5 of file content.
 */
export function getRevisionFromFilename(fileName: string): string | null {
  const match = FILENAME_HASH_RE.exec(fileName);
  return match ? match[1] : null;
}

/**
 * Computes an 8-character MD5 hex hash of the given buffer.
 */
export function computeMD5(content: Buffer): string {
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}

/**
 * Bundles a TypeScript service worker entry point into a single JS file
 * using Vite's build API (which uses Rolldown under the hood).
 */
async function bundleSW(entryPath: string, outPath: string): Promise<void> {
  const outDir = join(outPath, '..');
  const outFile = outPath.split(/[\\/]/).pop()!;

  await viteBuild({
    configFile: false,
    logLevel: 'warn',
    plugins: [],
    build: {
      outDir,
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      copyPublicDir: false,
      rollupOptions: {
        input: resolve(entryPath),
        output: {
          entryFileNames: outFile,
          format: 'es',
        },
      },
    },
  });
}

/**
 * Creates the Vite plugin that generates a precache manifest and injects it
 * into the service worker source template.
 */
export function swPrecachePlugin(options: SWPrecachePluginOptions): Plugin {
  let resolvedConfig: ResolvedConfig;

  return {
    name: 'sw-precache',
    apply: 'build',

    configResolved(config) {
      resolvedConfig = config;
    },

    async closeBundle() {
      const { swSrc, swDest, include, exclude } = options;
      const outDir = resolvedConfig.build.outDir;
      const basePath = resolvedConfig.base;

      // Check SW source template exists
      let swTemplate: string;
      try {
        swTemplate = await readFile(swSrc, 'utf-8');
      } catch (err) {
        throw new Error(
          `[sw-precache] Service worker source template not found: ${swSrc}. ` +
            `Ensure the file exists before building. (${err instanceof Error ? err.message : err})`
        );
      }

      // Determine temp file location (same directory as swSrc so relative imports resolve)
      const swSrcDir = resolve(swSrc, '..');
      const tempSrc = join(swSrcDir, '__sw_precache_temp.ts');

      // Check output directory exists
      let outDirExists = false;
      try {
        const stats = await stat(outDir);
        outDirExists = stats.isDirectory();
      } catch {
        // directory doesn't exist
      }

      if (!outDirExists) {
        console.warn(`[sw-precache] Output directory not found or empty: ${outDir}. Generating empty manifest.`);
        const manifestJson = JSON.stringify([] as PrecacheEntry[]);
        const swSource = swTemplate.replace('self.__PRECACHE_MANIFEST__', manifestJson);
        await writeFile(tempSrc, swSource, 'utf-8');
        try { await bundleSW(tempSrc, join(outDir, swDest)); } finally { await unlink(tempSrc).catch(() => {}); }
        return;
      }

      // Walk the output directory
      const allFiles = await walkDirectory(outDir);

      if (allFiles.length === 0) {
        console.warn(`[sw-precache] Output directory is empty: ${outDir}. Generating empty manifest.`);
        const manifestJson = JSON.stringify([] as PrecacheEntry[]);
        const swSource = swTemplate.replace('self.__PRECACHE_MANIFEST__', manifestJson);
        await writeFile(tempSrc, swSource, 'utf-8');
        try { await bundleSW(tempSrc, join(outDir, swDest)); } finally { await unlink(tempSrc).catch(() => {}); }
        return;
      }

      // Filter files based on include/exclude patterns
      const manifest: PrecacheEntry[] = [];

      for (const filePath of allFiles) {
        const relativePath = relative(outDir, filePath);
        // Normalize to forward slashes for URL paths
        const normalizedPath = relativePath.split('\\').join('/');

        // Check exclude patterns first
        if (matchesAny(normalizedPath, exclude)) {
          continue;
        }

        // Check include patterns
        if (!matchesAny(normalizedPath, include)) {
          continue;
        }

        // Compute revision hash
        const fileName = normalizedPath.split('/').pop() || normalizedPath;
        const embeddedHash = getRevisionFromFilename(fileName);

        let revision: string;
        if (embeddedHash) {
          revision = embeddedHash;
        } else {
          let content: Buffer;
          try {
            content = await readFile(filePath);
          } catch (err) {
            throw new Error(
              `[sw-precache] Failed to read file for hashing: ${filePath}. ` +
                `(${err instanceof Error ? err.message : err})`
            );
          }
          revision = computeMD5(content);
        }

        // Build URL: basePath + relative path
        const url = posix.join(basePath, normalizedPath);

        manifest.push({ url, revision });
      }

      // Sort manifest for deterministic output
      manifest.sort((a, b) => a.url.localeCompare(b.url));

      // Inject manifest into SW source and bundle with Vite/Rolldown
      const manifestJson = JSON.stringify(manifest);
      const swSource = swTemplate.replace('self.__PRECACHE_MANIFEST__', manifestJson);

      // Write intermediate source with injected manifest for bundling
      // (placed in same directory as swSrc so relative imports resolve)
      await writeFile(tempSrc, swSource, 'utf-8');

      try {
        await bundleSW(tempSrc, join(outDir, swDest));
      } finally {
        await unlink(tempSrc).catch(() => {});
      }
    },
  };
}
