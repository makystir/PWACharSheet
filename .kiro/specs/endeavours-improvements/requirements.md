# Requirements Document

## Introduction

This specification covers improvements to the existing Endeavours tracking system in the WFRP 4e character sheet PWA. The system currently allows players to create downtime periods and assign endeavour entries, but lacks several usability features, data integrity safeguards, and test coverage. These improvements expand class coverage, add progress tracking, improve mobile usability, and introduce property-based tests for the pure logic module.

## Glossary

- **Endeavours_Tracker**: The page component and logic module responsible for managing downtime periods and their endeavour entries within the PWA.
- **DowntimePeriod**: A data structure representing a block of downtime containing a label, slot count, and a list of EndeavourEntry items.
- **EndeavourEntry**: A data structure representing a single endeavour activity within a period, containing an id, type, notes, completion status, optional cost, and progress status.
- **CLASS_ENDEAVOURS**: A lookup map keyed by WFRP 4e character class that returns the class-specific endeavour options available in the picker.
- **Endeavour_Picker**: The UI component that displays grouped endeavour options (General, Class, Species, Custom) for selection.
- **Logic_Module**: The pure-function module (`src/logic/endeavours.ts`) containing all state transformations for the endeavours system.
- **Toast**: A brief, auto-dismissing notification message displayed to confirm a user action.
- **Touch_Target**: The interactive area of a UI control that responds to touch or click input.

## Requirements

### Requirement 1: Expand Class Endeavours Coverage

**User Story:** As a player with a character class not currently in the CLASS_ENDEAVOURS map, I want to see class-specific endeavour options for my class, so that the picker provides relevant suggestions for all major WFRP 4e classes.

#### Acceptance Criteria

1. THE CLASS_ENDEAVOURS map SHALL contain entries for at least the following classes: Academics, Burghers, Courtiers, Peasants, Rangers, Riverfolk, Rogues, Warriors, Priests, Doctors, Wizards, Entertainers, Soldiers, Servants, Nobles, with each entry containing at least 1 and no more than 10 endeavour option strings.
2. WHEN a character's class matches "Priests", THE Endeavour_Picker SHALL display "Preach Sermon" and "Pray for Guidance" as class endeavour options.
3. WHEN a character's class matches "Doctors", THE Endeavour_Picker SHALL display "Treat Patients" and "Research Remedy" as class endeavour options.
4. WHEN a character's class matches "Wizards", THE Endeavour_Picker SHALL display "Study Arcane Lore" and "Brew Potion" as class endeavour options.
5. WHEN a character's class matches "Entertainers", THE Endeavour_Picker SHALL display "Perform" and "Compose" as class endeavour options.
6. WHEN a character's class matches "Soldiers", THE Endeavour_Picker SHALL display "Combat Training" and "Drill" as class endeavour options.
7. WHEN a character's class matches "Servants", THE Endeavour_Picker SHALL display "Serve Master" and "Gather Rumours" as class endeavour options.
8. WHEN a character's class matches "Nobles", THE Endeavour_Picker SHALL display "Reputation" and "Seek Patronage" as class endeavour options.

### Requirement 2: Add Progress States to Endeavour Entries

**User Story:** As a player tracking multi-session endeavours like Training or Crafting, I want to mark an endeavour's progress as pending, in-progress, or completed, so that I can distinguish between activities at different stages.

#### Acceptance Criteria

1. THE EndeavourEntry type SHALL include a "status" field with allowed values "pending", "in_progress", or "completed".
2. WHEN a new EndeavourEntry is created, THE Endeavours_Tracker SHALL set the status field to "pending" by default.
3. WHEN an entry's status is "pending", THE Endeavours_Tracker SHALL display the entry row with no additional colour highlight or icon beyond the default entry styling.
4. WHEN an entry's status is "in_progress", THE Endeavours_Tracker SHALL display the entry row with a visually distinct indicator that differs from both the "pending" and "completed" states in either background colour, border colour, or icon presence.
5. WHEN an entry's status is "completed", THE Endeavours_Tracker SHALL display the entry type text with a strikethrough style and render the entry row at an opacity between 0.5 and 0.7.
6. WHEN a user clicks the status control on an entry, THE Endeavours_Tracker SHALL cycle the status in the order "pending" → "in_progress" → "completed" → "pending".
7. IF existing EndeavourEntry data contains a "completed" boolean field instead of a "status" field, THEN THE Endeavours_Tracker SHALL treat completed=true as status "completed" and completed=false as status "pending".

### Requirement 3: Add Date and Session Tracking to Periods

**User Story:** As a player reviewing past downtime, I want to record when a downtime period occurred, so that I can correlate it with campaign sessions.

#### Acceptance Criteria

