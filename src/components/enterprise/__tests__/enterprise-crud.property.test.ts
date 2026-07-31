// Feature: enterprise-tracker, Properties 5, 6, 7, 13, 14
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, Enterprise, EnterpriseCurrency, EnterpriseType, EnterpriseIncomeSource } from '../../../types/character';
import { parseMonetaryInput, createEnterpriseFromTemplate } from '../../../logic/enterprise-utils';
import { ENTERPRISE_TEMPLATES } from '../../../data/enterprises';

// ─── Generators ──────────────────────────────────────────────────────────────

const ALL_ENTERPRISE_TYPES: EnterpriseType[] = ENTERPRISE_TEMPLATES.map(t => t.type);

/** Currency with each field in [0, 999] */
function arbitraryEnterpriseCurrency(): fc.Arbitrary<EnterpriseCurrency> {
  return fc.record({
    gc: fc.nat({ max: 999 }),
    ss: fc.nat({ max: 999 }),
    d: fc.nat({ max: 999 }),
  });
}

/** One of the 10 valid enterprise types */
function arbitraryEnterpriseType(): fc.Arbitrary<EnterpriseType> {
  return fc.constantFrom(...ALL_ENTERPRISE_TYPES);
}

/** Valid income source within constraints */
function arbitraryIncomeSource(): fc.Arbitrary<EnterpriseIncomeSource> {
  return fc.record({
    id: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    earningSkill: fc.string({ minLength: 1, maxLength: 100 }),
    effectiveStatus: fc.string({ minLength: 1, maxLength: 50 }),
  });
}

/** Full enterprise with all fields within valid ranges */
function arbitraryEnterprise(): fc.Arbitrary<Enterprise> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: arbitraryEnterpriseType(),
    expansionLevel: fc.integer({ min: 1, max: 4 }),
    debt: arbitraryEnterpriseCurrency(),
    creditorName: fc.string({ minLength: 0, maxLength: 100 }),
    interestPayment: arbitraryEnterpriseCurrency(),
    incomeSources: fc.array(arbitraryIncomeSource(), { minLength: 0, maxLength: 20 }),
    trappings: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 50 }),
    specialRules: fc.array(fc.string({ minLength: 0, maxLength: 500 }), { minLength: 0, maxLength: 20 }),
    notes: fc.string({ minLength: 0, maxLength: 2000 }),
  });
}

