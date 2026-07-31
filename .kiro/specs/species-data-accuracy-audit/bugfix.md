# Bugfix Requirements Document

## Introduction

The `src/data/species.ts` file contains species and subrace data for WFRP 4e character creation. An audit against the official source documents has revealed several data inaccuracies in non-Dwarf species entries. Additionally, several source documents currently in the root directory need to be relocated to the `docs/` folder for better project organization. The Dwarf and Dwarf subrace entries have already been fixed in a prior spec and are excluded from this audit.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a Halfling character is created THEN the system offers "Gossip" as a species skill instead of "Trade (Cook)", which does not match the core rulebook (p.33)

1.2 WHEN a base High Elf character is created THEN the system offers "Research" as a species skill instead of "Swim", which does not match the core rulebook (p.33)

1.3 WHEN a Sea Elf character is created THEN the system is missing the "Uncouth Uranai" talent from the species talents list, which does not match the High Elf Player's Guide (p.57)

1.4 WHEN a developer or contributor looks for the source documents `Up_In_Arms.md`, `WarhammerFantasyRoleplay4e.md`, `windsofmagic.md`, `archivesoftheempire.md`, `archivesoftheempire2.md`, and `archivesoftheempire3.md` THEN the system has them in the project root directory instead of the `docs/` directory where other source documents reside

### Expected Behavior (Correct)

2.1 WHEN a Halfling character is created THEN the system SHALL offer "Trade (Cook)" as a species skill (replacing "Gossip"), matching the core rulebook

2.2 WHEN a base High Elf character is created THEN the system SHALL offer "Swim" as a species skill (replacing "Research"), matching the core rulebook

2.3 WHEN a Sea Elf character is created THEN the system SHALL include "Uncouth Uranai" in the species talents list, matching the High Elf Player's Guide

2.4 WHEN a developer or contributor looks for source documents THEN the system SHALL have all source documents (`Up_In_Arms.md`, `WarhammerFantasyRoleplay4e.md`, `windsofmagic.md`, `archivesoftheempire.md`, `archivesoftheempire2.md`, `archivesoftheempire3.md`) located in the `docs/` directory

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a Human/Reiklander character is created THEN the system SHALL CONTINUE TO provide the correct species skills and talents matching the core rulebook

3.2 WHEN a Dwarf or any Dwarf subrace character is created THEN the system SHALL CONTINUE TO provide the correct species skills and talents (already fixed in prior spec)

3.3 WHEN a Wood Elf character is created THEN the system SHALL CONTINUE TO provide the correct species skills and talents matching the core rulebook

3.4 WHEN an Ogre character is created THEN the system SHALL CONTINUE TO provide the correct species skills, talents, and characteristics matching Archives of the Empire Vol II

3.5 WHEN a High Elf subrace character (Caledor, Ellyrion, Avelorn, Saphery, Eataine, Tiranoc, Nagarythe, Chrace, Cothique, Yvresse) is created THEN the system SHALL CONTINUE TO provide the correct species skills and talents matching the High Elf Player's Guide

3.6 WHEN an existing character sheet is loaded that was created with the previous species data THEN the system SHALL CONTINUE TO load and display correctly without data loss