1. THE DowntimePeriod type SHALL include an optional "date" field of type string representing a date in "YYYY-MM-DD" format.
2. THE DowntimePeriod type SHALL include an optional "sessionNumber" field of type number restricted to positive integers from 1 to 9999.
3. WHEN a new DowntimePeriod is created, THE Logic_Module SHALL leave the date and sessionNumber fields undefined by default.
4. WHEN the user edits the date field, THE Endeavours_Tracker SHALL store the provided value on the DowntimePeriod.
5. WHEN the user edits the sessionNumber field and the provided value is a positive integer from 1 to 9999, THE Endeavours_Tracker SHALL store the numeric value on the DowntimePeriod.
6. IF the user enters a non-numeric or out-of-range value in the sessionNumber field, THEN THE Endeavours_Tracker SHALL reject the input and retain the previous sessionNumber value.
7. WHEN the user clears the date or sessionNumber field to an empty value, THE Endeavours_Tracker SHALL set the corresponding field back to undefined on the DowntimePeriod.
8. WHEN a DowntimePeriod has both date and sessionNumber set, THE Endeavours_Tracker SHALL display both values in the period header after the label, showing the date followed by the session number.
9. WHEN a DowntimePeriod has only one of date or sessionNumber set, THE Endeavours_Tracker SHALL display the single set value in the period header after the label.

### Requirement 4: Fix ID Generation Using UUIDs

**User Story:** As a player rapidly adding periods or entries, I want IDs generated without collision risk, so that data integrity is maintained regardless of click speed.

#### Acceptance Criteria

1. WHEN a new DowntimePeriod is created, THE Logic_Module SHALL generate its id using crypto.randomUUID when available.
2. IF crypto.randomUUID is not available, THEN THE Logic_Module SHALL generate a unique id using a fallback mechanism that produces a string identifier with at least 128 bits of randomness.
3. WHEN a new EndeavourEntry is created, THE Logic_Module SHALL generate its id using the same UUID generation strategy as DowntimePeriod (crypto.randomUUID with fallback).
4. THE EndeavourEntry id field type SHALL be changed from number to string to accommodate UUID values.
5. THE DowntimePeriod id field type SHALL be changed from number to string to accommodate UUID values.
6. IF entries or periods created with the old numeric id format exist in stored data, THEN THE Endeavours_Tracker SHALL load, display, update, and delete those entries and periods without error, treating both numeric and string id values as valid identifiers.

### Requirement 5: Add Reorder Support for Periods and Entries

**User Story:** As a player organising my downtime log, I want to reorder periods and entries within periods, so that I can arrange them in my preferred sequence.

#### Acceptance Criteria

1. WHEN a user activates the move-up control on a DowntimePeriod identified by its id, THE Logic_Module SHALL swap that period with the immediately preceding period in the array and return a new array containing all original periods.
2. WHEN a user activates the move-down control on a DowntimePeriod identified by its id, THE Logic_Module SHALL swap that period with the immediately following period in the array and return a new array containing all original periods.
3. WHEN a user activates the move-up control on an EndeavourEntry identified by its id within a period identified by its periodId, THE Logic_Module SHALL swap that entry with the immediately preceding entry in the same period's entries array and return the updated endeavours array with all original entries preserved.
4. WHEN a user activates the move-down control on an EndeavourEntry identified by its id within a period identified by its periodId, THE Logic_Module SHALL swap that entry with the immediately following entry in the same period's entries array and return the updated endeavours array with all original entries preserved.
5. IF a move-up is activated on the first item in a list, THEN THE Logic_Module SHALL return the array unchanged with no modification to element order or content.
6. IF a move-down is activated on the last item in a list, THEN THE Logic_Module SHALL return the array unchanged with no modification to element order or content.
7. WHEN a reorder operation is performed on any list, THE Logic_Module SHALL preserve the array length and the identity of all elements such that only the positions of the two swapped elements differ from the input.

### Requirement 6: Improve Picker UX for Unmatched Class

**User Story:** As a player whose character class does not appear in CLASS_ENDEAVOURS, I want clear feedback in the picker, so that I understand no class-specific options are available rather than seeing a silently empty section.

#### Acceptance Criteria

1. WHEN the character's class does not match any key in CLASS_ENDEAVOURS, THE Endeavour_Picker SHALL display a non-selectable informational item with the text "No class endeavours found for [class name]" in the picker list where class endeavour options would normally appear, substituting the character's actual class value for [class name].
2. IF the character's class field is empty, undefined, or contains only whitespace characters, THEN THE Endeavour_Picker SHALL omit the class endeavour group entirely from the picker list without displaying an error or informational message.
3. THE Endeavour_Picker SHALL perform class matching against CLASS_ENDEAVOURS keys using an exact case-sensitive string comparison of the character's class field value.

### Requirement 7: Fix Mobile Touch Targets

**User Story:** As a mobile user, I want all interactive controls in the Endeavours page to meet minimum touch target sizes, so that I can accurately tap checkboxes and buttons without frustration.

#### Acceptance Criteria

1. THE Endeavours_Tracker checkbox elements SHALL have a minimum touch target area of 44×44 CSS pixels, achieved through element sizing or additional padding/margin that expands the tappable region.
2. THE Endeavours_Tracker delete button elements SHALL have a minimum touch target area of 44×44 CSS pixels, achieved through element sizing or additional padding/margin that expands the tappable region.
3. THE Endeavours_Tracker move-up and move-down button elements SHALL have a minimum touch target area of 44×44 CSS pixels, achieved through element sizing or additional padding/margin that expands the tappable region.
4. THE Endeavours_Tracker interactive controls SHALL maintain at least 8 CSS pixels of spacing between adjacent touch targets so that no two targets overlap.

