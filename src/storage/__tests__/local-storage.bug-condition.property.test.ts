import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { setItem } from '../local-storage';

/**
 * Validates: Requirements 1.1, 1.3, 2.1, 2.3
 *
 * Bug Condition Exploration Test:
 * This test encodes the EXPECTED (correct) behavior after the fix.
 * On UNFIXED code, it will FAIL — confirming the bug exists.
 *
 * Bug Condition: setItem(key, value) currently returns void/undefined when
 * localStorage.setItem throws QuotaExceededError or other DOMException.
 * Expected behavior: it should return { ok: false, reason: 'quota-exceeded' | 'unavailable' }.
 */
describe('Property 1: Bug Condition - Silent Storage Write Failure Returns No Result', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('setItem returns { ok: false, reason: "quota-exceeded" } when localStorage.setItem throws QuotaExceededError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (key, value) => {
          // Mock localStorage.setItem to throw QuotaExceededError
          const quotaError = new DOMException(
            'Failed to execute \'setItem\' on \'Storage\': Setting the value exceeded the quota.',
            'QuotaExceededError'
          );
          const mockStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(() => { throw quotaError; }),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
          } as unknown as Storage;

          Object.defineProperty(globalThis, 'localStorage', {
            value: mockStorage,
            writable: true,
            configurable: true,
          });

          const result = setItem(key, value);

          // Expected behavior: should return a failure result object
          expect(result).toEqual({ ok: false, reason: 'quota-exceeded' });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('setItem returns { ok: false, reason: "unavailable" } when localStorage.setItem throws a generic DOMException', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (key, value) => {
          // Mock localStorage.setItem to throw a generic DOMException (e.g., private browsing)
          const genericError = new DOMException(
            'The operation is insecure.',
            'InvalidStateError'
          );
          const mockStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(() => { throw genericError; }),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
          } as unknown as Storage;

          Object.defineProperty(globalThis, 'localStorage', {
            value: mockStorage,
            writable: true,
            configurable: true,
          });

          const result = setItem(key, value);

          // Expected behavior: should return an unavailable result object
          expect(result).toEqual({ ok: false, reason: 'unavailable' });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('setItem returns { ok: false, reason: "unavailable" } when localStorage.setItem throws SecurityError', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (key, value) => {
          // Mock localStorage.setItem to throw SecurityError (Safari private mode)
          const securityError = new DOMException(
            'The operation is insecure.',
            'SecurityError'
          );
          const mockStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(() => { throw securityError; }),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
          } as unknown as Storage;

          Object.defineProperty(globalThis, 'localStorage', {
            value: mockStorage,
            writable: true,
            configurable: true,
          });

          const result = setItem(key, value);

          // Expected behavior: should return an unavailable result object
          expect(result).toEqual({ ok: false, reason: 'unavailable' });
        }
      ),
      { numRuns: 50 }
    );
  });
});
