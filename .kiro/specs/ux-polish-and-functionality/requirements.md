# Requirements Document

## Introduction

This specification covers 22 UX polish and functionality improvements for the WFRP 4e Character Sheet PWA. The improvements span visual polish (condition color-coding, wound escalation, animations), combat enhancements (opposed tests, end-of-turn automation, two-weapon fighting, initiative tracking), automation (wound/AP calculation, consumables), mobile experience (haptic feedback, offline indicator, roll persistence), and quality-of-life features (skill filtering, session notes, spell effects, ledger history). All improvements build upon existing systems and data already present in the application.

## Glossary

- **Combat_Dashboard**: The sticky panel on the Combat page displaying wounds, advantage, round counter, conditions, and fortune/resolve.
- **Condition_Badge**: A visual badge element rendered for each active condition on the Combat Dashboard.
- **Roll_Dialog**: The modal dialog used to configure and execute d100 skill/characteristic tests.
- **Roll_Result**: The outcome object produced by the dice roller containing roll value, SL, pass/fail, critical/fumble status.
- **Attack_Flow**: The step-by-step guided attack workflow on the Combat page (weapon selection → roll → hit location → damage).
- **Abilities_Tab**: The "Abilities" sub-tab on the Character page displaying skills, talents, and spells.
- **Estate_Page**: The page for managing estate treasury, holdings, income/expenses, and transaction ledger.
- **Character_Page**: The main character sheet page with sub-tabs for identity, abilities, gear, and notes.
- **Notes_Tab**: The "Notes" sub-tab on the Character page.
- **Currency_Input**: The existing shared component that parses freeform currency strings like "+2GC -5SS +10D".
- **SB**: Strength Bonus — the tens digit of total Strength characteristic.
- **TB**: Toughness Bonus — the tens digit of total Toughness characteristic.
- **WPB**: Willpower Bonus — the tens digit of total Willpower characteristic.
- **SL**: Success Levels — the difference between tens digit of target number and tens digit of roll.
- **AP**: Armour Points — protection value per body location from worn armour.
- **PWA**: Progressive Web App — the application shell with offline capability.
- **Career_Scheme**: The structured data defining skills, talents, and characteristics available at each career level.
- **Wound_Maximum**: The calculated maximum wound total: SB + (2 × TB) + WPB + Hardy talent levels.
- **Opposed_Test**: A contest where two parties roll and compare net SL to determine a winner.
- **Initiative_Order**: A sorted list of combatants ordered by Initiative characteristic value for turn tracking.
- **Consumable**: A dose-tracked item with name, current doses, maximum doses, and effect text.
- **Psychology_Trait**: A psychological condition (Animosity, Hatred, Fear, Terror, Frenzy, Prejudice) with target/rating specification.
- **Ledger_Entry**: A timestamped financial transaction record with description, amount, and income/expense type.
- **Haptic_Feedback**: Device vibration triggered via the Web Vibration API for tactile response.

## Requirements

### Requirement 1: Condition Badge Color-Coding

**User Story:** As a player in combat, I want condition badges to be color-coded by type and severity, so that I can assess my character's status at a glance.

#### Acceptance Criteria

1. THE Combat_Dashboard SHALL render each Condition_Badge with a distinct background color based on condition name: Bleeding as red, Ablaze as orange-red, Poisoned as green, Stunned as yellow, Surprised as yellow, Fatigued as orange, Prone as grey, Broken as purple, Blinded as dark-grey, Deafened as dark-grey, Entangled as brown, Unconscious as black with white text.
2. WHEN a condition is stackable and its level exceeds 1, THE Condition_Badge SHALL increase color intensity or opacity proportional to the condition level relative to maximum level.
3. THE Combat_Dashboard SHALL maintain sufficient color contrast (minimum 4.5:1 ratio) between badge text and badge background for all condition color assignments.

### Requirement 2: Roll Result Animations

**User Story:** As a player, I want brief visual animations on roll results, so that critical hits and fumbles feel dramatic and satisfying.

#### Acceptance Criteria

