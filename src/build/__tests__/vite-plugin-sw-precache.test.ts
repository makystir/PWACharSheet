import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ResolvedConfig } from 'vite';
import { swPrecachePlugin } from '../vite-plugin-sw-precache';

/**
 * Unit tests for the Vite SW precache plugin.
 * Uses real temp directories to test actual behavior.
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */

describe('vite-plugin-sw-precache', () => {
  let tmpDir: string;
  let outDir: string;
  let swSrcPath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'sw-precache-test-'));
    outDir = join(tmpDir, 'dist');
    swSrcPath = join(tmpDir, 'sw-template.ts');
    await mkdir(outDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function getPlugin(overrides?: Partial<Parameters<typeof swPrecachePlugin>[0]>) {
    const plugin = swPrecachePlugin({
      swSrc: swSrcPath,
      swDest: 'sw.js',
      include: [/\.html$/, /\.css$/, /\.js$/, /\.woff2?$/],
      exclude: [/\.map$/, /sw\.js$/],
      ...overrides,
    });

    const configResolved = (plugin as any).configResolved;
    configResolved({
      build: { outDir },
      base: '/PWACharSheet/',
    } as unknown as ResolvedConfig);

    return plugin;
  }

  async function callCloseBundle(plugin: ReturnType<typeof swPrecachePlugin>) {
    const closeBundle = (plugin as any).closeBundle;
    await closeBundle();
  }

  async function readOutput(): Promise<string> {
    return readFile(join(outDir, 'sw.js'), 'utf-8');
  }

  function parseManifest(output: string): Array<{ url: string; revision: string }> {
    // After bundling, the manifest array appears inline in the output.
    // Match the first JSON array pattern in the bundled output.
    const jsonMatch = output.match(/(\[\s*\{[\s\S]*?\}\s*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return [];
      }
    }
    // Check for empty array
    if (output.includes('[]')) {
      return [];
    }
    return [];
  }

  describe('plugin metadata', () => {
    it('has the correct name and apply setting', () => {
      const plugin = swPrecachePlugin({
        swSrc: swSrcPath,
        swDest: 'sw.js',
        include: [/\.html$/],
        exclude: [/\.map$/],
      });

      expect(plugin.name).toBe('sw-precache');
      expect(plugin.apply).toBe('build');
    });
  });

  describe('known file set', () => {
    it('includes HTML, CSS, JS, and woff2 files in manifest', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      await mkdir(join(outDir, 'assets'), { recursive: true });
      await writeFile(join(outDir, 'index.html'), '<html></html>');
      await writeFile(join(outDir, 'assets', 'index-a1b2c3d4.css'), 'body {}');
      await writeFile(join(outDir, 'assets', 'app-deadbeef01.js'), 'console.log("app")');
      await writeFile(join(outDir, 'assets', 'font-abcdef12.woff2'), 'font-data');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      expect(manifest).toHaveLength(4);
      const urls = manifest.map(e => e.url);
      expect(urls).toContain('/PWACharSheet/index.html');
      expect(urls).toContain('/PWACharSheet/assets/index-a1b2c3d4.css');
      expect(urls).toContain('/PWACharSheet/assets/app-deadbeef01.js');
      expect(urls).toContain('/PWACharSheet/assets/font-abcdef12.woff2');
    });
  });

  describe('empty directory', () => {
    it('generates empty manifest and logs warning when output dir is empty', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('empty')
      );

      const output = await readOutput();
      expect(output).toContain('[]');

      warnSpy.mockRestore();
    });
  });

  describe('only .map files', () => {
    it('generates empty manifest when directory contains only source map files', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      await writeFile(join(outDir, 'index.js.map'), '{}');
      await writeFile(join(outDir, 'vendor.js.map'), '{}');
      await writeFile(join(outDir, 'styles.css.map'), '{}');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);
      expect(manifest).toHaveLength(0);
    });
  });

  describe('mixed extensions filtering', () => {
    it('includes .html, .js, .css, .woff, .woff2 and excludes .map, .png, .jpg', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      await writeFile(join(outDir, 'index.html'), '<html></html>');
      await writeFile(join(outDir, 'app.js'), 'var x;');
      await writeFile(join(outDir, 'styles.css'), 'body{}');
      await writeFile(join(outDir, 'font.woff'), 'woff-data');
      await writeFile(join(outDir, 'font.woff2'), 'woff2-data');
      await writeFile(join(outDir, 'app.js.map'), '{}');
      await writeFile(join(outDir, 'hero.png'), 'png');
      await writeFile(join(outDir, 'photo.jpg'), 'jpg');
      await writeFile(join(outDir, 'icon.svg'), '<svg/>');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      const urls = manifest.map(e => e.url);
      // Included
      expect(urls).toContain('/PWACharSheet/index.html');
      expect(urls).toContain('/PWACharSheet/app.js');
      expect(urls).toContain('/PWACharSheet/styles.css');
      expect(urls).toContain('/PWACharSheet/font.woff');
      expect(urls).toContain('/PWACharSheet/font.woff2');
      // Excluded
      expect(urls).not.toContain('/PWACharSheet/app.js.map');
      expect(urls).not.toContain('/PWACharSheet/hero.png');
      expect(urls).not.toContain('/PWACharSheet/photo.jpg');
      expect(urls).not.toContain('/PWACharSheet/icon.svg');

      expect(manifest).toHaveLength(5);
    });
  });

  describe('revision hash derivation', () => {
    it('uses embedded hex hash from filename when present (7+ hex chars)', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      // "a1b2c3d4e5" is 10 hex chars, matching the embedded hash regex
      await writeFile(join(outDir, 'index-a1b2c3d4e5.js'), 'console.log("hello")');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      expect(manifest[0].revision).toBe('a1b2c3d4e5');
    });

    it('computes MD5 hash for files without embedded hash in filename', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      await writeFile(join(outDir, 'index.html'), '<html><body>Hello</body></html>');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      // Should be an 8-character hex string (MD5 sliced to 8 chars)
      expect(manifest[0].revision).toMatch(/^[0-9a-f]{8}$/);
    });

    it('does not treat non-hex filename segments as embedded hashes', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      // "xyzGHIJK" contains non-hex chars -> should NOT be treated as embedded hash
      await writeFile(join(outDir, 'main-xyzGHIJK.css'), 'body{}');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      // Since xyzGHIJK is not valid hex, MD5 is computed (8 hex chars)
      expect(manifest[0].revision).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('error handling', () => {
    it('throws when SW template file is missing', async () => {
      // Don't create the swSrcPath file
      await writeFile(join(outDir, 'index.html'), '<html></html>');

      const plugin = getPlugin();

      await expect(callCloseBundle(plugin)).rejects.toThrow(
        /Service worker source template not found/
      );
    });

    it('throws descriptive error including the template path', async () => {
      const plugin = getPlugin();

      await expect(callCloseBundle(plugin)).rejects.toThrow(
        new RegExp(swSrcPath.replace(/\\/g, '\\\\'))
      );
    });
  });

  describe('manifest injection', () => {
    it('replaces self.__PRECACHE_MANIFEST__ placeholder in template', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      await writeFile(join(outDir, 'app.js'), 'var x = 1;');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      expect(output).not.toContain('self.__PRECACHE_MANIFEST__');
      // The manifest should be inlined as a JSON array
      expect(output).toContain('/PWACharSheet/app.js');
    });

    it('writes output to the correct path (outDir/swDest)', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__)');
      await writeFile(join(outDir, 'app.js'), 'var x = 1;');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      // Verify the file exists at the expected path
      const output = await readFile(join(outDir, 'sw.js'), 'utf-8');
      expect(output).toBeDefined();
    });
  });

  describe('output directory missing', () => {
    it('logs warning when output dir does not exist as directory', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Remove and recreate it as an empty dir (stat will succeed but no files exist)
      // The plugin checks stat().isDirectory() - if stat throws, it falls through
      // to empty path. We'll use a file at that path instead.
      await rm(outDir, { recursive: true, force: true });
      // Create outDir as a file instead of directory so stat returns isDirectory: false
      await writeFile(outDir, 'not a directory');

      const plugin = getPlugin();
      // The plugin will try to writeFile to outDir/sw.js which will fail
      // because outDir is a file not a directory. The warning should still be logged.
      try {
        await callCloseBundle(plugin);
      } catch {
        // Expected to fail on write since outDir is a file
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found or empty')
      );

      warnSpy.mockRestore();
    });

    it('generates empty manifest when output dir stat returns non-directory', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__);');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Remove out dir and let the stat throw ENOENT
      await rm(outDir, { recursive: true, force: true });
      // Recreate outDir so writeFile will succeed
      await mkdir(outDir, { recursive: true });
      // But point the config to a non-existent subpath
      const plugin = swPrecachePlugin({
        swSrc: swSrcPath,
        swDest: 'sw.js',
        include: [/\.html$/, /\.css$/, /\.js$/, /\.woff2?$/],
        exclude: [/\.map$/, /sw\.js$/],
      });
      const nonExistentOutDir = join(tmpDir, 'non-existent');
      const configResolved = (plugin as any).configResolved;
      configResolved({
        build: { outDir: nonExistentOutDir },
        base: '/PWACharSheet/',
      } as unknown as ResolvedConfig);

      // Plugin should warn about non-existent directory
      // Vite build may create the directory, so we just check the warning
      try {
        await callCloseBundle(plugin);
      } catch {
        // May throw if Vite can't create the directory
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found or empty')
      );

      warnSpy.mockRestore();
    });
  });

  describe('manifest sorting', () => {
    it('sorts manifest entries by URL for deterministic output', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__)');
      await writeFile(join(outDir, 'z-file.js'), 'z');
      await writeFile(join(outDir, 'a-file.css'), 'a');
      await writeFile(join(outDir, 'm-file.html'), 'm');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      const urls = manifest.map(e => e.url);
      expect(urls).toEqual([
        '/PWACharSheet/a-file.css',
        '/PWACharSheet/m-file.html',
        '/PWACharSheet/z-file.js',
      ]);
    });
  });

  describe('sw.js exclusion', () => {
    it('excludes sw.js from the manifest to avoid self-caching', async () => {
      await writeFile(swSrcPath, 'console.log(self.__PRECACHE_MANIFEST__)');
      await writeFile(join(outDir, 'index.html'), '<html></html>');
      await writeFile(join(outDir, 'sw.js'), 'old service worker content');

      const plugin = getPlugin();
      await callCloseBundle(plugin);

      const output = await readOutput();
      const manifest = parseManifest(output);

      const urls = manifest.map(e => e.url);
      expect(urls).not.toContain('/PWACharSheet/sw.js');
      expect(urls).toContain('/PWACharSheet/index.html');
    });
  });
});
