# Requirements Document

## Introduction

This feature is a cold-start / first-visit bundle performance optimization for the WFRP4e PWA character sheet. The career-scheme dataset (`CAREER_SCHEMES` in `src/data/careers.ts`, ~1081 lines / ~251 kB raw, built as its own `data-careers` chunk) is currently pulled into the initial (eager) JavaScript graph loaded at first paint, even though it is only needed on the Advancement and Character pages.

The root cause is a static dependency chain: `src/storage/character-manager.ts` statically imports `CAREER_SCHEMES` because `loadCharacter()` uses it at runtime for a retroactive "ensure career skills exist" fill, and `src/App.tsx` eagerly imports `character-manager` at module top-level (directly for `saveCharacter`, and transitively through `useCharacterManager`, which uses create/load/duplicate/delete). Although `vite.config.ts` already assigns careers its own `manualChunk`, a chunk that is statically reachable from the entry is still fetched eagerly.

The goal is to remove the `Career_Dataset` from the eager startup chunk graph so first-visit downloads less JavaScript, **without changing any observable behavior**. The retroactive career-skill fill on load, character create/load/save/duplicate/delete, the persisted save format, and all existing tests must continue to behave identically. Because the app precaches assets via a service worker after first load, the measurable win is specifically the cold-start / first-visit payload.

The career dataset is rulebook-sourced (see rules-compliance steering) and MUST NOT be altered semantically. This spec scopes the primary target to the career dataset; other large data modules are noted as potential follow-ups.

## Glossary

- **Eager_Chunk / Initial_Load**: The set of JavaScript chunks statically reachable from the application entry module and therefore fetched by the browser at first paint (before any user navigation or interaction). A module is "in the eager chunk graph" if it is loaded during Initial_Load without an on-demand trigger.
- **Career_Dataset (CAREER_SCHEMES)**: The `CAREER_SCHEMES` record exported from `src/data/careers.ts`, built into the `data-careers` chunk. Contains the full career-scheme data (career levels, skills, talents) sourced from the WFRP4e rulebooks.
- **Retroactive_Career_Skill_Fill**: The logic in `loadCharacter()` (`src/storage/character-manager.ts`) that, when a loaded character has both `career` and `careerLevel`, looks up the matching scheme in `CAREER_SCHEMES`, finds the corresponding `CareerLevel`, and calls `ensureCareerSkillsExist(character, level.skills)` (`src/logic/advancement.ts`) to add any missing career skills. Its output is the corrected `Character`.
- **Character_Manager**: The module `src/storage/character-manager.ts`, which provides character persistence operations (`createCharacter`, `loadCharacter`, `saveCharacter`, `renameCharacter`, `duplicateCharacter`, `deleteCharacter`, plus portrait-aware variants).
- **PWA_Precache**: The service-worker asset precaching (configured via `swPrecachePlugin` in `vite.config.ts`) that caches built assets after the first visit, so subsequent visits do not re-download them.
- **Character_Consumer**: Any caller that invokes a Character_Manager load-path function and depends on its return value (e.g. `useCharacterManager`, `duplicateCharacter`, `renameCharacter`, `loadCharacterWithPortrait`).

## Requirements

### Requirement 1: Exclude the career dataset from the initial load

**User Story:** As a first-time visitor, I want the app to download less JavaScript at first paint, so that the app becomes interactive faster on a cold start.

#### Acceptance Criteria

1. THE Career_Dataset SHALL NOT be part of the Eager_Chunk graph loaded during Initial_Load.
2. WHERE the Advancement page or the Character page is mounted, THE application SHALL have the Career_Dataset available for that page's functionality.
3. WHILE the Career_Dataset load is in progress for a mounted Advancement page or Character page, THE application SHALL defer that page's career-dependent functionality until the Career_Dataset is available rather than rendering degraded career functionality.
4. WHEN a character that has both a `career` value and a `careerLevel` value is loaded, THE application SHALL load the Career_Dataset on demand to perform the Retroactive_Career_Skill_Fill.
5. THE production build SHALL place the Career_Dataset in a chunk that is loaded only via an on-demand (dynamic) request rather than a static entry-reachable import.

