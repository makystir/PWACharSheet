# Gap Analysis: Book Content vs. App Implementation

This document identifies mechanics, rules, and trackable data from the four source books that are **not yet implemented** in the character sheet app. Items are grouped by book and category, with priority ratings:

- **HIGH** — Directly useful on a character sheet, frequently referenced during play
- **MEDIUM** — Useful for specific character types or occasional reference
- **LOW** — Rarely needed in a digital character sheet, or heavily GM-dependent

---

## 1. Core Rulebook (WarhammerFantasyRoleplay4e.md)

### 1.1 Combat Mechanics

| Gap | Description | Priority |
|-----|-------------|----------|
| Two-Weapon Fighting rules | Secondary hand -20 penalty, Dual Wielder interaction. Could add an "off-hand" toggle to attack flow | MEDIUM |
| Grappling system | Entangled conditions, Opposed Strength Tests, SB+SL damage ignoring armour. Could be a combat action option | MEDIUM |
| Mounted Combat modifiers | +20 to hit smaller targets, -10 to hit rider, use mount's Strength for charge damage, -20 Dodge unless Trick Riding | MEDIUM |
| Pursuit tracker | Distance counter, SL comparison per round, Movement modifiers. Could be a simple distance counter widget | LOW |
| Scatter diagram (thrown weapons) | 1d10 direction + 2d10 distance for failed Ranged (Throwing) | LOW |
| Charging bonus | +1 Advantage on charge. Could auto-apply when "Charge" action selected | MEDIUM |
| Surprise mechanics | +1 Advantage vs Surprised enemies | LOW |
| Size modifiers in combat | Weapon damage bonuses/penalties based on Size differential, Fear/Terror from Size | MEDIUM |

### 1.2 Psychology System

| Gap | Description | Priority |
|-----|-------------|----------|
| Psychology traits tracker | Animosity (Target), Hatred (Target), Fear (Rating), Terror (Rating), Prejudice (Target), Frenzy — trackable per-character with target specification | HIGH |
| Psychology Test reminders | Cool Test at start of round when facing a psychology source, with Difficulty | MEDIUM |
| Custom Psychology | Player-defined psychological traits with custom triggers | LOW |

### 1.3 Equipment & Consumables

