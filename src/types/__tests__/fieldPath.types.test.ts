// Feature: state-safety-core, Task 1 — type-level test for FieldPath / FieldValue.
//
// These are the compile-time guarantees behind the typed `update` surface
// (Req 1.1: reject unknown field paths; Req 1.2: reject mismatched value types;
// Req 1.5: renamed/removed fields error at every reference site; Req 7.2: the
// utilities compile under strict tsc with verbatimModuleSyntax).
//
// The real assertions here are the `expectTypeOf` checks and the
// `@ts-expect-error` markers: this file passing `npm run typecheck` (and the
// build type-check) IS the test. Each `@ts-expect-error` line must sit directly
// above an expression that is genuinely a type error — if a path or value ever
// becomes valid, tsc reports the now-"unused" expect-error and the check fails.
// A single runtime `expect` keeps vitest happy that the suite ran.
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Character, FieldPath, FieldValue } from '../character';

describe('FieldPath<Character> / FieldValue<Character, P> (type-level)', () => {
  it('accepts representative valid editable paths (Req 1.1)', () => {
    // Top-level scalar leaf.
    expectTypeOf<'name'>().toMatchTypeOf<FieldPath<Character>>();
    // Nested object leaves.
    expectTypeOf<'move.m'>().toMatchTypeOf<FieldPath<Character>>();
    expectTypeOf<'chars.WS.a'>().toMatchTypeOf<FieldPath<Character>>();
    expectTypeOf<'ap.head'>().toMatchTypeOf<FieldPath<Character>>();
    // Array element field addressed by a numeric-string index.
    expectTypeOf<'bSkills.3.a'>().toMatchTypeOf<FieldPath<Character>>();
    expectTypeOf<'trappings.2.name'>().toMatchTypeOf<FieldPath<Character>>();
    // Currency scalar leaves.
    expectTypeOf<'wGC'>().toMatchTypeOf<FieldPath<Character>>();

    // A concrete value typed as FieldPath<Character> — must compile.
    const path: FieldPath<Character> = 'chars.WS.a';
    expect(path).toBe('chars.WS.a');
  });

  it('resolves the leaf value type at a path (Req 1.2)', () => {
    // Scalar string leaf.
    expectTypeOf<FieldValue<Character, 'name'>>().toEqualTypeOf<string>();
    // Numeric leaves at various depths.
    expectTypeOf<FieldValue<Character, 'move.m'>>().toEqualTypeOf<number>();
    expectTypeOf<FieldValue<Character, 'chars.WS.a'>>().toEqualTypeOf<number>();
    expectTypeOf<FieldValue<Character, 'ap.head'>>().toEqualTypeOf<number>();
    expectTypeOf<FieldValue<Character, 'bSkills.3.a'>>().toEqualTypeOf<number>();
    expectTypeOf<FieldValue<Character, 'wGC'>>().toEqualTypeOf<number>();
    // Array-element string leaf.
    expectTypeOf<FieldValue<Character, 'trappings.2.name'>>().toEqualTypeOf<string>();
  });

  it('rejects paths that do not exist on Character (Req 1.1, 1.5)', () => {
    // @ts-expect-error - 'nope' is not a field on Character
    const bad1: FieldPath<Character> = 'nope';
    // @ts-expect-error - 'chars.WS.z' — 'z' is not a key of CharacteristicValue
    const bad2: FieldPath<Character> = 'chars.WS.z';
    // @ts-expect-error - 'move.x' — 'x' is not a key of the move object
    const bad3: FieldPath<Character> = 'move.x';
    // @ts-expect-error - typo'd top-level field (renamed/removed field guard)
    const bad4: FieldPath<Character> = 'nam';

    // Reference the bindings so they are not reported as unused, without
    // asserting on their (never-legal) runtime value.
    expect([bad1, bad2, bad3, bad4]).toHaveLength(4);
  });

  it('rejects values whose type does not match the leaf (Req 1.2)', () => {
    // @ts-expect-error - 'name' is a string leaf, not a number
    const v1: FieldValue<Character, 'name'> = 5;
    // @ts-expect-error - 'chars.WS.a' is a number leaf, not a string
    const v2: FieldValue<Character, 'chars.WS.a'> = 'five';
    // @ts-expect-error - 'move.m' is a number leaf, not a boolean
    const v3: FieldValue<Character, 'move.m'> = true;

    expect([v1, v2, v3]).toHaveLength(3);
  });
});