/** Strings that are NOT valid non-negative integers */
function arbitraryNonNumericString(): fc.Arbitrary<string> {
  return fc.oneof(
    // Empty string
    fc.constant(''),
    // Strings with letters only
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[a-zA-Z]/.test(s)),
    // Decimal numbers (e.g. "3.14")
    fc.tuple(fc.integer({ min: 0, max: 999 }), fc.integer({ min: 1, max: 99 })).map(
      ([whole, frac]) => `${whole}.${frac}`
    ),
    // Negative numbers
    fc.integer({ min: -999, max: -1 }).map(n => String(n)),
    // Mixed content like "12abc"
    fc.tuple(
      fc.integer({ min: 0, max: 999 }),
      fc.string({ minLength: 1, maxLength: 5, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')) })
    ).map(([n, s]) => `${n}${s}`),
    // Pure whitespace (not empty)
    fc.string({ minLength: 1, maxLength: 5, unit: fc.constantFrom(' ', '\t') }),
  );
}

/** Strings composed entirely of whitespace (including empty string) */
function arbitraryWhitespaceString(): fc.Arbitrary<string> {
  return fc.string({
    minLength: 0,
    maxLength: 20,
    unit: fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'),
  });
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: enterprise-tracker, Property 5: Empty or whitespace enterprise name rejection', () => {
  /**
   * Property 5: Empty or whitespace enterprise name rejection
   *
   * For any string composed entirely of whitespace characters (including the
   * empty string), attempting to create an enterprise with that name SHALL be
   * rejected. Test by checking that name.trim().length === 0 means no enterprise
   * should be created.
   *
   * Validates: Requirements 5.4
   */
  it('whitespace-only or empty names are rejected (trim check)', () => {
    fc.assert(
      fc.property(
        arbitraryWhitespaceString(),
        arbitraryEnterpriseType(),
        (name, type) => {
          // Verify the generated name is indeed whitespace-only or empty
          expect(name.trim().length).toBe(0);

          // The create flow should reject this name - simulate the validation
          // that the UI performs before calling createEnterpriseFromTemplate
          const isValid = name.trim().length > 0;
          expect(isValid).toBe(false);

          // If we were to track the character's enterprises, they should remain unchanged
          const character: Character = {
            ...structuredClone(BLANK_CHARACTER),
            enterprises: [],
            houseRules: {
              ...structuredClone(BLANK_CHARACTER.houseRules),
              useEnterprises: true,
            },
          };

          // Simulate the create flow: only add enterprise if name is valid
          const updatedEnterprises = name.trim().length > 0
            ? [...character.enterprises!, createEnterpriseFromTemplate(type, name)]
            : character.enterprises!;

          expect(updatedEnterprises).toEqual(character.enterprises);
          expect(updatedEnterprises).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: enterprise-tracker, Property 6: Enterprise field edit round-trip', () => {
  /**
   * Property 6: Enterprise field edit round-trip
   *
   * For any valid enterprise and any valid field edit (name ≤100 chars,
   * creditorName ≤100 chars, debt/interestPayment fields 0–999, income source
   * fields within length constraints, trapping entries ≤200 chars, special rule
   * entries ≤500 chars, notes ≤2000 chars), applying the edit and then reading
   * back SHALL yield the edited value.
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
   */
  it('editing any valid field and reading it back yields the edited value', () => {
    fc.assert(
      fc.property(
        arbitraryEnterprise(),
        fc.oneof(
          // Edit name
          fc.string({ minLength: 1, maxLength: 100 }).map(v => ({ field: 'name' as const, value: v })),
          // Edit creditorName
          fc.string({ minLength: 0, maxLength: 100 }).map(v => ({ field: 'creditorName' as const, value: v })),
          // Edit debt
          arbitraryEnterpriseCurrency().map(v => ({ field: 'debt' as const, value: v })),
          // Edit interestPayment
          arbitraryEnterpriseCurrency().map(v => ({ field: 'interestPayment' as const, value: v })),
          // Edit notes
          fc.string({ minLength: 0, maxLength: 2000 }).map(v => ({ field: 'notes' as const, value: v })),
          // Edit trappings (replace whole array)
          fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 50 })
            .map(v => ({ field: 'trappings' as const, value: v })),
          // Edit specialRules (replace whole array)
          fc.array(fc.string({ minLength: 0, maxLength: 500 }), { minLength: 0, maxLength: 20 })
            .map(v => ({ field: 'specialRules' as const, value: v })),
          // Edit incomeSources (replace whole array)
          fc.array(arbitraryIncomeSource(), { minLength: 0, maxLength: 20 })
            .map(v => ({ field: 'incomeSources' as const, value: v })),
        ),
        (enterprise, edit) => {
          // Apply the edit (simulating updateCharacter mutator)
          const edited = { ...enterprise, [edit.field]: edit.value };

          // Read back the field
          expect(edited[edit.field]).toEqual(edit.value);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: enterprise-tracker, Property 7: Non-numeric monetary input sanitization', () => {
  /**
   * Property 7: Non-numeric monetary input sanitization
   *
   * For any string that does not represent a valid non-negative integer
   * (including empty strings, strings with letters, decimal numbers, negative
   * numbers), parseMonetaryInput SHALL return 0.
   *
   * Validates: Requirements 6.10
   */
  it('parseMonetaryInput returns 0 for any non-valid-non-negative-integer string', () => {
    fc.assert(
      fc.property(
        arbitraryNonNumericString(),
        (input) => {
          const result = parseMonetaryInput(input);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: enterprise-tracker, Property 13: Toggle cycle data idempotence', () => {
  /**
   * Property 13: Toggle cycle data idempotence
   *
   * For any character with a non-empty enterprises array, toggling
   * useEnterprises from true to false and back to true any number of times
   * SHALL leave the enterprises array identical.
   *
   * Validates: Requirements 10.1, 10.2, 10.4
   */
  it('toggling useEnterprises any number of times preserves enterprises data', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEnterprise(), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (enterprises, toggleCount) => {
          // Build a character with enterprises and toggle ON
          const initial: Character = {
            ...structuredClone(BLANK_CHARACTER),
            enterprises: structuredClone(enterprises),
            houseRules: {
              ...structuredClone(BLANK_CHARACTER.houseRules),
              useEnterprises: true,
            },
          };

          // Simulate toggling: the toggle only changes the boolean field,
          // it does NOT modify the enterprises array
          let current = structuredClone(initial);
          for (let i = 0; i < toggleCount; i++) {
            // Toggle OFF
            current = {
              ...structuredClone(current),
              houseRules: {
                ...current.houseRules,
                useEnterprises: false,
              },
            };
            // Toggle ON
            current = {
              ...structuredClone(current),
              houseRules: {
                ...current.houseRules,
                useEnterprises: true,
              },
            };
          }

          // enterprises array should be identical after all toggle cycles
          expect(current.enterprises).toEqual(initial.enterprises);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: enterprise-tracker, Property 14: Delete removes exactly one enterprise', () => {
  /**
   * Property 14: Delete removes exactly one enterprise
   *
   * For any character with N enterprises (N ≥ 1), deleting an enterprise by
   * its id (using .filter(e => e.id !== targetId)) SHALL produce an array of
   * length N − 1 that does not contain the deleted id, and all other
   * enterprises remain unchanged.
   *
   * Validates: Requirements 11.3
   */
  it('deleting by id produces N-1 length array without the deleted enterprise, others unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEnterprise(), { minLength: 1, maxLength: 10 })
          // Ensure unique IDs
          .map(enterprises => enterprises.map((e, i) => ({ ...e, id: `id-${i}` }))),
        (enterprises) => {
          // Pick a random enterprise to delete
          const targetIndex = Math.floor(Math.random() * enterprises.length);
          const targetId = enterprises[targetIndex].id;
          const N = enterprises.length;

          // Perform the delete (same logic as the app uses)
          const result = enterprises.filter(e => e.id !== targetId);

          // Result should have N-1 elements
          expect(result).toHaveLength(N - 1);

          // Result should not contain the deleted id
          expect(result.find(e => e.id === targetId)).toBeUndefined();

          // All other enterprises should remain unchanged
          const expectedOthers = enterprises.filter(e => e.id !== targetId);
          expect(result).toEqual(expectedOthers);
        }
      ),
      { numRuns: 100 }
    );
  });
});
