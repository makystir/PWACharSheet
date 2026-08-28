# Requirements Document

## Introduction

WFRP4e (Core p.293, "Worn Items") states that worn items such as armour, clothing, and jewellery have their Encumbrance dropped by 1 (minimum 0), which often means they count as Encumbrance 0 when worn. The character sheet already applies this reduction to armour items via a `worn` toggle, but there is currently no equivalent for trappings. Players who want a wearable trapping (a Cloak, Boots, Robes, etc.) to count at its reduced worn Encumbrance must either edit the Encumbrance value by hand or misuse the "stored on horse" flag.

This feature adds a "Worn" toggle to wearable trappings only. When a trapping is marked worn, its effective Encumbrance is reduced by 1 per item (minimum 0), multiplied by quantity, and this reduction is reflected consistently in the character page encumbrance total, the encumbrance breakdown tooltip, and the print layout. The toggle mirrors the existing armour `worn` pattern and the existing trapping "stored on horse" checkbox pattern for consistency.

## Glossary

- **Trapping**: A non-weapon, non-armour item of equipment carried by a character, represented by the `Trapping` model `{ name, enc, quantity, storedOnHorse?, worn? }`.
- **Wearable_Trapping**: A trapping classified as clothing or jewellery per the WFRP4e "Worn Items" rule (Core p.293) — for example Boots, Cloak, Clothing, Coat, Hat, Hood or Mask, Silk Underwear, Practical Robes, Standard Robes, Elaborate Robes.
- **Non_Wearable_Trapping**: Any trapping not classified as clothing or jewellery — for example Backpack, Sack, Tent, Waterskin, or a weapon carried as a trapping.
- **Worn_Classifier**: The logic component that determines whether a trapping is a Wearable_Trapping, based on the item name.
- **Effective_Encumbrance**: The Encumbrance a trapping contributes to the carried total after applying the worn reduction and quantity.
- **Worn_Reduction**: A reduction of 1 Encumbrance point per individual item, applied to each unit in a worn trapping's quantity, with the per-item result clamped to a minimum of 0.
- **Character_Page**: The primary character sheet view rendered by `CharacterPage.tsx`, including the trapping list, the carried encumbrance total, and its breakdown tooltip.
- **Encumbrance_Breakdown_Tooltip**: The tooltip that shows how the carried encumbrance total is calculated, per the calculated-totals steering rule.
- **Print_Layout**: The printable character sheet rendered by `PrintLayout.tsx`.
- **Worn_Toggle**: The user-facing control (a checkbox mirroring the "stored on horse" pattern) that sets a trapping's `worn` state.

## Requirements

### Requirement 1: Worn field on the trapping model

**User Story:** As a player, I want a wearable trapping to remember whether it is worn, so that its reduced Encumbrance persists across sessions.

#### Acceptance Criteria

1. THE Trapping model SHALL include an optional boolean field named `worn`.
2. WHEN a character containing a trapping with a `worn` value is saved, THE Character_Page SHALL persist the `worn` value with that trapping.
3. WHEN a saved character is loaded, THE Character_Page SHALL restore each trapping's `worn` value as it was saved.
4. WHERE a loaded trapping has no `worn` field, THE Character_Page SHALL treat that trapping as not worn.
5. WHEN a trapping's `worn` value round-trips through save then load, THE Character_Page SHALL produce a trapping whose `worn` value equals the value before saving.

### Requirement 2: Classify wearable trappings

**User Story:** As a player, I want the Worn toggle to appear only on clothing and jewellery items, so that I do not mark non-wearable items as worn.

#### Acceptance Criteria

1. THE Worn_Classifier SHALL classify a trapping as a Wearable_Trapping WHEN the trapping name matches a defined clothing or jewellery item from the WFRP4e "Worn Items" rule (Core p.293), including Boots, Cloak, Clothing, Coat, Hat, Hood or Mask, Silk Underwear, Practical Robes, Standard Robes, and Elaborate Robes.
2. THE Worn_Classifier SHALL classify a trapping as a Non_Wearable_Trapping WHEN the trapping name does not match a defined clothing or jewellery item.
3. THE Worn_Classifier SHALL classify trapping names case-insensitively.
4. WHERE a trapping is a Wearable_Trapping, THE Character_Page SHALL display the Worn_Toggle for that trapping.
5. WHERE a trapping is a Non_Wearable_Trapping, THE Character_Page SHALL omit the Worn_Toggle for that trapping.

### Requirement 3: Toggle worn state

**User Story:** As a player, I want to toggle a wearable trapping as worn, so that I can reduce its effective Encumbrance without editing values by hand.

#### Acceptance Criteria