### Requirement 8: Add Save Feedback

**User Story:** As a player performing actions in the Endeavours page, I want brief visual confirmation after adding or removing entries, so that I have confidence the action succeeded.

#### Acceptance Criteria

1. WHEN an EndeavourEntry is successfully added to a period, THE Endeavours_Tracker SHALL display a Toast with the message "Endeavour added".
2. WHEN an EndeavourEntry is successfully removed from a period, THE Endeavours_Tracker SHALL display a Toast with the message "Endeavour removed".
3. WHEN a DowntimePeriod is successfully added, THE Endeavours_Tracker SHALL display a Toast with the message "Period added".
4. WHEN a DowntimePeriod is successfully removed, THE Endeavours_Tracker SHALL display a Toast with the message "Period removed".
5. THE Toast SHALL auto-dismiss after no more than 3 seconds without requiring user interaction.
6. THE Toast SHALL be rendered in a fixed position at the bottom-centre of the viewport, outside the document flow, so that it does not shift or overlap the period cards and entry lists.
7. IF a new Toast is triggered while an existing Toast is still visible, THEN THE Endeavours_Tracker SHALL replace the existing Toast with the new message and reset the auto-dismiss timer.
8. THE Toast container SHALL have an ARIA live region attribute of "polite" so that screen readers announce the message when it appears.

### Requirement 9: Add Endeavour Costs

**User Story:** As a player tracking expenses during downtime, I want to record the cost of endeavours like Commission or Banking, so that I can see a summary of money spent per period.

#### Acceptance Criteria

1. THE EndeavourEntry type SHALL include an optional "cost" field of type string with a maximum length of 50 characters to accommodate WFRP currency notation (e.g., "2 GC 5 s").
2. WHEN a user enters a cost value on an EndeavourEntry, THE Endeavours_Tracker SHALL store and display the cost text adjacent to the entry's type label within the entry row.
3. WHEN a DowntimePeriod contains at least one entry whose cost field is a non-empty, non-whitespace-only string, THE Endeavours_Tracker SHALL display a cost summary line within that period listing each non-empty cost value as a comma-separated sequence.
4. WHEN no entries in a DowntimePeriod have a cost field set to a non-empty, non-whitespace-only string, THE Endeavours_Tracker SHALL omit the cost summary line.
5. IF a user clears the cost field (sets it to an empty string or whitespace only), THEN THE Endeavours_Tracker SHALL treat the entry as having no cost and exclude it from the cost summary.

### Requirement 10: Add Property-Based Tests for Logic Module

**User Story:** As a developer maintaining the endeavours system, I want comprehensive property-based tests for all pure functions in the logic module, so that edge cases and invariants are validated automatically.

#### Acceptance Criteria

1. THE test suite SHALL include a property test verifying that addDowntimePeriod followed by removeDowntimePeriod with the same period id returns an array deep-equal to the original array (round-trip property), using arrays of 0 to 20 periods with ids in the range 1 to 1,000,000.
2. THE test suite SHALL include a property test verifying that addEndeavourEntry followed by removeEndeavourEntry with the same period id and entry id returns the targeted period's entries array deep-equal to its original state (round-trip property), using periods containing 0 to 20 entries.
3. THE test suite SHALL include a property test verifying that updateEndeavourEntry preserves the total number of entries in the targeted period for any valid field and value combination (invariant property).
4. THE test suite SHALL include a property test verifying that updateDowntimePeriod preserves the total number of periods in the array for any valid field and value combination (invariant property).
5. THE test suite SHALL include a property test verifying that the move-up and move-down reorder functions defined in Requirement 5 preserve the collection length and element membership as a set (invariant property), using arrays of 1 to 20 elements and index positions from 0 to length minus 1.
6. THE test suite SHALL include a property test verifying that parseStatusTier returns a value in the set {"gold", "silver", "brass", null} for any arbitrary input string of length 0 to 200 (metamorphic property).
7. THE test suite SHALL include a property test verifying that getDefaultSlots returns a positive integer greater than or equal to 1 for all valid tier values ("brass", "silver", "gold", null) (invariant property).
8. THE test suite SHALL include a property test verifying that createDowntimePeriod produces a DowntimePeriod with entries as an empty array, a label matching the pattern "Downtime #N" where N equals existingCount plus 1, and slots as a positive integer greater than or equal to 1, for any input string of length 0 to 200 and existingCount in the range 0 to 1000 (invariant property).
9. THE test suite SHALL use fast-check as the property-based testing library and vitest as the test runner, with a minimum of 100 generated inputs per property test (numRuns).
10. THE test suite SHALL exercise all exported pure functions from src/logic/endeavours.ts including: parseStatusTier, getDefaultSlots, createDowntimePeriod, addDowntimePeriod, removeDowntimePeriod, addEndeavourEntry, removeEndeavourEntry, updateEndeavourEntry, updateDowntimePeriod, and isElf.
