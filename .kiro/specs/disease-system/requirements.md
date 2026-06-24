# Requirements Document

## Introduction

The Disease System adds WFRP 4e Core Rulebook disease tracking to the character sheet PWA. The system models 9 diseases and 12 symptoms as structured data, provides logic functions for disease lookup and status tracking, and exposes a UI panel for players to manage active diseases on their characters. This follows the existing data → logic → UI architecture used by mutations, critical wounds, and corruption.

## Glossary

- **Disease_Registry**: The static data module that defines all 9 diseases with their properties (name, contraction method, incubation period, duration, and associated symptoms).
- **Symptom_Catalogue**: The static data module that defines all 12 symptoms with their names, descriptions, and mechanical effects.
- **Disease_Tracker**: The logic module responsible for managing active diseases on a character, including adding, removing, and querying disease state.
- **Disease_Panel**: The React UI component that displays active diseases and allows the player to add or remove diseases from their character.
- **Active_Disease**: A disease instance currently afflicting a character, including a reference to the disease definition, the date it was contracted, and its current phase (incubating or symptomatic).
- **Incubation_Phase**: The period after contraction during which the disease has no visible symptoms.
- **Symptomatic_Phase**: The period after incubation during which the disease's symptoms are active.
- **Contraction_Method**: A text description of how a disease is contracted (e.g., "Ingesting tainted food or water").
- **Duration**: The time period a disease lasts once symptomatic, after which it resolves naturally if the character survives.

## Requirements

### Requirement 1: Disease Data Definitions

**User Story:** As a developer, I want a typed data file defining all 9 WFRP 4e diseases, so that disease information is centralized and reusable across logic and UI layers.

#### Acceptance Criteria

1. THE Disease_Registry SHALL define a TypeScript interface for a disease entry containing: name (string), contraction method (string), incubation period (string representing dice expression and time unit, e.g. "1d10 days"), duration (string representing dice expression and time unit, e.g. "1d10 days"), and symptoms (array of strings referencing symptom names).
2. THE Disease_Registry SHALL contain exactly 9 disease entries: Blood Rot, The Bloody Flux, Galloping Trots, Itching Pox, Neiglish Rot, Packer's Pox, Ratte Fever, The Shakes, and Black Plague.
3. WHEN a disease entry references a symptom, THE Disease_Registry SHALL use the symptom name string exactly as defined in the Symptom_Catalogue.
4. THE Disease_Registry SHALL export a typed constant array of all disease entries, with each entry having all interface fields populated (no optional or undefined values).
5. THE Disease_Registry SHALL require every disease entry to contain at least 1 symptom reference in its symptoms array.

### Requirement 2: Symptom Data Definitions

**User Story:** As a developer, I want a typed data file defining all 12 WFRP 4e symptoms, so that symptom details are centralized and reusable.

#### Acceptance Criteria

1. THE Symptom_Catalogue SHALL define a TypeScript interface for a symptom entry containing: name (string), description (string), and effects (string summarising the mechanical impact of the symptom).
2. THE Symptom_Catalogue SHALL contain exactly 12 symptom entries: Blight, Convulsions, Coughs and Sneezes, Delirium, Fever, Flux, Gangrene, Lingering, Malaise, Nausea, Pox, and Wounded.
3. THE Symptom_Catalogue SHALL export a typed constant array of all 12 symptom entries.
4. FOR EACH symptom entry in the Symptom_Catalogue, THE description field SHALL be a non-empty string and the effects field SHALL be a non-empty string.

### Requirement 3: Disease Lookup Logic

**User Story:** As a developer, I want logic functions that look up diseases and symptoms by name, so that UI components can retrieve disease details without coupling to data structures.

#### Acceptance Criteria

1. WHEN a valid disease name is provided (case-sensitive exact match), THE Disease_Tracker SHALL return the matching disease entry from the Disease_Registry.
2. WHEN an invalid disease name is provided (no exact match exists), THE Disease_Tracker SHALL return undefined.
3. WHEN a valid symptom name is provided (case-sensitive exact match), THE Disease_Tracker SHALL return the matching symptom entry from the Symptom_Catalogue.
4. WHEN an invalid symptom name is provided (no exact match exists), THE Disease_Tracker SHALL return undefined.
5. WHEN a valid disease name is provided, THE Disease_Tracker SHALL return the full list of resolved symptom entries associated with that disease, in the same order as the disease's symptoms array.
6. WHEN an invalid disease name is provided to the symptom-list function, THE Disease_Tracker SHALL return undefined.

