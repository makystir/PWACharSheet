# Bugfix Requirements Document

## Introduction

Two related data integrity issues exist in `src/data/careers.ts` and `src/data/species.ts` where the Runesmith and Runescribe career entries have scrambled/swapped data, and all Dwarf subrace entries have incorrect talents (choices listed as fixed values, wrong talents substituted, "Ancestral Grudge" erroneously added to all subraces). The source of truth is `docs/dwarfguide.md`.

## Bug Analysis

### Current Behavior (Defect)

**Runesmith Career:**

1.1 WHEN the Runesmith career Level 1 ("Apprentice Runesmith") is loaded THEN the system displays status "Brass 4" instead of the correct "Silver 2", and shows incorrect skills (missing Art, Intuition, Melee, Consume Alcohol) and wrong talents (Craftsman (Smith), Read/Write, Rune Magic, Sturdy instead of Detect Artefact, Magic Resistance, Rune Magic (Rune of Striking), Strong Back)

1.2 WHEN the Runesmith career Level 2 ("Runesmith") is loaded THEN the system displays status "Silver 3" instead of the correct "Silver 5", and shows incorrect skills (Engineering, Research, Carpenter, etc. instead of Athletics, Dodge, Intimidate, Lore (Geology or Metallurgy), Perception, Stealth (Any One)) and wrong talents

1.3 WHEN the Runesmith career Level 3 is loaded THEN the system displays title "Master Runesmith" instead of the correct "Runemaster", status "Gold 1" instead of "Gold 2", and shows incorrect skills and talents

1.4 WHEN the Runesmith career Level 4 ("Runelord") is loaded THEN the system displays status "Gold 3" instead of the correct "Gold 4", and shows incorrect skills (contains accumulated skills from lower levels) and wrong talents

**Runescribe Career:**

1.5 WHEN the Runescribe career Level 1 ("Apprentice Runescribe") is loaded THEN the system displays status "Brass 4" instead of the correct "Brass 3", and shows incorrect skills (Art (Calligraphy), Lore (Runes), etc. instead of Art (Writing), Consume Alcohol, Entertain (Singing or Storytelling), Evaluate, Gamble, Haggle, Language (Any One), Lore (Any One), Research, Stealth (Any One)) and wrong talents (Artistic, Read/Write, Savvy, Super Numerate instead of Read/Write, Speedreader, Super Numerate, Supportive)

1.6 WHEN the Runescribe career Level 2 ("Runescribe") is loaded THEN the system shows incorrect skills and includes magical talents "Rune Magic" and "Runesmithing" that do not belong to this non-magical career (correct talents: Acute Sense (Touch), Bookish, Lip Reading, Long Memory)

1.7 WHEN the Runescribe career Level 3 is loaded THEN the system displays title "Master Runescribe" instead of the correct "Lorekeeper", status "Silver 4" instead of "Silver 5", and incorrectly includes "Rune Magic" and "Runesmithing" talents

1.8 WHEN the Runescribe career Level 4 is loaded THEN the system displays title "Runelord Scribe" instead of the correct "Loremaster", and incorrectly includes "Master Rune Magic", "Rune Magic", and "Runesmithing" talents

**Dwarf Subrace Talents:**

1.9 WHEN any Dwarf subrace other than Karaz-a-Karak is loaded THEN the system incorrectly includes "Ancestral Grudge" as a fixed talent (only Karaz-a-Karak has it as a choice option "Ancestral Grudge or Resolute")

1.10 WHEN any Dwarf subrace is loaded THEN the system displays talent choices ("X or Y") as separate fixed talents, losing the choice mechanic (e.g., "Read/Write or Relentless" is shown as just "Read/Write" with "Relentless" or another talent listed separately or omitted)

1.11 WHEN Dwarf subrace talent data is loaded THEN the system shows wrong unique talents for many holds (e.g., Barak Varr shows "Sea Legs" instead of "Dealmaker or Strong-minded"; Karak Azul shows "Craftsman (Trade)" instead of "Hatred (Orcs and Goblins) or Resolute"; Karak Kadrin shows "Fearless (Everything)" instead of "Iron Jaw or Read/Write")

