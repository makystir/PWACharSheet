# WFRP 4e Character Sheet — Player Guide

A digital character sheet for Warhammer Fantasy Roleplay 4th Edition. Runs in your browser, saves locally, and works offline as an installable PWA.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Navigation](#navigation)
- [Command Palette Search](#command-palette-search)
- [Character Page](#character-page)
- [Combat Page](#combat-page)
- [Advancement Page](#advancement-page)
- [Retinue Page](#retinue-page)
- [Holdings & Wealth Page](#holdings--wealth-page)
- [Endeavours Page](#endeavours-page)
- [Settings Page](#settings-page)
- [Tips & Tricks](#tips--tricks)

---

## Getting Started

### First Launch

On your first visit you'll see three options:

- **Character Wizard** — A guided 6-step flow covering species, career, characteristics, skills, talents, and personal details. Follows the WFRP 4e creation rules with optional random rolls for bonus XP.
- **Quick Start** — Enter a name and get a blank sheet to fill in at your own pace.
- **Import from File** — Load a previously exported character JSON file.

### Managing Multiple Characters

On desktop, click the character name in the sidebar to open the character switcher. On mobile, tap your character name in the page header. From the character management panel you can:

- **Create** a new character (wizard or blank)
- **Switch** between saved characters
- **Rename**, **Duplicate**, or **Delete** characters

All data is stored in your browser's local storage — nothing leaves your device.

### Installing as an App

Use your browser's "Install" or "Add to Home Screen" option to get a native app experience. Once installed, the app loads instantly and works fully offline. When updates are available, a banner appears at the top of the screen prompting you to refresh.

---

## Navigation

### Desktop (sidebar)

Seven pages listed vertically with keyboard shortcuts (1–7):

| # | Icon | Page | What it's for |
|---|------|------|---------------|
| 1 | 👤 | **Character** | Identity, abilities, gear, wealth, and notes |
| 2 | ⚔️ | **Combat** | Weapons, armour, spellcasting, attack rolls, damage, conditions |
| 3 | 👥 | **Retinue** | Hirelings and animal companions |
| 4 | 🏠 | **Holdings & Wealth** | Treasury, estate, properties, and financial ledger |
| 5 | 📅 | **Endeavours** | Between-adventure downtime activities |
| 6 | 📈 | **Advancement** | Career progression, XP spending, spell/rune learning |
| 7 | ⚙️ | **Settings** | Theme, house rules, export/import, quick actions |

The sidebar also contains a **Search** button (magnifying glass icon) that opens the command palette.

### Mobile (bottom bar)

Four primary tabs: **Character**, **Combat**, **Retinue**, **Settings**. A **Search** button for the command palette. A **More** overflow button reveals **Holdings & Wealth**, **Endeavours**, and **Advancement**.

---

## Command Palette Search

A global reference lookup tool for quickly finding game entities without leaving your current page.

### Opening the Palette

- **Keyboard**: Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS) from anywhere in the app
- **Button**: Tap the Search icon in the navigation header (desktop sidebar or mobile nav bar)

### Using Search

- Start typing to fuzzy-search across **spells, talents, skills, careers, runes, rituals, and conditions**
- Results appear instantly, grouped by entity type and ranked by relevance
- Partial matches and minor typos are tolerated (e.g., "fieball" finds "Fireball")
- Works without a character loaded — it searches all game data, not just your character's abilities

### Navigating Results

- **Arrow keys** (↑/↓) to move through results
- **Enter** to open the detail view for the selected result
- **Escape** to close the palette (or go back from detail view)
- **Click/tap** any result to see its full details
- **Back button** (or Backspace) returns to the results list

### Detail View

Each entity type shows its complete rules information:
- **Spells**: CN, range, target, duration, effect, lore
- **Talents**: Max level, full description
- **Skills**: Linked characteristic
- **Careers**: Class, all four career levels with status, characteristics, skills, and talents
- **Runes**: Category, master status, XP cost, effects
- **Rituals**: CN, type, learning XP, ingredients, conditions, description
- **Conditions**: Stackable status, description, effects, duration, removal method

---

## Character Page

Four sub-tabs across the top: **Identity**, **Abilities**, **Gear & Wealth**, and **Notes**.

### Identity

| Section | What you can do |
|---------|-----------------|
| Portrait | Tap to upload an image (stored locally) |
| Personal Info | Edit name, species, class, career, career level, status, age, height, hair, eyes |
| Characteristics | View all 10 stats with initial / advances / bonus / total. Tap 🎲 to roll against any stat |
| Movement | Displays Move, Walk, and Run speeds |
| Fortune & Resolve | Spend or recover points with +/− buttons |
| Corruption & Mutation | Track corruption points against your threshold, sin level, Wrath trigger range, and mutations (see below) |
| Diseases | Track active diseases with symptoms and notes |
| Psychology | Track psychology traits (Animosity, Hatred, Fear, Terror, Frenzy, Prejudice) |

#### Corruption & Mutation

The corruption card shows:
- **Corruption Tracker** — Current points vs. threshold (based on Toughness + Willpower bonuses, modified by Pure Soul talent). Color-coded status: normal → warning → danger
- **Sin Tracker** — Current sin level with Wrath trigger range displayed (e.g., "Wrath: 1–3")
- **Mutation Roller** — Roll on official physical or mental mutation tables. Add results directly to your character
- **Mutation Lists** — View physical and mental mutations with limits based on your characteristics

#### Diseases

Add diseases from the rulebook database. Each disease entry shows:
- Contraction method, incubation period, duration
- Expandable symptoms list with descriptions and mechanical effects
- Notes field for GM rulings and treatment tracking

#### Psychology

Add psychology traits by type with targets (for Animosity/Hatred/Prejudice) or ratings (for Fear/Terror). Each entry displays a rule reminder explaining the mechanical effect.

### Abilities

| Section | What you can do |
|---------|-----------------|
| Skill Filter | Search skills by name and toggle "Trained Only" to hide untrained |
| Basic Skills | All 18 core skills with linked characteristic and total. Tap name for tooltip with full description. Tap 🎲 to roll |
| Advanced Skills | Add from the rulebook database or create custom. Edit advances inline. Delete with ✕ |
| Talents | Add from rulebook or create custom. Shows level and description. Tap name for tooltip |
| Spells & Prayers | Add spells showing CN, Range, Target, Duration, Effect (appears for spellcasters) |
| Known Runes | Rune list with category badges (appears for Runesmiths) |
| Consumables | Track limited-use items like healing draughts and antidotes (see below) |
| Yenlui Balance | Elven spiritual balance tracker (appears for Elves with Yenlui house rule) |
| Grudge Book | Dwarf Book of Grudges (appears for Dwarfs with Grudge Book house rule) |

#### Consumables

Track potions, draughts, antidotes, and other limited-use items:
- Add items with name, max doses, and effect description
- Use +/− buttons to track remaining doses
- Items turn grey when depleted
- Delete items you no longer carry

#### Yenlui Balance (Elves)

Visible when the Yenlui house rule is enabled and character is an Elf:
- Toggle between Light, Balanced, and Dark states
- See roleplaying guidance for each state
- Dark state shows sword-dancing penalty warning (−30)
- Reference lists for influences that shift toward Light or Dark
- Talent interaction notes for Yenlui-affected talents

#### Grudge Book (Dwarfs)

Visible when the Grudge Book house rule is enabled and character is a Dwarf:
- Record grudges with offence, perpetrator, and required restitution
- Choose type: **Standard** (25 XP on satisfaction) or **Blood** (50 XP)
- Mark grudges as party-shared (max 3 outstanding party grudges)
- **Satisfy** a grudge to earn the XP reward
- Delete resolved or abandoned grudges

### Gear & Wealth

| Section | What you can do |
|---------|-----------------|
| Trappings | Add items from the rulebook or custom. Track enc and quantity. Tick "On Horse" to exclude from personal carry |
| Weapons & Armour | Visible here, managed primarily on the Combat page |
| Wealth | Edit GC / SS / D directly |
| Encumbrance | Current vs. max carry, broken down by category |

### Notes (Session Log)

A timestamped session journal rather than a plain text box:
- Type a note and press Enter (or tap Add) to log it with the current date/time
- Notes appear newest-first
- Delete individual entries with ✕
- Use for session events, decisions, reminders, NPC names, or anything else worth recording

---

## Combat Page

### Starting & Ending Combat

Tap **START COMBAT** to activate the combat dashboard and reveal combat-only panels. Tap **END COMBAT** when finished — this resets advantage to 0 and clears the initiative list.

### Combat Dashboard (sticky at top during combat)

| Element | Description |
|---------|-------------|
| **Wounds** | Current / total with animated color-coded progress bar (green → yellow → red → skull). +/−/Full buttons |
| **Advantage** | +/− buttons (or Group Advantage if that house rule is enabled). Respects your Advantage Cap |
| **Round Counter** | Track the current combat round |
| **Engaged** | Toggle melee engagement (affects ranged difficulty) |
| **Conditions** | Active conditions with level badges and color coding. Tap for tooltip with rule text. Tap ✕ to remove. Open Condition Picker to add new ones |
| **Fortune / Resolve** | Spend directly with reason selection (Reroll, +1 SL, Special Ability / Immunity to Psychology, Remove Conditions, Special Ability) |
| **End Turn** | Automatically processes condition effects (e.g., Bleeding damage, Ablaze damage) and advances the round counter |

### Initiative Tracker

Track turn order during combat:
- Add combatants by name and initiative value
- List displays sorted by initiative (highest first)
- Active combatant highlighted with ▶ indicator
- **Next Turn** button cycles to the next combatant
- Remove combatants with ✕
- List automatically clears when combat ends

### Attack Flow (4 steps)

1. **Select Weapon** — Pick from your equipped weapons.
2. **Roll to Hit** — See your target number and difficulty. Tap 🎲 ROLL TO HIT. Results show hit/miss/critical/fumble with SL.
3. **Hit Location** — Auto-reversed from the roll. Shows your AP at that location.
4. **Damage** — Weapon damage + SL = total. Enter opponent TB and AP to see net wounds dealt.

### Take Damage

1. Enter incoming damage.
2. Select hit location (auto-fills your AP).
3. See net wounds after TB + AP reduction.
4. Tap **Apply Wounds** to subtract from your total.
5. Alert if you reach 0 wounds.

### Spells & Prayers (Spellcasting Panel)

Visible for characters with a spellcasting talent (Arcane Magic, Petty Magic, Bless, or Invoke):

- **Memorized Spells** table with CN, range, target, duration, and effect
- **Cast** button opens a roll dialog against your Language (Magick) target
- **Channel** button to accumulate SL toward a spell's CN before casting
- Channelling progress displayed per spell
- **Magic Saturation** selector (Low / Normal / Heavy / Extreme / Corrupted) with modifier display
- **Armour Casting Penalty** shown when wearing armour
- **Overcast allocation** on successful casts
- **Miscast tables** (Minor / Major) rolled automatically on doubles failures
- **Manage Spells** toggle to memorize/unmemorize spells

### Hireling Combat Panel

When you have hirelings in your retinue, a collapsible **Hirelings** section appears during combat:
- Track each hireling's wounds (+/−)
- See incapacitated status when wounds reach 0
- Add and remove conditions per hireling

### Weapons

Weapon cards show name, group, calculated damage (including SB and talent bonuses), range/reach, and qualities.

Actions per weapon: 🎲 quick roll | ⚒ manage runes (up to 3) | ✕ delete

Add weapons from the rulebook database or create custom.

### Armour

Visual armour map showing AP at each body location (Head, Left Arm, Right Arm, Body, Left Leg, Right Leg). Uses WFRP 4e stacking rules: highest non-flexible + highest flexible AP per location.

Add armour from the rulebook or custom. Manage runes (up to 3 per piece). Toggle worn/unworn.

### Ammo Tracker

Track ammunition by name, current qty, max, and encumbrance. Adjust as you fire.

### Critical Wounds

Log critical wounds with location, description, effects, duration, and severity. Mark as healed when recovered.

### Roll Critical Flow

Roll on the critical wound tables by selecting location and severity. Results come from the official WFRP 4e tables.

### Quick Roll Bar

Fast access to characteristic and skill rolls without the full attack flow.

---

## Advancement Page

### Career Management

- View your current Class / Career / Level.
- **Career Progress** checklist shows what's needed to complete your level:
  - Characteristics at threshold (5/10/15/20 depending on level)
  - 8 career skills at threshold
  - At least 1 career talent acquired
- **Advance Career Level**: 100 XP if requirements met, 200 XP if not.
- **Switch Career**: Same-class = 100 XP, different-class = 200 XP. Career eligibility filtering shows only valid career options.
- **Help popovers** (ℹ️ buttons) explain advancement rules in context.

### Experience Points

Edit Current XP, Spent XP, and Total XP directly. The app tracks spending automatically when you advance.

### Advancing Characteristics

Cards for each stat showing:
- Current value and advances
- Next advance cost (in-career tier pricing; out-of-career is double)
- **+1** single advance and **+X** bulk advance buttons
- Gold highlight = in-career, grey = out-of-career

### Advancing Skills

Table sorted by career status:
- Career skills first (gold), other skills below
- Toggle **Career Only** to focus on relevant skills
- Each row: name, characteristic, advances, total, cost, status
- **+1** and **+5** advance buttons

### Acquiring Talents

- **In-Career Talents**: All talents from your current career level. Cost = 100 × (times taken + 1).
- **Out-of-Career Talents**: Talents you already own that aren't in your career. Double cost.

### Learning Spells

Appears for characters with Arcane Magic or Petty Magic talents:
- Browse available spells filtered by your character's lore
- See XP cost for each spell
- Learn spells that deduct from current XP
- Spell count per lore type displayed

### Learning Rituals

Appears for characters with the Ritual Magic talent:
- Browse available rituals with CN, type, and XP cost
- Learn rituals with XP deduction

### Rune Learning (Runesmiths)

Appears for characters with Rune Magic talent:
- Browse all runes organized by category (Weapon, Armour, Talismanic)
- See XP costs and prerequisite requirements
- Master runes marked with ★
- Learn button deducts XP; prerequisite errors shown when not met
- Current XP displayed at top

### Sword-Dancing Techniques (High Elves)

Appears for characters with the Sword Dancing talent:
- Technique list with SL requirements and descriptions
- Escalating XP costs as you learn more techniques
- Yenlui difficulty indicators on learned techniques (when Yenlui is active)
- Prerequisite checking with error messages

### Deity Selection (Dwarf Priests)

Appears for Dwarf characters in a priest career:
- Select your patron Ancestor God from a dropdown
- Changing deity with existing runes shows a warning about restricted runes
- Deity affects which runes are available for learning

### Magical Burnout (High Magic)

Appears for characters with the High Magic talent:
- Status display (no burnout / temporary / permanent)
- Apply burnout from a d100 roll result (doubles = permanent)
- Temporary burnout shows days remaining
- Clear via Fortune (temporary) or Fate (permanent) spend

### Undo / Redo

Buttons at the top of the page let you reverse accidental advances.

### Advancement Archive

Archived entries from previous career levels. View and restore if needed.

---

## Retinue Page

Two sub-tabs: **Hirelings** and **Companions**.

### Hirelings

Recruit and manage NPCs who serve your character (maximum 10):

- **Create a Hireling** — Guided creation flow: name, role, key skills, quirks, and pay rate.
- **Hireling Cards** — Each card shows the hireling's name, role, skills, loyalty, and pay. Track wounds and morale.
- **Combat Integration** — Hirelings appear on the Combat page during encounters for wound/condition tracking.
- **Delete** — Remove hirelings you no longer employ (with undo toast).

### Companions (Animals)

Add trained animals from templates (war horse, hunting dog, carrier pigeon, etc.) or create custom:

- Track species, trained skills (togglable from a list), wounds, and notes
- Adjust wound current/max during play
- Pack animals can carry encumbrance (excluded from your personal carry total)

---

## Holdings & Wealth Page

Three sub-tabs: **Wealth & Finances**, **Estate**, and **Holdings & Properties**.

### Wealth & Finances

| Section | Description |
|---------|-------------|
| Financial Summary | Total monthly income, expenses, and profit across everything (including hireling upkeep) |
| Treasury | Your estate's cash reserves (GC/SS/D), editable directly |
| Collect Monthly | One-tap button adds net monthly profit to treasury |
| Ledger | Transaction history log (see below) |

#### Financial Ledger

A running transaction log for your treasury:
- Add **income** or **expense** entries with description and amount (GC/SS/D)
- Treasury balance automatically adjusted on each entry
- Entries displayed newest-first with date and type badge
- Delete individual entries with ✕

### Estate

Name, location, and description for your estate. Monthly income and expenses at the estate level.

### Holdings & Properties

Add and manage properties:

- **Type**: Inn, Tavern, Farm, Mill, Workshop, Shop, Warehouse, Manor, Mine, Smithy, Stable, Dock, or Other
- **Status**: Active, Under Construction, Damaged, Destroyed, or Abandoned
- **Financials**: Per-property monthly income and expenses
- **Condition**: Percentage bar
- **Staff**: Employee count
- **Notes**: Free text for details

---

## Endeavours Page

Track between-adventure downtime activities.

### Downtime Periods

Tap **New Downtime Period** to create one. Each period has:
- A label (e.g., "After Bögenhafen")
- A slot count (determined by your Status tier)
- A list of endeavour entries

### Adding Endeavours

Tap **+** on a period to choose from:
- **General Endeavours** — Recover, Earn, Recruit, Research, Train, etc.
- **Class Endeavours** — Options specific to your character class
- **Custom** — Free-text for anything else

Mark endeavours complete with the checkbox. Remove with ✕.

---

## Settings Page

### Appearance (Themes)

| Theme | Description |
|-------|-------------|
| 🌙 Dark | Default dark fantasy theme |
| ☀️ Light | Light parchment theme |
| ◐ High Contrast | Maximum readability |
| 🔍 Old Guy Mode | Larger text, easier on the eyes |

### House Rules

Per-character rule variants affecting gameplay calculations:

| Rule | Options | Source |
|------|---------|--------|
| **Ranged Damage SB** | None (RAW) · Half SB · Full SB | Core |
| **Impale Crits on 10s** | Toggle — Impale weapons crit on multiples of 10 | Core |
| **Minimum 1 Wound (RAW)** | Toggle — Hits overcoming TB+AP always deal at least 1 wound | Core |
| **Advantage Cap** | Set max advantage (0 = uncapped, RAW = Initiative Bonus) | Core |
| **Group Advantage** | Toggle — Shared advantage pool for the party | Up in Arms |
| **Yenlui Balance** | Toggle — Elven spiritual balance tracking (Light/Balanced/Dark) | High Elf Guide |
| **Grudge Book** | Toggle — Dwarf Book of Grudges with XP rewards | Dwarf Guide |

Enabling Yenlui or Grudge Book reveals the corresponding panels on the Character page for eligible characters.

### Export / Import (Single Character)

- **Copy to Clipboard** — Character as JSON text
- **Download File** — Save a .json file
- **Import from File** — Load from .json, merges missing fields with defaults

### Bulk Backup & Restore (All Characters)

- **Backup All Characters** — Downloads a single backup file containing every saved character (with portraits). Progress indicator shows count.
- **Restore from Backup** — Load a backup file. Shows character names, detects duplicates, and asks for confirmation before importing. Skips duplicates automatically.

### Quick Actions

Configure up to 6 skill shortcuts that appear as a floating bar at the bottom of the screen on mobile:
- Pick skills from your character's skill list
- Tap a quick action button to instantly open a roll dialog for that skill
- Remove actions you no longer need

### Utilities

- **Clear Sheet** — Reset all data to defaults (keeps name)
- **Print** — Opens print dialog with an optimized one-page print layout

---

## Tips & Tricks

| Tip | Details |
|-----|---------|
| **Command Palette** | Press `Ctrl+K` / `Cmd+K` anywhere to instantly search spells, talents, skills, careers, runes, rituals, and conditions. Works without a character loaded. |
| **Auto-save** | Every change saves instantly. No save button needed. |
| **Offline mode** | Works without internet after first load. Updates arrive via service worker with a refresh banner. |
| **Install as app** | Use your browser's Install / Add to Home Screen for a native experience. |
| **Keyboard shortcuts** | Keys 1–7 switch pages. Ctrl/Cmd+K opens search. All elements are keyboard-accessible. |
| **Tooltips** | Tap skill and talent names for official WFRP 4e descriptions and rule text. |
| **Help popovers** | ℹ️ buttons throughout the app explain rules and mechanics in context. |
| **Dice rolls** | 🎲 buttons use the WFRP 4e d100 system with SL calculation, criticals, fumbles, and difficulty modifiers. |
| **End Turn automation** | The End Turn button in combat automatically processes Bleeding, Ablaze, and other condition effects. |
| **Undo on delete** | Deleting weapons, armour, hirelings, or companions shows an undo toast — tap it to recover. |
| **Print layout** | Ctrl+P (or Cmd+P) gives you a clean one-page character sheet optimized for paper. |
| **Multiple devices** | Export on one device, import on another. Use Bulk Backup for all characters at once. |
| **Quick Actions** | Set up skill shortcuts in Settings for one-tap rolls on mobile (floating bar, up to 6 skills). |
| **Species-specific features** | Elves get Yenlui Balance, Dwarfs get Grudge Book and deity-specific runes — enable in House Rules. |
