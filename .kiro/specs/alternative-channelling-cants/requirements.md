# Requirements Document

## Introduction

This feature adds support for Alternative Channelling Cants, an optional house rule from Archives of the Empire Volume III (Chapter VIII). Cants are semi-informal magical practices that allow wizards to expend channelled power (gathered SL) for minor but significant effects unique to each of the 8 Winds of Magic. Each Wind has three Cants costing 1, 2, and 3 SL respectively. The feature integrates with the existing channelling system already implemented in the PWA character sheet and follows the established house rule toggle pattern (similar to `usePsychologyTracker`).

## Glossary

- **Channelling_System**: The existing system in the PWA that tracks accumulated SL from Extended Channelling Tests, stored in `channellingProgress` on the Character model.
- **Cant**: A minor magical effect powered by expending gathered channelling SL. Each Cant belongs to a specific Lore and costs a fixed number of SL (1, 2, or 3).
- **Wind**: One of the 8 Winds of Magic (Ghur/Beasts, Shyish/Death, Aqshy/Fire, Azyr/Heavens, Chamon/Metal, Ghyran/Life, Hysh/Light, Ulgu/Shadows).
- **Lore**: The magical tradition associated with a specific Wind (e.g., Lore of Beasts for Ghur).
- **Gathered_Power**: The accumulated SL from an Extended Channelling Test, stored in the character's `channellingProgress` array.
- **House_Rules_Toggle**: A boolean field on the Character's `houseRules` object that enables or disables an optional rule system.
- **Settings_Panel**: The existing UI area where house rule toggles are configured per character.
- **Cant_Panel**: A new UI component that displays available Cants and allows the user to expend gathered power to activate them.

## Requirements

### Requirement 1: House Rule Toggle

**User Story:** As a player, I want to enable or disable Alternative Channelling Cants via a house rule toggle, so that this optional rule only appears when my group chooses to use it.

#### Acceptance Criteria

1. THE Settings_Panel SHALL include a toggle labelled "Alternative Channelling Cants" in the house rules section.
2. WHEN the toggle is set to false, THE Cant_Panel SHALL not render in the DOM.
3. WHEN the toggle is set to true, THE Cant_Panel SHALL render for characters that have at least one spell with a lore value in the set {Lore of Beasts, Lore of Death, Lore of Fire, Lore of Heavens, Lore of Life, Lore of Light, Lore of Metal, Lore of Shadows}.
4. THE House_Rules_Toggle SHALL default to false for new characters and for existing characters loaded without the field present (backfill behaviour).
5. WHEN the toggle is changed from true to false, THE Character model SHALL retain any previously learned Cants data without deletion.
6. WHEN the toggle is set to true and the character has no spell with a colour magic lore value, THE Cant_Panel SHALL not render in the DOM.

### Requirement 2: Cant Data Model

**User Story:** As a player, I want my learned Cants to be stored on my character, so that they persist across sessions and are available when channelling.

#### Acceptance Criteria

1. THE Character model SHALL include a `learnedCants` field that stores an array of Cant references, each containing the Lore identifier (matching one of the 8 colour magic Lore strings from the existing spell catalogue, e.g., "Lore of Beasts") and the Cant name, with a maximum of 24 entries.
2. WHEN a character has no learned Cants, THE `learnedCants` field SHALL be an empty array.
3. THE Channelling_System SHALL store all 24 canonical Cants (3 per Lore × 8 Lores) in a static data catalogue.
4. THE Character model SHALL reference only Cant entries whose Lore identifier and Cant name pair exists in the static catalogue, and SHALL NOT contain duplicate entries (same Lore and Cant name pair appearing more than once).
5. IF a character is loaded with a `learnedCants` entry that does not match any entry in the static catalogue, THEN THE load logic SHALL discard that invalid entry and retain only valid entries.

### Requirement 3: Cant Learning Rules

**User Story:** As a player, I want the app to track how many Cants I can learn based on the number of spells I know from each Lore, so that progression follows the book rules.

#### Acceptance Criteria