1. WHEN a Roll_Result has isFumble equal to true, THE Roll_Dialog SHALL apply a horizontal shake animation to the result display lasting between 100ms and 200ms using CSS-only transitions; the fumble shake takes priority over the critical glow if both conditions somehow apply.
2. WHEN a Roll_Result has isCritical equal to true and isFumble is false, THE Roll_Dialog SHALL apply a gold glow animation to the result display lasting between 100ms and 200ms using CSS-only transitions.
3. THE Roll_Dialog SHALL implement animations using CSS transitions and keyframes only, with no JavaScript-driven animation frames.
4. WHEN a user has prefers-reduced-motion enabled, THE Roll_Dialog SHALL skip all animation logic entirely, applying no roll result animations or transitions regardless of roll outcome.

### Requirement 3: Auto-Calculate Wound Maximum

**User Story:** As a player, I want my maximum wounds calculated automatically from my characteristics and talents, so that I don't need to compute the formula manually.

#### Acceptance Criteria

1. THE Character_Page SHALL compute the wound maximum using the formula: SB + (2 × TB) + WPB + Hardy_talent_levels, where SB is the tens digit of total Strength, TB is the tens digit of total Toughness, and WPB is the tens digit of total Willpower.
2. WHEN the character has the Hardy talent, THE Character_Page SHALL add the Hardy talent level count to the wound maximum formula as additional TB multipliers (each Hardy level adds one more TB).
3. WHEN a character's species has woundsUseSB set to false, THE Character_Page SHALL exclude SB from the wound maximum formula.
4. THE Character_Page SHALL display a formula breakdown showing each component value (e.g., "SB 4 + 2×TB 8 + WPB 4 + Hardy 3 = 19").
5. WHEN the user has set an eMaxOverride value, THE Character_Page SHALL display the override value as the effective wound maximum while still showing the calculated value for reference.
6. FOR ALL valid characteristic combinations, computing wound maximum then displaying the formula breakdown SHALL produce component values that sum to the displayed total (round-trip property).

### Requirement 4: Show Spell Effect Text

**User Story:** As a spellcaster player, I want to see spell effect text without navigating away from the spells table, so that I can quickly reference what my spells do during play.

#### Acceptance Criteria

1. THE Abilities_Tab SHALL render each spell row with an expand/collapse control that reveals the spell effect text.
2. WHEN a user activates the expand control on a spell row, THE Abilities_Tab SHALL display the full effect text from the SpellItem.effect field below the spell's summary row while keeping the summary row visible, showing both summary and effect text together.
3. WHEN a spell row is collapsed, THE Abilities_Tab SHALL display only the spell name, CN, range, target, and duration fields in the summary row.
4. THE Abilities_Tab SHALL support multiple spell rows being expanded simultaneously.

### Requirement 5: Career Skill Highlighting on Abilities Tab

**User Story:** As a player managing advancement, I want my current career skills visually highlighted, so that I can quickly identify which skills are cheaper to advance.

#### Acceptance Criteria

1. WHEN the character has a valid career and career level set, THE Abilities_Tab SHALL apply a gold accent indicator to each skill that appears in the current career level's skill list from the Career_Scheme data.
2. THE Abilities_Tab SHALL apply the career skill indicator as a subtle left border or background tint using the existing accent-gold CSS variable.
3. WHEN the character's career or career level changes, THE Abilities_Tab SHALL update the highlighted skills to reflect the new career level's skill list.
4. WHEN the character has no career set or career data becomes invalid, THE Abilities_Tab SHALL remove all career highlighting immediately and display all skills without any accent indicator.

### Requirement 6: Session Notes UI

**User Story:** As a player, I want to record timestamped session notes in my character sheet, so that I can track events, decisions, and reminders across sessions.

#### Acceptance Criteria

1. THE Notes_Tab SHALL render the character's log field as a chronological list of timestamped entries, with newest entries displayed first.
2. THE Notes_Tab SHALL provide a text input and submit control for adding new entries to the log.
3. WHEN a user submits a new note, THE Notes_Tab SHALL prepend a new entry to the log array with the current timestamp and the entered text.
4. WHEN a user submits a new note, THE Notes_Tab SHALL display the timestamp formatted as a human-readable date and time string.
5. THE Notes_Tab SHALL provide a delete control on each log entry to remove individual entries.
6. IF the log array length is 0, THEN THE Notes_Tab SHALL display an empty state message indicating no notes have been recorded; the empty state SHALL be determined solely by checking the actual array length.

