// Feature: alternative-channelling-cants, Property 8: SL deduction correctness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deductSLFromProgress } from '../cants';
import type { ChannellingProgress, SpellData } from '../../types/character';
import { COLOUR_LORES } from '../../data/cants';

/**
 * Validates: Requirements 4.1
 *
 * Property 8: SL deduction correctness
 * For any valid Cant activation (where canActivateCant returns true),
 * after deducting the Cant's SL cost from the channelling progress entries
 * for that Wind, the new aggregated SL for that Wind shall equal the previous
 * aggregated SL minus the Cant's SL cost, and all other Winds' aggregated SL
 * shall remain unchanged.
 */

// Helper: build a fake spell catalogue with spells distributed across multiple Lores
function buildSpellCatalogue(spellNames: Map<string, string[]>): SpellData[] {
  const catalogue: SpellData[] = [];
  for (const [lore, names] of spellNames.entries()) {
    for (const name of names) {
      catalogue.push({
        name,
        cn: '0',
        range: 'Touch',
        target: 'You',
        duration: 'Instant',
        effect: 'Test effect',
        lore,
      });
    }
  }
  return catalogue;
}

// Helper: aggregate SL for a given lore from channelling progress
function aggregateSLForLore(
  progress: ChannellingProgress[],
  lore: string,
  spellCatalogue: SpellData[]
): number {
  const colourLoreSet = new Set<string>(COLOUR_LORES);
  const spellNameToLore = new Map<string, string>();
  for (const spell of spellCatalogue) {
    if (colourLoreSet.has(spell.lore)) {
      spellNameToLore.set(spell.name, spell.lore);
    }
  }
  let total = 0;
  for (const entry of progress) {
    if (spellNameToLore.get(entry.spellName) === lore) {
      total += entry.accumulatedSL;
    }
  }
  return total;
}

// Generator: pick a target lore and at least one other lore for "other Winds"
const arbTargetLore = fc.constantFrom(...COLOUR_LORES);
const arbOtherLore = fc.constantFrom(...COLOUR_LORES);

// Generator for a channelling progress setup with multiple Winds
const arbDeductionScenario = fc.record({
  targetLore: arbTargetLore,
  otherLore: arbOtherLore.filter((l) => true), // will filter in property
  // Number of entries for the target Wind (1-5)
  targetEntryCount: fc.integer({ min: 1, max: 5 }),
  // SL values for target Wind entries (each 1-20)
  targetSLValues: fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 5 }),
  // Number of entries for other Winds (0-4)
  otherEntryCount: fc.integer({ min: 0, max: 4 }),
  // SL values for other Wind entries (each 0-15)
  otherSLValues: fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 0, maxLength: 4 }),
  // SL cost to deduct (1-10)
  slCost: fc.integer({ min: 1, max: 10 }),
});

