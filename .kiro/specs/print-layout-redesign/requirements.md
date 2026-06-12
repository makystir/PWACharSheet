# Requirements Document

## Introduction

This feature redesigns the print output of the WFRP 4e character sheet PWA to produce a clean, focused, and thematically styled printable character record. The print layout includes only gameplay-essential information that a player needs at the table, excludes application UI and non-essential data, and uses Warhammer Fantasy Roleplay-consistent visual decorations (borders, headers, ornamental dividers). The output is optimized for clean printing on A4 paper with proper page breaks and no content clipping.

## Glossary

- **Print_Layout**: The React component responsible for rendering the print-specific view of a character, visible only when the browser print dialog is invoked
- **Character_Record**: The complete set of gameplay-essential data for a WFRP 4e character that a player references during play sessions
- **Essential_Content**: Character data required for active gameplay — characteristics, skills, talents, wounds, weapons, armour, spells, trappings, wealth, fate/fortune, resilience/resolve, movement, and conditions
- **Non_Essential_Content**: Data not needed during play sessions — advancement log, session history, house rules configuration, XP tracking, combat state metadata, estate ledger entries, endeavour records, and application settings
- **WFRP_Decoration**: Visual styling elements consistent with Warhammer Fantasy Roleplay aesthetic — parchment-toned backgrounds, ornamental double-line borders, Cinzel serif typography for headers, heraldic dividers, and aged-document styling
- **Page_Break**: A CSS page-break directive that forces content to begin on a new printed page, preventing content from being split across pages
- **Section_Box**: A bordered container grouping related character data with a titled header

## Requirements

### Requirement 1: Essential Content Selection

**User Story:** As a player, I want the printed sheet to contain only the information I need during gameplay, so that I can quickly reference my character without visual noise.

#### Acceptance Criteria

1. THE Print_Layout SHALL display the following Essential_Content sections: personal details (name, species, class, career, career level, status), characteristics, fate and fortune, resilience and resolve, movement rates, basic skills, advanced skills, talents, weapons, armour and armour points, trappings, wealth, encumbrance, wounds, conditions, spells (when present), psychology, corruption and mutations, and ambitions
2. THE Print_Layout SHALL exclude the following Non_Essential_Content: advancement log, session history, house rules, XP totals, combat state metadata, estate ledger details, endeavour records, application settings, and character portrait
3. WHEN a character has no spells, THE Print_Layout SHALL omit the Spells section entirely
4. WHEN a character has no mutations, THE Print_Layout SHALL omit the Mutations section entirely
5. WHEN a character has companions, THE Print_Layout SHALL display companion stat blocks including name, species, characteristics, wounds, traits, and trained skills

### Requirement 2: Logical Content Organization

**User Story:** As a player, I want the printed sheet organized in the order I reference things during play, so that I can find information quickly at the table.

#### Acceptance Criteria

1. THE Print_Layout SHALL organize page one to contain: character identity (name, species, career, status), characteristics, fate/fortune/resilience/resolve, movement, skills, and talents
2. THE Print_Layout SHALL organize page two to contain: weapons, armour and armour points, wounds, conditions, wealth, encumbrance, trappings, spells (if present), psychology, corruption/mutations, and ambitions
3. THE Print_Layout SHALL place the character name and career prominently at the top of page one as the primary identifier
4. THE Print_Layout SHALL group related data within Section_Box containers with clearly labeled headers

### Requirement 3: Print-Clean Output

**User Story:** As a player, I want the printed sheet to render cleanly on paper without clipped content or awkward breaks, so that I get a professional-looking physical character record.

#### Acceptance Criteria

1. THE Print_Layout SHALL fit content within A4 page dimensions (210mm × 297mm) with 1cm margins
2. THE Print_Layout SHALL place Page_Break directives between logical page boundaries to prevent content from splitting across pages
3. THE Print_Layout SHALL prevent table rows from splitting across page boundaries
4. THE Print_Layout SHALL size all text, tables, and spacing to remain within printable area without overflow or horizontal clipping
5. WHEN a section contains more content than fits on the current page, THE Print_Layout SHALL move the entire section to the next page rather than splitting it mid-section
6. THE Print_Layout SHALL use a base font size between 8px and 10px to maximize content density while maintaining legibility on paper

### Requirement 4: WFRP Thematic Decoration

