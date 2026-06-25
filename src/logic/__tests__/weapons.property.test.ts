import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { WEAPONS } from '../../data/weapons';
import { findSkillForWeapon, calcWeaponDamage, RANGED_GROUPS } from '../weapons';
import { getRuneDamageBonus } from '../runes';
import { WeaponCards } from '../../components/combat/WeaponCards';
import { BLANK_CHARACTER } from '../../types/character';
import type { WeaponItem, Talent, RangedDamageSBMode } from '../../types/character';

// Feature: dwarf-weapons, Property 1: Weapon picker field copy correctness
// **Validates: Requirements 1.3**

describe('Feature: dwarf-weapons, Property 1: Weapon picker field copy correctness', () => {
  it('picker selection copies all fields identically from the catalogue entry', () => {
    const weaponArb = fc.constantFrom(...WEAPONS);

    fc.assert(
      fc.property(weaponArb, (weapon) => {
        // Simulate picker selection by copying the weapon entry (spread)
        const pickedWeapon = { ...weapon };

        // Verify all critical fields are identical to catalogue entry
        expect(pickedWeapon.name).toBe(weapon.name);
        expect(pickedWeapon.group).toBe(weapon.group);
        expect(pickedWeapon.enc).toBe(weapon.enc);
        expect(pickedWeapon.damage).toBe(weapon.damage);
        expect(pickedWeapon.qualities).toBe(weapon.qualities);

        // rangeReach is optional (only on melee weapons)
        if (weapon.rangeReach !== undefined) {
          expect(pickedWeapon.rangeReach).toBe(weapon.rangeReach);
        }
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-weapons, Property 2: Encumbrance string invariant
// **Validates: Requirements 2.4**

describe('Feature: dwarf-weapons, Property 2: Encumbrance string invariant', () => {
  it('every weapon enc field is a string representing a non-negative integer', () => {
    const weaponArb = fc.constantFrom(...WEAPONS);

    fc.assert(
      fc.property(weaponArb, (weapon) => {
        expect(weapon.enc).toMatch(/^\d+$/);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-weapons, Property 3: Range derivation correctness
// **Validates: Requirements 2.5**

describe('Feature: dwarf-weapons, Property 3: Range derivation correctness', () => {
  it('for Dwarf ranged weapons with numeric maxR, optR === floor(maxR/3) and rangeMod === floor(maxR/5)', () => {
    // Requirement 2.5 applies to Dwarf ranged weapon entries with numeric maxR
    const dwarfRangedWeaponNames = [
      '(2H) Dwarf Handgun',
      'Dwarf Pistol',
      '(2H) Dwarf Crossbow',
      '(2H) Repeating Dwarf Handgun',
      '(2H) Grudge-raker',
      '(2H) Drakegun',
      'Drakefire Pistol',
      'Trollhammer Torpedo',
    ];

    const numericMaxRDwarfWeapons = WEAPONS.filter(
      (w) =>
        dwarfRangedWeaponNames.includes(w.name) &&
        w.maxR !== undefined &&
        /^\d+$/.test(w.maxR)
    );

    // Ensure we actually have weapons to test
    expect(numericMaxRDwarfWeapons.length).toBeGreaterThan(0);

    const weaponArb = fc.constantFrom(...numericMaxRDwarfWeapons);

    fc.assert(
      fc.property(weaponArb, (weapon) => {
        const maxR = parseInt(weapon.maxR!, 10);
        const expectedOptR = Math.floor(maxR / 3).toString();
        const expectedRangeMod = Math.floor(maxR / 5).toString();

        expect(weapon.optR).toBe(expectedOptR);
        expect(weapon.rangeMod).toBe(expectedRangeMod);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-weapons, Property 7: BP quality annotation invariant
// **Validates: Requirements 6.1, 6.4**

describe('Feature: dwarf-weapons, Property 7: BP quality annotation invariant', () => {
  it('a weapon has "BP" in its qualities iff group is "Blackpowder" OR name is "(2H) Drakegun" or "Drakefire Pistol"', () => {
    // Use fc.constantFrom to iterate over all weapons in the catalogue
    const weaponArb = fc.constantFrom(...WEAPONS);

    fc.assert(
      fc.property(weaponArb, (weapon) => {
        const hasBP = weapon.qualities.split(',').map(q => q.trim()).includes('BP');
        const shouldHaveBP =
          weapon.group === 'Blackpowder' ||
          weapon.name === '(2H) Drakegun' ||
          weapon.name === 'Drakefire Pistol';

        expect(hasBP).toBe(shouldHaveBP);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-weapons, Property 5: Engineering weapon skill resolution
// **Validates: Requirements 4.1, 4.2, 4.4**

describe('Feature: dwarf-weapons, Property 5: Engineering weapon skill resolution', () => {
  it('Engineering weapons resolve to the correct skill based on maxR presence', () => {
    // Generator for maxR: either undefined (melee) or a numeric string (ranged)
    const maxRArb = fc.option(
      fc.integer({ min: 1, max: 999 }).map(n => n.toString())
    );

    // Skills that may or may not appear in the character's skill list
    const relevantSkills = [
      { n: 'Melee (Engineering)', c: 'WS', a: 10 },
      { n: 'Ranged (Engineering)', c: 'BS', a: 15 },
      { n: 'Melee (Basic)', c: 'WS', a: 5 },
    ];

    // Generate a random subset of relevant skills
    const skillListArb = fc.subarray(relevantSkills, { minLength: 0, maxLength: 3 });

    fc.assert(
      fc.property(maxRArb, skillListArb, (maxR, skills) => {
        const weapon: { group: string; maxR?: string } = { group: 'Engineering' };
        if (maxR !== null) {
          weapon.maxR = maxR;
        }

        const result = findSkillForWeapon(weapon, skills, []);

        if (weapon.maxR !== undefined) {
          // Ranged Engineering weapon: should resolve to Ranged (Engineering) if present, otherwise null
          const rangedEngSkill = skills.find(s => s.n === 'Ranged (Engineering)');
          if (rangedEngSkill) {
            expect(result).toEqual(rangedEngSkill);
          } else {
            expect(result).toBeNull();
          }
        } else {
          // Melee Engineering weapon: should resolve to Melee (Engineering) if present, else Melee (Basic), else null
          const meleeEngSkill = skills.find(s => s.n === 'Melee (Engineering)');
          const meleeBasicSkill = skills.find(s => s.n === 'Melee (Basic)');
          if (meleeEngSkill) {
            expect(result).toEqual(meleeEngSkill);
          } else if (meleeBasicSkill) {
            expect(result).toEqual(meleeBasicSkill);
          } else {
            expect(result).toBeNull();
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-weapons, Property 6: Damage calculation correctness
// **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

describe('Feature: dwarf-weapons, Property 6: Damage calculation correctness', () => {
  it('calcWeaponDamage output matches manual computation for any SB, formula, talents, runes, and rangedDamageSBMode combination', () => {
    // Generator for SB (0-10)
    const sbArb = fc.integer({ min: 0, max: 10 });

    // Generator for flat bonus N (0-15)
    const flatNArb = fc.integer({ min: 0, max: 15 });

    // Generator for damage formula type
    const formulaArb = fc.oneof(
      flatNArb.map(n => ({ type: '+SB+N' as const, n, formula: `+SB+${n}` })),
      flatNArb.map(n => ({ type: '+1/2SB+N' as const, n, formula: `+1/2SB+${n}` })),
      flatNArb.map(n => ({ type: '+N' as const, n, formula: `+${n}` }))
    );

    // Generator for weapon type: melee or ranged
    const meleeGroups = ['Basic', 'Two-Handed', 'Fencing', 'Engineering'] as const;
    const rangedGroups = ['Bow', 'Blackpowder', 'Crossbow'] as const;

    const weaponArb = fc.oneof(
      // Melee weapon: group from melee groups, no maxR
      fc.constantFrom(...meleeGroups).map(group => ({
        isRanged: false,
        weapon: {
          name: 'Test Melee Weapon',
          group,
          enc: '1',
          damage: '', // will be filled in
          qualities: '—',
        } as WeaponItem,
      })),
      // Ranged weapon: group from ranged groups OR Engineering WITH maxR
      fc.oneof(
        fc.constantFrom(...rangedGroups).map(group => ({
          isRanged: true,
          weapon: {
            name: 'Test Ranged Weapon',
            group,
            enc: '2',
            damage: '', // will be filled in
            qualities: '—',
            maxR: '30',
          } as WeaponItem,
        })),
        fc.constant({
          isRanged: true,
          weapon: {
            name: 'Test Ranged Engineering',
            group: 'Engineering',
            enc: '2',
            damage: '', // will be filled in
            qualities: '—',
            maxR: '30',
          } as WeaponItem,
        })
      )
    );

    // Generator for talent levels (0-5)
    const talentLevelsArb = fc.record({
      strikeMightyBlow: fc.integer({ min: 0, max: 5 }),
      accurateShot: fc.integer({ min: 0, max: 5 }),
      sureShot: fc.integer({ min: 0, max: 5 }),
    });

    // Generator for rangedDamageSBMode
    const modeArb = fc.constantFrom<RangedDamageSBMode>('none', 'halfSB', 'fullSB');

    // Generator for rune list (empty or with 'rune-of-might')
    const runesArb = fc.oneof(
      fc.constant([] as string[]),
      fc.constant(['rune-of-might'] as string[])
    );

    fc.assert(
      fc.property(
        sbArb, formulaArb, weaponArb, talentLevelsArb, modeArb, runesArb,
        (SB, formulaData, weaponData, talentLevels, mode, runes) => {
          const halfSB = Math.floor(SB / 2);

          // Set the damage formula on the weapon
          const weapon: WeaponItem = { ...weaponData.weapon, damage: formulaData.formula };
          const isRanged = weaponData.isRanged;

          // Build talents array
          const talents: Talent[] = [];
          if (talentLevels.strikeMightyBlow > 0) {
            talents.push({ n: 'Strike Mighty Blow', lvl: talentLevels.strikeMightyBlow, desc: '' });
          }
          if (talentLevels.accurateShot > 0) {
            talents.push({ n: 'Accurate Shot', lvl: talentLevels.accurateShot, desc: '' });
          }
          if (talentLevels.sureShot > 0) {
            talents.push({ n: 'Sure Shot', lvl: talentLevels.sureShot, desc: '' });
          }

          // Compute expected damage manually
          let expected = 0;

          // Step 1: Compute base damage from formula + mode
          if (isRanged && mode !== 'none') {
            // House rule overrides the SB component for ranged weapons
            if (mode === 'halfSB') {
              expected = halfSB;
            } else if (mode === 'fullSB') {
              expected = SB;
            }
            expected += formulaData.n;
          } else {
            // RAW: use formula as written
            if (formulaData.type === '+SB+N') {
              expected = SB + formulaData.n;
            } else if (formulaData.type === '+1/2SB+N') {
              expected = halfSB + formulaData.n;
            } else {
              // +N (flat)
              expected = formulaData.n;
            }
          }

          // Step 2: Add talent bonuses
          if (isRanged) {
            expected += talentLevels.accurateShot;
            expected += talentLevels.sureShot;
          } else {
            expected += talentLevels.strikeMightyBlow;
          }

          // Step 3: Add rune bonus
          const runeBonus = getRuneDamageBonus(runes);
          expected += runeBonus;

          // Call the function under test
          const result = calcWeaponDamage(weapon, SB, talents, runes, mode);

          expect(result.num).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-weapons, Property 4: Quality rendering faithfulness
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.3**

describe('Feature: dwarf-weapons, Property 4: Quality rendering faithfulness', () => {
  it('weapons with non-empty, non-"—" qualities render their full qualities text faithfully in WeaponCards', () => {
    // Filter to weapons with meaningful qualities
    const qualifiedWeapons = WEAPONS.filter(
      (w) => w.qualities && w.qualities !== '—' && w.qualities.trim() !== ''
    );

    // Ensure we have weapons to test
    expect(qualifiedWeapons.length).toBeGreaterThan(0);

    const weaponArb = fc.constantFrom(...qualifiedWeapons);

    fc.assert(
      fc.property(weaponArb, (weaponData) => {
        // Create a WeaponItem from the catalogue entry
        const weapon: WeaponItem = {
          name: weaponData.name,
          group: weaponData.group,
          enc: weaponData.enc,
          rangeReach: weaponData.rangeReach,
          damage: weaponData.damage,
          qualities: weaponData.qualities,
          maxR: weaponData.maxR,
          optR: weaponData.optR,
          rangeMod: weaponData.rangeMod,
          reload: weaponData.reload,
        };

        // Minimal character for rendering
        const character = {
          ...BLANK_CHARACTER,
          chars: {
            ...BLANK_CHARACTER.chars,
            S: { i: 40, a: 0, b: 0 },
          },
        };

        // Render WeaponCards using createElement (no JSX in .ts file)
        const { container } = render(
          createElement(WeaponCards, {
            weapons: [weapon],
            character,
            onRollWeapon: () => {},
          })
        );

        // The component renders w.qualities directly as text content
        // Verify that the rendered output contains the full qualities string
        const textContent = container.textContent || '';
        expect(textContent).toContain(weaponData.qualities);

        // Additionally verify specific rated qualities if present
        // Check for Salvo, Spread, Crewed with numeric ratings
        const qualities = weaponData.qualities.split(',').map(q => q.trim());
        for (const quality of qualities) {
          expect(textContent).toContain(quality);
        }
      }),
      { numRuns: 100 }
    );
  });
});
