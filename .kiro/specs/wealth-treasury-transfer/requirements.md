# Requirements Document

## Introduction

This feature lets a player move coin between a character's personal Wealth (the purse tracked on the Character page "Gear & Wealth" tab) and the estate Treasury (tracked on the Holdings & Wealth page "Wealth & Finances" tab), in both directions. A **deposit** moves coin from personal Wealth into the Treasury; a **withdrawal** moves coin from the Treasury into personal Wealth. Transfers operate per denomination (Gold Crowns, Silver Shillings, Brass Pennies) with no conversion between denominations. Each transfer is recorded in both the estate Financial Ledger and the unified event log, blocks any move that would overdraw the source pool, and updates the personal coin encumbrance that follows from carried coin.

This is bookkeeping over the player's own coin between two pools the character already controls. No new WFRP4e game mechanic is introduced. The two rulebook-relevant behaviours that this feature touches — coin encumbrance and the absence of automatic denomination conversion — are preserved from existing logic rather than redefined (see Requirement 5 and Requirement 4).

## Glossary

- **Personal_Wealth**: The character's purse, stored as `character.wGC`, `character.wSS`, `character.wD` (Gold Crowns, Silver Shillings, Brass Pennies). Displayed and edited in the Character page coin section. Displayed to the player as "Coin Purse (carried)" (the coin section heading) and "Coin Purse" (the transfer preview pool label); the identifier Personal_Wealth is retained internally, and the data fields `wGC`/`wSS`/`wD` are unchanged.
- **Treasury**: The estate coin store, stored as `character.estate.treasury.{gc, ss, d}`. Displayed and edited in the Estate page "Wealth & Finances" sub-tab "Treasury" panel.
- **Transfer_Service**: The pure logic that validates and computes a coin movement between two coin pools, returning the two resulting balances or a failure. Intended to live in `src/logic/currency.ts` as a `transferFunds` helper.
- **Deposit**: A transfer whose source is Personal_Wealth and whose destination is Treasury.
- **Withdrawal**: A transfer whose source is Treasury and whose destination is Personal_Wealth.
- **Source_Pool**: The coin pool a transfer draws coin from (Personal_Wealth for a Deposit, Treasury for a Withdrawal).
- **Destination_Pool**: The coin pool a transfer adds coin to (Treasury for a Deposit, Personal_Wealth for a Withdrawal).
- **Denomination**: One of Gold Crowns (GC), Silver Shillings (SS), or Brass Pennies (D).
- **Currency_Delta**: A per-denomination amount `{ gc, ss, d }` (the existing `CurrencyDelta` type).
- **Financial_Ledger**: The estate ledger stored in `character.estate.ledger`, an ordered list of `LedgerEntry` records (`type`, `description`, `amount`, `timestamp`).
- **Event_Log**: The unified event log stored in `character.eventLog`, appended to via `appendEvent`. Wealth changes use the `wealth` category.
- **Deposit_Control**: The UI affordance in the Character page "Wealth" section that initiates a Deposit.
- **Withdraw_Control**: The UI affordance in the Estate page "Treasury" panel that initiates a Withdrawal.
- **Coin_Encumbrance**: The Encumbrance contribution from carried personal coin, computed by `calculateCoinWeight(wGC, wSS, wD)` as `floor((gc + ss + d) / 200)`. Only Personal_Wealth contributes to Coin_Encumbrance; Treasury does not.

## Requirements

### Requirement 1: Deposit coin from Personal Wealth to Treasury

**User Story:** As a player, I want to deposit coin from my character's purse into the estate treasury, so that I can bank money I do not want to carry.

#### Acceptance Criteria

1. THE Character_Page SHALL display a Deposit_Control in the "Wealth" section.
2. WHEN a player submits a Deposit of a Currency_Delta that the Personal_Wealth can cover in every Denomination, THE Transfer_Service SHALL subtract that Currency_Delta from Personal_Wealth per Denomination and add the same Currency_Delta to Treasury per Denomination.
3. WHEN a Deposit is applied, THE System SHALL persist the updated Personal_Wealth and Treasury balances to the character in a single update.
4. IF a submitted Deposit would reduce any Denomination of Personal_Wealth below zero, THEN THE System SHALL block the Deposit, leave both Personal_Wealth and Treasury unchanged, and display an inline error in the "Wealth" section.

### Requirement 2: Withdraw coin from Treasury to Personal Wealth

**User Story:** As a player, I want to withdraw coin from the estate treasury into my character's purse, so that I can spend or carry money the estate is holding.

#### Acceptance Criteria