| Gap | Description | Priority |
|-----|-------------|----------|
| Drugs & Poisons inventory | 8 drugs/poisons with mechanical effects (Black Lotus, Heartkill, Mad Cap Mushrooms, Mandrake Root, Moonflower, Ranald's Delight, Spit, Weirdroot) — duration tracking, stat modifiers | MEDIUM |
| Herbs & Draughts inventory | 8 items with healing/buff effects (Healing Draught, Faxtoryll, Vitality Draught, etc.) — dose tracking per encounter | HIGH |
| Prosthetics | 7 types with mechanical effects (False Leg restores Movement, Hook counts as Dagger, Engineering Marvel ignores penalties) — could track on character | MEDIUM |
| Item Qualities & Flaws detail | Full mechanical effects of each quality/flaw on weapons/armour for reference | MEDIUM |
| Crafting system | Extended Trade Test tracker for crafting items between adventures (SL accumulation, raw material cost) | LOW |

### 1.4 Endeavour Types (Not Currently Offered)

| Gap | Description | Priority |
|-----|-------------|----------|
| Banking (Invest/Stash) | Interest rate, d100 roll for bank failure, stash theft mechanics | MEDIUM |
| Commission | Ordering exotic items for delivery after next adventure | LOW |
| Consult an Expert | Finding experts, earning Expert Rerolls | LOW |
| Crafting Endeavour | Extended Trade Test progress tracking between sessions | MEDIUM |
| Invent! | Plan + Build stages for creating new items | LOW |
| Training (out-of-career) | Pay tutor, acquire in-career treatment for skills/characteristics | MEDIUM |
| Unusual Learning | Attempt to learn out-of-career talents with test | MEDIUM |
| Foment Dissent | Multi-endeavour political action | LOW |
| The Latest News | Learn rumours via Gossip Test | LOW |
| Reputation | Spend money to boost Standing temporarily | MEDIUM |
| Research Lore | Gain knowledge via Lore Test | LOW |
| Study a Mark | Gain ability to reverse a Test against target | LOW |
| Combat Training (class) | Reverse a Melee/Ranged Test once next adventure | MEDIUM |

### 1.5 Healing & Recovery

| Gap | Description | Priority |
|-----|-------------|----------|
| Healing rules | Natural healing rates, Medical Attention rules, Surgery | MEDIUM |
| Broken Bones tracker | Duration, healing requirements | MEDIUM |
| Torn Muscles tracker | Duration, healing requirements | MEDIUM |
| Amputated Parts tracker | Permanent penalties, prosthetic eligibility | MEDIUM |

### 1.6 Corruption Details

| Gap | Description | Priority |
|-----|-------------|----------|
| Corruption source tracking | Where corruption was gained (Dark Magic, Warpstone, location, etc.) | LOW |
| Physical Mutation table | Full table for rolling/tracking physical mutations | MEDIUM |
| Mental Mutation table | Full table for rolling/tracking mental mutations | MEDIUM |

### 1.7 Travel & Environment

| Gap | Description | Priority |
|-----|-------------|----------|
| Travel pace calculator | Movement × hours = distance per day, with fatigue | LOW |
| Drowning/Suffocation rules | Rounds held, Endurance Tests | LOW |
| Fire/Falling damage | Damage formulas for environmental hazards | LOW |
| Exposure rules | Cold/heat effects with Endurance Tests | LOW |

### 1.8 Favour System

| Gap | Description | Priority |
|-----|-------------|----------|
| Favours tracker | Minor/Major/Significant favours owed to/by NPCs | MEDIUM |

---

## 2. Dwarf Player's Guide (dwarfguide.md)

### 2.1 Grudge System (Major Gap)

| Gap | Description | Priority |
|-----|-------------|----------|
| Personal Grudge Book | Track offence, perpetrator, restitution required, date — replaces Ambitions for Dwarfs | HIGH |
| Blood Grudges | More serious grudges requiring death of perpetrator, +50 XP reward | HIGH |
| Party Grudges | 3 shared grudges replacing Party Ambitions | HIGH |
| Grudge XP rewards | 25 XP per satisfied Grudge, +25 for Blood Grudges | HIGH |
| Grudge psychology effects | Auto-apply Animosity/Hatred when interacting with perpetrators | MEDIUM |
| Unresolved Grudge death penalty | Track outstanding grudges affecting successor XP | LOW |
| New Grudge per session | UI for entering new grudges at session end | MEDIUM |

### 2.2 New Skills (Dwarf-specific)

| Gap | Description | Priority |
|-----|-------------|----------|
| Lore (Runes) specialisation | Already likely in generic Lore system, but confirm it's available | LOW |
| Runesmithing (Dex) Advanced | The actual crafting skill for runes — may need explicit tracking | MEDIUM |
| Sail (Skycraft) specialisation | For gyrocopters and airships | LOW |

### 2.3 New Talents (Dwarf-specific) — Not in App

| Gap | Description | Priority |
|-----|-------------|----------|
| Ancestral Grudge | Choose faction, earn 50 XP per significant victory against them | HIGH |
| Bludgeoner | Extra Stunned Conditions when activating Pummel Quality | MEDIUM |
| Demolisher | Extra damage on armour/shields with Hack, reduces cover effectiveness | MEDIUM |
| Dragon Belcher | Extra Broken Conditions when firing Blackpowder weapons | MEDIUM |
| Entrenchment | Upgrades cover effectiveness | MEDIUM |
| Forgefire | Allies' melee weapons gain Penetrating within WPB yards | MEDIUM |
| Glorious Demise | Interrupt to attack when gaining Unconscious Condition | MEDIUM |
| Harpooner | +10 per level on Critical Hit table with Crossbow, bolts reduce Movement | MEDIUM |
| Kingsguard | -10 per level to enemy attacks against nearby allies | MEDIUM |
| Liquid Fortification | +10 S and T after drinking alcohol | MEDIUM |
| Long Memory | Perfect recall of campaign events | LOW |
| Magic Defiance | Reverse Tests from spell effects, negate one spell per adventure | MEDIUM |
| Master Rune Magic | Learn master runes, plus all three Doom Runes | HIGH |
| Maverick | No -20 penalty on Ranged attacks when flying | LOW |
| Rune Magic | Learn individual runes for crafting | HIGH |
| Short Fuse | +1 Blast Rating per level on Explosive weapons | MEDIUM |
| Tireless | Ignore Fatigued Conditions (1+1 per level) | MEDIUM |
| Underminer | No penalties for attacking while Prone, +20 vs Surprised enemies from below | LOW |
| Whirlwind of Death | Attack all Engaged enemies with one Melee action (costs 1 Fortune) | MEDIUM |

### 2.4 Dwarf Equipment

| Gap | Description | Priority |
|-----|-------------|----------|
| Steamcraft vehicles | Ironclads, submarines, steam tanks — vehicle stats | LOW |
| Skycraft vehicles | Gyrocopters, airships, war balloons — vehicle stats and rules | LOW |
| Watercraft vehicles | Nautilus, ironclad ships — vehicle stats | LOW |
| Ancestral Heirlooms system | Mechanically significant inherited items | MEDIUM |
| Lighting equipment (Dwarf) | Specialized mining/tunnel lighting | LOW |
| Runic Weapons of Renown | Named legendary weapons with unique rune combinations | MEDIUM |

### 2.5 Dwarf Careers (Already Implemented)

All 16 Dwarf careers appear to be in the app: Dwarf Engineer, Dwarf Lawyer, Dwarf Artisan, Dwarf Miner, Dwarf Messenger, Dwarf Slayer, Dwarf Soldier, Brewer, Doom Priest, Forge Priest, Hearth Priest, Hammerer, Ironbreaker, Karak Ranger, Runescribe, Runesmith, Thane. ✓

### 2.6 Dwarf Religion

| Gap | Description | Priority |
|-----|-------------|----------|
| Ancestor Veneration mechanics | Honouring rituals, Clan Shrine traditions, mechanical benefits | LOW |
| Travelling Priests rules | Specific rules for priests away from their temples | LOW |

---

## 3. High Elf Player's Guide (highelfguide.md)

### 3.1 Obsessions System (Major Gap)

| Gap | Description | Priority |
|-----|-------------|----------|
| Obsession tracker | Track active Obsession with positive/negative effects based on Yenlui State | HIGH |
| Obsession benefits | +2 SL on related Tests (Light state: benefit only; Balanced: benefit then penalty; Dark: penalty even without benefit) | HIGH |
| Obsession resolution | Cannot freely discard; requires narrative work with GM | MEDIUM |
| Example Obsessions table | 10 pre-made obsessions for random generation | LOW |

### 3.2 Dreams System

| Gap | Description | Priority |
|-----|-------------|----------|
| Dream tracker | Record prophetic dream, can replace Short-term Ambition | MEDIUM |
| Dream benefit | +1 SL on all Tests during the foretold event | MEDIUM |
| Example Dreams table | 10 pre-made dreams for inspiration | LOW |

### 3.3 Blood of Aenarion

| Gap | Description | Priority |
|-----|-------------|----------|
| Blood of Aenarion benefits | Magical Prodigy (half XP for spells) or Martial Prodigy (half XP for specific Talents) | HIGH |
| Madness of Khaine | Auto-applied Mental Mutation as Psychology Trait (table with 6 results) | HIGH |
| Weekly Cool Test | Average (+20) Cool Test or gain Yenlui (Dark) | MEDIUM |

### 3.4 Elder Characters System

| Gap | Description | Priority |
|-----|-------------|----------|
| Elder creation rules | Choose Time of Birth, gain career advances per era, apply Burdens | MEDIUM |
| Burdens tracker | Corruption points, reduced Fate/Resilience, max Endeavours, Prejudice | MEDIUM |
| Centuries of Experience | Extra career advances from each era lived through | MEDIUM |

### 3.5 Enchanted Items

| Gap | Description | Priority |
|-----|-------------|----------|
| Aethyrolabe | Detect Wind concentrations | LOW |
| Flamespyre/Frostheart Phoenix Feathers | Light/cold sources with year duration | LOW |
| Staff of Nightelm | Magic Resistance 3 vs specific lores | MEDIUM |
| Staff of the Eternal Grove | Durable 4 Quality for polearms/bows | LOW |
| Wayshard | Aids Yenlui meditation, sense nearest waystone | LOW |

### 3.6 High Elf Religion

| Gap | Description | Priority |
|-----|-------------|----------|
| Smith-priest of Vaul career | Full career with unique miracles (Magic of Vaul) | MEDIUM |
| Storm Weaver career | Full career data for priest of Mathlann | MEDIUM |
| Loremaster of Hoeth career | Full career data for priest of Hoeth | MEDIUM |
| Magic of Vaul spells | Deity-specific magical lore for Vaul priests | MEDIUM |
| High Elf Sea Magic spells | Spells for Storm Weavers/Mathlann priests | MEDIUM |
| Magic of Hoeth spells | Spells for Loremasters of Hoeth | MEDIUM |

### 3.7 Intrigue System

| Gap | Description | Priority |
|-----|-------------|----------|
| Intrigue tracker | Steps 1-5 of Intrigue process: Target, Agenda, Complexity, Tactics, Persuasion Test results | LOW |
| Leverage mechanics | +SL bonuses based on discovered vulnerabilities | LOW |
| Intrigue complications | Random events during multi-step intrigues | LOW |

### 3.8 Naval/Warship Rules

| Gap | Description | Priority |
|-----|-------------|----------|
| High Elf Warship stats | Dragonship, Eagleship, Hawkship statistics | LOW |
| Naval combat rules | Ship-to-ship engagement mechanics | LOW |

### 3.9 High Elf Careers

All High Elf careers appear to be implemented: Sea Guard, Swordmaster, Shadow Warrior, Merchant Adventurer, Aestheticist, Mage (with 5th level). ✓

---

## 4. Up in Arms (Up_In_Arms.md)

### 4.1 Expanded Mounted Combat (Major Gap)

| Gap | Description | Priority |
|-----|-------------|----------|
| Mount stat tracking | Mount's Movement, WS, S, T, Wounds, Traits on character sheet | HIGH |
| Combined Advantage pool | Mount + rider share Advantage (half on misfortune if Trained War + Ride Skill) | MEDIUM |
| Mount Actions | Trained (War) = independent combatant; No Trained (War) = needs rider direction | MEDIUM |
| Mounted ranged restrictions | Two-handed: front only; one-handed: front or weapon side (Trick Riding ignores) | MEDIUM |
| Falling from mount | Conditions that cause falling (Unconscious, Prone, Stunned, Surprise) with Ride Tests | MEDIUM |
| Mount training system | Trained (War), Trained (Magic), Trained (Shock Cavalry) traits — XP/Endeavour to teach | MEDIUM |
| Quadruped hit locations | Alternative hit location table for four-legged creatures (01-16 Head, 17-56 Body, etc.) | MEDIUM |
| Exotic mount stats | Demigryph, Pegasus, etc. with specific traits | LOW |

### 4.2 Alternative Injury System (Optional Rule)

| Gap | Description | Priority |
|-----|-------------|----------|
| Alternative Critical Wound tables | Completely revised Head/Body/Arm/Leg tables with "Wounds" column and Trivial injuries | HIGH |
| Alternative Bleeding rules | Lose 1 Wound/round (not TB); 10% death chance per Bleeding Condition when Unconscious | HIGH |
| Alternative Death rules | Die when Unconscious + 0 Wounds + Critical Wounds > TB | HIGH |
| Pulling Your Blows | Declare before attack; only inflict Crits at 0 Wounds, lose Hack/Impact/Impale/Penetrating | MEDIUM |
| Sudden Death (optional) | GM declares NPCs dead at 0 Wounds (simplification rule) | LOW |

### 4.3 Siege Weapons & Structures

| Gap | Description | Priority |
|-----|-------------|----------|
| Siege weapon stats | Cannon, Mortar, Helblaster, Helstorm, Bolt Thrower, Great Cannon stats | LOW |
| Structure damage system | Structure Wounds, Cover Penalty, repair rules | LOW |
| Crewed weapon rules | Multi-person operation, reload mechanics | LOW |

### 4.4 Expanded Pursuit Rules

| Gap | Description | Priority |
|-----|-------------|----------|
| Complex Pursuit tracker | Individual distance tracking, Movement-based SL bonuses, Exhaustion effects | LOW |
| Breaking from Combat | Advantage-spend or Dodge to disengage into pursuit | MEDIUM |
| Obstacle system | Obstacles during pursuits with various Tests to overcome | LOW |

### 4.5 Warrior Endeavours (Not Currently Offered)

| Gap | Description | Priority |
|-----|-------------|----------|
| Fanmaris's Perfect Shot | Practise archery → "Perfect Shot" benefit with cumulative SL effects | MEDIUM |
| The Leitdorf Defence | Practise unorthodox melee → opponent can't use Talents/Advances to defend | MEDIUM |
| Alcatini Method | Leadership Test → grant temporary Drilled Talent to allies | LOW |
| Count Punchausen's Narrative Auction | Sell adventure stories → earn 2d10 shillings + reverse a Charm/Entertain Test | LOW |
| The Quartermaster Shuffle | Dangerous job → acquire a specific Trapping + take a Critical Wound | MEDIUM |

### 4.6 New/Updated Talents (Up in Arms)

| Gap | Description | Priority |
|-----|-------------|----------|
| Beat Blade | Spend Action to remove Advantage from opponent (non-Opposed) | HIGH |
| Crew Commander | Leadership Test to share Ranged Skill with weapon crew | LOW |
| Distract | Use Move for Opposed Athletics/Cool — opponent gains no Advantage until next Round end | HIGH |
| Drilled (updated) | Count as two combatants for Losing Advantage; +SL when beside Drilled ally | HIGH |
| Flee! | +1 Movement when Fleeing or as Quarry in pursuit | MEDIUM |
| Gunner | Add SL to reload Extended Tests for blackpowder weapons; reload counts as Assess | MEDIUM |
| Rapid Reload (updated) | Add SL to reload Extended Tests; reload counts as Assess | MEDIUM |
| Relentless (updated) | Reduce Flee from Harm Advantage cost to 1 | MEDIUM |
| Reversal | On winning Opposed Melee, take 1 Advantage from opponent instead of gaining +1 (no damage) | HIGH |
| Roughrider | Direct mount Action without Test; treat as mount's Size for Fear/Terror resistance | MEDIUM |
| Shieldsman | Spend 2 Advantage when defending with Shield to deal damage or push opponent 2 yards | HIGH |
| Strike to Injure | Roll twice on Critical Damage table, choose result | HIGH |

### 4.7 Tilean Characters

| Gap | Description | Priority |
|-----|-------------|----------|
| Tilean species variant | Unique Skills (Sail, Language Arabyan/Estalian/Reikspiel, Lore Tilea, etc.) and Talents (Argumentative/Fisherman, Coolheaded/Suave) | MEDIUM |
| Tilean Dooming | Luccini-specific Dooming option | LOW |
| Tilean name tables | Male/Female/Surname lists | LOW |

### 4.8 Group Advantage (Appendix)

| Gap | Description | Priority |
|-----|-------------|----------|
| Full Group Advantage rules | Shared pool, gaining/losing/spending, Initiative interaction — APPEARS PARTIALLY IMPLEMENTED as house rule toggle | LOW (mostly done) |
| Advantage spending options | Flee from Harm, Tactical Withdrawal costs | MEDIUM |
| Changing Creature Traits with Advantage | Spend Advantage to activate special abilities | LOW |

### 4.9 Hirelings (Appendix)

| Gap | Description | Priority |
|-----|-------------|----------|
| Hireling Disadvantages | Random negative traits for generated hirelings | LOW |
| Hireling personality tables | Random quirks and backgrounds | LOW |
| Liability rules | Hireling liability when things go wrong | LOW |

### 4.10 Up in Arms Careers

All 15 Up in Arms careers appear to be implemented: Archer, Halberdier, Handgunner, Greatsword, Pikeman, Siege Specialist, Freelance, Knights of the Blazing Sun, Knights of the White Wolf, Knights Panther, Light Cavalry, Camp Follower, Artillerist, Cartographer, Priest of Myrmidia. ✓

---

## Summary: Top Priority Gaps

### Tier 1 — HIGH priority, broadly useful

1. **Grudge Book system** (Dwarf Guide) — Full XP-earning alternative to Ambitions for Dwarf characters
2. **Obsession system** (High Elf Guide) — Interacts with existing Yenlui system, provides benefits/penalties
3. **Psychology traits tracker** (Core) — Animosity, Hatred, Fear, Prejudice, Frenzy per-character
4. **Alternative Injury system** (Up in Arms) — Complete optional replacement for Critical Wound tables
5. **Herbs & Draughts inventory** (Core) — Healing Draught, Faxtoryll, etc. with dose tracking
6. **Blood of Aenarion** (High Elf Guide) — Talent with major mechanical effects already partially tracked
7. **Mount stat tracking** (Up in Arms) — For mounted combat characters
8. **Missing Dwarf talents** (Dwarf Guide) — 19 new talents not yet in talent database
9. **Missing Up in Arms talents** (Up in Arms) — Beat Blade, Distract, Reversal, Shieldsman, Strike to Injure, etc.

### Tier 2 — MEDIUM priority, useful for specific builds

10. Drugs & Poisons inventory with effects
11. Prosthetics tracking
12. Mounted Combat modifiers in attack flow
13. Two-Weapon Fighting modifiers
14. Additional Endeavour types (Training, Banking, Commission, Combat Training)
15. Warrior Endeavours from Up in Arms
16. Favour tracker (Minor/Major/Significant)
17. Grappling as combat action
18. Healing/Recovery rules (Broken Bones, Torn Muscles, Amputations)
19. Elder character creation for High Elves
20. Tilean species variant

### Tier 3 — LOW priority, niche or GM-dependent

21. Pursuit tracker
22. Siege weapons & structures
23. Naval combat / warship stats
24. Intrigue system
25. Vehicle/Steamcraft/Skycraft stats
26. Environmental damage rules
27. Crafting/Invention systems
28. Scatter diagram