**Dwarf Subrace Skills:**

1.12 WHEN Dwarf subrace skill data is loaded THEN the system shows incorrect skills for most holds that do not match the source material (e.g., Karaz-a-Karak shows "Lore (History), Perception, Trade (Smith), Trade (Cook)" instead of "Leadership, Lore (Dwarfs), Lore (Geology), Lore (Metallurgy), Trade (Any One)"; Barak Varr shows "Swim" instead of correct skills from dwarfguide.md)

### Expected Behavior (Correct)

**Runesmith Career:**

2.1 WHEN the Runesmith career Level 1 ("Apprentice Runesmith") is loaded THEN the system SHALL display status "Silver 2", characteristics [Dex, Int, WP], skills [Art (Sculpture or Engraving), Cool, Consume Alcohol, Endurance, Evaluate, Intuition, Lore (Runes), Runesmithing, Melee (Basic or Two-handed), Trade (Smith)], and talents [Detect Artefact, Magic Resistance, Rune Magic (Rune of Striking), Strong Back]

2.2 WHEN the Runesmith career Level 2 ("Runesmith") is loaded THEN the system SHALL display status "Silver 5" and show only the new skills for this level [Athletics, Dodge, Intimidate, Lore (Geology or Metallurgy), Perception, Stealth (Any One)] and talents [Forgefire, Magic Defiance, Magical Sense, Rune Magic (All Forms)]

2.3 WHEN the Runesmith career Level 3 ("Runemaster") is loaded THEN the system SHALL display title "Runemaster", status "Gold 2", and show only the new skills for this level [Climb, Navigation, Pick Lock, Set Trap] and talents [Acute Sense (Touch), Long Memory, Master Rune Magic (All Forms), Tireless]

2.4 WHEN the Runesmith career Level 4 ("Runelord") is loaded THEN the system SHALL display status "Gold 4" and show only the new skills for this level [Leadership, Lore (Any)] and talents [Ancestral Grudge, Iron Will, Menacing, Pure Soul]

**Runescribe Career:**

2.5 WHEN the Runescribe career Level 1 ("Apprentice Runescribe") is loaded THEN the system SHALL display status "Brass 3", characteristics [T, Dex, Int], skills [Art (Writing), Consume Alcohol, Entertain (Singing or Storytelling), Evaluate, Gamble, Haggle, Language (Any One), Lore (Any One), Research, Stealth (Any One)], and talents [Read/Write, Speedreader, Super Numerate, Supportive]

2.6 WHEN the Runescribe career Level 2 ("Runescribe") is loaded THEN the system SHALL display status "Silver 2" and show only the new skills [Gossip, Intuition, Lore (Any One), Navigation, Perception, Trade (Any One)] and talents [Acute Sense (Touch), Bookish, Lip Reading, Long Memory] with NO magical talents

2.7 WHEN the Runescribe career Level 3 ("Lorekeeper") is loaded THEN the system SHALL display title "Lorekeeper", status "Silver 5", and show only the new skills [Heal, Lore (Any One), Outdoor Survival, Track] and talents [Ancestral Grudge, Gregarious, Linguistics, Savant (Any One)] with NO magical talents

2.8 WHEN the Runescribe career Level 4 ("Loremaster") is loaded THEN the system SHALL display title "Loremaster", status "Gold 2", and show only the new skills [Cool, Lore (Any One)] and talents [Blather, Detect Artefact, Public Speaker, Tireless] with NO magical talents

**Dwarf Subrace Talents:**

