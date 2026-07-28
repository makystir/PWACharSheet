# Requirements Document

## Introduction

The combat page's Spells & Prayers panel displays an "Effect" column showing raw text like "Magic missile Dmg +4". This is unclear to players because it does not explain that the actual damage formula is the listed modifier plus the casting SL (Success Levels). For spells that reference "Dmg WPB" or "Dmg TB", it is equally opaque without seeing the resolved values. This feature improves the clarity of spell damage display so players can understand at a glance what damage a combat spell will actually deal, both before and after casting.

## Glossary

- **Spell_Table**: The HTML table in the SpellCastingPanel that lists memorized spells with columns for Name, CN, Range, Target, Duration, and Effect.
- **Effect_Column**: The table column that displays the raw spell effect text (e.g., "Magic missile Dmg +4").
- **Magic_Missile**: A combat spell whose effect text contains "Dmg", "damage", or "Magic missile" (case-insensitive), indicating it deals direct damage.
- **Damage_Modifier**: The numeric component extracted from the spell's effect text (e.g., +4 from "Dmg +4", or the resolved WPB value from "Dmg WPB").
- **WPB**: Willpower Bonus — the tens digit of the character's total Willpower characteristic.
- **Casting_SL**: The Success Levels achieved on the casting roll, added to the damage modifier to compute total spell damage.
- **Damage_Formula**: The complete calculation for magic missile damage: Damage_Modifier + Casting_SL.
- **Damage_Breakdown**: A human-readable string showing the formula components (e.g., "4 + SL" or "WPB(4) + SL").
- **CastResultDisplay**: The dialog shown after a spell is cast, displaying the roll result, hit location, and computed damage.

## Requirements

### Requirement 1: Show Damage Formula in Spell Table

**User Story:** As a player, I want to see a clear damage formula for magic missile spells in the spell table, so that I understand what the listed modifier means before I cast.

#### Acceptance Criteria

1. WHEN the Spell_Table renders a Magic_Missile spell, THE Spell_Table SHALL display a Damage_Breakdown below or alongside the effect text showing the formula components.
2. WHEN the spell's effect contains "Dmg +N" (where N is an integer), THE Spell_Table SHALL display the Damage_Breakdown as "Dmg: N + SL".
3. WHEN the spell's effect contains "Dmg WPB", THE Spell_Table SHALL display the Damage_Breakdown as "Dmg: WPB(X) + SL" where X is the character's current WPB value.
4. WHEN the spell's effect contains "Dmg TB", THE Spell_Table SHALL display the Damage_Breakdown as "Dmg: TB(X) + SL" where X is the character's current Toughness Bonus value.
5. WHEN a spell is not a Magic_Missile, THE Spell_Table SHALL display only the raw effect text with no Damage_Breakdown.

### Requirement 2: Show Damage Breakdown in Cast Result

**User Story:** As a player, I want to see a step-by-step damage breakdown in the cast result dialog after casting a magic missile, so that I can verify the final damage number.

#### Acceptance Criteria

1. WHEN a Magic_Missile spell is cast successfully, THE CastResultDisplay SHALL display the damage as a breakdown showing each component: Damage_Modifier, Casting_SL, and total.
2. THE CastResultDisplay SHALL format the breakdown as "Damage_Modifier + SL(X) = Total" where X is the achieved SL and Total is the computed damage value.
3. WHEN overcast damage is applied, THE CastResultDisplay SHALL include the overcast bonus in the breakdown as "Damage_Modifier + SL(X) + Overcast(Y) = Total".

### Requirement 3: Tooltip Explanation for Damage Column

**User Story:** As a player, I want to be able to see a tooltip explaining the damage formula convention, so that I can learn what the numbers mean without consulting the rulebook.

#### Acceptance Criteria

1. THE Spell_Table SHALL display a help indicator (such as an info icon or question mark) adjacent to the Effect column header.
2. WHEN the user hovers over or taps the help indicator, THE Spell_Table SHALL display a tooltip with the text: "Magic missile damage = listed modifier + Success Levels from your casting roll."
3. THE tooltip SHALL be accessible via keyboard focus in addition to hover and tap interactions.
