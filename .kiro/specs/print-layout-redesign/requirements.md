# Requirements Document

## Introduction

This document specifies the requirements for a full redesign of the Print Layout component in the WFRP 4e Character Sheet PWA. The redesigned layout must present all character data needed for tabletop play, support multi-page printing on A4/Letter paper, and evoke the dark fantasy aesthetic of the Warhammer Old World through decorative CSS elements such as parchment textures, ornamental borders, blackletter-inspired headings, and heraldic flourishes.

## Glossary

- **Print_Layout**: The React component responsible for rendering the character sheet in a printer-optimized format, triggered via the browser print dialog
- **Character_Sheet**: The complete set of character data stored in the application, encompassing all gameplay-relevant fields
- **Old_World_Theme**: A visual design language inspired by Germanic medieval and dark renaissance aesthetics—parchment textures, weathered borders, blackletter typography, iron-bound ornamentation, and heraldic sigils
- **Section**: A visually distinct grouping of related character data within the printed output (e.g., Characteristics, Skills, Armour)
- **Page_Break**: A CSS-controlled boundary that forces content onto the next printed page
- **Optional_Mechanic**: A gameplay subsystem enabled via house rules toggles (enterprises, psychology tracker, grudge book, yenlui balance)
- **Decorative_Element**: A CSS-only visual flourish (border, corner ornament, divider, background texture) that contributes to the Old_World_Theme without requiring external image assets

## Requirements

### Requirement 1: Complete Character Data Coverage

**User Story:** As a player, I want every gameplay-relevant piece of character data included on my printed sheet, so that I can reference all information at the table without needing the digital app.

#### Acceptance Criteria

1. THE Print_Layout SHALL render the following core Sections: personal details (name, species, class, career, career level, career path, status, age, height, hair, eyes), characteristics (all 10 with initial/advances/current), fate/fortune, resilience/resolve, movement (M/Walk/Run), XP (current/spent/total), basic skills, advanced skills, talents, weapons, armour, armour points by location, trappings, ammunition, wealth (GC/SS/D), encumbrance summary, wounds (breakdown and total), corruption/sin, mutations, spells and prayers, companions, conditions, ambitions, party details, and estate
2. WHEN the character has psychology traits recorded in the psychologyTraits array, THE Print_Layout SHALL render each trait displaying its type, target, and rating where applicable
3. WHEN the enterprises house rule is enabled and the character has one or more enterprises, THE Print_Layout SHALL render each enterprise displaying its name, type, expansion level, debt, income sources, and special rules
4. WHEN the grudge book house rule is enabled and the character has one or more grudges, THE Print_Layout SHALL render each grudge displaying offence, perpetrator, restitution, type, and status
5. WHEN the yenlui house rule is enabled, THE Print_Layout SHALL render the current yenlui state (light, balanced, or dark)
6. WHEN the character has one or more critical wounds, THE Print_Layout SHALL render each critical wound displaying location, description, effects, and severity
7. WHEN the character has one or more rituals, THE Print_Layout SHALL render each ritual displaying name, CN, type, and description
8. WHEN the character has one or more hirelings, THE Print_Layout SHALL render each hireling displaying name, role, status, characteristics, and skills summary

### Requirement 2: Old World Decorative Theming

**User Story:** As a player, I want my printed character sheet to look like an in-universe document from the Old World, so that it enhances immersion during tabletop play.

#### Acceptance Criteria

1. THE Print_Layout SHALL apply a parchment-style background colour or subtle gradient to all printed pages
2. THE Print_Layout SHALL render ornamental double-rule or engraved-style borders around each page
3. THE Print_Layout SHALL render Section headings using a blackletter-inspired or decorative serif font family distinct from body text
4. THE Print_Layout SHALL render decorative corner ornaments on the outermost page border using CSS-only techniques (pseudo-elements, box-shadows, or border-image)
5. THE Print_Layout SHALL render horizontal dividers between major Sections using ornamental rule patterns (not plain lines)
6. THE Print_Layout SHALL apply a dark, muted colour palette (deep browns, aged golds, parchment cream, iron greys) throughout all printed content
7. THE Print_Layout SHALL render at least one heraldic or sigil-style Decorative_Element per page using CSS shapes or Unicode glyphs

### Requirement 3: Typography and Readability

**User Story:** As a player, I want my printed character sheet to remain clearly readable despite the decorative styling, so that I can quickly find values during gameplay.

#### Acceptance Criteria