2.9 WHEN the "Dwarfs (Karaz-a-Karak)" subrace is loaded THEN the system SHALL display talents ["Ancestral Grudge or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]

2.10 WHEN the "Dwarfs (Barak Varr)" subrace is loaded THEN the system SHALL display talents ["Dealmaker or Strong-minded", "Magic Resistance", "Night Vision", "Read/Write or Resolute", "Sturdy"]

2.11 WHEN the "Dwarfs (Karak Azul)" subrace is loaded THEN the system SHALL display talents ["Hatred (Orcs and Goblins) or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]

2.12 WHEN the "Dwarfs (Karak Eight Peaks)" subrace is loaded THEN the system SHALL display talents ["Magic Resistance", "Night Vision", "Read/Write or Resolute", "Strong-minded or Tenacious", "Sturdy"]

2.13 WHEN the "Dwarfs (Karak Kadrin)" subrace is loaded THEN the system SHALL display talents ["Iron Jaw or Read/Write", "Magic Resistance", "Night Vision", "Resolute or Strong-minded", "Sturdy"]

2.14 WHEN the "Dwarfs (Zhufbar)" subrace is loaded THEN the system SHALL display talents ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Strong-minded or Tinker", "Sturdy"]

2.15 WHEN the "Dwarfs (Karak Hirn/Black Mountains)" subrace is loaded THEN the system SHALL display talents ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Scale Sheer Surface or Strong-minded", "Sturdy"]

2.16 WHEN the "Dwarfs (Karak Izor/The Vaults)" subrace is loaded THEN the system SHALL display talents ["Enclosed Fighter or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]

2.17 WHEN the "Dwarfs (Karak Norn/Grey Mountains)" subrace is loaded THEN the system SHALL display talents ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Stone Soup", "Sturdy"]

2.18 WHEN the "Dwarfs (Norse)" subrace is loaded THEN the system SHALL display talents ["Carouser or Strong-minded", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]

2.19 WHEN the "Dwarfs (Imperial)" subrace is loaded THEN the system SHALL display talents ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Strong-minded", "Sturdy"]

**Dwarf Subrace Skills:**

2.20 WHEN the "Dwarfs (Karaz-a-Karak)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Leadership", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]

2.21 WHEN the "Dwarfs (Barak Varr)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Haggle", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Navigation", "Sail", "Trade (Any One)"]

2.22 WHEN the "Dwarfs (Karak Azul)" subrace is loaded THEN the system SHALL display skills ["Climb", "Consume Alcohol", "Cool", "Endurance", "Evaluate", "Haggle", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]

2.23 WHEN the "Dwarfs (Karak Eight Peaks)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Cool", "Endurance", "Evaluate", "Intuition", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Warfare)", "Melee (Basic)", "Set Traps", "Trade (Any One)"]

2.24 WHEN the "Dwarfs (Karak Kadrin)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Gamble", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]

2.25 WHEN the "Dwarfs (Zhufbar)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Engineering)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]

2.26 WHEN the "Dwarfs (Karak Hirn/Black Mountains)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Haggle", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Play (Horn)", "Trade (Any One)"]

2.27 WHEN the "Dwarfs (Karak Izor/The Vaults)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Melee (Basic)", "Outdoor Survival", "Trade (Any One)"]

2.28 WHEN the "Dwarfs (Karak Norn/Grey Mountains)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Perception", "Ranged (Crossbow)", "Trade (Any One)"]

2.29 WHEN the "Dwarfs (Norse)" subrace is loaded THEN the system SHALL display skills ["Climb", "Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Language (Norse)", "Lore (Dwarfs)", "Melee (Basic)", "Sail", "Trade (Any One)"]

2.30 WHEN the "Dwarfs (Imperial)" subrace is loaded THEN the system SHALL display skills ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any non-Dwarf career (e.g., Warrior, Wizard, Ranger) is loaded THEN the system SHALL CONTINUE TO display the correct skills, talents, status, and titles for those careers

3.2 WHEN the base "Dwarf" species entry is loaded THEN the system SHALL CONTINUE TO display the correct base Dwarf characteristics, skills ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any)"], and talents ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Strong-minded", "Sturdy"]

3.3 WHEN any non-Dwarf species (Human, Halfling, Elf) is loaded THEN the system SHALL CONTINUE TO display the correct data for those species

3.4 WHEN other Dwarf-specific careers besides Runesmith and Runescribe are loaded THEN the system SHALL CONTINUE TO display correct data for those careers

3.5 WHEN species characteristic values (WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10), move (3), fate (0), resilience (2), and extraPoints (2) are loaded for any Dwarf subrace THEN the system SHALL CONTINUE TO display those unchanged numerical values
