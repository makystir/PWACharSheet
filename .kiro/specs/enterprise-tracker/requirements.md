# Requirements Document

## Introduction

Add an Enterprise ownership and management system to the WFRP 4e character sheet, based on the rules from "Archives of the Empire Vol. III". Enterprises are business ventures that characters can invest in, expand over time, and use as sources of income between adventures. The system tracks enterprise metadata (name, type, expansion level, debt, creditors), income sources with associated earning skills and statuses, trappings, special rules, and expansion progression. An Enterprise Events table (d100) provides random outcomes during downtime. The entire section is gated behind a `useEnterprises` house rule toggle and stored as a separate `enterprises` array on the Character object.

## Glossary

- **Enterprise_Tracker**: The UI section (component group) that displays and manages a character's enterprise data, rendered on the appropriate tab when the feature is enabled.
- **Enterprise**: A single business venture owned by a character, defined by a template type and tracked with name, expansion level, debt, creditor, income sources, trappings, and special rules.
- **Enterprise_Template**: One of ten predefined business archetypes (Courier Service, Crafting Workshop, Criminal Gang, Holy Temple, Knightly Order, Tavern, Market Parlour, Noble Estate, Performance Troupe, Publishing House) that defines the default income sources, trappings, special rules, and expansion path for an enterprise.
- **Expansion_Level**: An integer from 1 to 4 representing the current development stage of an enterprise. Level 1 is the base enterprise; levels 2–4 unlock new benefits, trappings, and improved income statuses.
- **Income_Source**: A way for an enterprise to generate money, defined by a description, an Earning Skill name, and an effective Status level string (e.g. "Silver 2").
- **Earning_Skill**: The WFRP skill used when a character makes an Income Endeavour with a given income source (e.g. "Ride (Horse)", "Trade (Any)", "Intimidate").
- **Effective_Status**: The social tier temporarily used for income calculations when earning from a specific income source (e.g. "Brass 4", "Silver 3", "Gold 1").
- **Trapping_Entry**: An item, animal, employee, or premise that the enterprise provides access to, tracked as a text entry.
- **Special_Rule**: A template-specific advantage or restriction that applies to characters invested in the enterprise, tracked as a text entry.
- **Enterprise_Event**: A d100 roll outcome from the Enterprise Events Table that affects the enterprise during downtime, with 30+ possible results ranging from bankruptcy to buyout offers.
- **Debt**: The outstanding monetary amount owed to a creditor, expressed in gold crowns.
- **Interest_Payment**: The recurring fee paid to a creditor each downtime period while the enterprise remains in debt.
- **Creditor**: The NPC or entity to whom the enterprise's debt is owed.
- **Settings_Page**: The application page where players configure house rules and optional mechanics via toggle controls.
- **Optional_Mechanics_Section**: The collapsible section within the Settings_Page's House Rules card that contains ON/OFF toggles for optional features.
- **HouseRules**: The data structure on the Character object that stores boolean flags and configuration values for optional and variant rules.
- **Character**: The top-level data object representing a player character, persisted in IndexedDB.

## Requirements

### Requirement 1: Add Enterprise Toggle to HouseRules

**User Story:** As a player, I want a setting to enable or disable the Enterprise system, so that I can opt in to this optional mechanic only when my campaign uses enterprises.

#### Acceptance Criteria

1. THE HouseRules interface SHALL include a `useEnterprises` field of type boolean.
2. THE `useEnterprises` field SHALL default to `false` in the blank character template.
3. WHEN a character is loaded whose `houseRules` object is missing entirely, THE application SHALL assign `useEnterprises` the value `false` via the blank-character defaults. WHEN a character is loaded whose `houseRules` object is present but does not contain the `useEnterprises` field, THE application SHALL merge the blank-character default so that `useEnterprises` resolves to `false`.
4. WHEN the user sets `useEnterprises` to `true` and the character is saved and subsequently reloaded, THE application SHALL read back `useEnterprises` as `true`.

### Requirement 2: Render Enterprise Toggle in Optional Mechanics Section

**User Story:** As a player, I want an ON/OFF toggle for Enterprises in the Optional Mechanics section of the Settings page, so that I can easily enable or disable the feature.

#### Acceptance Criteria

