# Implementation Plan: Archives of the Empire Vol. II Integration

## Overview

This plan adds Ogre species data, three Ogre-only careers, Ogre weapons/armour, the Lore of the Great Maw spells, a star signs reference table, and a psychology tracker component. Implementation follows existing patterns: static data in `src/data/`, logic in `src/logic/`, types in `src/types/character.ts`, and components in `src/components/`.

## Tasks

- [x] 1. Extend type definitions and update wound calculator
  - [x] 1.1 Add `woundMultiplier` to `SpeciesData` and `brokenTally` to `Character` in `src/types/character.ts`
    - Add optional `woundMultiplier?: number` field to the `SpeciesData` interface
    - Add optional `brokenTally?: number` field to the `Character` interface
    - _Requirements: 2.3, 12.3_

  - [x] 1.2 Update `calculateWoundsCore` in `src/logic/calculators.ts` to support the wound multiplier
    - Add a `multiplier: number = 1` parameter to `calculateWoundsCore`
    - Apply the multiplier to the base formula `(sb + tb + wpb) * multiplier` before adding Hardy
    - Update `calculateTotalWounds` to accept and pass through the multiplier (read from species data)
    - Update `computeWoundMaximum` and `syncWoundFields` to pass the multiplier
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 1.3 Write property tests for wound calculator multiplier
    - **Property 1: Wound formula with multiplier produces correct result**
    - **Property 2: Default wound multiplier preserves standard formula**
    - **Validates: Requirements 2.1, 2.2, 2.4**
    - Test file: `src/logic/__tests__/calculators.property.test.ts`