### Requirement 2: Preserve the retroactive career-skill fill result

**User Story:** As a player loading an existing character, I want my career skills to be filled in exactly as they are today, so that no skills are dropped or changed by this optimization.

#### Acceptance Criteria

1. WHEN a character with a valid `career` and `careerLevel` is loaded, THE Character_Manager SHALL produce a `Character` whose career-skill contents are identical to the result of the current `ensureCareerSkillsExist` behavior for that same input.
2. WHEN a character has no `career` or no `careerLevel`, THE Character_Manager SHALL return the migrated `Character` without applying the Retroactive_Career_Skill_Fill, matching current behavior.
3. IF a character references a `career` or `careerLevel` that is not present in the Career_Dataset, THEN THE Character_Manager SHALL return the migrated `Character` without applying the Retroactive_Career_Skill_Fill, matching current behavior.
4. WHEN a load operation fails to parse the stored character data, THE Character_Manager SHALL return `null`, matching current behavior.

### Requirement 3: Preserve character management operations

**User Story:** As a player, I want to create, load, save, rename, duplicate, and delete characters exactly as before, so that this optimization is invisible to me.

#### Acceptance Criteria

1. THE Character_Manager SHALL continue to support `createCharacter`, `loadCharacter`, `saveCharacter`, `renameCharacter`, `duplicateCharacter`, `deleteCharacter`, and the portrait-aware variants with their current observable results.
2. WHEN a character is duplicated, THE Character_Manager SHALL produce a copy whose career-skill contents match the current duplicate behavior for the same source character.
3. THE persisted save format for characters SHALL remain unchanged by this feature.
4. WHERE the load path is changed to defer the Career_Dataset, THE change SHALL update every Character_Consumer consistently so that each consumer observes the same career-skill-fill result as today.

### Requirement 4: Maintain synchronous-load compatibility for callers

**User Story:** As a developer, I want the deferral change to keep the codebase type-safe and internally consistent, so that no caller silently receives a wrong or unresolved character.

#### Acceptance Criteria

1. WHERE the Retroactive_Career_Skill_Fill is made asynchronous or is split out of the synchronous `loadCharacter` path, THE change SHALL update all Character_Consumers to consume the correct (filled) `Character` result.
2. THE codebase SHALL compile with no new type errors introduced by this feature.
3. IF a Character_Consumer cannot obtain the filled `Character` synchronously after the change, THEN THE consumer SHALL be updated to obtain the filled `Character` before relying on its career-skill contents.

### Requirement 5: Preserve career data content and rules compliance

**User Story:** As a maintainer, I want the rulebook-sourced career data to remain unchanged, so that game correctness and rules compliance are preserved.

#### Acceptance Criteria

1. THE content of the Career_Dataset SHALL remain semantically unchanged by this feature.
2. THE set of careers, career levels, and career skills exposed by the Career_Dataset SHALL remain unchanged by this feature.
3. THE user-facing behavior and appearance of the Advancement page and the Character page SHALL remain unchanged by this feature.

### Requirement 6: Verify the optimization and regression safety

**User Story:** As a maintainer, I want measurable evidence that the dataset is deferred and that nothing regressed, so that I can merge the change with confidence.

#### Acceptance Criteria

1. THE production build chunk graph SHALL show that the `data-careers` chunk is not reachable from the entry chunk via static imports.
2. WHEN the full test suite is run, THE result SHALL be all tests passing.
3. WHEN a type check is run, THE result SHALL report no errors.
4. WHEN a production build is run, THE result SHALL complete successfully with no errors.

## Out of Scope / Non-Goals

- Changing the content or semantics of `src/data/careers.ts` (rulebook-sourced; must not be altered).
- Changing which careers, career levels, or career skills exist.
- Any UI or UX change to the Advancement page, Character page, or elsewhere.
- Any change to the persisted character save format.
- Deferral of other large data modules (`talents`, `spells`, `weapons`, `runes`, `enterprises`). These are noted as possible follow-ups and are only in scope if a chosen mechanism removes them from the eager graph trivially and without behavior change; otherwise they are deferred to separate specs.