1. WHEN the user activates the Worn_Toggle on a Wearable_Trapping that is not worn, THE Character_Page SHALL set that trapping's `worn` value to true.
2. WHEN the user activates the Worn_Toggle on a Wearable_Trapping that is worn, THE Character_Page SHALL set that trapping's `worn` value to false.
3. WHEN the user sets a trapping's `worn` value, THE Character_Page SHALL recalculate and display the updated carried encumbrance total.

### Requirement 4: Apply the worn reduction to effective encumbrance

**User Story:** As a player, I want a worn trapping to count for 1 less Encumbrance per item, so that my carried total matches the WFRP4e worn-items rule.

#### Acceptance Criteria

1. WHERE a trapping is worn, THE Character_Page SHALL compute that trapping's per-item Effective_Encumbrance as its base Encumbrance minus 1, clamped to a minimum of 0.
2. WHERE a trapping is not worn, THE Character_Page SHALL compute that trapping's per-item Effective_Encumbrance as its base Encumbrance.
3. THE Character_Page SHALL compute a trapping's total Effective_Encumbrance as its per-item Effective_Encumbrance multiplied by its quantity.
4. WHEN a worn trapping has a base Encumbrance of 0, THE Character_Page SHALL compute that trapping's per-item Effective_Encumbrance as 0.
5. THE Character_Page SHALL exclude the total Effective_Encumbrance of any trapping marked as stored on horse from the carried encumbrance total.
6. THE Character_Page SHALL compute the carried encumbrance total as the sum of the total Effective_Encumbrance of all trappings that are not stored on horse.

### Requirement 5: Consistency across displays

**User Story:** As a player, I want the worn reduction reflected everywhere my encumbrance is shown, so that the character page, tooltip, and printout agree.

#### Acceptance Criteria

1. THE Print_Layout SHALL apply the same Worn_Reduction and quantity calculation used by the Character_Page when computing the carried encumbrance total.
2. THE Encumbrance_Breakdown_Tooltip SHALL reflect the Effective_Encumbrance of worn trappings in the displayed breakdown.
3. WHEN a worn trapping contributes a reduced Effective_Encumbrance, THE Encumbrance_Breakdown_Tooltip SHALL show that trapping's contribution using its Effective_Encumbrance rather than its base Encumbrance.
4. FOR ALL characters, the carried encumbrance total shown on the Character_Page SHALL equal the carried encumbrance total shown on the Print_Layout.

### Requirement 6: Worn and stored-on-horse mutual exclusivity

**User Story:** As a player, I want worn and stored-on-horse to be mutually exclusive, so that an item is not both worn and packed away at the same time.

#### Acceptance Criteria

1. WHEN the user sets a trapping's `worn` value to true, THE Character_Page SHALL set that trapping's `storedOnHorse` value to false.
2. WHEN the user sets a trapping's `storedOnHorse` value to true, THE Character_Page SHALL set that trapping's `worn` value to false.
3. IF a loaded trapping has both `worn` and `storedOnHorse` set to true, THEN THE Character_Page SHALL treat that trapping as stored on horse and not worn.

### Requirement 7: Backward compatibility

**User Story:** As an existing user, I want my saved characters to keep working, so that adding the worn feature does not change my current encumbrance totals.

#### Acceptance Criteria

1. WHEN a character saved before this feature is loaded, THE Character_Page SHALL treat every trapping without a `worn` field as not worn.
2. WHEN a character with no worn trappings is loaded, THE Character_Page SHALL compute the same carried encumbrance total as before this feature was added.

### Requirement 8: Toggle accessibility and presentation

**User Story:** As a player using assistive technology, I want the Worn toggle to be labeled and operable like the existing stored-on-horse control, so that the interface stays consistent and accessible.

#### Acceptance Criteria

1. THE Worn_Toggle SHALL use the same control type and interaction pattern as the existing "stored on horse" checkbox.
2. THE Worn_Toggle SHALL have an accessible label identifying the control as the worn state for the associated trapping.
3. THE Worn_Toggle SHALL reflect the current `worn` value of the associated trapping as its checked state.

## Out of Scope / Flagged Ambiguities

- **Bulky flaw (Core p.293).** The *Bulky* flaw notes that clothing and armour with the Bulky quality remain Encumbrance 1 even when worn. Trappings in this application have no quality/flaw field, so this edge case is flagged as a potential out-of-scope item. If in scope, a worn Bulky trapping should have a per-item Effective_Encumbrance floor of 1 instead of 0. Recommendation: exclude from this feature unless the user confirms otherwise.
- **Jewellery data.** The current trapping list (`src/data/trappings.ts`) does not include distinct jewellery entries; the Worn_Classifier is defined against the clothing/jewellery examples from the rulebook plus the wearable items present in the data. Custom user-entered items are classified by the same name-based rule.
