# Bugfix Requirements Document

## Introduction

The `careerSkillMatches` function in `src/logic/advancement.ts` fails to recognize two skill naming patterns used in WFRP 4e career definitions: the `(Any X)` variant (e.g., `"Channelling (Any Colour)"`) and the `(X or Y)` choice pattern (e.g., `"Art (Calligraphy or Engraving)"`). This causes the career completion check to undercount qualifying skills, showing incorrect progress (e.g., "Skills: 7/8 needed at 5+ advances") even when the character has enough qualifying skills. The bug affects multiple careers including Mage, Soldier, Rat Catcher, Pedlar, Smuggler, and Artisan.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a career skill uses the `(Any X)` pattern (e.g., `"Channelling (Any Colour)"`) and the character has a matching specialization (e.g., `"Channelling (Aqshy)"`) THEN the system does not count the skill as matching the career requirement

1.2 WHEN a career skill uses the `(X or Y)` pattern (e.g., `"Art (Calligraphy or Engraving)"`) and the character has one of the listed specializations (e.g., `"Art (Calligraphy)"`) THEN the system does not count the skill as matching the career requirement

1.3 WHEN a career skill uses the `(X or Y)` pattern (e.g., `"Stealth (Rural or Urban)"`) and the character has one of the listed specializations (e.g., `"Stealth (Urban)"`) THEN the system does not count the skill as matching the career requirement

1.4 WHEN the above unmatched skills cause the qualifying skill count to fall below the required threshold (8 skills at the level's advance requirement) THEN the system incorrectly reports the career level as incomplete

### Expected Behavior (Correct)

2.1 WHEN a career skill uses the `(Any X)` pattern (e.g., `"Channelling (Any Colour)"`) and the character has a matching specialization with the same base name (e.g., `"Channelling (Aqshy)"`) THEN the system SHALL count the skill as matching the career requirement

2.2 WHEN a career skill uses the `(X or Y)` pattern (e.g., `"Art (Calligraphy or Engraving)"`) and the character has a skill matching one of the listed options (e.g., `"Art (Calligraphy)"` or `"Art (Engraving)"`) THEN the system SHALL count the skill as matching the career requirement

2.3 WHEN a career skill uses the `(X or Y)` pattern (e.g., `"Stealth (Rural or Urban)"`) and the character has a skill matching one of the listed options (e.g., `"Stealth (Rural)"` or `"Stealth (Urban)"`) THEN the system SHALL count the skill as matching the career requirement

2.4 WHEN the character has sufficient qualifying skills (including those matched via `(Any X)` and `(X or Y)` patterns) meeting the advance threshold THEN the system SHALL correctly report the career level as complete

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a career skill is an exact match with the character's skill name (e.g., `"Melee (Basic)"` matches `"Melee (Basic)"`) THEN the system SHALL CONTINUE TO count the skill as matching

3.2 WHEN a career skill uses the `(Any)` pattern without a qualifier (e.g., `"Melee (Any)"`) and the character has any specialization of that skill THEN the system SHALL CONTINUE TO match correctly

3.3 WHEN an ungrouped career skill (e.g., `"Stealth"`) matches a specialized character skill (e.g., `"Stealth (Urban)"`) THEN the system SHALL CONTINUE TO count the skill as matching

3.4 WHEN a career skill uses the `(Any X)` pattern and the character has an unrelated skill with a different base name THEN the system SHALL CONTINUE TO not match (e.g., `"Channelling (Any Colour)"` shall not match `"Language (Aqshy)"`)

3.5 WHEN a career skill uses the `(X or Y)` pattern and the character has a specialization not listed in the options THEN the system SHALL CONTINUE TO not match (e.g., `"Art (Calligraphy or Engraving)"` shall not match `"Art (Painting)"`)

3.6 WHEN a career skill is a specific specialization (e.g., `"Melee (Basic)"`) and the character has a different specialization of the same base skill (e.g., `"Melee (Two-Handed)"`) THEN the system SHALL CONTINUE TO not match