### Requirement 7: Opposed Test Mode

**User Story:** As a player in contested situations, I want to quickly resolve opposed tests against an opponent, so that I can determine the winner of social and combat contests.

#### Acceptance Criteria

1. THE Roll_Dialog SHALL provide an "Opposed Test" toggle that enables opposed test mode.
2. WHEN opposed test mode is active, THE Roll_Dialog SHALL display an input field for the opponent's target number.
3. WHEN an opposed test is executed, THE Roll_Dialog SHALL roll for the player using the standard resolution, generate a separate roll for the opponent using the opponent's target number, and compute the net SL difference.
4. WHEN an opposed test result is displayed, THE Roll_Dialog SHALL show the player's SL, the opponent's SL, the net SL, and the winner (player, opponent, or tie).
5. WHEN net SL is zero, THE Roll_Dialog SHALL resolve the tie by declaring the side with the higher roll value as the winner.
6. FOR ALL combinations of player target and opponent target numbers between 1 and 200, calculating the opposed result SHALL produce a net SL equal to player SL minus opponent SL (metamorphic property).

### Requirement 8: End-of-Turn Button

**User Story:** As a player in active combat, I want an end-of-turn button that processes round-end effects automatically, so that I don't forget per-round condition processing.

#### Acceptance Criteria

1. WHILE the character is in combat, THE Combat_Dashboard SHALL display an "End Turn" button.
2. WHEN the End Turn button is activated, THE Combat_Dashboard SHALL advance the current round counter by 1.
3. WHEN the End Turn button is activated and the character has Bleeding conditions, THE Combat_Dashboard SHALL reduce current wounds by the Bleeding condition level.
4. WHEN the End Turn button is activated and the character has Ablaze conditions, THE Combat_Dashboard SHALL reduce current wounds by the Ablaze condition level.
5. WHEN the End Turn button is activated and the character has Stunned or Surprised conditions, THE Combat_Dashboard SHALL automatically remove those conditions.
6. WHEN the End Turn button is activated, THE Combat_Dashboard SHALL display a summary of all automated effects applied during that end-of-turn processing.
7. WHEN wound reduction from end-of-turn effects would reduce wounds below 0, THE Combat_Dashboard SHALL floor wounds at 0.
8. WHEN current wounds are already at 0, THE Combat_Dashboard SHALL skip all condition damage processing entirely (Bleeding and Ablaze effects are not applied).

### Requirement 9: Auto-Calculate AP from Worn Armour

**User Story:** As a player, I want my armour points per location calculated automatically from my equipped armour, so that I always have accurate AP values during damage resolution.

#### Acceptance Criteria

1. THE Character_Page SHALL compute AP per body location (head, left arm, right arm, body, left leg, right leg) by summing the AP values of all armour items marked as worn that cover each respective location.
2. WHEN an armour item's locations field contains a body location identifier, THE Character_Page SHALL include that armour item's AP value in the computed total for that location.
3. THE Character_Page SHALL display the computed AP values alongside the current manual AP fields.
4. WHEN computed AP differs from the manually entered AP in either direction (computed higher or lower), THE Character_Page SHALL visually indicate the discrepancy showing all differences regardless of direction.
5. THE Character_Page SHALL provide a control to sync manual AP values to the computed values.
6. FOR ALL combinations of worn armour items, the sum of AP for each location SHALL equal the total of individual armour AP values covering that location (invariant property).

### Requirement 10: Consumables and Herbs Inventory

**User Story:** As a player, I want a dose-tracked consumables list, so that I can track healing draughts, antidotes, and other limited-use items during play.

#### Acceptance Criteria

