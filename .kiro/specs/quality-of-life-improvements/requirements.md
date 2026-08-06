# Requirements Document

## Introduction

A bundle of eight quality-of-life improvements for the WFRP4e Character Sheet PWA. These enhancements address common user friction points: unclear feedback during advancement, missing search/filter capabilities, lost roll history, inability to reorder equipment, repetitive skill advancement clicks, manual condition tracking, lack of encumbrance visibility, and tedious endeavour setup.

## Glossary

- **Advancement_Page**: The application page where players spend XP to improve skills, characteristics, and talents.
- **Character_Page**: The main application page displaying character details, skills, talents, and equipment.
- **Toast**: A brief non-modal notification message that appears temporarily on screen and auto-dismisses.
- **XP**: Experience Points — the currency spent to advance skills and characteristics.
- **Skill_Advances**: The number of advancement points allocated to a skill, determining the tier bracket for XP cost calculation.
- **Tier_Bracket**: An advancement cost range (1–5: Simple, 6–10: Intermediate, 11–15: Challenging, 16–20: Difficult, 21–25: Hard) that determines XP cost per advance.
- **Roll_History**: An ordered list of recent dice roll results persisted across page navigations and refreshes.
- **Encumbrance**: The total carried weight calculated from weapons, armour, trappings, and coins, compared against a maximum capacity.
- **Condition**: A status effect on a character with a name, stackable level, optional duration, and optional source.
- **Round_Counter**: The combat round tracker that increments when a new combat round begins.
- **Endeavour_Template**: A pre-defined set of field values for common endeavour types that auto-fills notes and cost fields.
- **Status_Tier**: The character's social standing (e.g., Brass 3, Silver 2, Gold 1) which determines costs for certain endeavour activities.
- **Drag_Handle**: A visual grip element that indicates an item can be repositioned via drag interaction.
- **Equipment_List**: An ordered array of weapon or trapping items displayed on the character sheet.

## Requirements

### Requirement 1: Inline XP Budget Feedback on Advancement

**User Story:** As a player, I want clear feedback when I lack sufficient XP to advance a skill or characteristic, so that I understand why the advancement did not occur.

#### Acceptance Criteria

1. WHEN a player attempts to advance a skill or characteristic and the character's available XP is less than the advancement cost, THE Advancement_Page SHALL display a Toast showing the required XP cost and the currently available XP (e.g., "Need 25 XP, have 10").
2. WHEN a player attempts to advance a skill or characteristic and the character's available XP is less than the advancement cost, THE Advancement_Page SHALL apply a brief visual shake animation to the XP display element.
3. WHEN a player attempts to advance a skill or characteristic and the character's available XP is greater than or equal to the advancement cost, THE Advancement_Page SHALL process the advancement without displaying any insufficient-XP feedback.
4. THE Toast SHALL auto-dismiss after 3 seconds without requiring user interaction.

### Requirement 2: Skill Search on Advancement Page

**User Story:** As a player, I want to search for specific skills on the Advancement page, so that I can quickly find and advance the skill I need without scrolling through the full list.

#### Acceptance Criteria

1. THE Advancement_Page SHALL display a text search input that filters the visible skill list by skill name.
2. WHEN a player types into the skill search input, THE Advancement_Page SHALL filter the skill list to show only skills whose names contain the search text (case-insensitive substring match).
3. WHEN the search input is cleared, THE Advancement_Page SHALL display the full skill list respecting any active "Career Only" toggle.
4. THE Advancement_Page SHALL support simultaneous use of the search filter and the "Career Only" toggle, combining both filters with AND logic.
5. THE search input SHALL include a visible label or placeholder text reading "Search skills…" and an accessible aria-label for screen readers.

### Requirement 3: Persistent Roll History

**User Story:** As a player, I want my dice roll history to persist across page navigations and browser refreshes, so that I can reference past results during a session.

#### Acceptance Criteria

1. THE Roll_History SHALL persist entries to localStorage so that roll data survives page navigation and full page refresh.
2. THE Roll_History SHALL retain a maximum of 50 entries, discarding the oldest entries when the limit is exceeded.
3. WHEN the application loads, THE Roll_History SHALL restore previously persisted entries from localStorage.
4. WHEN a player clears the roll history, THE Roll_History SHALL remove all persisted entries from localStorage.
5. IF localStorage is unavailable or a write fails, THEN THE Roll_History SHALL continue operating in memory-only mode without displaying an error to the player.

### Requirement 4: Drag-to-Reorder for Weapons and Trappings

**User Story:** As a player, I want to reorder my weapons and trappings lists by dragging items, so that I can place my most-used equipment at the top for quick access.

#### Acceptance Criteria

