# Requirements Document

## Introduction

This feature implements the Sword-dancing techniques subsystem for the WFRP 4e character sheet PWA. Sword-dancing is an ancient High Elf martial tradition where Swordmasters channel the Winds of Magic through precise blade movements. Characters with the "Sword-dancing" talent learn techniques progressively, starting with "Ritual of Cleansing" (granted free by the talent) and purchasing additional techniques at escalating XP costs (100 XP per technique already known). Each technique requires a Melee (Two-handed) Test to perform, with a target SL that varies by technique difficulty. This feature requires a new data structure for technique definitions, a character state field for learned techniques, logic for XP cost calculation and technique learning, and a UI component to display and manage learned techniques.

## Glossary

- **Techniques_Module**: The `src/data/swordDancingTechniques.ts` file exporting the `SWORD_DANCING_TECHNIQUES` array of `SwordDancingTechnique` objects
- **Character_Type**: The `Character` interface in `src/types/character.ts` that holds all character state
- **Technique_Logic**: The `src/logic/swordDancing.ts` file containing functions for learning techniques and calculating XP costs
- **Technique_UI**: The React component(s) responsible for displaying and managing learned Sword-dancing techniques
- **SL**: Success Levels — the target number a character must achieve on a Melee (Two-handed) Test to perform a technique
- **Yenlui**: The spiritual balance state of a High Elf character, affecting the difficulty of Sword-dancing Tests (Balanced/Light = Challenging +0, Dark = Very Hard -30)
- **Sword_Dancing_Talent**: The existing "Sword-dancing" talent entry in `TALENT_DB` with max "1"
- **Advancement_Log**: The `advancementLog` array on the Character object that records all XP expenditures

## Requirements

### Requirement 1: Define Sword-dancing Technique Data Structure

**User Story:** As a developer, I want a well-defined TypeScript interface for Sword-dancing techniques, so that technique data is type-safe and consistent across the application.

#### Acceptance Criteria

1. THE Techniques_Module SHALL export a `SwordDancingTechnique` interface with fields: `id` (string), `name` (string), `sl` (number — the target SL required), `description` (string summarising the technique effect), and `order` (number — the learning sequence position)
2. THE Techniques_Module SHALL export the `SwordDancingTechnique` interface from `src/types/character.ts` to maintain consistency with existing type patterns
3. THE `SwordDancingTechnique` interface SHALL be importable by both data modules and logic modules without circular dependencies

### Requirement 2: Define Sword-dancing Technique Static Data

**User Story:** As a player with a Swordmaster character, I want all 10 canonical Sword-dancing techniques available in the application data, so that I can learn and track them accurately.

#### Acceptance Criteria

1. THE Techniques_Module SHALL include "Ritual of Cleansing" with id "ritual-of-cleansing", sl 1, order 1, and a description noting it adjusts Yenlui state through a meditative sequence of thirty forms
2. THE Techniques_Module SHALL include "Flight of the Phoenix" with id "flight-of-the-phoenix", sl 1, order 2, and a description noting it is a devastating thrown sword attack with Penetrating quality dealing weapon Damage at SB + WPB yards range
3. THE Techniques_Module SHALL include "Path of the Sun" with id "path-of-the-sun", sl 1, order 3, and a description noting it grants +1 War Leader talent for WPB Rounds, with extra SL adding duration or additional War Leader levels
4. THE Techniques_Module SHALL include "Path of Frost" with id "path-of-frost", sl 1, order 4, and a description noting successful strikes ignore 1 AP for WSB Rounds, with Critical Wound rolls increased by +10 per extra SL
5. THE Techniques_Module SHALL include "Path of the Storm" with id "path-of-the-storm", sl 1, order 5, and a description noting it allows opposing missile attacks with Melee (Two-handed) for IB Rounds, increased by 1 Round per extra SL
6. THE Techniques_Module SHALL include "Path of the Rain" with id "path-of-the-rain", sl 2, order 6, and a description noting it grants +1 SL to Dodge Tests for AgB Rounds, with extra SL adding duration and additional Dodge SL
7. THE Techniques_Module SHALL include "Shadows of Loec" with id "shadows-of-loec", sl 2, order 7, and a description noting the character moves SL x Movement yards appearing blurred, enemies must pass Initiative Test or gain Surprised
8. THE Techniques_Module SHALL include "Path of the Hawk" with id "path-of-the-hawk", sl 3, order 8, and a description noting it inflicts 10 + SL Damage (ignoring Armour, not TB) within WPB yards plus 2 Deafened Conditions on failed Endurance Test
9. THE Techniques_Module SHALL include "Path of Falling Water" with id "path-of-falling-water", sl 3, order 9, and a description noting it allows a single attack against all Engaged enemies within weapon reach, with triple attacks against Swarm targets
10. THE Techniques_Module SHALL include "Final Stroke of the Master" with id "final-stroke-of-the-master", sl 4, order 10, and a description noting the opponent must pass a Very Hard (-30) Dodge Test or suffer +4 Damage, with extra SL adding +1 Damage each

### Requirement 3: Add Learned Techniques to Character State

**User Story:** As a player, I want my character to persistently track which Sword-dancing techniques have been learned, so that my progress is saved between sessions.

#### Acceptance Criteria

1. THE Character_Type SHALL include a `learnedTechniques` field (optional array of strings) storing the ids of learned Sword-dancing techniques
2. WHEN a character has the Sword_Dancing_Talent, THE Character_Type SHALL initialise `learnedTechniques` with "ritual-of-cleansing" as the first entry (granted free by the talent)
3. THE Character_Type SHALL preserve all existing fields unchanged when the `learnedTechniques` field is added
4. WHEN `learnedTechniques` is undefined or absent on a loaded character, THE application SHALL treat it as an empty array for backward compatibility

