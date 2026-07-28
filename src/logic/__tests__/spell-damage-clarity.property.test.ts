import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatDamageBreakdown, formatCastDamageBreakdown } from '../spell-casting';

// Feature: spell-damage-clarity

interface SpellItem {
  name: string;
  cn: number;
  range: string;
  target: string;
  duration: string;
  effect: string;
  memorized?: boolean;
}

function makeSpell(effect: string): SpellItem {
  return {
    name: 'Test Spell',
    cn: 0,
    range: '48',
    target: '1',
    duration: 'Instant',
    effect,
  };
}

// Property 1: Damage formula formatting resolves correct modifier
// **Validates: Requirements 1.2, 1.3, 1.4**
describe('Property 1: Damage formula formatting resolves correct modifier', () => {
  it('for "Dmg +N" patterns, returns "Dmg: N + SL"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (n, wpBonus, tbBonus) => {
          const spell = makeSpell(`Magic missile Dmg +${n}`);
          const result = formatDamageBreakdown(spell, wpBonus, tbBonus);
          expect(result).toBe(`Dmg: ${n} + SL`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for "Dmg WPB" patterns, returns "Dmg: WPB(X) + SL" where X is wpBonus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (wpBonus, tbBonus) => {
          const spell = makeSpell('Magic missile Dmg WPB');
          const result = formatDamageBreakdown(spell, wpBonus, tbBonus);
          expect(result).toBe(`Dmg: WPB(${wpBonus}) + SL`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for "Dmg TB" patterns, returns "Dmg: TB(X) + SL" where X is tbBonus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (wpBonus, tbBonus) => {
          const spell = makeSpell('Magic missile Dmg TB');
          const result = formatDamageBreakdown(spell, wpBonus, tbBonus);
          expect(result).toBe(`Dmg: TB(${tbBonus}) + SL`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 2: Non-magic-missile spells produce no breakdown
// **Validates: Requirements 1.5**
describe('Property 2: Non-magic-missile spells produce no breakdown', () => {
  it('for any spell effect that does not contain "dmg", "damage", or "magic missile", returns null', () => {
    // Use a set of safe effect text templates that cannot trigger magic missile detection
    const safeEffects = [
      'Healing Touch',
      'Shield of Faith',
      'Light',
      'Teleport',
      'Invisibility',
      'Fireball splash zone',
      'Protection 3 AP all zones',
      'Move target 6 yrs',
      'Fear test or flee',
      'Silence 10 yrs',
      'Slow target half move',
      'Blessing of Valor +10 WS',
    ];

    const safeEffectArb = fc.oneof(
      fc.constantFrom(...safeEffects),
      fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
        const lower = s.toLowerCase();
        return !lower.includes('dmg') && !lower.includes('damage') && !lower.includes('magic missile');
      })
    );

    fc.assert(
      fc.property(
        safeEffectArb,
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (effect, wpBonus, tbBonus) => {
          const spell = makeSpell(effect);
          const result = formatDamageBreakdown(spell, wpBonus, tbBonus);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 3: Cast result breakdown arithmetic is correct (without overcast)
// **Validates: Requirements 2.2**
describe('Property 3: Cast result breakdown arithmetic is correct (without overcast)', () => {
  it('for any damageModifier and castingSL, returns "M + SL(X) = T" where T = M + X', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 10 }),
        (damageModifier, castingSL) => {
          const result = formatCastDamageBreakdown(damageModifier, castingSL);
          const expectedTotal = damageModifier + castingSL;
          expect(result).toBe(`${damageModifier} + SL(${castingSL}) = ${expectedTotal}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 4: Cast result breakdown arithmetic is correct (with overcast)
// **Validates: Requirements 2.3**
describe('Property 4: Cast result breakdown arithmetic is correct (with overcast)', () => {
  it('for any damageModifier, castingSL, and overcastBonus, returns "M + SL(X) + Overcast(Y) = T" where T = M + X + Y', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 7 }),
        (damageModifier, castingSL, overcastBonus) => {
          const result = formatCastDamageBreakdown(damageModifier, castingSL, overcastBonus);
          const expectedTotal = damageModifier + castingSL + overcastBonus;
          expect(result).toBe(`${damageModifier} + SL(${castingSL}) + Overcast(${overcastBonus}) = ${expectedTotal}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