### Requirement 4: Active Disease Management on Character

**User Story:** As a player, I want to add and remove diseases from my character, so that I can track which diseases my character currently has.

#### Acceptance Criteria

1. WHEN a player adds a disease to the character, THE Disease_Tracker SHALL create an Active_Disease record containing a unique numeric ID (max existing ID + 1, or 1 if none exist), the disease name, a contracted timestamp (Date.now()), and notes field initialized to an empty string.
2. WHEN a player removes a disease from the character, THE Disease_Tracker SHALL remove the Active_Disease record matching the provided ID from the character's disease list.
3. WHEN a player removes a disease with an ID that does not exist in the list, THE Disease_Tracker SHALL return the original array unchanged (no-op).
4. WHEN an Active_Disease is added, THE Disease_Tracker SHALL append it to the end of the existing array and return a new array without mutating the original array.
5. WHEN an Active_Disease is removed, THE Disease_Tracker SHALL return a new array without mutating the original array, preserving the ordering of remaining entries.

### Requirement 5: Character Type Extension

**User Story:** As a developer, I want the Character type to include a diseases array, so that active diseases persist with the character data.

#### Acceptance Criteria

1. THE Character interface SHALL include a diseases field typed as an array of Active_Disease records, where each Active_Disease record contains a numeric id, a disease name (string), a contracted timestamp (number), and a notes field (string).
2. THE BLANK_CHARACTER constant SHALL initialize the diseases field as an empty array.
3. WHEN loading a saved character that lacks a diseases field, THE character loading logic SHALL default the missing field to an empty array, preserving all other existing character fields unchanged.

### Requirement 6: Disease Panel UI

**User Story:** As a player, I want a Disease Panel on the Character page, so that I can view my active diseases and their symptoms at a glance.

#### Acceptance Criteria

1. THE Disease_Panel SHALL display a list of all active diseases on the character with each disease's name.
2. WHEN a player taps on an active disease entry, THE Disease_Panel SHALL expand to show the disease's contraction method, incubation period, duration, associated symptoms, and notes.
3. WHEN a player taps an "Add Disease" button, THE Disease_Panel SHALL present a picker listing all 9 diseases from the Disease_Registry.
4. WHEN a player selects a disease from the picker, THE Disease_Panel SHALL add the selected disease to the character's active diseases.
5. WHEN a player taps the remove button on an active disease, THE Disease_Panel SHALL remove that disease from the character's active diseases.
6. WHILE the character has zero active diseases, THE Disease_Panel SHALL display an empty state indicating no diseases are active.

### Requirement 7: Symptom Detail Display

**User Story:** As a player, I want to see the full details of each symptom on an active disease, so that I know the mechanical effects without looking up the rulebook.

#### Acceptance Criteria

1. WHEN an active disease is expanded, THE Disease_Panel SHALL display each associated symptom's name, description, and mechanical effects.
2. THE Disease_Panel SHALL display symptoms in the order they appear in the disease's symptom list from the Disease_Registry.

### Requirement 8: Disease Notes

**User Story:** As a player, I want to add free-text notes to an active disease, so that I can record GM rulings, remaining duration, or treatment progress.

#### Acceptance Criteria

1. WHEN a player edits the notes field on an active disease, THE Disease_Tracker SHALL persist the updated text with the Active_Disease record.
2. THE Disease_Panel SHALL display an editable text area for notes when an active disease is expanded.

### Requirement 9: Data Integrity

**User Story:** As a developer, I want the disease data to be internally consistent, so that all disease-symptom references resolve correctly.

#### Acceptance Criteria

1. FOR ALL diseases in the Disease_Registry, each symptom reference SHALL match a name in the Symptom_Catalogue (round-trip property).
2. THE Disease_Registry SHALL contain no duplicate disease names.
3. THE Symptom_Catalogue SHALL contain no duplicate symptom names.
