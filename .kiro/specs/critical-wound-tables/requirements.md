# Requirements Document

## Introduction

This feature adds Core Rulebook critical wound reference tables to the WFRP 4e character sheet PWA. The app currently tracks critical wounds manually (user types description, effects, etc.) but has no structured reference data. This feature introduces data tables for all four body location groups (Head, Arm, Body, Leg), a lookup function, and a "Roll Critical" UI flow that auto-populates wound records from table data while preserving the existing manual entry workflow.

## Glossary

- **Critical_Wound_Table**: A structured data file containing all critical wound entries organized by body location group, keyed by d100 roll ranges
- **Critical_Wound_Entry**: A single row in a Critical_Wound_Table containing a roll range, wound name, wound effect description, and severity value
- **Body_Location_Group**: One of four groupings used by the critical wound tables — Head, Arm, Body, or Leg — where Arm covers both Left Arm and Right Arm, and Leg covers both Left Leg and Right Leg
- **Lookup_Function**: A pure function that accepts a HitLocation and a d100 roll value and returns the matching Critical_Wound_Entry
- **Roll_Critical_Flow**: A UI interaction in the CriticalWoundsPanel that guides the user through selecting a hit location, providing a d100 roll, and auto-populating a CriticalWound record from the matched table entry
- **CriticalWoundsPanel**: The existing UI component that displays and manages active critical wounds
- **TakeDamagePanel**: The existing UI component that calculates net wounds and displays a "Character is Down" alert when wounds reach zero
- **HitLocation**: A type representing one of six body locations — Head, Left Arm, Right Arm, Body, Left Leg, or Right Leg — as defined in hitLocationTable.ts
- **d100_Roll**: An integer value between 1 and 100 inclusive, representing the result of rolling percentile dice

## Requirements

### Requirement 1: Critical Wound Table Data Structure

**User Story:** As a developer, I want critical wound table entries stored in a structured data file, so that the app can programmatically look up wound results by location and roll.

#### Acceptance Criteria

1. THE Critical_Wound_Table SHALL contain entries for four Body_Location_Groups: Head, Arm, Body, and Leg, each exported as a separately named constant array
2. WHEN a Critical_Wound_Entry is defined, THE Critical_Wound_Table SHALL include a minimum roll value, a maximum roll value, a wound name, a wound effect description, and a severity integer value for that entry
3. THE Critical_Wound_Table SHALL cover the complete d100 range (1–100) for each Body_Location_Group with no gaps and no overlaps between entries, with each location array containing at least 10 entries
4. THE Critical_Wound_Table SHALL follow the existing MutationTableEntry interface pattern of { min: number, max: number, name: string, effect: string } extended with a severity: number field, exported as a named interface from the data file

### Requirement 2: Critical Wound Lookup Function

**User Story:** As a developer, I want a lookup function that resolves a hit location and roll into a critical wound entry, so that the UI can retrieve the correct table result without manual searching.

#### Acceptance Criteria

1. WHEN a HitLocation of "Left Arm" or "Right Arm" is provided, THE Lookup_Function SHALL use the Arm Body_Location_Group table for the lookup
2. WHEN a HitLocation of "Left Leg" or "Right Leg" is provided, THE Lookup_Function SHALL use the Leg Body_Location_Group table for the lookup
3. WHEN a HitLocation of "Head" is provided, THE Lookup_Function SHALL use the Head Body_Location_Group table for the lookup
4. WHEN a HitLocation of "Body" is provided, THE Lookup_Function SHALL use the Body Body_Location_Group table for the lookup
5. WHEN a valid HitLocation and a d100_Roll between 1 and 100 inclusive are provided, THE Lookup_Function SHALL return the Critical_Wound_Entry whose min value is less than or equal to the roll and whose max value is greater than or equal to the roll
6. IF a d100_Roll value less than 1 or greater than 100 is provided, THEN THE Lookup_Function SHALL return undefined
7. THE Lookup_Function SHALL be a pure function that produces the same output for the same HitLocation and d100_Roll inputs and produces no side effects

### Requirement 3: Roll Critical UI Flow

**User Story:** As a player, I want to roll on the critical wound table from within the app, so that I can quickly determine and record the wound my character receives without consulting the physical rulebook.

