import { describe, it, expect } from 'vitest';
import { gzip, gunzip } from '../gzip';

describe('gzip / gunzip', () => {
  // Fail loudly if the Web Streams compression globals are absent (they are
  // Node >= 20 globals, not provided by jsdom itself — see context.json).
  it('requires CompressionStream and DecompressionStream globals', () => {
    expect(typeof CompressionStream).toBe('function');
    expect(typeof DecompressionStream).toBe('function');
  });

  it('round-trips arbitrary bytes', async () => {
    const original = new TextEncoder().encode('The quick brown fox jumps over the lazy dog. '.repeat(50));
    const compressed = await gzip(original);
    const restored = await gunzip(compressed, 1_000_000);
    expect(Array.from(restored)).toEqual(Array.from(original));
  });

  it('round-trips empty input', async () => {
    const original = new Uint8Array(0);
    const compressed = await gzip(original);
    const restored = await gunzip(compressed, 1000);
    expect(restored.length).toBe(0);
  });

  it('aborts when decompressed output exceeds maxBytes', async () => {
    // Highly compressible input inflates well beyond a tiny maxBytes.
    const original = new Uint8Array(100_000); // all zeros
    const compressed = await gzip(original);
    await expect(gunzip(compressed, 1000)).rejects.toThrow();
  });

  it('rejects invalid gzip data', async () => {
    const notGzip = new TextEncoder().encode('definitely not gzip');
    await expect(gunzip(notGzip, 1_000_000)).rejects.toThrow();
  });
});