1. WHEN a character knows at least 1 spell from a given colour magic Lore (Beasts, Death, Fire, Heavens, Metal, Life, Light, or Shadows), THE Cant_Panel SHALL permit the character to have learned 1 Cant from that Lore.
2. WHEN a character knows at least 3 spells from a given colour magic Lore, THE Cant_Panel SHALL permit the character to have learned up to 2 Cants from that Lore.
3. WHEN a character knows at least 6 spells from a given colour magic Lore, THE Cant_Panel SHALL permit the character to have learned up to 3 Cants from that Lore.
4. IF the user attempts to add a Cant from a Lore and the character's learned Cant count for that Lore already equals the permitted maximum, THEN THE Cant_Panel SHALL disable the add action for that Lore's unlearned Cants and display a validation message indicating how many additional spells from that Lore are required to unlock the next Cant slot.
5. THE Cant_Panel SHALL compute the spell count per Lore by matching the character's `spells` entries by name against the static spell catalogue's Lore assignments; any character spell whose name does not match an entry in the static catalogue SHALL be excluded from the count.
6. IF a character's spell count for a Lore drops below a threshold (due to spell removal) and the character has more learned Cants from that Lore than the new permitted maximum, THEN THE Cant_Panel SHALL display a warning indicating which excess Cants must be removed and SHALL prevent adding further Cants from any Lore until the violation is resolved.
7. WHEN a character has 0 spells from a given colour magic Lore, THE Cant_Panel SHALL not permit the character to learn or retain any Cants from that Lore.

### Requirement 4: Cant Activation and SL Expenditure

**User Story:** As a player, I want to activate a Cant by expending gathered channelling SL, so that I can use these abilities during gameplay.

#### Acceptance Criteria

1. WHEN the user activates a learned Cant, THE Channelling_System SHALL deduct the Cant's SL cost from the character's current accumulated SL for the matching Wind and update the displayed SL total immediately.
2. IF the character's accumulated SL for the matching Wind is less than the Cant's SL cost, THEN THE Cant_Panel SHALL disable the activation button for that Cant and display the current SL alongside the required SL cost.
3. WHEN a Cant is successfully activated, THE Cant_Panel SHALL display a confirmation indicating the Cant name, SL cost deducted, and remaining gathered SL until the user dismisses it or activates a different panel action.
4. IF a Cant has already been activated during the current round, THEN THE Cant_Panel SHALL disable all remaining Cant activation buttons and display an indicator that the one-Cant-per-round limit has been reached.
5. WHEN the user advances to a new round via the existing round-tracking controls, THE Cant_Panel SHALL re-enable Cant activation buttons (subject to sufficient SL per criterion 2) and clear the one-Cant-per-round indicator.
6. IF a Cant allows a variable SL expenditure, THEN THE Cant_Panel SHALL present a numeric input constrained between the Cant's minimum SL cost and the character's current accumulated SL for that Wind (capped at Willpower Bonus) before confirming activation.

### Requirement 5: Cant Reference Display

**User Story:** As a player, I want to see the full description and SL cost of each Cant, so that I can make informed decisions during play.

#### Acceptance Criteria