1. THE Estate_Page SHALL display a Withdraw_Control in the "Treasury" panel.
2. WHEN a player submits a Withdrawal of a Currency_Delta that the Treasury can cover in every Denomination, THE Transfer_Service SHALL subtract that Currency_Delta from Treasury per Denomination and add the same Currency_Delta to Personal_Wealth per Denomination.
3. WHEN a Withdrawal is applied, THE System SHALL persist the updated Treasury and Personal_Wealth balances to the character in a single update.
4. IF a submitted Withdrawal would reduce any Denomination of Treasury below zero, THEN THE System SHALL block the Withdrawal, leave both Treasury and Personal_Wealth unchanged, and display an inline error in the "Treasury" panel.

### Requirement 3: Record every transfer in the ledger and event log

**User Story:** As a player, I want each transfer logged, so that I have an auditable history of money moving between my purse and the estate treasury.

#### Acceptance Criteria

1. WHEN a Deposit is applied, THE System SHALL append one LedgerEntry to the Financial_Ledger recording the Currency_Delta moved and identifying the entry as a transfer from Personal_Wealth to Treasury.
2. WHEN a Withdrawal is applied, THE System SHALL append one LedgerEntry to the Financial_Ledger recording the Currency_Delta moved and identifying the entry as a transfer from Treasury to Personal_Wealth.
3. WHEN a transfer is applied, THE System SHALL append one Event_Log event in the `wealth` category recording the Currency_Delta moved and the transfer direction.
4. IF a transfer is blocked for insufficient funds, THEN THE System SHALL append no LedgerEntry and no Event_Log event.

### Requirement 4: Move each denomination independently

**User Story:** As a player, I want transfers to move Gold Crowns, Silver Shillings, and Brass Pennies independently, so that the app does not silently convert my coin.

#### Acceptance Criteria

1. WHEN a transfer is applied, THE Transfer_Service SHALL move the Gold Crowns amount, the Silver Shillings amount, and the Brass Pennies amount independently, changing each Denomination only by the amount specified for that Denomination.
2. THE Transfer_Service SHALL NOT convert coin between Denominations during a transfer.

### Requirement 5: Reflect transferred coin in personal encumbrance

**User Story:** As a player, I want my carried coin weight to update when I transfer coin, so that my Encumbrance stays accurate.

#### Acceptance Criteria

1. WHEN a Deposit or Withdrawal changes Personal_Wealth, THE System SHALL recompute Coin_Encumbrance from the updated Personal_Wealth using `calculateCoinWeight`.
2. THE System SHALL exclude Treasury balances from Coin_Encumbrance.

### Requirement 6: Validate and preview transfer amounts

**User Story:** As a player, I want the transfer input to behave like the existing currency controls and show me the result, so that I can enter amounts confidently.

#### Acceptance Criteria

1. WHILE a player is entering a transfer amount, THE System SHALL parse the current amount into a Currency_Delta using the existing currency input parsing.
2. THE System SHALL display, for each Denomination, the resulting Source_Pool balance and Destination_Pool balance that a valid transfer would produce.
3. WHERE a resulting balance is displayed, THE System SHALL provide a tooltip showing the breakdown of that balance in the form `current +/- transferred = result`.
4. IF a player submits a transfer amount that parses to zero in every Denomination, THEN THE System SHALL block the transfer and leave both pools unchanged.

### Requirement 7: Apply each transfer atomically

**User Story:** As a player, I want a transfer to update both pools, the ledger, and the log together, so that my records never show a half-completed transfer.

#### Acceptance Criteria

1. WHEN a transfer is applied, THE System SHALL update Personal_Wealth, Treasury, the Financial_Ledger, and the Event_Log within a single character mutation.
2. IF a transfer is blocked, THEN THE System SHALL leave Personal_Wealth, Treasury, the Financial_Ledger, and the Event_Log unchanged.

### Requirement 8: Player-facing coin-purse labelling

**User Story:** As a player, I want the personal-coin section labelled as a carried coin purse, so that I understand this money is on my character's person.

#### Acceptance Criteria

1. THE Character_Page SHALL title the Personal_Wealth coin section "Coin Purse (carried)".
2. WHERE the Deposit_Control preview labels the Personal_Wealth pool, THE Deposit_Control SHALL label that pool "Coin Purse".
3. WHERE the Withdraw_Control preview labels the Personal_Wealth pool, THE Withdraw_Control SHALL label that pool "Coin Purse".
4. IF a Deposit is blocked for insufficient funds, THEN THE Deposit_Control SHALL refer to the Personal_Wealth pool as "Coin Purse" in the inline error.
5. THE System SHALL apply these labels as display text only, leaving the Personal_Wealth identifier and the `wGC`/`wSS`/`wD` data fields unchanged.
