import { describe, it, expect } from 'vitest';
import {
  PORTRAIT_MAX_BYTES,
  PORTRAIT_ACCEPTED_TYPES,
  validatePortraitFile,
  readFileAsDataURL,
} from '../portrait';

describe('portrait constants', () => {
  it('PORTRAIT_MAX_BYTES is 2 MB', () => {
    expect(PORTRAIT_MAX_BYTES).toBe(2 * 1024 * 1024);
  });

  it('PORTRAIT_ACCEPTED_TYPES contains jpeg, png, webp', () => {
    expect(PORTRAIT_ACCEPTED_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });
});

// Feature: character-portrait, Property 1: File validation correctness
// Validates: Requirements 2.2, 2.4, 2.5
describe('validatePortraitFile', () => {
  function makeFile(type: string, size: number): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], 'test', { type });
  }

  it('accepts a valid JPEG file (1 MB)', () => {
    const result = validatePortraitFile(makeFile('image/jpeg', 1024 * 1024));
    expect(result).toEqual({ valid: true });
  });

  it('accepts a valid PNG file (100 bytes)', () => {
    const result = validatePortraitFile(makeFile('image/png', 100));
    expect(result).toEqual({ valid: true });
  });

  it('accepts a valid WebP file at exactly 2 MB boundary', () => {
    const result = validatePortraitFile(makeFile('image/webp', PORTRAIT_MAX_BYTES));
    expect(result).toEqual({ valid: true });
  });

  it('rejects a GIF file with type error', () => {
    const result = validatePortraitFile(makeFile('image/gif', 1000));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/JPEG.*PNG.*WebP/i);
  });

  it('rejects a PDF file with type error', () => {
    const result = validatePortraitFile(makeFile('application/pdf', 1000));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/JPEG.*PNG.*WebP/i);
  });

  it('rejects a file with empty MIME type', () => {
    const result = validatePortraitFile(makeFile('', 1000));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/JPEG.*PNG.*WebP/i);
  });

  it('rejects a JPEG at 2 MB + 1 byte with size error', () => {
    const result = validatePortraitFile(makeFile('image/jpeg', PORTRAIT_MAX_BYTES + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/2 MB/i);
  });

  it('accepts a 0-byte JPEG', () => {
    const result = validatePortraitFile(makeFile('image/jpeg', 0));
    expect(result).toEqual({ valid: true });
  });

  it('checks type before size — invalid type AND oversized returns type error', () => {
    const result = validatePortraitFile(makeFile('image/gif', PORTRAIT_MAX_BYTES + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/JPEG.*PNG.*WebP/i);
    expect(result.error).not.toMatch(/2 MB/i);
  });
});

// Feature: character-portrait, Property 2: Valid file reading produces a data URL
// Validates: Requirements 2.3, 4.1
describe('readFileAsDataURL', () => {
  it('reads a small PNG blob as a data URL', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
    const file = new File([blob], 'test.png', { type: 'image/png' });
    const result = await readFileAsDataURL(file);
    expect(result).toMatch(/^data:image\/png/);
  });

  it('reads a JPEG blob as a data URL', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
    const result = await readFileAsDataURL(file);
    expect(result).toMatch(/^data:image\/jpeg/);
  });
});