1. THE Cant_Panel SHALL display each learned Cant with its name, SL cost, and full effect description.
2. WHILE a Cant is not yet learned but the character meets the spell-count prerequisite to learn it (per Requirement 3), THE Cant_Panel SHALL display the Cant name and SL cost with a visual indicator distinguishing it from learned Cants.
3. IF a Cant belongs to a Lore the character has access to but the character does not yet meet the spell-count prerequisite to learn it, THEN THE Cant_Panel SHALL display the Cant name and SL cost in a locked state that indicates the prerequisite has not been met.
4. THE Cant_Panel SHALL group Cants by Lore, using the Wind's common name (e.g., "Beasts (Ghur)"), and SHALL only display Lore groups for which the character knows at least 1 spell from that Lore.
5. THE Cant_Panel SHALL visually distinguish between Cants that can currently be activated (character's accumulated SL for the matching Wind is greater than or equal to the Cant's SL cost) and those that cannot (accumulated SL is less than the Cant's SL cost).
6. THE Cant_Panel SHALL display Lore groups in alphabetical order by the Wind's common name.

### Requirement 6: Static Cant Catalogue

**User Story:** As a developer, I want a static data file containing all 24 Cants with their rules text, so that the UI can reference accurate lore content.

#### Acceptance Criteria

1. THE static catalogue SHALL contain exactly 24 entries: 3 Cants for each of the 8 Lores of colour magic.
2. FOR ALL Cant entries, THE catalogue SHALL include: a unique Cant identifier (composed of Lore key and Cant name), a Lore key matching one of the 8 Wind identifiers used in the Channelling_System, Cant name, SL cost (1, 2, or 3), and the complete rules text describing the Cant's mechanical effect as written in the source material.
3. THE Lore of Beasts Cants SHALL be: Face of the Wild (1 SL), Talons of Ghur (2 SL), Thick Hide (3 SL).
4. THE Lore of Death Cants SHALL be: Eyes of Death (1 SL), Whispers of Doom (2 SL), Death's Visage (3 SL).
5. THE Lore of Fire Cants SHALL be: Brighten Blaze (1 SL), Set Alight (2 SL), Fervent Bellow (3 SL).
6. THE Lore of Heavens Cants SHALL be: Visions of Trauma (1 SL), Crackling Blade (2 SL), Visions of Fortune (3 SL).
7. THE Lore of Metal Cants SHALL be: Reinforcement (1 SL), Heart of Iron (2 SL), Quicksilver Blade (3 SL).
8. THE Lore of Life Cants SHALL be: Staunch (1 SL), Invigorate (2 SL), Regenerate (3 SL).
9. THE Lore of Light Cants SHALL be: Brighteyes (1 SL), Purging Light (2 SL), Perfection of the Self (3 SL).
10. THE Lore of Shadows Cants SHALL be: Ulgu's Touch (1 SL), Not Your Problem (2 SL), A Passing Shadow (3 SL).
11. FOR ALL Cant identifiers referenced in a character's `learnedCants` array, THE static catalogue SHALL return the matching entry when queried by that identifier, enabling lookup by Lore key or by unique Cant identifier.
12. THE static catalogue SHALL be immutable at runtime; no user action or application logic SHALL modify its entries after initial load.

### Requirement 7: Integration with Existing Channelling UI

**User Story:** As a player, I want the Cants feature to integrate naturally with the existing channelling progress display, so that I have a unified view of my channelled power and how I can spend it.

#### Acceptance Criteria

1. WHILE a character has active channelling progress for one or more spells of a given Wind, THE Cant_Panel SHALL display the total accumulated SL across all channelling progress entries for that Wind alongside the character's learned Cants for that Wind.
2. IF the character has no active channelling progress entries for any Wind, THEN THE Cant_Panel SHALL display all learned Cants with their names, SL costs, and effect descriptions, with all activation buttons disabled.
3. THE Cant_Panel SHALL render within the SpellCastingPanel component, immediately after the memorized spells list for the corresponding Lore.
4. WHEN a Cant is successfully activated, THE Cant_Panel SHALL immediately update the displayed accumulated SL to reflect the deduction, without requiring a page reload or manual refresh.
5. WHILE a character has active channelling progress for multiple Winds simultaneously, THE Cant_Panel SHALL display a separate Cant group per Wind, each showing only that Wind's aggregated SL and associated learned Cants.

### Requirement 8: Data Persistence and Migration

**User Story:** As a player, I want my Cant selections to persist when I save and reload my character, so that I do not lose my choices between sessions.

#### Acceptance Criteria

1. WHEN a character is saved, THE storage layer SHALL persist the `learnedCants` array alongside all other character data such that loading the same character returns the identical `learnedCants` entries in the same order.
2. WHEN a character is loaded that was saved before this feature existed (i.e., the stored JSON contains no `learnedCants` field), THE load logic SHALL backfill `learnedCants` as an empty array so the Character model invariant is satisfied.
3. WHEN a character is exported to JSON and re-imported, THE import logic SHALL preserve the `learnedCants` array intact, replacing the blank default with the source array (consistent with existing array-replacement merge behaviour).
4. FOR ALL valid `learnedCants` arrays, serialising and then deserialising the character SHALL produce an equivalent `learnedCants` array (identical entries in the same order — round-trip property).
5. IF a loaded or imported `learnedCants` array contains entries whose identifiers do not match any entry in the static Cant catalogue, THEN THE load logic SHALL discard those invalid entries and retain only entries with valid catalogue identifiers.
6. WHEN the `useCants` House_Rules_Toggle is changed from true to false, THE storage layer SHALL retain the persisted `learnedCants` array without modification on the next save.
