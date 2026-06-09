# WFRP 4e Character Sheet — Player Guide

A digital character sheet for Warhammer Fantasy Roleplay 4th Edition. Works in your browser, saves locally, and functions offline once installed.

---

## Getting Started

### First Launch

When you first open the app, you'll see three options:

- **Character Wizard** — Guided 6-step creation that walks you through species, career, characteristics, skills, talents, and personal details. Follows the WFRP 4e creation rules with optional random rolls for bonus XP.
- **Quick Start** — Enter a character name and get a blank sheet to fill in manually.
- **Import from File** — Load a previously exported character JSON file.

### Managing Multiple Characters

The sidebar (accessible via the menu icon) lets you:
- Create additional characters
- Switch between saved characters
- Rename, duplicate, or delete characters

All data saves automatically to your browser's local storage.

---

## Navigation

The app has six main pages accessible from the bottom navigation bar:

| Icon | Page | Purpose |
|------|------|---------|
| 👤 | Character | Identity, abilities, gear, and notes |
| ⚔️ | Combat | Weapons, armour, attack rolls, damage tracking |
| 📈 | Advancement | Career progression and XP spending |
| 🏠 | Estate | Wealth, properties, and holdings |
| 📅 | Endeavours | Between-adventure downtime activities |
| ⚙️ | Settings | Theme, house rules, export/import |

---

## Character Page

Four sub-tabs across the top:

### Identity

- **Portrait**: Tap to upload an image for your character.
- **Personal Info**: Edit name, species, class, career, career level, status, age, height, hair, and eyes by tapping any field.
- **Characteristics**: Shows all 10 stats (WS, BS, S, T, I, Ag, Dex, Int, WP, Fel) with initial value, advances, talent bonuses, and current total. Tap the 🎲 button to roll against any characteristic.
- **Movement**: Displays Move, Walk, and Run speeds.
- **Fortune & Resolve**: Spend or recover Fortune/Resolve points with the +/- buttons.

### Abilities

- **Basic Skills**: All 18 WFRP 4e basic skills with linked characteristic, advances, and total. Tap a skill name for a tooltip description. Tap 🎲 to roll. Use the **Trained Only** button to hide skills with 0 advances.
- **Advanced Skills**: Add from the rulebook database or create custom skills. Edit advances inline. Delete with the ✕ button.
- **Talents**: Add from the rulebook or create custom. Shows level and description. Tap name for tooltip.
- **Spells & Prayers**: Appears if your character has spellcasting abilities. Add spells from the database showing CN, Range, Target, Duration, and Effect.
- **Known Runes**: Appears for Runesmith characters. Shows learned runes with category badges.

### Gear & Wealth

- **Trappings**: Add equipment from the rulebook or create custom items. Track name, encumbrance, and quantity. Tick "On Horse" to exclude items from personal encumbrance.
- **Weapons & Armour**: Managed primarily from the Combat page but visible here too.
- **Wealth**: Edit Gold Crowns (GC), Silver Shillings (SS), and Brass Pennies (D).
- **Encumbrance**: Shows current carry weight vs. maximum, broken down by category.
- **Animals & Companions**: Add trained animals and track their wounds.

### Notes

Free-form text area for background, story notes, session logs, or anything else.

---

## Combat Page

### Starting Combat

Tap **START COMBAT** at the bottom of the page. This activates the combat dashboard and reveals combat-only panels. Tap **END COMBAT** when finished (resets advantage to 0).

### Combat Dashboard (Always Visible)

- **Wounds**: Current/total with color-coded bar (green → yellow → red as wounds decrease).
- **Advantage**: +/- buttons. Respects your Advantage Cap house rule.
- **Round Counter**: Track the current combat round.
- **Engaged**: Toggle whether you're in melee engagement (affects ranged difficulty).
- **Conditions**: View active conditions. Tap ✕ to remove one, or open the condition picker to add new ones.
- **Fortune/Resolve**: Spend points directly from the dashboard.

### Attack Flow (Combat Only)

A guided 4-step attack sequence:

1. **Select Weapon** — Pick from your equipped weapons.
2. **Roll to Hit** — Shows your skill, target number, and difficulty. Tap 🎲 ROLL TO HIT. Results show hit/miss/critical/fumble with SL.
3. **Hit Location** — Automatically reversed from the roll. Shows your AP at that location.
4. **Damage Calculation** — Weapon damage + SL = total. Enter opponent's TB and AP to see net wounds dealt.

### Take Damage Panel (Combat Only)

For when your character takes hits:
1. Enter incoming damage.
2. Select hit location (auto-fills your AP at that location).
3. See net wounds after TB and AP reduction.
4. Tap **Apply Wounds** to subtract from your current wounds.
5. Alert appears if your character goes down (0 wounds).

### Weapons

Weapon cards show name, group, calculated damage (including SB and talent bonuses), range/reach, and qualities. Actions:
- **🎲** — Quick roll to hit with that weapon.
- **⚒ Runes** — Manage runes on the weapon (up to 3).
- **✕** — Delete the weapon.
- **Add from Rulebook** / **Add Custom** — Add new weapons.

### Armour

Visual armour map showing AP at each location (Head, Arms, Body, Legs). Armour list shows individual pieces with locations, AP, and qualities. Same add/delete/rune workflow as weapons.

### Ammo Tracker (Combat Only)

Track ammunition: name, current quantity, maximum, and encumbrance. Adjust quantities as you fire.

### Critical Wounds (Combat Only)

Log critical wounds with location, description, effects, duration, and severity. Mark as healed when recovered.