#### Acceptance Criteria

1. WHEN the user activates the Roll_Critical_Flow, THE CriticalWoundsPanel SHALL display a hit location selector pre-populated with the six HitLocation values (Head, Left Arm, Right Arm, Body, Left Leg, Right Leg) and a numeric input field for the d100_Roll value
2. WHEN the TakeDamagePanel has displayed the "Character is Down" alert with a selected hit location and the user subsequently activates the Roll_Critical_Flow, THE Roll_Critical_Flow SHALL pre-select that hit location in the location selector
3. WHEN the user provides a d100_Roll value manually in the input field, THE Roll_Critical_Flow SHALL accept only integer values between 1 and 100 inclusive and use that value for the table lookup
4. IF the user enters a value outside the range 1–100 or a non-integer value in the d100_Roll input field, THEN THE Roll_Critical_Flow SHALL disable the lookup action and display an inline error indication stating the valid range
5. WHEN the user requests a random roll by pressing the Roll button, THE Roll_Critical_Flow SHALL generate a random integer between 1 and 100 inclusive, display it in the roll input field, and perform the lookup automatically
6. WHEN the Lookup_Function returns a Critical_Wound_Entry, THE Roll_Critical_Flow SHALL display the wound name, effect description, and severity value to the user as a preview, with a Confirm control and a Cancel control visible
7. WHEN the user confirms the looked-up result, THE Roll_Critical_Flow SHALL create a new CriticalWound record with the location set to the selected HitLocation, the description set to the entry name, the effects set to the entry effect, the severity set to the entry severity value, duration set to empty string, and healed set to false, and then close the flow returning to the default CriticalWoundsPanel state
8. WHEN the user activates the Cancel control at any point during the Roll_Critical_Flow, THE Roll_Critical_Flow SHALL dismiss without creating a wound record and return to the default CriticalWoundsPanel state

### Requirement 4: Preserve Manual Wound Entry

**User Story:** As a player, I want to continue adding critical wounds manually, so that I can record wounds from house rules, GM decisions, or sources not covered by the standard tables.

#### Acceptance Criteria

1. THE CriticalWoundsPanel SHALL retain the existing "Add" button that creates a new CriticalWound record with default values (location: "Body", description: "New wound", effects: empty, duration: empty, severity: 1, healed: false) for manual editing
2. WHILE the Roll_Critical_Flow is available, THE CriticalWoundsPanel SHALL display both the "Add" button and the Roll Critical entry point simultaneously, allowing the user to choose either method of wound creation
3. WHILE the Roll_Critical_Flow is available, THE CriticalWoundsPanel SHALL continue to allow editing of all CriticalWound fields (location, description, effects, duration, severity) on any wound record regardless of how it was created
4. WHEN a CriticalWound record has been created via the Roll_Critical_Flow, THE CriticalWoundsPanel SHALL allow the user to edit all fields of that record after creation, with no fields locked or read-only
5. WHEN a CriticalWound record exists regardless of creation method, THE CriticalWoundsPanel SHALL allow the user to heal that wound using the existing heal action

### Requirement 5: Table Entry Severity Classification

**User Story:** As a player, I want critical wound severity to be included in table data, so that the wound severity is automatically set based on the rulebook's intended danger level.

#### Acceptance Criteria

1. THE Critical_Wound_Table SHALL assign an integer severity value between 1 and 5 inclusive to each Critical_Wound_Entry
2. WHEN a Critical_Wound_Entry has effects that describe death, amputation, or permanent loss of a body part, THE Critical_Wound_Table SHALL assign a severity value of 4 or 5 to that entry
3. WHEN a Critical_Wound_Entry has effects that describe only temporary penalties with no lasting injury, THE Critical_Wound_Table SHALL assign a severity value of 1 to that entry
4. THE Critical_Wound_Table SHALL assign severity values in non-decreasing order within each Body_Location_Group, such that no entry with a lower roll range has a higher severity than an entry with a higher roll range in the same group
5. WHEN a Critical_Wound_Entry has effects that describe lasting injuries short of amputation or death, THE Critical_Wound_Table SHALL assign a severity value of 2 or 3 to that entry