- [x] 2. Add Ogre species data
  - [x] 2.1 Add the Ogre entry to `src/data/species.ts`
    - Add "Ogre" key with correct characteristics (WS 20, BS 10, S 35, T 35, I 0, Ag 15, Dex 10, Int 10, WP 20, Fel 10), move 6, fate 0, resilience 3, extraPoints 1, woundsUseSB true, woundMultiplier 2
    - Add the 12 species skills and 6 species talents as specified in the design
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write unit tests for Ogre species data
    - Verify all base characteristics, movement, fate, resilience, extra points values
    - Verify species skills list contains all 12 entries
    - Verify species talents list contains all 6 entries
    - Test file: `src/data/__tests__/species.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Add Ogre career data and species restriction
  - [x] 3.1 Add Maneater, Rhinox Herder, and Ogre Butcher career schemes to `src/data/careers.ts`
    - Add Maneater in Warriors class with 4 levels, correct skills/talents/characteristics per level
    - Add Rhinox Herder in Rangers class with 4 levels, correct skills/talents/characteristics per level
    - Add Ogre Butcher in Academics class with 4 levels, correct skills/talents/characteristics per level
    - _Requirements: 3.1–3.10, 4.1–4.10, 5.1–5.10_

  - [x] 3.2 Add Ogre species restriction to `src/logic/career-eligibility.ts`
    - Add `isOgreSpecies(species: string): boolean` helper function
    - Add `OGRE_ONLY_CAREERS` list with "Maneater", "Rhinox Herder", "Ogre Butcher"
    - Update `getExcludedCareers` to exclude Ogre-only careers for non-Ogre species
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 3.3 Write property test for career species restriction
    - **Property 7: Non-Ogre species excludes Ogre-only careers**
    - **Validates: Requirements 13.2**
    - Test file: `src/logic/__tests__/career-eligibility.property.test.ts`

  - [x] 3.4 Write unit tests for Ogre careers and eligibility
    - Verify career level structures match requirements for all 3 careers
    - Verify Ogre can access Ogre-only careers
    - Verify non-Ogre species cannot access Ogre-only careers
    - Test files: `src/data/__tests__/careers.test.ts`, `src/logic/__tests__/career-eligibility.test.ts`
    - _Requirements: 3.1, 4.1, 5.1, 13.1, 13.2, 13.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add Ogre weapons, ammunition, and armour data
  - [x] 5.1 Add Ogre melee weapons to `src/data/weapons.ts`
    - Add Ogre Club (Basic, Enc 2, Average, +SB+4, note about non-Ogre Improvised)
    - Add Ironfist (Basic, Enc 2, Short, +SB+3, Shield 1, Defensive)
    - Add Great Ogre Club (Two-Handed, Enc 4, Long, +SB+6, Impact, Tiring)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.2 Add Ogre ranged weapons and ammunition to `src/data/weapons.ts`
    - Add Great Throwing Spear (Throwing, Enc 2, SBx3, +SB+4, Impale)
    - Add Leadbelcher Gun (Blackpowder, Enc 8, Range 50, +10, Dangerous, Reload 5)
    - Add Ogre Pistol (Blackpowder, Enc 3, Range 20, +8, Dangerous, Pistol, Reload 3)
    - Add Harpoon Launcher (Engineering, Enc 4, Range 30, +SB+5, Impale, Reload 2)
    - Add Chain Trap (Entangling, Enc 2, SBx2, —, Entangle)
    - Add Leadbelcher Shot and Leadbelcher Ball ammunition entries
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 5.3 Add Ogre Gutplate to `src/data/armour.ts`
    - Add Ogre Gutplate (Plate, Body, AP 3, Impenetrable)
    - _Requirements: 8.1_

  - [x] 5.4 Write unit tests for Ogre weapons and armour
    - Verify all melee weapon entries have correct fields
    - Verify all ranged weapon and ammo entries have correct fields
    - Verify Ogre Gutplate entry is correct
    - Test files: `src/data/__tests__/weapons.test.ts`, `src/data/__tests__/armour.test.ts`
    - _Requirements: 6.1, 6.2, 6.3, 7.1–7.7, 8.1_

- [x] 6. Add Lore of the Great Maw spells
  - [x] 6.1 Add 7 Great Maw spells to `src/data/spells.ts`
    - Add Bonecrusher (CN 5, Range WP yards, Target 1, Duration Instant, effect as specified)
    - Add Bullgorger (CN 5, Range WPB yards, Target 1, Duration WPB Rounds, +2 SB)
    - Add Braingobbler (CN 5, Range You, Target You, Duration WPB Rounds, Fear 2)
    - Add Taste Death (CN 2, Range You, Target You, Duration Instant, learn cause of death)
    - Add Trollguts (CN 7, Range TB yards, Target 1, Duration TB Rounds, Regenerate trait)
    - Add The Maw (CN 11, Range WP yards, Target AoE WPB yards, Duration WPB Rounds, pit damage)
    - Add Feast of the Fallen (CN 9, Range You, Target Special, Duration WPB Rounds, Vampiric trait)
    - All entries must have `lore: "Lore of the Great Maw"`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 6.2 Write property test for Great Maw spell completeness
    - **Property 3: Lore of the Great Maw spells have complete data**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8**
    - Test file: `src/data/__tests__/spells.property.test.ts`

  - [x] 6.3 Write unit tests for individual spell values
    - Verify each spell has correct CN, range, target, duration, effect
    - Test file: `src/data/__tests__/spells.test.ts`
    - _Requirements: 9.2–9.8_

- [x] 7. Add star signs data
  - [x] 7.1 Create `src/data/starSigns.ts` with 20 star sign entries
    - Define `StarSignEntry` interface with name, type, bonuses, penalty, talent fields
    - Add all 20 star sign entries following the design data model
    - Entries with type 'characteristics' have two +2 bonuses and one −3 penalty
    - Entries with type 'talent' have a talent name and one −3 penalty
    - Export the `STAR_SIGNS` array
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 7.2 Write property test for star sign structure validity
    - **Property 4: Star sign entries have valid modifier structure**
    - **Validates: Requirements 10.2, 10.3**
    - Test file: `src/data/__tests__/starSigns.property.test.ts`

  - [x] 7.3 Write unit test verifying 20 star sign entries exist
    - Verify STAR_SIGNS array length is 20
    - Test file: `src/data/__tests__/starSigns.test.ts`
    - _Requirements: 10.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Psychology Tracker component
  - [x] 9.1 Create `src/components/pages/PsychologyTracker.tsx` and `PsychologyTracker.module.css`
    - Render list of `psychologyTraits` from character state
    - Display each entry with type (Phobia, Animosity, Hatred, Trauma), target/description, and numeric rating
    - Display current `brokenTally` count
    - Display phobia threshold (WP characteristic value)
    - Add/remove controls for psychology entries
    - Prompt for target description when adding Phobia, Animosity, Hatred, or Trauma entries
    - Implement increment control for `brokenTally`
    - Show alert when `brokenTally >= WP` indicating phobia acquisition
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 9.2 Integrate PsychologyTracker into the Identity tab on the CharacterPage
    - Import and render PsychologyTracker in the appropriate location on CharacterPage
    - Pass character data and update handlers as props
    - _Requirements: 11.1, 10.4_

  - [x] 9.3 Write property tests for psychology logic
    - **Property 5: Removing a psychology entry decreases list length**
    - **Property 6: Broken tally threshold alert triggers correctly**
    - **Validates: Requirements 12.5, 12.7**
    - Test file: `src/logic/__tests__/psychology.property.test.ts`

  - [x] 9.4 Write unit tests for PsychologyTracker component
    - Test adding each psychology type prompts for correct input
    - Test removing an entry removes it from the list
    - Test brokenTally increment behavior
    - Test alert displays when threshold exceeded
    - Test file: `src/components/pages/__tests__/PsychologyTracker.test.tsx`
    - _Requirements: 11.2, 11.3, 11.4, 12.1–12.7_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest with fast-check for property-based testing — run with `vitest --run`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "3.1", "5.1", "5.2", "5.3", "6.1", "7.1"] },
    { "id": 3, "tasks": ["3.2", "5.4", "6.2", "6.3", "7.2", "7.3"] },
    { "id": 4, "tasks": ["3.3", "3.4"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3"] },
    { "id": 7, "tasks": ["9.4"] }
  ]
}
```