1. THE Character_Page SHALL provide a consumables section displaying items with name, current doses, maximum doses, and effect text.
2. THE Character_Page SHALL provide controls to increment and decrement the current dose count for each consumable.
3. WHEN a consumable's current doses reach 0, THE Character_Page SHALL visually indicate the item as depleted.
4. THE Character_Page SHALL provide a control to add new consumable items with name, max doses, and effect text fields.
5. THE Character_Page SHALL provide a control to remove consumable items from the list.
6. WHEN a consumable's dose count is decremented, THE Character_Page SHALL floor the value at 0.
7. WHEN a consumable's dose count is incremented, THE Character_Page SHALL cap the value at the maximum doses.

### Requirement 11: Psychology Traits Tracker

**User Story:** As a player with psychological conditions, I want a dedicated section to track my character's psychology traits with targets and mechanical reminders, so that I correctly apply them during roleplay.

#### Acceptance Criteria

1. THE Character_Page SHALL provide a psychology traits section listing each trait with its type, target/rating specification, and mechanical reminder text.
2. THE Character_Page SHALL support the following psychology trait types: Animosity, Hatred, Fear, Terror, Frenzy, and Prejudice.
3. WHEN adding a new psychology trait, THE Character_Page SHALL require all fields (type, target/rating) to be filled before allowing the trait to be added.
4. FOR Fear and Terror traits, THE Character_Page SHALL accept a numeric rating value.
5. FOR Animosity, Hatred, and Prejudice traits, THE Character_Page SHALL accept a text target specification (e.g., "Greenskins", "Undead").
6. THE Character_Page SHALL display a brief mechanical reminder for each trait type (e.g., Fear: "Must pass Cool Test or gain Broken condition").
7. THE Character_Page SHALL provide controls to remove psychology traits from the list.

### Requirement 12: CurrencyInput on Estate Page

**User Story:** As a player managing finances, I want to use the freeform currency input component for estate treasury and property fields, so that currency entry is consistent and efficient across the application.

#### Acceptance Criteria

1. THE Estate_Page SHALL use the Currency_Input component for modifying the estate treasury balance.
2. THE Estate_Page SHALL use the Currency_Input component for modifying property monthly income and monthly expense fields.
3. WHEN a currency delta is submitted via Currency_Input on the estate treasury, THE Estate_Page SHALL validate that the delta would not create an invalid state (e.g., negative treasury balance) and reject invalid deltas with a validation message; valid deltas SHALL be applied to the current treasury balance (adding positive values, subtracting negative values).
4. WHEN a currency delta is submitted via Currency_Input on a property income field, THE Estate_Page SHALL update that property's monthly income values.

### Requirement 13: Wound Threshold Visual Escalation

**User Story:** As a player in combat, I want escalating visual indicators as my wounds decrease, so that I have clear urgency cues without reading exact numbers.

#### Acceptance Criteria

1. WHILE current wounds are above 50% of wound maximum, THE Combat_Dashboard SHALL display the wound indicator in the default healthy state.
2. WHILE current wounds are at or below 50% but above 25% of wound maximum, THE Combat_Dashboard SHALL display a caution indicator with a warning color and cautionary icon (higher wound values represent more remaining health; wCur is current remaining wounds, not damage taken).
3. WHILE current wounds are at or below 25% but above 0, THE Combat_Dashboard SHALL display a danger indicator with a pulsing animation and danger color.
4. WHILE current wounds are at 0, THE Combat_Dashboard SHALL display a critical indicator with a skull or critical icon and the most urgent visual treatment.
5. THE Combat_Dashboard SHALL transition between wound threshold states using CSS animations lasting between 200ms and 400ms.

### Requirement 14: Transitions on State Changes

**User Story:** As a player, I want smooth visual transitions when combat values change, so that updates feel polished rather than jarring.

#### Acceptance Criteria

1. WHEN the wound count changes, THE Combat_Dashboard SHALL animate the wound number transition over 200-300ms using CSS transitions.
2. WHEN the advantage count changes, THE Combat_Dashboard SHALL animate the advantage number transition over 200-300ms using CSS transitions.
3. WHEN a condition badge is added, THE Combat_Dashboard SHALL animate the badge appearing with a fade-in and scale transition over 200-300ms.
4. WHEN a condition badge is removed, THE Combat_Dashboard SHALL animate the badge disappearing with a fade-out transition over 200-300ms.
5. WHEN a user has prefers-reduced-motion enabled, THE Combat_Dashboard SHALL suppress all state change animations and apply changes instantly; reduced-motion always takes precedence over individual animation requirements in this specification.