1. THE Print_Layout SHALL render body text at a minimum effective size of 8pt when printed
2. THE Print_Layout SHALL render numeric values (characteristic scores, skill totals, AP values) in a bold weight to distinguish them from labels
3. THE Print_Layout SHALL maintain a minimum contrast ratio of 4.5:1 between text and background across all Sections
4. THE Print_Layout SHALL use consistent font sizing hierarchy: page title largest, Section headings medium, table headers small-caps or uppercase, body text standard
5. THE Print_Layout SHALL limit decorative fonts to headings and titles, using a legible serif or sans-serif for data cells and descriptions

### Requirement 4: Multi-Page Layout and Print Optimisation

**User Story:** As a player, I want the printed sheet to flow cleanly across multiple pages without cutting content mid-section, so that the output is professional and easy to read.

#### Acceptance Criteria

1. THE Print_Layout SHALL target A4 paper size (210mm × 297mm) with margins no larger than 15mm per side
2. WHEN rendered content exceeds one page, THE Print_Layout SHALL insert Page_Breaks at logical boundaries between Sections rather than mid-table or mid-section
3. THE Print_Layout SHALL apply CSS `break-inside: avoid` to each Section to prevent splitting a single Section across two pages where feasible
4. WHEN a single Section exceeds the available height of one page, THE Print_Layout SHALL allow that Section to break across pages with a repeated table header on the continuation page
5. THE Print_Layout SHALL support US Letter paper size (216mm × 279mm) as an alternative via CSS `@page` size declaration
6. THE Print_Layout SHALL render a footer on each page displaying the character name and generation date

### Requirement 5: Conditional Section Rendering

**User Story:** As a player, I want only the sections relevant to my character to appear on the printed sheet, so that non-applicable sections do not waste paper.

#### Acceptance Criteria

1. WHEN the character has zero spells and zero prayers, THE Print_Layout SHALL omit the Spells and Prayers Section entirely
2. WHEN the character has zero enterprises or the enterprises house rule is disabled, THE Print_Layout SHALL omit the Enterprises Section entirely
3. WHEN the character has zero grudges or the grudge book house rule is disabled, THE Print_Layout SHALL omit the Grudge Book Section entirely
4. WHEN the yenlui house rule is disabled, THE Print_Layout SHALL omit the Yenlui Balance Section entirely
5. WHEN the character has zero companions, THE Print_Layout SHALL omit the Companions Section entirely
6. WHEN the character has zero mutations, THE Print_Layout SHALL omit the Mutations Section entirely
7. WHEN the character has zero critical wounds, THE Print_Layout SHALL omit the Critical Wounds Section entirely
8. WHEN the character has zero hirelings, THE Print_Layout SHALL omit the Hirelings Section entirely
9. WHEN the character has zero rituals, THE Print_Layout SHALL omit the Rituals Section entirely
10. WHEN the character has no estate name defined, THE Print_Layout SHALL omit the Estate Section entirely
11. WHEN the psychology tracker house rule is disabled or the character has zero psychology traits, THE Print_Layout SHALL omit the Psychology Traits Section entirely

### Requirement 6: Section Layout and Information Density

**User Story:** As a player, I want data-dense sections arranged efficiently to minimise page count while remaining scannable, so that my sheet is compact yet usable.

#### Acceptance Criteria

1. THE Print_Layout SHALL render basic skills in a multi-column grid (minimum two columns) to reduce vertical space usage
2. THE Print_Layout SHALL render the characteristics table as a single horizontal row of all 10 characteristics with initial, advances, and current values stacked vertically
3. THE Print_Layout SHALL render armour points in a compact visual format showing all six hit locations plus shield in a single row or diagram
4. THE Print_Layout SHALL group fate/fortune, resilience/resolve, movement, and wounds into a single compact status row beneath characteristics
5. THE Print_Layout SHALL render weapons in a table with columns for name, group, encumbrance, range/reach, damage, and qualities
6. THE Print_Layout SHALL render talents in a table with columns for name, times taken, and description

### Requirement 7: Print Media Isolation

**User Story:** As a player, I want the print layout to display only when printing and not affect the on-screen application, so that screen and print experiences remain independent.

#### Acceptance Criteria

1. THE Print_Layout SHALL be visible only within a `@media print` context or when explicitly rendered in a print-preview mode
2. THE Print_Layout SHALL hide all interactive UI elements (buttons, inputs, navigation, modals) from the printed output
3. THE Print_Layout SHALL not affect the visual styling of non-print application views when loaded in the DOM
4. WHEN the user triggers the browser print dialog, THE Print_Layout SHALL be the sole visible content in the printed output