describe('Feature: alternative-channelling-cants, Property 8: SL deduction correctness', () => {
  it('after deduction, target Wind SL = previous SL − cost and other Winds unchanged', () => {
    fc.assert(
      fc.property(arbDeductionScenario, (scenario) => {
        const { targetLore, targetEntryCount, targetSLValues, otherEntryCount, otherSLValues, slCost } = scenario;

        // Pick an "other" lore that differs from targetLore
        const otherLores = COLOUR_LORES.filter(l => l !== targetLore);
        // Use first available other lore
        const otherLore = otherLores[0];

        // Trim SL values to actual entry counts
        const actualTargetSLs = targetSLValues.slice(0, targetEntryCount);
        if (actualTargetSLs.length === 0) return; // Need at least 1 entry

        // Compute total SL for target Wind
        const totalTargetSL = actualTargetSLs.reduce((sum, v) => sum + v, 0);

        // Precondition: total SL for target Wind must be >= slCost
        fc.pre(totalTargetSL >= slCost);

        // Build spell names for target lore
        const targetSpellNames = actualTargetSLs.map((_, i) => `TargetSpell_${i}`);

        // Build spell names for other lore
        const actualOtherSLs = otherSLValues.slice(0, otherEntryCount);
        const otherSpellNames = actualOtherSLs.map((_, i) => `OtherSpell_${i}`);

        // Build spell catalogue
        const spellNameMap = new Map<string, string[]>();
        spellNameMap.set(targetLore, targetSpellNames);
        if (otherSpellNames.length > 0) {
          spellNameMap.set(otherLore, otherSpellNames);
        }
        const spellCatalogue = buildSpellCatalogue(spellNameMap);

        // Build channelling progress
        const channellingProgress: ChannellingProgress[] = [];
        for (let i = 0; i < actualTargetSLs.length; i++) {
          channellingProgress.push({
            spellName: targetSpellNames[i],
            accumulatedSL: actualTargetSLs[i],
          });
        }
        for (let i = 0; i < actualOtherSLs.length; i++) {
          channellingProgress.push({
            spellName: otherSpellNames[i],
            accumulatedSL: actualOtherSLs[i],
          });
        }

        // Compute SL before deduction
        const previousTargetSL = aggregateSLForLore(channellingProgress, targetLore, spellCatalogue);
        const previousOtherSL = aggregateSLForLore(channellingProgress, otherLore, spellCatalogue);

        // Perform deduction
        const result = deductSLFromProgress(channellingProgress, targetLore, slCost, spellCatalogue);

        // Compute SL after deduction
        const newTargetSL = aggregateSLForLore(result, targetLore, spellCatalogue);
        const newOtherSL = aggregateSLForLore(result, otherLore, spellCatalogue);

        // Assert: target Wind SL decreased by exactly slCost
        expect(newTargetSL).toBe(previousTargetSL - slCost);

        // Assert: other Winds' SL unchanged
        expect(newOtherSL).toBe(previousOtherSL);
      }),
      { numRuns: 100 }
    );
  });

  it('deduction does not modify entries from other Winds (individual entry check)', () => {
    fc.assert(
      fc.property(arbDeductionScenario, (scenario) => {
        const { targetLore, targetEntryCount, targetSLValues, otherEntryCount, otherSLValues, slCost } = scenario;

        const otherLores = COLOUR_LORES.filter(l => l !== targetLore);
        const otherLore = otherLores[0];

        const actualTargetSLs = targetSLValues.slice(0, targetEntryCount);
        if (actualTargetSLs.length === 0) return;

        const totalTargetSL = actualTargetSLs.reduce((sum, v) => sum + v, 0);
        fc.pre(totalTargetSL >= slCost);

        const targetSpellNames = actualTargetSLs.map((_, i) => `TargetSpell_${i}`);
        const actualOtherSLs = otherSLValues.slice(0, otherEntryCount);
        const otherSpellNames = actualOtherSLs.map((_, i) => `OtherSpell_${i}`);

        const spellNameMap = new Map<string, string[]>();
        spellNameMap.set(targetLore, targetSpellNames);
        if (otherSpellNames.length > 0) {
          spellNameMap.set(otherLore, otherSpellNames);
        }
        const spellCatalogue = buildSpellCatalogue(spellNameMap);

        const channellingProgress: ChannellingProgress[] = [];
        for (let i = 0; i < actualTargetSLs.length; i++) {
          channellingProgress.push({
            spellName: targetSpellNames[i],
            accumulatedSL: actualTargetSLs[i],
          });
        }
        for (let i = 0; i < actualOtherSLs.length; i++) {
          channellingProgress.push({
            spellName: otherSpellNames[i],
            accumulatedSL: actualOtherSLs[i],
          });
        }

        const result = deductSLFromProgress(channellingProgress, targetLore, slCost, spellCatalogue);

        // Each "other Wind" entry should have identical accumulatedSL to its original
        for (let i = 0; i < actualOtherSLs.length; i++) {
          const originalIdx = actualTargetSLs.length + i;
          expect(result[originalIdx].accumulatedSL).toBe(actualOtherSLs[i]);
          expect(result[originalIdx].spellName).toBe(otherSpellNames[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all accumulatedSL values remain non-negative after deduction', () => {
    fc.assert(
      fc.property(arbDeductionScenario, (scenario) => {
        const { targetLore, targetEntryCount, targetSLValues, slCost } = scenario;

        const actualTargetSLs = targetSLValues.slice(0, targetEntryCount);
        if (actualTargetSLs.length === 0) return;

        const totalTargetSL = actualTargetSLs.reduce((sum, v) => sum + v, 0);
        fc.pre(totalTargetSL >= slCost);

        const targetSpellNames = actualTargetSLs.map((_, i) => `TargetSpell_${i}`);

        const spellNameMap = new Map<string, string[]>();
        spellNameMap.set(targetLore, targetSpellNames);
        const spellCatalogue = buildSpellCatalogue(spellNameMap);

        const channellingProgress: ChannellingProgress[] = actualTargetSLs.map((sl, i) => ({
          spellName: targetSpellNames[i],
          accumulatedSL: sl,
        }));

        const result = deductSLFromProgress(channellingProgress, targetLore, slCost, spellCatalogue);

        // No entry should go negative
        for (const entry of result) {
          expect(entry.accumulatedSL).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