**User Story:** As a WFRP player, I want the printed sheet to look and feel like an in-universe document, so that it enhances the tabletop experience with appropriate Warhammer Fantasy aesthetic.

#### Acceptance Criteria

1. THE Print_Layout SHALL use Cinzel serif font family for section headers and the character name
2. THE Print_Layout SHALL use a parchment-toned background color (warm off-white in the #f5efe0 range) for the page
3. THE Print_Layout SHALL render Section_Box containers with ornamental double-line borders in a muted gold-brown tone
4. THE Print_Layout SHALL display section headers in uppercase with letter-spacing consistent with WFRP_Decoration style
5. THE Print_Layout SHALL apply a subtle aged-document aesthetic through muted earth-tone colors for text and borders
6. THE Print_Layout SHALL include a decorative double-rule border around each printed page

### Requirement 5: Skills Display Completeness

**User Story:** As a player, I want all my skills displayed with their linked characteristic and calculated total, so that I can make skill tests without mental arithmetic.

#### Acceptance Criteria

1. THE Print_Layout SHALL display each skill with its name, linked characteristic abbreviation, advance value, and calculated skill total
2. THE Print_Layout SHALL display basic skills and advanced skills in separate labeled sections
3. THE Print_Layout SHALL calculate the skill total as the sum of the linked characteristic current value and the skill advance value
4. WHEN a skill has zero advances, THE Print_Layout SHALL still display the skill with its base characteristic value as the total

### Requirement 6: Combat Reference Data

**User Story:** As a player, I want all combat-relevant data presented together clearly, so that I can resolve combat actions quickly during play.

#### Acceptance Criteria

1. THE Print_Layout SHALL display each weapon with its name, group, encumbrance, range/reach, damage value, and qualities
2. THE Print_Layout SHALL display each armour piece with its name, covered locations, encumbrance, AP value, and qualities
3. THE Print_Layout SHALL display the armour points summary showing AP totals for each hit location (Head, Right Arm, Left Arm, Body, Right Leg, Left Leg, Shield) with their corresponding dice roll ranges
4. THE Print_Layout SHALL display current wounds and total wounds prominently
5. THE Print_Layout SHALL display the wound calculation breakdown (SB + TB×2 + WPB + Hardy)
6. WHEN a character has active conditions, THE Print_Layout SHALL display condition names and their current stack levels

### Requirement 7: Wealth and Encumbrance Tracking

**User Story:** As a player, I want wealth and carrying capacity clearly printed, so that I can track resources and weight limits during adventures.

#### Acceptance Criteria

1. THE Print_Layout SHALL display wealth in all three denominations: Gold Crowns (GC), Silver Shillings (SS), and Brass Pennies (D)
2. THE Print_Layout SHALL display encumbrance totals broken down by category (weapons, armour, trappings) and the combined total
3. THE Print_Layout SHALL display the maximum encumbrance capacity
4. THE Print_Layout SHALL display each trapping item with its name, encumbrance value, and quantity

### Requirement 8: Responsive Section Rendering

**User Story:** As a player with a unique character build, I want the print layout to adapt to my character's data, so that space is used efficiently regardless of whether I have spells, companions, or other optional content.

#### Acceptance Criteria

1. WHEN a character has spells, THE Print_Layout SHALL render a Spells section displaying each spell with name, casting number, range, target, duration, and effect
2. WHEN a character has no companions, THE Print_Layout SHALL omit the Companions section without leaving blank space
3. WHEN a character has many talents or skills, THE Print_Layout SHALL allow the content to flow onto additional pages with proper Page_Break handling
4. WHEN a character has ammo items, THE Print_Layout SHALL display ammunition with name, quantity, and qualities

### Requirement 9: Print Trigger Isolation

**User Story:** As a user of the PWA, I want the print layout to appear only when I print and not affect the normal application display, so that screen and print experiences remain independent.

#### Acceptance Criteria

1. WHILE the browser is not in print mode, THE Print_Layout SHALL remain hidden and not affect screen layout or performance
2. WHEN the browser enters print mode, THE Print_Layout SHALL become visible and all screen-only UI elements SHALL be hidden
3. THE Print_Layout SHALL not include interactive elements (buttons, inputs, toggles, or editable fields)
4. THE Print_Layout SHALL render static text representations of all character data