### Requirement 4: Calculate Technique Learning XP Cost

**User Story:** As a player, I want the XP cost for learning a new technique to be calculated correctly based on how many techniques I already know, so that I can plan my advancement.

#### Acceptance Criteria

1. WHEN a character knows N techniques (including Ritual of Cleansing), THE Technique_Logic SHALL calculate the cost of the next technique as `N * 100` XP
2. THE Technique_Logic SHALL export a `getTechniqueXpCost` function that accepts the number of currently known techniques and returns the XP cost for the next technique
3. FOR ALL valid counts of known techniques (1 through 9), THE `getTechniqueXpCost` function SHALL return the correct escalating cost (100, 200, 300, 400, 500, 600, 700, 800, 900 XP respectively)
4. THE Technique_Logic SHALL export a `canLearnTechnique` function that checks whether a character has the Sword_Dancing_Talent, has sufficient XP, and has not already learned the specified technique

### Requirement 5: Learn Technique and Deduct XP

**User Story:** As a player, I want to spend XP to learn a new Sword-dancing technique, so that my character grows in martial mastery.

#### Acceptance Criteria

1. WHEN a character learns a new technique, THE Technique_Logic SHALL deduct the calculated XP cost from `xpCur` and add it to `xpSpent`
2. WHEN a character learns a new technique, THE Technique_Logic SHALL append the technique id to the `learnedTechniques` array
3. WHEN a character learns a new technique, THE Technique_Logic SHALL record the advancement in the Advancement_Log with type "technique", the technique name, and the XP cost
4. IF a character does not have the Sword_Dancing_Talent, THEN THE Technique_Logic SHALL prevent learning and return an appropriate error
5. IF a character has insufficient XP, THEN THE Technique_Logic SHALL prevent learning and return an appropriate error
6. IF a character has already learned the specified technique, THEN THE Technique_Logic SHALL prevent learning and return an appropriate error

### Requirement 6: Display Learned Techniques in UI

**User Story:** As a player, I want to see my learned Sword-dancing techniques displayed clearly on my character sheet, so that I can reference them during play.

#### Acceptance Criteria

1. WHEN a character has the Sword_Dancing_Talent, THE Technique_UI SHALL display a "Sword-dancing Techniques" section on the character page
2. THE Technique_UI SHALL list all learned techniques showing their name, SL requirement, and description
3. THE Technique_UI SHALL visually distinguish learned techniques from unlearned techniques
4. WHEN a character does not have the Sword_Dancing_Talent, THE Technique_UI SHALL not display the Sword-dancing Techniques section
5. THE Technique_UI SHALL display the XP cost for the next available technique

### Requirement 7: Provide UI for Learning New Techniques

**User Story:** As a player, I want a UI control to learn new techniques by spending XP, so that I can advance my Swordmaster without manual editing.

#### Acceptance Criteria

1. THE Technique_UI SHALL provide a "Learn Technique" action for each unlearned technique
2. WHEN the "Learn Technique" action is triggered, THE Technique_UI SHALL display the XP cost and request confirmation before proceeding
3. IF the character has sufficient XP and meets prerequisites, THEN THE Technique_UI SHALL enable the "Learn Technique" action
4. IF the character has insufficient XP or lacks the Sword_Dancing_Talent, THEN THE Technique_UI SHALL disable the "Learn Technique" action and display the reason
5. WHEN a technique is successfully learned, THE Technique_UI SHALL update the display to reflect the newly learned technique and recalculated next-technique cost

### Requirement 8: Validate Data Integrity with Tests

**User Story:** As a developer, I want automated tests verifying the Sword-dancing technique data and logic, so that regressions are caught if the code is modified.

#### Acceptance Criteria

1. THE test suite SHALL verify that all 10 techniques exist in the `SWORD_DANCING_TECHNIQUES` array with correct id, name, sl, and order fields
2. THE test suite SHALL verify that `getTechniqueXpCost` returns the correct escalating cost for all valid input values (1 through 9)
3. THE test suite SHALL verify that `learnTechnique` correctly deducts XP, updates `learnedTechniques`, and creates an advancement log entry
4. THE test suite SHALL verify that `canLearnTechnique` returns false when the character lacks the Sword_Dancing_Talent
5. THE test suite SHALL verify that `canLearnTechnique` returns false when the character has insufficient XP
6. THE test suite SHALL verify that `canLearnTechnique` returns false when the technique is already learned
7. FOR ALL valid technique ids, parsing then looking up a technique by id SHALL return the original technique object (round-trip property)

### Requirement 9: Preserve Existing Data and Functionality

**User Story:** As a developer, I want the addition of the Sword-dancing subsystem to leave all existing character data and functionality unchanged, so that no existing features are broken.

#### Acceptance Criteria

1. THE Character_Type SHALL retain all pre-existing fields unchanged after the addition of `learnedTechniques`
2. THE application SHALL load characters saved before this feature without errors, treating missing `learnedTechniques` as an empty array
3. THE existing Sword_Dancing_Talent entry in `TALENT_DB` SHALL remain unchanged
4. THE existing test suite SHALL continue to pass without modification

---

## Follow-up Notes

- **Sword-dancing Test Difficulty by Yenlui**: The Yenlui spiritual balance system (Balanced/Light = Challenging +0, Dark = Very Hard -30) affects technique difficulty. If a Yenlui tracking system is implemented later, the technique UI could display adjusted difficulty. For now, the technique descriptions note the SL requirement and the rules text explains Yenlui modifiers.
- **Technique Ordering**: Techniques are numbered by `order` field but the source material does not explicitly require learning them in sequence. The XP cost scales by total techniques known, not by which specific technique is chosen. Players may learn techniques in any order.
