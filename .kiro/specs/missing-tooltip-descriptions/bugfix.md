# Bugfix Requirements Document

## Introduction

Several skills and talents in the WFRP 4e character sheet app are missing tooltip descriptions. When users hover or tap on these items, no tooltip appears because the data entries are absent from the lookup databases (`SKILL_DESCRIPTIONS` and `TALENT_DB`). This affects three categories: (1) advanced skills present in `ADV_SKILL_DB` but missing from `SKILL_DESCRIPTIONS` (Augury, Psychometry, Runesmithing), (2) talents referenced in career data but absent from `TALENT_DB` (Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, Stealthy, Trick Rider, Public Speaker, Strongminded, Stouthearted, Wellprepared, Warleader, Cat Fall, Detect Artifact, Public-Speaking), and (3) name variant mismatches where career data uses a different spelling than the canonical `TALENT_DB` entry (e.g., "Warleader" vs "War Leader", "Cat Fall" vs "Catfall").

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user views a skill tooltip for Augury, Psychometry, or Runesmithing THEN the system returns no tooltip content because these skills have no entry in SKILL_DESCRIPTIONS

1.2 WHEN a user views a talent tooltip for a genuinely new talent (Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, Stealthy) THEN the system returns no tooltip content because these talents have no entry in TALENT_DB

1.3 WHEN a user views a talent tooltip for a name variant (Trick Rider, Public Speaker, Strongminded, Stouthearted, Wellprepared, Warleader, Cat Fall, Detect Artifact, Public-Speaking) THEN the system returns no tooltip content because the exact name does not match any TALENT_DB entry despite a canonical equivalent existing

### Expected Behavior (Correct)

2.1 WHEN a user views a skill tooltip for Augury, Psychometry, or Runesmithing THEN the system SHALL display a tooltip with the skill's description and linked characteristic

2.2 WHEN a user views a talent tooltip for Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, or Stealthy THEN the system SHALL display a tooltip with the talent's description and max value

2.3 WHEN a user views a talent tooltip for a name variant (Trick Rider, Public Speaker, Strongminded, Stouthearted, Wellprepared, Warleader, Cat Fall, Detect Artifact, Public-Speaking) THEN the system SHALL resolve the variant to its canonical TALENT_DB entry and display the correct tooltip

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views a skill tooltip for any previously-working skill (e.g., Animal Care, Channelling, Heal, Evaluate) THEN the system SHALL CONTINUE TO display the correct tooltip with description and linked characteristic

3.2 WHEN a user views a talent tooltip for any previously-working talent (e.g., Accurate Shot, Hardy, Combat Master, War Leader) THEN the system SHALL CONTINUE TO display the correct tooltip with description and max value

3.3 WHEN a user views a talent tooltip for a custom talent not in TALENT_DB that has a character-level description THEN the system SHALL CONTINUE TO fall back to showing the character-provided description

3.4 WHEN a user views a grouped skill tooltip (e.g., "Melee (Cavalry)", "Language (Khazalid)") THEN the system SHALL CONTINUE TO resolve via prefix matching and display the group description