1. THE Character_Page SHALL display a Drag_Handle on each weapon item in the weapons list.
2. THE Character_Page SHALL display a Drag_Handle on each trapping item in the trappings list.
3. WHEN a player drags a weapon item to a new position in the weapons list, THE Character_Page SHALL reorder the weapons array to reflect the new position and persist the change.
4. WHEN a player drags a trapping item to a new position in the trappings list, THE Character_Page SHALL reorder the trappings array to reflect the new position and persist the change.
5. WHILE a drag operation is in progress, THE Character_Page SHALL display a visual indicator (e.g., placeholder or highlight) showing the target drop position.
6. THE drag-to-reorder interaction SHALL be accessible via keyboard (e.g., arrow keys with a focused handle) as a fallback for users who cannot use pointer-based drag.

### Requirement 5: Bulk Skill Advancement

**User Story:** As a player, I want to advance a skill to the next tier bracket in a single action, so that I can reduce repetitive clicking when advancing skills with sufficient XP.

#### Acceptance Criteria

1. THE Advancement_Page SHALL display an "Advance to next tier" button for each skill that has remaining advances within the current or next tier bracket.
2. WHEN a player activates the "Advance to next tier" button, THE Advancement_Page SHALL calculate the cumulative XP cost for all advances from the skill's current advance count to the next tier boundary (5, 10, 15, 20, or 25).
3. WHEN the character's available XP is greater than or equal to the cumulative tier cost, THE Advancement_Page SHALL apply all advances in the tier range atomically and deduct the total XP cost.
4. WHEN the character's available XP is less than the cumulative tier cost, THE Advancement_Page SHALL display a Toast indicating the total cost required and available XP (reusing the feedback from Requirement 1).
5. THE Advancement_Page SHALL log each individual advance within the bulk operation as separate entries in the advancement log for undo granularity.
6. WHEN a skill is already at the maximum of its current tier boundary (i.e., at advance 5, 10, 15, 20, or 25), THE "Advance to next tier" button SHALL calculate cost to reach the next boundary above.

### Requirement 6: Condition Duration Auto-Decrement

**User Story:** As a player, I want conditions with durations to automatically decrement when the combat round advances, so that I do not need to manually track and remove timed conditions.

#### Acceptance Criteria

1. WHEN the Round_Counter advances to the next round, THE Combat_Page SHALL decrement the numeric duration of each condition that has a duration value by 1.
2. WHEN a condition's duration reaches 0 after decrement, THE Combat_Page SHALL display a prompt asking the player whether to remove the condition.
3. WHEN the player confirms removal in the prompt, THE Combat_Page SHALL remove the condition from the character's active conditions.
4. WHEN the player declines removal in the prompt, THE Combat_Page SHALL keep the condition active with a duration of 0.
5. WHILE a condition has no duration value set, THE Combat_Page SHALL leave that condition unaffected by round advancement.
6. THE duration decrement SHALL only apply to conditions where the duration field contains a positive integer value.

### Requirement 7: Encumbrance Warning Indicator

**User Story:** As a player, I want a visual indicator showing how close I am to my maximum encumbrance, so that I can manage my carried weight at a glance without scrolling to the summary.

#### Acceptance Criteria

1. THE Character_Page Gear tab SHALL display a progress bar showing current encumbrance as a proportion of maximum encumbrance.
2. WHILE the current encumbrance is less than 50% of the maximum, THE progress bar SHALL display in the default (neutral) color.
3. WHILE the current encumbrance is between 50% (inclusive) and 75% (exclusive) of the maximum, THE progress bar SHALL display in a warning color (amber/yellow).
4. WHILE the current encumbrance is between 75% (inclusive) and 100% (exclusive) of the maximum, THE progress bar SHALL display in a danger color (orange).
5. WHILE the current encumbrance is at or above 100% of the maximum, THE progress bar SHALL display in a critical color (red) and include a text label "Over-encumbered".
6. THE encumbrance indicator SHALL update in real-time as weapons, armour, trappings, or coins are added, removed, or modified.
7. THE progress bar SHALL display the numeric values of current and maximum encumbrance (e.g., "12 / 18").

### Requirement 8: Endeavour Templates

**User Story:** As a player, I want to select from common endeavour types that pre-fill notes and cost fields based on my character's status tier, so that I can set up endeavours quickly without manual rulebook lookup.

#### Acceptance Criteria

1. THE Endeavours_Page SHALL offer a template selection when creating a new endeavour entry, listing common types: Training, Income, Research, Crafting, Healing, and Socialising.
2. WHEN a player selects an endeavour template, THE Endeavours_Page SHALL populate the endeavour entry's type field with the template name.
3. WHEN a player selects an endeavour template, THE Endeavours_Page SHALL populate the notes field with a brief description of the endeavour rules relevant to that type.
4. WHEN a player selects an endeavour template that has an associated cost, THE Endeavours_Page SHALL populate the cost field with the standard cost based on the character's current Status_Tier.
5. WHEN a player selects an endeavour template, THE Endeavours_Page SHALL allow the player to edit all pre-filled fields after population.
6. IF the character has no Status_Tier set, THEN THE Endeavours_Page SHALL leave the cost field empty and display a note indicating that status tier is needed for cost calculation.
