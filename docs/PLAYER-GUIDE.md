# WFRP 4e Character Sheet — Player Guide

A digital character sheet for Warhammer Fantasy Roleplay 4th Edition. It runs in your browser, saves everything locally on your device, and works offline as an installable PWA.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Navigation](#navigation)
- [Command Palette Search](#command-palette-search)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Character Page](#character-page)
- [Combat Page](#combat-page)
- [Advancement Page](#advancement-page)
- [Retinue Page](#retinue-page)
- [Estate Page (Holdings & Wealth)](#estate-page-holdings--wealth)
- [Endeavours Page](#endeavours-page)
- [Settings Page](#settings-page)
- [Tips & Tricks](#tips--tricks)

---

## Getting Started

### First Launch

On your first visit you'll see several ways to begin:

- **Create with Wizard** — A guided, step-by-step flow covering species, career, characteristics, skills, talents, and personal details. Follows the WFRP 4e creation rules with optional random rolls for bonus XP.
- **Quick Start** — Enter a name and get a blank sheet to fill in at your own pace.
- **Create Random Character** — One click builds a complete, rules-legal character end to end: species, an eligible starting career, rolled-and-rearranged characteristics, species and career skills and talents, starting trappings and wealth, and full personal details (sex, age, height, hair, eyes, distinguishing feature, and a species- and sex-appropriate name). 95 bonus XP is left unspent for you to spend on the Advancement page. Great for NPCs, one-shots, or inspiration — everything is editable afterward.
- **Import from File** — Load a previously exported character JSON file.

### Managing Multiple Characters

On desktop, click the character name near the top of the sidebar to open the character switcher; use the **+ New** button beside it to create another character. On mobile, tap your character name in the page header. From the switcher you can:

- **Switch** between saved characters
- **Rename** (✎), **Duplicate** (⧉), or **Delete** (✕) a character
- Open **Manage Characters…** for the full management panel

Deleting a character asks for confirmation first. All data is stored in your browser's local storage — nothing leaves your device, so back up regularly (see [Settings](#settings-page)).

### Installing as an App

Use your browser's "Install" or "Add to Home Screen" option — or the **Install** button in Settings when it's available — to get a native app experience. Once installed, the app loads instantly and works fully offline. When an update is available, a banner appears prompting you to refresh.

---

## Navigation

The app has seven pages. On desktop they appear in a collapsible left sidebar; on mobile they appear in a scrollable bar.

| # | Page | Icon | What it's for |
|---|------|------|---------------|
| 1 | **Character** | person | Identity, abilities, gear, wealth, and notes |
| 2 | **Combat** | crossed swords | Weapons, armour, spellcasting, attack/defend, damage, conditions |
| 3 | **Retinue** | people | Hirelings and animal companions |
| 4 | **Estate** | landmark | Estate, holdings/properties, treasury, finances (and enterprises) |
| 5 | **Endeavours** | calendar | Between-adventure downtime activities |
| 6 | **Advancement** | upward trend | Career progression, XP spending, spell/rune learning |
| 7 | **Settings** | gear | Theme, dice mode, house rules, export/import, quick actions |

Press the number keys **1–7** to jump straight to a page. The **Advancement** and **Endeavours** items may show a small **badge dot** — Advancement when you have unspent XP, Endeavours when you have active endeavours.

### Desktop (sidebar)

- The sidebar can be **collapsed** to icons-only with the toggle at the bottom (your choice is remembered).
- A **Search** button (magnifying glass) at the top opens the command palette.
- A **Keyboard Shortcuts** button opens the shortcuts overlay.
- The Estate item shows a sub-label hint ("Estate · Holdings · Treasury · Finances") to signal it has sub-tabs.

### Mobile

A single horizontal **scrollable bar** holds all seven pages plus **Search** and **Shortcuts** buttons — swipe sideways to reach any page. The active page scrolls into view automatically.

---

## Command Palette Search

A global reference lookup tool for quickly finding game entities without leaving your current page.

### Opening the Palette

- **Keyboard**: `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS) from anywhere
- **Button**: the Search icon in the sidebar (desktop) or the bottom bar (mobile)

### Using Search

- Start typing to fuzzy-search across **spells, talents, skills, careers, runes, rituals, and conditions**
- Results appear instantly, grouped by entity type and ranked by relevance
- Partial matches and minor typos are tolerated (e.g., "fieball" finds "Fireball")
- Works without a character loaded — it searches all game data, not just your character's abilities

### Navigating Results

- **Arrow keys** (↑/↓) to move through results
- **Enter** to open the detail view for the selected result
- **Escape** to close the palette (or go back from a detail view)
- **Click/tap** any result to see its full details
- The **Back** control (or Backspace) returns to the results list

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

## Keyboard Shortcuts

Open the shortcuts overlay from the **Keyboard Shortcuts** button in the sidebar (desktop) or the **Shortcuts** button in the mobile bar.

| Keys | Action |
|------|--------|
| `1`–`7` | Jump to a page (Character … Settings) |
| `Ctrl / ⌘ + K` | Open search / command palette |
| `Ctrl / ⌘ + Z` | Undo the last change |

Number-key shortcuts are ignored while you're typing in a text field. Nearly every control is keyboard-accessible.

---

## Character Page

A **summary header** sits at the top showing key stats and quick links (jump to setup, roll a test, open Combat). Below it are four sub-tabs: **Identity**, **Abilities**, **Gear**, and **Notes**.

- **Reorder the sub-tabs**: enter the tab bar's edit mode to move tabs left/right or reset to default. Your order and last-viewed tab are remembered.
- **Compact / Expanded toggle**: switch between a denser layout and a roomier one; your preference is saved.

### Identity

| Section | What you can do |
|---------|-----------------|
| Portrait | Upload an image (stored locally). Also **Generate Portrait Prompt** for AI art (see below) |
| Personal Info | Edit name, species, class, career, career path, career level, status, **sex**, age, height, hair, eyes, and **distinguishing feature** |
| Generate Personal Details | Roll species-appropriate age, height, hair, eyes, feature, and sex, or pick from dropdowns |
| Characteristics | All 10 stats with Initial / Advances / Bonus / Current (total) and a CB (characteristic bonus) column. Hover or tap any total or bonus for a breakdown tooltip. Tap 🎲 to roll against a stat. Includes a Wound Maximum override |
| Movement | Move, Walk, and Run speeds |
| Fortune & Resolve | Spend or recover points with +/− buttons |
| Ambitions & Party | Short- and long-term ambitions and party notes |
| Corruption & Mutation | Corruption vs. threshold, sin level with Wrath trigger range, and a mutation roller (see below) |
| Diseases | Track active diseases with symptoms and notes |
| Magical Burnout | Appears for High Magic casters (see below) |
| Yenlui Balance | Appears for Elves when the Yenlui house rule is on |
| Grudge Book | Appears for Dwarfs when the Grudge Book house rule is on |
| Psychology Tracker | Appears when the Psychology Tracker house rule is on |

Every calculated total in the app (characteristic totals and bonuses, wounds, encumbrance, armour points, weapon damage, movement) shows a **breakdown tooltip** on hover (desktop) or tap (touch) that spells out exactly how the number was derived.

#### Sex

The **Sex** field offers Male, Female, or Other. It is pure flavour with no mechanical effect; random generation rolls Male or Female and the generated name is drawn to match. You can change it any time, and "Other" is always available as a manual choice.

#### Generate Portrait Prompt

Next to the portrait is a **Generate Portrait Prompt** button. It assembles a copy-pasteable prompt for an AI image generator describing your character — personal details, equipped weapons, worn armour, and notable gear — along with the recommended image size and file-size limits. Options:

- **Framing**: choose a head/chest **Portrait (bust)** or a **Full body** figure.
- **Include retinue**: optionally add your companions and hirelings to the scene (available only when you have some).

The prompt explicitly asks the generator to produce no text in the image. Copy it, paste it into your image tool of choice, then upload the result as your portrait.

#### Corruption & Mutation

- **Corruption Tracker** — Current points vs. threshold (Toughness + Willpower bonuses, modified by Pure Soul). Color-coded: normal → warning → danger
- **Sin Tracker** — Current sin with Wrath trigger range (e.g., "Wrath: 1–3")
- **Mutation Roller** — Roll on official physical or mental mutation tables and add results to your character
- **Mutation Lists** — Physical and mental mutations with limits based on your characteristics

#### Diseases

Add diseases from the rulebook database. Each entry shows contraction method, incubation, duration, an expandable symptoms list with effects, and a notes field.

#### Magical Burnout (High Magic)

For characters with the High Magic talent (shown on Identity):
- Status display (no burnout / temporary / permanent)
- Apply burnout from a d100 roll (doubles = permanent)
- Temporary burnout shows days remaining
- Clear via Fortune (temporary) or Fate (permanent)

#### Psychology Tracker

Enabled via the Psychology Tracker house rule. Add traits by type (Animosity, Hatred, Fear, Terror, Frenzy, Prejudice, Phobia, Trauma) with targets or ratings; each entry shows a rule reminder.

### Abilities

| Section | What you can do |
|---------|-----------------|
| Skill Filter | Search skills by name and toggle "Trained Only" |
| Basic Skills | All core skills with linked characteristic and total. Tap name for a tooltip; tap 🎲 to roll |
| Advanced Skills | Add from the rulebook database or create custom. Edit advances inline. Delete with ✕ |
| Talents | Add from rulebook or create custom. Shows level and description. Tap name for a tooltip |
| Spells & Prayers | Add spells showing CN, range, target, duration, effect (for spellcasters) |
| Known Runes | Rune list with category badges (for Runesmiths) |
| Consumables | Track limited-use items like draughts and antidotes (see below) |

Use the **Add** menu to add advanced skills, talents, or spells from the rulebook or as custom entries.

#### Choosing a specialisation

Careers often list grouped skills and talents such as *Language (Any)*, *Channelling (Any Colour)*, *Art (Calligraphy or Engraving)* or *Etiquette (Any)*. A row still named like that shows a **choose** button (⇅) next to its name. It opens a list of specialisations the game data knows (for Channelling: the eight colours, Dhar, Qhaysh, or no specialisation), and you can type your own, homebrew included. The row is renamed to the usual *Group (Specialisation)* form, e.g. *Channelling (Aqshy)*. Renaming the row by hand works too; spacing and capitalisation don't matter.

#### Consumables

Track potions, draughts, antidotes, and other limited-use items: add with name, max doses, and effect; adjust remaining doses with +/−; items grey out when depleted; delete when gone.

#### Yenlui Balance (Elves)

Visible when the Yenlui house rule is on and the character is an Elf (panel on the Identity tab): toggle Light / Balanced / Dark, with roleplaying guidance, a Dark-state sword-dancing penalty warning (−30), influence reference lists, and talent interaction notes.

#### Grudge Book (Dwarfs)

Visible when the Grudge Book house rule is on and the character is a Dwarf (panel on the Identity tab): record grudges (offence, perpetrator, restitution), choose **Standard** (25 XP) or **Blood** (50 XP), mark party-shared grudges (max 3 outstanding), **Satisfy** to earn XP, and delete resolved ones.

### Gear

| Section | What you can do |
|---------|-----------------|
| Trappings | Add from the rulebook or custom. Track Enc and quantity. Toggle 🐎 (on horse / pack animal), 👕 (worn — reduces Enc), and 🎒 (in backpack — with the backpack house rule). Drag to reorder; long-press (touch) for a context menu |
| Card / List view | A toggle in the Trappings header switches between detailed cards and a compact list — your choice is remembered |
| Armour Points | Per-location AP auto-calculated from worn armour, with a **Sync** button to copy computed values into the manual fields |
| Consumables | Also available here |
| Coin Purse | Your carried money (GC / SS / D), with Quick Adjust and a **Deposit to Treasury** control |
| Encumbrance | Current vs. max carry, broken down by category, each with a breakdown tooltip; shows an overburdened warning and any pack-animal load |

Weapons and armour are shown here but managed primarily on the Combat page.

### Notes (Session Log)

A timestamped session journal: type a note and press Enter (or Add) to log it with the date/time, newest first; delete entries with ✕. There's also a broader timeline/event view of changes to your character.

---

## Combat Page

A **house-rule indicator** banner at the top summarises which combat house rules are active.

### Starting & Ending Combat

Tap **START COMBAT** to activate the combat dashboard and the mode controls. Tap **END COMBAT** when finished — this resets advantage and clears the initiative list.

### Attack / Defend / Status modes

During active combat a sticky **segmented control** switches the page between three modes:

- **Attack** — Attack Flow, Quick Roll, and your Weapons
- **Defend** — Take Damage and the Armour map
- **Status** — Fortune & Resolve, Spells & Prayers, Ammo, Critical Wounds, and Roll History

Values you enter in a mode persist when you switch away and back.

### Combat Dashboard

Shown prominently during combat (compact and sticky on mobile in Attack/Defend; full-width on desktop and in Status):

| Element | Description |
|---------|-------------|
| **Wounds** | Current / total with a color-coded progress bar (green → yellow → red → skull) and +/−/Full buttons |
| **Advantage** | +/− (or Group Advantage if that house rule is on). Respects your Advantage Cap |
| **Round Counter** | The current combat round |
| **Engaged** | Toggle melee engagement (affects ranged difficulty) |
| **Conditions** | Active conditions with level badges and colors. Tap for a rule tooltip, ✕ to remove, or open the Condition Picker to add |
| **Initiative Tracker** | Add combatants by name and initiative; sorted highest-first; active combatant marked ▶; **Next Turn** cycles; clears when combat ends |
| **End Turn** | Processes condition effects (e.g., Bleeding, Ablaze) and advances the round |

### Attack Flow (Attack mode)

1. **Select Weapon** — Pick from your weapons.
2. **Roll to Hit** — See your target number and difficulty, then roll (or enter a manual d100). Results show hit/miss/critical/fumble with SL.
3. **Hit Location** — Auto-reversed from the roll; shows your AP there.
4. **Damage** — Weapon damage + SL = total; enter opponent TB and AP to see net wounds.

### Take Damage (Defend mode)

Enter incoming damage, pick the hit location (auto-fills your AP), see net wounds after TB + AP, and **Apply Wounds**. With the **Critical Deflection** house rule, you can sacrifice 1 AP to ignore a Critical Wound. A hit that drops you can hand off directly to the critical-wound roller in Status mode.

### Weapons

Weapon cards show name, group, calculated damage (including SB and talent bonuses), range/reach, and qualities. A header toggle switches between **card** and **compact list** views. Per weapon: 🎲 quick roll · ✎ edit · ⚒ manage runes (up to 3) · ✕ delete. Add from the rulebook or create custom. A **?** help button explains the damage formula.

### Armour (Defend mode / out of combat)

A visual armour map shows AP at each location (Head, L/R Arm, Body, L/R Leg) using WFRP 4e stacking rules. Add armour from the rulebook or custom, manage runes (up to 3), and toggle worn/unworn.

### Spells & Prayers (Status mode)

For characters with a spellcasting talent (Arcane/Petty Magic, Bless, or Invoke):
- **Memorized Spells** with CN, range, target, duration, effect
- **Cast** opens a roll dialog; **Channel** accumulates SL toward a spell's CN; progress shown per spell
- With more than one Channelling skill (e.g. *Channelling (Aqshy)* and *Channelling (Hysh)*), the Channel dialog has a **Skill** dropdown listing each with its target. It starts on the skill for the spell's Wind (Lore of Fire → Aqshy, High Magic → Qhaysh, Necromancy and Daemonology → Dhar) when you have it, otherwise on your highest Channelling skill (e.g. for Petty and Arcane spells), and remembers your pick for that spell until you leave the page
- **Magic Saturation** selector (Low … Corrupted), **Armour Casting Penalty**, **Overcast allocation**, and automatic **Miscast** tables
- With the **Alternative Channelling Cants** house rule, spend gathered channelling SL on minor effects
- **Manage Spells** to memorize/unmemorize

### Status mode extras

- **Ammo Tracker** — ammunition by name, current/max, and Enc
- **Critical Wounds** — log location, description, effects, duration, severity; mark healed; roll on the official critical tables
- **Roll History** — recent rolls

### Hirelings in combat

When you have hirelings, a collapsible Hirelings section lets you track each one's wounds and conditions during an encounter.

---

## Advancement Page

A badge dot appears on the Advancement nav item when you have unspent XP.

### Career Management

- View your current Class / Career / Level.
- **Career Progress** checklist: characteristics at threshold, career skills at threshold, and at least one career talent.
  - Each skill the career lists counts once, and each of your skills counts for one of them. *Language (Any)* is met by any language, while *Language (Magick)* is met only by Magick, so one Language (Magick) cannot tick both. Several Channelling colours meet *Channelling (Any Colour)* once; every one of them is still advanced at the in-career price.
  - The checklist names the skill counted for a grouped entry, e.g. *Language (Any): Language (Bretonnian)*.
- **Advance Career Level (N XP)** — advances to the next level (cheaper when requirements are met).
- **Change Career** and **Switch Career** — two ways to move to a new career; eligibility filtering shows only valid options and the XP cost depends on same-class vs. different-class.
- **Help popovers** (ℹ️) explain the rules in context.

### Experience Points & Award Log

Edit Current / Spent / Total XP directly; the app tracks spending as you advance. GMs can **Award XP** with a reason, and awards are recorded in an **XP Award Log**.

### Advancing Characteristics

Per-stat cards with current value, advances, next-advance cost (in-career tier pricing; out-of-career double), and **+1** / bulk-advance buttons. Gold = in-career, grey = out-of-career.

### Advancing Skills

A table (career skills first, in gold) with name, characteristic, advances, total, cost, and status; a **Career Only** toggle; and **+1** / **+5** (and larger "Tier") advance buttons.

### Acquiring Talents

- **In-Career Talents** from your current level (cost scales with times taken). A grouped talent such as *Arcane Magic (Any Arcane Lore)* shows a card for each specialisation you own plus a **Choose & Acquire** card that asks for the new specialisation first.
- **Out-of-Career Talents** you already own (double cost)
- A view of **future career talents** you'll gain at later levels

### Learning Spells, Rituals, and Runes

Shown based on your talents:
- **Spells** (Arcane/Petty Magic) — browse by lore, see XP cost, learn with XP deduction; includes Chaos lore where applicable
- **Rituals** (Ritual Magic) — browse by CN/type and learn
- **Runes** (Rune Magic) — browse by category (Weapon, Armour, Talismanic, Protection, Engineering, Doom, and more), with XP costs, prerequisites, and ★ master runes
- **Sword-Dancing Techniques** (High Elf Sword Dancing) — SL-gated techniques with escalating costs
- **Deity Selection** (Dwarf priests) — pick an Ancestor God, which affects available runes

### Undo / Redo & Archive

Undo/Redo at the top reverse accidental advances. An **Archive** holds entries from previous career levels, viewable and restorable.

---

## Retinue Page

Two sub-tabs (reorderable): **Hirelings** and **Animal Companions**.

### Hirelings

Recruit and manage NPCs (maximum 10):
- **Add from Up in Arms** profiles or create a custom hireling (name, role, skills, quirks, pay)
- Each **Hireling Card** tracks stats, wounds, and details
- Hirelings appear on the Combat page for wound/condition tracking
- Delete with an **undo toast** to recover

### Animal Companions

Add from **Templates** (war horse, hunting dog, etc.) or **Add Custom**:
- Track species, characteristics, trained skills (togglable), wounds, and notes
- Mark one as a **pack animal** so its carried gear is excluded from your personal encumbrance
- Delete with an undo toast

---

## Estate Page (Holdings & Wealth)

Sub-tabs (reorderable): **Treasury & Finances**, **Estate**, **Holdings**, and **Enterprises** (when the Enterprises house rule is on).

### Treasury & Finances

| Section | Description |
|---------|-------------|
| Financial Summary | Monthly income, expenses, and profit across everything (properties and hireling upkeep included) |
| Treasury | Your estate's cash reserves (GC/SS/D), editable directly |
| Collect Monthly Income & Pay Expenses | One tap applies the net monthly profit to the treasury |
| Deposit / Withdraw | Move coin between your personal Coin Purse (on the Character → Gear tab) and the Treasury |
| Ledger | Transaction history — add income/expense entries that adjust the balance; newest first; delete with ✕ |

Your **personal coin purse** (carried money) lives on the Character page's Gear tab; the **Treasury** here is your estate's reserves.

### Estate

Name, location, and description for your estate, plus estate-level monthly income/expenses and free-text notes.

### Holdings

Add and manage properties:
- **Type**: Inn, Tavern, Farm, Mill, Workshop, Shop, Warehouse, Manor, Mine, Smithy, Stable, Dock, or Other
- **Status**: Active, Under Construction, Damaged, Destroyed, or Abandoned
- Per-property monthly income/expenses, a condition bar, staff count, and notes

### Enterprises

Enabled via the **Enterprises** house rule. Track business ventures (courier service, crafting workshop, tavern, noble estate, and more) with expansion levels, debt and interest, income sources, trappings, and special rules — the enterprise rules from the Archives of the Empire supplements.

---

## Endeavours Page

Track between-adventure downtime activities. A badge dot appears on the nav item when you have active endeavours.

### Downtime Periods

Tap **New Downtime Period** to create one. Each has a label (e.g., "After Bögenhafen"), a slot count (from your Status tier), and a list of endeavour entries.

### Adding Endeavours

Tap **+** on a period and choose from **General Endeavours** (Recover, Earn, Recruit, Research, Train, …), **Class Endeavours** (specific to your class), or **Custom** free-text. Cycle an endeavour's status (e.g., not started → in progress → complete) and remove with ✕.

---

## Settings Page

### Appearance (Themes)

| Theme | Description |
|-------|-------------|
| 🌙 Dark | Default dark fantasy theme |
| ☀️ Light | Light parchment theme |
| ◐ High Contrast | Maximum readability |
| 🔍 Old Nerd Mode | Larger text, easier on the eyes |

### Dice Rolling

Choose how test rolls are made:
- **🎲 Auto-roll** — the app rolls the d100 for you
- **✍️ Manual entry** — roll a physical die and type the result; the app still works out Success Levels, criticals, and difficulty

### Quick Actions

Configure up to **6** skills or characteristics for one-tap rolls. They appear on a docked **Quick Rolls** bar on desktop and a floating action bar on mobile. Add from the dropdown (grouped into Characteristics and Skills) and remove with the ✕ on each chip.

### House Rules

Per-character rule variants, grouped into **Combat Rules** and **Optional Mechanics**. Each shows a "Find it on:" hint pointing to where its UI appears once enabled.

**Combat Rules**

| Rule | Options / Effect | Source |
|------|------------------|--------|
| **Ranged Damage SB** | None (RAW) · Half SB · Full SB | Core |
| **Initiative Formula** | Initiative + 1d10 · Initiative/Agility Test | Core |
| **Impale Crits on 10s** | Impale weapons crit on multiples of 10 | Core |
| **Minimum 1 Wound (RAW)** | Hits overcoming TB+AP deal at least 1 wound | Core |
| **Advantage Cap** | Max advantage (0 = uncapped; RAW = Initiative Bonus) | Core |
| **Group Advantage** | Party shares one advantage pool | Up in Arms |
| **Backpack Ignores Encumbrance** | Items marked "in backpack" count as 0 Enc | House rule |

**Optional Mechanics**

| Rule | Effect | Source |
|------|--------|--------|
| **Yenlui Balance (High Elf)** | Elven spiritual balance tracking (Identity tab) | High Elf Guide |
| **Grudge Book (Dwarf)** | Dwarf grudges for XP (Identity tab) | Dwarf Guide |
| **Psychology Tracker** | Phobias, animosity, hatred, trauma (Identity tab) | Archives Vol. II |
| **Critical Deflection** | Sacrifice 1 AP to ignore a Critical Wound (Take Damage) | Archives Vol. III |
| **Enterprises** | Business-venture tracking (Estate → Enterprises tab) | Archives Vol. III |
| **Alternative Channelling Cants** | Spend channelling SL on minor effects (Spells panel) | Archives Vol. III |

### Export / Import (Single Character)

- **Export ▾** → **Copy to Clipboard** or **Download File**
- **Import from File** — load a .json; if it would overwrite your current character, you're asked to confirm first

### Bulk Backup & Restore (All Characters)

- **Back Up All Characters** — downloads one file containing every saved character (with portraits); a progress indicator shows the count. A gentle reminder appears if you haven't backed up in a while.
- **Restore from Backup** — loads a backup file; shows character names, flags duplicates, asks for confirmation, and skips duplicates automatically.

### Utilities

- **Print Character Sheet** — opens your browser's print dialog with a clean, ink-friendly one-page layout (great for Save as PDF)
- **Install** — appears when the app can be installed as a PWA

### Danger Zone

Collapsed by default. **Clear Sheet** resets all data to defaults (keeps the name) after a confirmation. Actions here cannot be undone.

---

## Tips & Tricks

| Tip | Details |
|-----|---------|
| **Random character** | Use **Create Random Character** for an instant, rules-legal sheet — ideal for NPCs, one-shots, or a starting point you then tweak. |
| **Command Palette** | `Ctrl+K` / `Cmd+K` anywhere searches spells, talents, skills, careers, runes, rituals, and conditions — even with no character loaded. |
| **Auto-save** | Every change saves instantly. No save button needed. |
| **Undo** | `Ctrl/Cmd+Z` undoes your last field change; deleting weapons, armour, hirelings, or companions shows an undo toast. |
| **Card vs list** | Switch Weapons and Trappings between detailed cards and a compact list from the toggle in each section header; your choice is remembered. |
| **Compact mode** | Toggle the Character page between Compact and Expanded layouts. |
| **Breakdown tooltips** | Hover (or tap) any calculated total — characteristics, wounds, encumbrance, armour points, weapon damage — to see how it was computed. |
| **Portrait prompt** | Generate an AI image prompt from your character's details and gear, then paste it into your image tool and upload the result. |
| **Manual or auto dice** | Prefer physical dice? Switch to Manual entry in Settings and the app still handles SL, crits, and difficulty. |
| **Reorder things** | Drag to reorder weapons and trappings (card view); reorder sub-tabs from each tab bar's edit mode. |
| **Offline & install** | Works offline after first load; install it as an app for a native experience. Updates arrive with a refresh banner. |
| **Keyboard shortcuts** | Keys 1–7 switch pages; `Ctrl/Cmd+K` opens search. Open the Shortcuts overlay from the sidebar/bottom bar. |
| **Tooltips & help** | Tap skill and talent names for official rule text; ℹ️ and **?** buttons explain mechanics in context. |
| **End Turn automation** | The End Turn button processes Bleeding, Ablaze, and other condition effects automatically. |
| **Back up often** | Data lives in this browser only — use **Back Up All Characters** in Settings regularly, and move characters between devices via export/import. |
| **Species & optional rules** | Elves get Yenlui Balance, Dwarfs get Grudge Book and deity runes, and Archives options (Psychology, Critical Deflection, Enterprises, Cants) are all toggles in House Rules. |