### Quick Roll Bar (Combat Only)

Fast access to characteristic and skill rolls without going through the full attack flow.

### Roll History (Combat Only)

Shows all rolls made during this combat session. Clear when done.

### Spell Casting

Available if your character has spellcasting talents or spells. Select a spell, allocate overcasting, and cast.

---

## Advancement Page

### Career Management

- **Class / Career / Level**: Tap to change via picker. The app includes all WFRP 4e careers.
- **Career Progress**: Visual checklist showing what's needed to complete your current career level:
  - Characteristics at threshold (5/10/15/20 depending on level)
  - 8 career skills at threshold
  - At least 1 career talent acquired
- **Advance Career Level**: Costs 100 XP if requirements are met, 200 if not.
- **Switch Career**: Same-class costs 100 XP base, different-class costs 200 XP base.

### Experience Points

Edit Current XP, Spent XP, and Total XP directly. The app tracks spending automatically when you advance.

### Advancing Characteristics

Cards for each of the 10 characteristics showing:
- Current value and advances
- Next advancement cost (in-career uses the tiered table; out-of-career is double)
- **+1** button for single advance
- **+X** bulk button when you can afford multiple
- Color-coded in-career (gold) vs. out-of-career (grey)
- "In-career at CL#" warning for skills that become in-career at a future level

### Advancing Skills

Skills table sorted by career status:
- **Career Skills** appear first with gold highlighting
- **Other Skills** appear below (use the **Career Only** button to hide untrained out-of-career skills)
- Each row shows: skill name, characteristic, advances, total, cost, and status
- **+1** and **+5** bulk advance buttons
- Tap skill names for tooltip descriptions

### Acquiring Talents

- **In-Career Talents**: Shows all talents from your current career level. Cost = 100 × (times taken + 1).
- **Out-of-Career Talents**: Shows talents you already own that aren't in your current career. Double cost.
- Tap talent names for descriptions.

### Undo / Redo

Undo and redo buttons at the top of the page let you reverse accidental advances.

### Advancement Archive

Old advancement entries are automatically archived when you advance career levels. View and restore from the archive.

---

## Estate Page

Three sub-tabs for managing wealth and property:

### Wealth & Finances

- **Financial Summary**: Total monthly income, expenses, and profit across your estate and all properties.
- **Treasury**: Your estate's cash reserves (GC/SS/D). Editable.
- **Collect Monthly**: One-tap button that adds your net monthly profit to the treasury.

### Estate

- Name, location, and description for your estate.
- Estate-level monthly income and expenses (GC/SS/D).

### Holdings & Properties

Add and manage individual properties:
- **Type**: Inn, Tavern, Farm, Mill, Workshop, Shop, Warehouse, Manor, Mine, Smithy, Stable, Dock, or Other.
- **Status**: Active, Under Construction, Damaged, Destroyed, or Abandoned.
- **Income & Expenses**: Per-property monthly financials.
- **Condition**: Percentage track with visual bar.
- **Staff**: Number of employees.
- **Notes**: Free text for business details.

---

## Endeavours Page

Track between-adventure downtime activities:

### Downtime Periods

- Tap **New Downtime Period** to create one.
- Each period has a label, slot count (how many endeavours you can fit), and a list of endeavour entries.
- Slots are determined by your Status tier.

### Adding Endeavours

Tap the + button on a period to choose from:
- **General Endeavours**: Recover, Earn, Recruit, Research, Train, etc.
- **Class Endeavours**: Options specific to your character class.
- **Custom**: Free-text entry for anything else.

Mark endeavours as complete with the checkbox. Remove with ✕.

---

## Settings Page

### Appearance

Four themes:
- 🌙 **Dark** — Default dark fantasy theme
- ☀️ **Light** — Light parchment theme
- ◐ **High Contrast** — Maximum readability
- 🔍 **Old Guy Mode** — Larger text, easier on the eyes

### House Rules

Per-character rule variants that affect combat calculations:

- **Ranged Damage SB**: Controls SB contribution to ranged weapon damage.
  - *None (RAW)*: Uses each weapon's formula as written.
  - *Half SB*: All ranged weapons use ½SB.
  - *Full SB*: All ranged weapons use full SB.
- **Impale Crits on 10s**: Impale-quality weapons score critical hits on multiples of 10 (in addition to standard doubles).
- **Minimum 1 Wound (RAW)**: Hits that overcome TB+AP always deal at least 1 wound. Turn OFF to allow 0-wound hits.
- **Advantage Cap**: Maximum advantage your character can accumulate. Set to 0 for uncapped. RAW default is Initiative Bonus.

### Export / Import

- **Copy to Clipboard**: Copies your character as JSON text.
- **Download File**: Saves a .json file to your device.
- **Import from File**: Load a character from a .json file. Merges missing fields with defaults.

### Utilities

- **Clear Sheet**: Resets all character data to defaults (keeps the name).
- **Print**: Opens your browser's print dialog with a print-optimized layout.

---

## Tips

- **Auto-save**: All changes save automatically. No save button needed.
- **Offline**: Once you've loaded the app, it works without internet.
- **Install as App**: Use your browser's "Install" or "Add to Home Screen" option for a native app experience.
- **Keyboard navigation**: All interactive elements are keyboard-accessible.
- **Tooltips**: Tap/click skill and talent names for WFRP 4e descriptions and rules references.
- **Rolls**: The 🎲 buttons throughout the app use the WFRP 4e d100 system with SL calculation, critical detection, and difficulty modifiers.