1. THE Settings_Page SHALL display an "Enterprises" toggle within the Optional_Mechanics_Section.
2. THE toggle label SHALL read "Enterprises" with a description of "Track business ventures and income sources (Archives Vol. III)".
3. WHEN the `useEnterprises` field is `false`, THE toggle SHALL display "OFF" and the description text SHALL render in a muted color.
4. WHEN the `useEnterprises` field is `true`, THE toggle SHALL display "ON" and the description text SHALL render in the default text color.
5. WHEN the player clicks the toggle, THE Settings_Page SHALL update the `houseRules.useEnterprises` field to the opposite boolean value.
6. WHEN the player clicks the toggle, THE Settings_Page SHALL immediately reflect the new toggle state without requiring a page reload.

### Requirement 3: Enterprise Data Model

**User Story:** As a player, I want the application to store enterprise data on my character, so that my enterprise information persists between sessions.

#### Acceptance Criteria

1. THE Character interface SHALL include an `enterprises` field of type `Enterprise[]` that is optional and defaults to an empty array when a new character is created.
2. THE Enterprise data structure SHALL store the following fields: a unique `id` (string, unique within the character's enterprises array), `name` (string, maximum 100 characters), `type` (EnterpriseType enum with values: "Courier Service", "Crafting Workshop", "Criminal Gang", "Holy Temple", "Knightly Order", "Tavern", "Market Parlour", "Noble Estate", "Performance Troupe", "Publishing House"), `expansionLevel` (integer 1–4), `debt` (object with `gc`, `ss`, `d` fields as non-negative integers), `creditorName` (string, maximum 100 characters), `interestPayment` (object with `gc`, `ss`, `d` fields as non-negative integers), `incomeSources` (array of Income_Source objects), `trappings` (array of strings), `specialRules` (array of strings), and `notes` (string, maximum 2000 characters).
3. THE Income_Source data structure SHALL store the following fields: an `id` (string, unique within the parent enterprise's incomeSources array), `description` (string, maximum 200 characters), `earningSkill` (string, maximum 100 characters), and `effectiveStatus` (string, maximum 50 characters).
4. WHEN a character is loaded that does not contain the `enterprises` field, THE application SHALL treat the missing field as an empty array without requiring manual migration.
5. WHEN a character is loaded with an `enterprises` array containing entries that have missing or undefined optional sub-fields (`incomeSources`, `trappings`, `specialRules`), THE application SHALL treat each missing sub-field as an empty array.

### Requirement 4: Enterprise Template Data

**User Story:** As a player, I want predefined enterprise templates for the ten business types, so that I can quickly set up a new enterprise with correct default values.

#### Acceptance Criteria

1. THE application SHALL provide a static data file containing templates for all ten enterprise types: Courier Service, Crafting Workshop, Criminal Gang, Holy Temple, Knightly Order, Tavern, Market Parlour, Noble Estate, Performance Troupe, and Publishing House.
2. FOR EACH enterprise template, THE data file SHALL define: a display name, default income sources (each with a text description, an earning skill name, and an effective status expressed as a status tier and numeric level such as "Silver 2"), a default trappings list of one or more text entries, default special rules text, start-up costs expressed in gold crowns, the minimum owner contribution (10% of start-up costs) expressed in gold crowns, base interest payment amount expressed in gold crowns or silver shillings, and expansion data for levels 2 through 4.
3. FOR EACH expansion level (2–4), THE template data SHALL define: the expansion cost expressed in gold crowns, the minimum owner contribution (10% of expansion cost) expressed in gold crowns, the new interest payment amount expressed in gold crowns or silver shillings, a text description of new benefits, and any additional trappings (as text entries) or income sources (each with description, earning skill, and effective status) unlocked at that level.
4. FOR EACH income source defined in a template or expansion level, THE data file SHALL include a boolean field indicating whether the income source is active at the base enterprise level, so that sources unlocked only by expansion are distinguishable from sources available at start-up.

### Requirement 5: Create New Enterprise

**User Story:** As a player, I want to create a new enterprise by selecting a template, so that I can start tracking a business venture for my character.

#### Acceptance Criteria

1. WHEN the player activates the create enterprise action, THE Enterprise_Tracker SHALL display a template selection interface listing all ten enterprise types by display name.
2. WHEN the player selects a template, THE Enterprise_Tracker SHALL create a new Enterprise object with a unique `id`, expansion level set to 1, debt fields set to zero, creditor name set to an empty string, interest payment set to the template's base interest payment amount, income sources populated from the template's level 1 defaults, trappings populated from the template's level 1 defaults, special rules populated from the template's level 1 defaults, and notes set to an empty string.
3. WHEN a new enterprise is created, THE Enterprise_Tracker SHALL prompt the player to enter a custom name for the enterprise with a maximum length of 100 characters.
4. IF the player submits an empty enterprise name, THEN THE Enterprise_Tracker SHALL not save the enterprise and SHALL keep the name input displayed for correction.
5. IF the player cancels the create enterprise flow at any step before confirming, THEN THE Enterprise_Tracker SHALL discard the pending enterprise and return to the previous view without modifying the character's data.
6. THE application SHALL allow a character to own multiple enterprises simultaneously.

### Requirement 6: Edit Enterprise Details

**User Story:** As a player, I want to edit my enterprise's details, so that I can track changes to debt, creditor, income sources, trappings, and special rules as the campaign progresses.

#### Acceptance Criteria

1. THE Enterprise_Tracker SHALL allow the player to edit the enterprise name as free text with a maximum length of 100 characters.
2. THE Enterprise_Tracker SHALL allow the player to edit the creditor name as free text with a maximum length of 100 characters.
3. THE Enterprise_Tracker SHALL allow the player to edit the outstanding debt amount (gc, ss, d fields independently), where each field accepts an integer value from 0 to 999.
4. THE Enterprise_Tracker SHALL allow the player to edit the interest payment amount (gc, ss, d fields independently), where each field accepts an integer value from 0 to 999.
5. THE Enterprise_Tracker SHALL allow the player to add, edit, and remove individual income sources (description, earning skill, and effective status fields), up to a maximum of 20 income sources per enterprise.
6. THE Enterprise_Tracker SHALL allow the player to add, edit, and remove individual trapping entries (free text, maximum 200 characters each), up to a maximum of 50 trapping entries per enterprise.
7. THE Enterprise_Tracker SHALL allow the player to add, edit, and remove individual special rule entries (free text, maximum 500 characters each), up to a maximum of 20 special rule entries per enterprise.
8. THE Enterprise_Tracker SHALL allow the player to edit a free-text notes field with a maximum length of 2000 characters.
9. WHEN the player completes editing a field (on blur or Enter key), THE Enterprise_Tracker SHALL persist the updated value to the character data immediately without requiring a separate save action.
10. IF the player enters a non-numeric value in a monetary field (gc, ss, or d), THEN THE Enterprise_Tracker SHALL treat the invalid input as 0.

### Requirement 7: Expansion Tracking

**User Story:** As a player, I want to track my enterprise's expansion level and see what benefits each level unlocks, so that I can plan my enterprise's growth.

#### Acceptance Criteria

1. THE Enterprise_Tracker SHALL display the current expansion level (1–4) for each enterprise.
2. WHEN the enterprise is below level 4 and the player activates the expand action, THE Enterprise_Tracker SHALL display the next level's expansion cost (including the minimum 10% own-contribution amount), new interest payment, new Status value, and the list of additional trappings and income sources unlocked.
3. WHEN the player confirms expansion, THE Enterprise_Tracker SHALL increment the expansion level by 1.
4. WHEN expansion is confirmed, THE Enterprise_Tracker SHALL add any new trappings, income sources, and special rules defined by the template for the new level to the enterprise's data.
5. THE Enterprise_Tracker SHALL NOT allow expansion beyond level 4.
6. IF the enterprise has outstanding debt greater than 0, THEN THE Enterprise_Tracker SHALL disable the expand action and display an indication that all debt must be repaid before expansion is available.
7. WHEN the enterprise is at level 4 and the player views expansion information, THE Enterprise_Tracker SHALL indicate that maximum expansion has been reached and hide or disable the expand action.

### Requirement 8: Enterprise Events Table Roller

**User Story:** As a player, I want to roll on the Enterprise Events table, so that I can quickly determine random downtime events affecting my enterprise.

#### Acceptance Criteria

1. THE Enterprise_Tracker SHALL provide a "Roll Event" action for each enterprise that generates a random integer between 1 and 100 inclusive.
2. WHEN an event is rolled, THE Enterprise_Tracker SHALL display the numeric roll result, the event title (e.g. "Looming Bankruptcy"), and the event outcome description text from the Enterprise Events Table.
3. THE Enterprise Events Table SHALL contain entries covering the full d100 range (1–100) with at least 30 distinct event outcomes, where each entry maps a contiguous sub-range to a single event title and description.
4. WHEN the rolled result falls in the Alternate Event ranges (55–57 or 58–60), THE Enterprise_Tracker SHALL display the alternate event text defined for the rolled enterprise's template type instead of the generic alternate event placeholder.
5. THE Enterprise_Tracker SHALL display the most recent roll result persistently until a new roll is made or the player activates a visible "Dismiss" control that clears the displayed result.
6. WHEN the player has more than one enterprise, THE Enterprise_Tracker SHALL associate the "Roll Event" action and its result with the specific enterprise currently being viewed in the detail view.

### Requirement 9: Conditionally Render Enterprise Tracker

**User Story:** As a player, I want the Enterprise section to appear only when the mechanic is enabled, so that the UI remains uncluttered when the feature is not in use.

#### Acceptance Criteria

1. IF `houseRules.useEnterprises` is `true`, THEN THE application SHALL render the Enterprise_Tracker component.
2. IF `houseRules.useEnterprises` is `false`, THEN THE application SHALL render zero DOM elements for the Enterprise_Tracker.
3. WHEN the player toggles `houseRules.useEnterprises` from `false` to `true` during a session, THE application SHALL render the Enterprise_Tracker within the same rendering update, without requiring a page refresh.
4. WHEN the player toggles `houseRules.useEnterprises` from `true` to `false` during a session, THE application SHALL remove the Enterprise_Tracker from the DOM within the same rendering update, without requiring a page refresh.

### Requirement 10: Preserve Enterprise Data When Disabled

**User Story:** As a player, I want my enterprise data to be preserved when I disable the tracker, so that I do not lose information if I temporarily turn the feature off.

#### Acceptance Criteria

1. WHEN the player disables the Enterprise_Tracker via the house rule toggle, THE application SHALL retain the `enterprises` array and all its contents on the character object without modification.
2. WHEN the player re-enables the Enterprise_Tracker, THE Enterprise_Tracker SHALL display all previously recorded enterprise data with field values identical to those present before the feature was disabled, including enterprise name, type, expansion level, debt, creditor, interest payment, income sources, trappings, special rules, and notes.
3. WHEN the player saves and reloads the character while `useEnterprises` is `false`, THE application SHALL persist and restore the `enterprises` array unchanged.
4. WHEN the player disables and re-enables the Enterprise_Tracker multiple times within a session, THE application SHALL preserve the `enterprises` array without data loss or corruption after each toggle cycle.

### Requirement 11: Delete Enterprise

**User Story:** As a player, I want to delete an enterprise I no longer need, so that I can keep my character data clean.

#### Acceptance Criteria

1. THE Enterprise_Tracker SHALL provide a delete action for each enterprise.
2. WHEN the player activates the delete action, THE Enterprise_Tracker SHALL display a confirmation prompt that includes the enterprise's name before removing the enterprise.
3. WHEN the player confirms deletion, THE application SHALL remove the enterprise from the character's `enterprises` array and the Enterprise_Tracker SHALL no longer display the deleted enterprise.
4. IF the player dismisses or cancels the confirmation prompt, THEN THE application SHALL retain the enterprise in the character's `enterprises` array unchanged.

### Requirement 12: Enterprise Summary Display

**User Story:** As a player, I want to see a summary of each enterprise at a glance, so that I can quickly review my business ventures.

#### Acceptance Criteria

1. THE Enterprise_Tracker SHALL display each enterprise's name, type, and current expansion level in a summary view.
2. THE Enterprise_Tracker SHALL display the outstanding debt amount (gc, ss, d fields) for each enterprise in the summary view.
3. THE Enterprise_Tracker SHALL display the creditor name and interest payment amount (gc, ss, d fields) for each enterprise in the summary view.
4. WHEN the player selects an enterprise from the summary view, THE Enterprise_Tracker SHALL display the full detail view including income sources, trappings, special rules, and notes.
5. WHEN the player is viewing the full detail view of an enterprise, THE Enterprise_Tracker SHALL provide a navigation action that returns the player to the summary view.
6. IF the character has no enterprises, THEN THE Enterprise_Tracker SHALL display an empty state indicating that no enterprises have been created.
