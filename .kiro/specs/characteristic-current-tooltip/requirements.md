# Requirements Document

## Introduction

Add a breakdown tooltip to the "Current" column values in the Characteristics panel on the Character page (Identity tab). When a user hovers or clicks on a Current value, a tooltip appears showing how that total was calculated from its component parts: Initial value, Advances, and Talent Bonus.

## Glossary

- **Characteristics_Panel**: The grid on the Identity tab of the Character page displaying the 10 WFRP4e characteristics (WS, BS, S, T, I, Ag, Dex, Int, WP, Fel) with columns for Initial, Advance, Current, CB, and T. Bonus.
- **Current_Value**: The computed total for a characteristic, equal to Initial + Advances + Talent Bonus (stored as `chars[key].i + chars[key].a + chars[key].b`).
- **Tooltip**: The existing shared Tooltip component used across the application, rendered as a portal with `role="tooltip"`, positioned relative to an anchor element, and dismissible via Escape or clicking outside.
- **Talent_Bonus**: The bonus value (`b` field) applied to a characteristic from talents such as "Warrior Born" (+5 WS), "Marksman" (+5 BS), etc., synced via `syncTalentBonuses`.
- **Characteristic_Key**: One of the 10 WFRP4e characteristic abbreviations: WS, BS, S, T, I, Ag, Dex, Int, WP, Fel.

## Requirements

### Requirement 1: Display Breakdown Tooltip on Current Value Interaction

**User Story:** As a player, I want to see how my characteristic's Current value is calculated, so that I can understand the contribution of my initial roll, advances, and talent bonuses at a glance.

#### Acceptance Criteria

1. WHEN the user clicks on a Current_Value cell in the Characteristics_Panel, THE Tooltip SHALL appear anchored to that cell showing the calculation breakdown.
2. WHEN the user hovers over a Current_Value cell for 300 milliseconds or more, THE Tooltip SHALL appear anchored to that cell showing the calculation breakdown.
3. THE Tooltip SHALL display the Characteristic_Key full name as its title (e.g., "Weapon Skill").
4. THE Tooltip SHALL display the breakdown as labeled rows: "Initial: {i}", "Advances: {a}", "Talent Bonus: {b}" followed by "Total: {current}".
5. WHILE a Talent_Bonus value is zero for a given characteristic, THE Tooltip SHALL omit the "Talent Bonus" row from the breakdown.
6. WHILE a Talent_Bonus value is greater than zero for a given characteristic, THE Tooltip SHALL display the contributing talent name alongside the bonus value (e.g., "Talent Bonus: +5 (Warrior Born)").

### Requirement 2: Tooltip Dismiss Behaviour

**User Story:** As a player, I want to dismiss the breakdown tooltip easily, so that it does not obstruct my view of the character sheet.

#### Acceptance Criteria

1. WHEN the user presses the Escape key while a Current_Value Tooltip is visible, THE Tooltip SHALL close.
2. WHEN the user clicks outside the Current_Value Tooltip, THE Tooltip SHALL close.
3. WHEN the user clicks on a different Current_Value cell while a Tooltip is already open, THE Characteristics_Panel SHALL close the first Tooltip and open a new one for the clicked cell.
4. WHEN the user moves the mouse away from both the Current_Value cell and the Tooltip, THE Tooltip SHALL close after a 200 millisecond delay.

### Requirement 3: Accessibility Compliance

**User Story:** As a player using assistive technology, I want the breakdown tooltip to be accessible, so that I can understand my characteristic totals using a screen reader or keyboard navigation.

#### Acceptance Criteria

1. THE Tooltip SHALL have `role="tooltip"` and a unique `id` attribute following the pattern "tooltip-char-{key}" (e.g., "tooltip-char-WS").
2. THE Current_Value cell SHALL have an `aria-describedby` attribute referencing the Tooltip id while the Tooltip is visible.
3. WHEN the Tooltip opens, THE Tooltip SHALL receive programmatic focus.
4. THE Current_Value cell SHALL be keyboard-focusable (via `tabIndex={0}`) to allow keyboard users to trigger the Tooltip.
5. WHEN the user presses Enter or Space on a focused Current_Value cell, THE Tooltip SHALL open.

### Requirement 4: Responsive Behaviour

**User Story:** As a player using a mobile device, I want the breakdown tooltip to work via tap, so that I can view the calculation without needing a hover interaction.

#### Acceptance Criteria

1. WHEN the user taps a Current_Value cell on a touch device, THE Tooltip SHALL appear showing the breakdown.
2. WHEN the user taps outside the Tooltip on a touch device, THE Tooltip SHALL close.
3. THE Tooltip SHALL remain fully visible within the viewport, repositioning if necessary to avoid overflow.
