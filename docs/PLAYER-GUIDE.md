# WFRP 4e Character Sheet — Player Guide

A digital character sheet for Warhammer Fantasy Roleplay 4th Edition. Runs in your browser, saves locally, and works offline as an installable PWA.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Navigation](#navigation)
- [Character Page](#character-page)
- [Combat Page](#combat-page)
- [Advancement Page](#advancement-page)
- [Retinue Page](#retinue-page)
- [Estate Page](#estate-page)
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

Tap the character name in the header (or the hamburger menu on mobile) to open the character management sheet. From there you can:

- **Create** a new character (wizard or blank)
- **Switch** between saved characters
- **Rename**, **Duplicate**, or **Delete** characters

All data is stored in your browser's local storage — nothing leaves your device.

### Installing as an App

Use your browser's "Install" or "Add to Home Screen" option to get a native app experience. Once installed, the app loads instantly and works fully offline.

---

## Navigation

Seven pages accessible from the bottom navigation bar:

| Icon | Page | What it's for |
|------|------|---------------|
| 👤 | **Character** | Identity, abilities, gear, wealth, and notes |
| ⚔️ | **Combat** | Weapons, armour, attack rolls, damage, conditions |
| 📈 | **Advancement** | Career progression and XP spending |
| 👥 | **Retinue** | Hirelings and animal companions |
| 🏠 | **Estate** | Wealth, properties, and holdings |
| 📅 | **Endeavours** | Between-adventure downtime activities |
| ⚙️ | **Settings** | Theme, house rules, export/import |

Pages load on demand — only the Character page is bundled upfront, keeping initial load times fast.

---

## Character Page

Four sub-tabs across the top: **Identity**, **Abilities**, **Gear & Wealth**, and **Notes**.

### Identity

| Section | What you can do |
|---------|-----------------|
| Portrait | Tap to upload an image |
| Personal Info | Edit name, species, class, career, career level, status, age, height, hair, eyes |
| Characteristics | View all 10 stats with initial / advances / bonus / total. Tap 🎲 to roll against any stat |
| Movement | Displays Move, Walk, and Run speeds |
| Fortune & Resolve | Spend or recover points with +/− buttons |

### Abilities

| Section | What you can do |
|---------|-----------------|
| Basic Skills | All 18 core skills with linked characteristic and total. Tap name for tooltip. Tap 🎲 to roll. Toggle "Trained Only" to hide untrained skills |
| Advanced Skills | Add from the rulebook database or create custom. Edit advances inline. Delete with ✕ |
| Talents | Add from rulebook or create custom. Shows level and description |
| Spells & Prayers | Add spells showing CN, Range, Target, Duration, Effect (appears for spellcasters) |
| Known Runes | Rune list with category badges (appears for Runesmiths) |

### Gear & Wealth

| Section | What you can do |
|---------|-----------------|
| Trappings | Add items from the rulebook or custom. Track enc and quantity. Tick "On Horse" to exclude from personal carry |
| Weapons & Armour | Visible here, managed primarily on the Combat page |
| Wealth | Edit GC / SS / D directly |
| Encumbrance | Current vs. max carry, broken down by category |
| Animals & Companions | Add trained animals and track their wounds |

### Notes

Free-form text for background, story notes, session logs, or anything else.

---

## Combat Page

### Starting & Ending Combat

Tap **START COMBAT** to activate the combat dashboard and reveal combat-only panels (Attack Flow, Take Damage, Ammo, Critical Wounds, Quick Roll Bar). Tap **END COMBAT** when finished — this resets advantage to 0.

### Combat Dashboard (always visible)

| Element | Description |
|---------|-------------|
| **Wounds** | Current / total with color-coded bar (green → yellow → red) |
| **Advantage** | +/− buttons, respects your Advantage Cap house rule |
| **Round Counter** | Track the current round |
| **Engaged** | Toggle melee engagement (affects ranged difficulty) |
| **Conditions** | View active conditions with level. Tap ✕ to remove, or open the Condition Picker to add |
| **Fortune / Resolve** | Spend directly from the dashboard |

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

### Weapons

Weapon cards show name, group, calculated damage (including SB and talent bonuses), range/reach, and qualities.

Actions per weapon: 🎲 quick roll | ⚒ manage runes (up to 3) | ✕ delete

Add weapons from the rulebook database or create custom.

### Armour

Visual armour map showing AP at each body location (Head, Left Arm, Right Arm, Body, Left Leg, Right Leg). Uses WFRP 4e stacking rules: highest non-flexible + highest flexible AP per location.

Add armour from the rulebook or custom. Manage runes. Toggle worn/unworn.

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
- **Switch Career**: Same-class = 100 XP, different-class = 200 XP.

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

### Undo / Redo

Buttons at the top of the page let you reverse accidental advances.

### Advancement Archive

Archived entries from previous career levels. View and restore if needed.

---

## Retinue Page

Two sub-tabs: **Hirelings** and **Companions**.

### Hirelings

Recruit and manage NPCs who serve your character:

- **Create a Hireling** — Guided creation flow: name, role, key skills, quirks, and pay rate.
- **Hireling Cards** — Each card shows the hireling's name, role, skills, loyalty, and pay. Track wounds and morale.
- **Combat Panel** — Manage hireling wounds and conditions during combat.
- **Delete** — Remove hirelings you no longer employ.

### Companions (Animals)

Add trained animals from templates (war horse, hunting dog, carrier pigeon, etc.) or create custom:

- Track species, trained skills, wounds, and notes.
- Adjust wound current/max during play.

---

## Estate Page

Three sub-tabs: **Wealth & Finances**, **Estate**, and **Holdings & Properties**.

### Wealth & Finances

| Section | Description |
|---------|-------------|
| Financial Summary | Total monthly income, expenses, and profit across everything |
| Treasury | Your estate's cash reserves (GC/SS/D), editable |
| Collect Monthly | One-tap button adds net monthly profit to treasury |

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
- A label (e.g. "After Bögenhafen")
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

Per-character rule variants affecting combat calculations:

| Rule | Options |
|------|---------|
| **Ranged Damage SB** | None (RAW) · Half SB · Full SB |
| **Impale Crits on 10s** | Toggle — Impale weapons crit on multiples of 10 |
| **Minimum 1 Wound (RAW)** | Toggle — Hits overcoming TB+AP always deal at least 1 wound |
| **Advantage Cap** | Set max advantage (0 = uncapped, RAW = Initiative Bonus) |

### Export / Import

- **Copy to Clipboard** — Character as JSON text
- **Download File** — Save a .json file
- **Import from File** — Load from .json, merges missing fields with defaults

### Utilities

- **Clear Sheet** — Reset all data to defaults (keeps name)
- **Print** — Opens print dialog with an optimized print layout

### Quick Actions

Configure skill shortcuts that appear as a floating bar on mobile. Tap to roll instantly without navigating.

---

## Tips & Tricks

| Tip | Details |
|-----|---------|
| **Auto-save** | Every change saves instantly. No save button needed. |
| **Offline mode** | Works without internet after first load. A cached offline page appears if you navigate to uncached content. |
| **Install as app** | Use your browser's Install / Add to Home Screen for a native experience. |
| **Keyboard navigation** | All elements are keyboard-accessible with a skip-to-content link. |
| **Tooltips** | Tap skill and talent names for official WFRP 4e descriptions. |
| **Dice rolls** | 🎲 buttons use the WFRP 4e d100 system with SL calculation, criticals, fumbles, and difficulty modifiers. |
| **Print layout** | Ctrl+P (or Cmd+P) gives you a clean one-page character sheet. |
| **Multiple devices** | Export on one device, import on another. Data doesn't sync automatically. |
| **Service Worker** | Fonts, images, and the app shell are cached for instant repeat loads. JS/CSS uses stale-while-revalidate for seamless updates. |