### Requirement 15: Condition Badges with Effect Text

**User Story:** As a player, I want to see condition mechanical effects without opening a full tooltip, so that I can quickly recall what each condition does.

#### Acceptance Criteria

1. WHEN a user hovers over a Condition_Badge on desktop, THE Combat_Dashboard SHALL display the condition's brief mechanical effect text (from the effects field) as an inline tooltip.
2. WHEN a user taps a Condition_Badge on mobile, THE Combat_Dashboard SHALL display the condition's brief mechanical effect text as an inline expansion below the badge.
3. THE Combat_Dashboard SHALL display the effect text in a compact format limited to one line of text with overflow truncated.
4. THE Combat_Dashboard SHALL display the effect text within 100ms of the hover/tap interaction.

### Requirement 16: Haptic Feedback on Dice Rolls

**User Story:** As a mobile player, I want brief vibration feedback when I roll dice, so that the roll feels tactile and satisfying.

#### Acceptance Criteria

1. WHEN a dice roll is executed on a device supporting the Vibration API, THE Roll_Dialog SHALL trigger a 50ms vibration pulse via navigator.vibrate(50); WHEN the Roll_Result has isCritical equal to true, the critical-specific pattern [50, 30, 50] SHALL be used instead of the standard 50ms pulse; WHEN the Roll_Result has isFumble equal to true, only the fumble-specific 100ms vibration SHALL be used, overriding the standard vibration.
2. IF the device does not support the Vibration API (navigator.vibrate is undefined), THEN THE Roll_Dialog SHALL skip all vibration calls without throwing an error regardless of roll type (standard, critical, or fumble).
3. WHEN a Roll_Result has isCritical equal to true on a supported device, THE Roll_Dialog SHALL trigger only the double vibration pattern [50, 30, 50] for emphasis.
4. WHEN a Roll_Result has isFumble equal to true on a supported device, THE Roll_Dialog SHALL trigger only the longer single vibration of 100ms.

### Requirement 17: Offline Indicator

**User Story:** As a player using the PWA without internet, I want a visible offline indicator, so that I know my data is being stored locally and will persist.

#### Acceptance Criteria

1. WHEN the PWA loses network connectivity (navigator.onLine is false or the 'offline' event fires), THE PWA SHALL display a small "Offline" indicator chip in a consistent, non-intrusive location.
2. WHEN network connectivity is restored (the 'online' event fires) or navigator.onLine is true, THE PWA SHALL hide the offline indicator within 1 second regardless of pending event state.
3. THE PWA SHALL position the offline indicator so it does not obscure interactive content or navigation elements.
4. WHEN the application loads in an offline state, THE PWA SHALL display the offline indicator immediately on initial render.

### Requirement 18: Roll History Persistence

**User Story:** As a player, I want my recent roll history to survive page refreshes, so that I can reference past rolls after accidental navigation or app restart.

#### Acceptance Criteria

1. THE Roll_Dialog SHALL persist the most recent 50 roll results to localStorage.
2. WHEN the application loads, THE Roll_Dialog SHALL restore roll history from localStorage if available.
3. WHEN a new roll result is added and the history exceeds 50 entries, THE Roll_Dialog SHALL remove the oldest entry to maintain the 50-entry limit.
4. THE Roll_Dialog SHALL provide a "Clear History" control that removes all persisted roll history from localStorage and the in-memory list.
5. FOR ALL sequences of roll additions and page reloads, the persisted history SHALL contain the most recent 50 rolls in chronological order (invariant property).

### Requirement 19: Initiative and Turn Order Tracker

**User Story:** As a player in combat, I want a simple initiative list to track turn order, so that I know whose turn it is without a separate tool.

#### Acceptance Criteria

1. THE Combat_Dashboard SHALL provide an initiative tracker section that displays a sorted list of combatants.
2. THE Combat_Dashboard SHALL provide controls to add combatants with a name and initiative value.
3. THE Combat_Dashboard SHALL sort combatants in descending order by initiative value (highest initiative acts first).
4. THE Combat_Dashboard SHALL visually highlight the currently active combatant in the initiative order.
5. THE Combat_Dashboard SHALL provide a "Next Turn" control that advances the active combatant indicator to the next in order, wrapping to the first combatant after the last.
6. THE Combat_Dashboard SHALL provide controls to remove individual combatants from the initiative list.
7. WHEN combat ends (inCombat becomes false), THE Combat_Dashboard SHALL clear the initiative list immediately and unconditionally.
8. FOR ALL lists of combatants with distinct initiative values, sorting by initiative descending SHALL produce a sequence where each combatant's initiative is less than or equal to the previous (invariant property).

### Requirement 20: Two-Weapon Fighting Support

**User Story:** As a player with two weapons, I want the attack flow to support off-hand attacks with the correct penalties, so that I can use dual-wielding rules without manual calculation.

#### Acceptance Criteria

1. THE Attack_Flow SHALL provide an "Off-Hand" toggle that applies a −20 modifier to the attack roll target number.
2. WHEN the character has the Dual Wielder talent, THE Attack_Flow SHALL reduce the off-hand penalty from −20 to −0 (talent negates the penalty).
3. WHEN the Off-Hand toggle is active, THE Attack_Flow SHALL display the modified target number reflecting the −20 penalty (or reduced penalty with Dual Wielder).
4. THE Attack_Flow SHALL allow executing a second attack in the same step sequence after completing the first attack, enabling two-weapon fighting within a single round.
5. WHEN the character does not have the Dual Wielder talent and Off-Hand is toggled, THE Attack_Flow SHALL display a reminder that the off-hand penalty applies; WHEN the character has the Dual Wielder talent, THE Attack_Flow SHALL NOT display the off-hand penalty reminder.

### Requirement 21: Ledger Transaction History on Estate Page

**User Story:** As a player managing finances, I want to see a chronological transaction history on the estate page, so that I can track income and expenses over time.

#### Acceptance Criteria

1. THE Estate_Page SHALL render the estate's ledger field as a chronological list of transaction entries, with newest entries displayed first.
2. THE Estate_Page SHALL display each ledger entry showing: timestamp (formatted as date), description, amount (in GC/SS/D format), and transaction type (income or expense).
3. THE Estate_Page SHALL provide an entry form for adding new ledger entries with fields: description, amount (GC, SS, D), and type (income/expense); the form SHALL validate that the amount is positive (greater than zero) and reject zero-amount entries with a validation message.
4. WHEN a new ledger entry is submitted, THE Estate_Page SHALL add the entry to the ledger array with the current timestamp.
5. WHEN a new income entry is submitted, THE Estate_Page SHALL add the amount to the estate treasury balance.
6. WHEN a new expense entry is submitted, THE Estate_Page SHALL subtract the amount from the estate treasury balance.
7. THE Estate_Page SHALL provide a control to delete individual ledger entries.

### Requirement 22: Skill Search and Filter on Abilities Tab

**User Story:** As a player with many skills, I want to quickly filter the skills table by name, so that I can find specific skills without scrolling through the entire list.

#### Acceptance Criteria

1. THE Abilities_Tab SHALL display a text filter input above the skills table.
2. WHEN the user types in the filter input, THE Abilities_Tab SHALL filter both basic and advanced skill lists in real time to show only skills whose names contain the entered text (case-insensitive).
3. THE Abilities_Tab SHALL provide a "Trained Only" toggle that filters the displayed skills to show only skills with advances greater than 0.
4. WHEN both the text filter and "Trained Only" toggle are active, THE Abilities_Tab SHALL apply both filters simultaneously (intersection) — displaying all skills that meet both criteria; if a skill is trained and its name matches the filter text, it must be shown.
5. WHEN the filter input is cleared, THE Abilities_Tab SHALL display all skills without filtering.
6. FOR ALL filter text inputs, the filtered results SHALL be a subset of the unfiltered skill list and every displayed skill SHALL contain the filter text in its name (invariant property).
