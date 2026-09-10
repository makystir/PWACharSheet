# Implementation Plan: Wealth Treasury Transfer

## Overview

This plan adds bidirectional coin transfers between a character's Personal Wealth (`wGC/wSS/wD`) and the estate Treasury (`estate.treasury.{gc,ss,d}`), per denomination with no conversion. Work proceeds from the pure logic (`transferFunds` in `src/logic/currency.ts`) and its property/example tests, through a shared `TransferControl` component, then outward to the UI wiring in `CharacterPage.tsx` (Deposit) and `EstatePage.tsx` (Withdraw), each with render tests. Property-based tests (fast-check, 100+ iterations) validate the 5 correctness properties; render/example tests cover UI presentation, atomic persistence + logging, and coin-encumbrance recompute. Each step builds on the previous one and ends wired into a consumer so no orphaned code remains.

## Tasks

- [x] 1. Add the pure `transferFunds` helper to `src/logic/currency.ts`
  - Add `TransferFailureReason` (`'zero-amount' | 'insufficient-funds'`) and the discriminated `TransferResult` type.
  - Implement `transferFunds(source, destination, amount)`: reject zero total (reuse `isValidLedgerAmount` semantics) before checking coverage; reject when `source` cannot cover `amount` in any denomination (reuse `validateTreasuryDelta` with a negated amount); on success return `source − amount` and `destination + amount` per denomination via `applyCurrencyDelta`. Keep it pure (no argument mutation).
  - Add a code comment citing Core p.293 (coin weight preserved; no auto denomination conversion) per rules-compliance.
  - _Requirements: 1.2, 1.4, 2.2, 2.4, 4.1, 4.2, 6.4_

- [x] 2. Property tests for `transferFunds` (`src/logic/__tests__/transfer-funds.property.test.ts`)
  - Reuse the `CurrencyDelta` arbitraries style from `ledger-currency.property.test.ts`; ≥100 runs each; tag each `Feature: wealth-treasury-transfer, Property {n}: {text}`.
  - [x] 2.1 Property 1 — successful transfer subtracts from source, adds to destination, conserves per-denomination total (both directions).
    - _Requirements: 1.2, 2.2_
  - [x] 2.2 Property 2 — each denomination moves independently; no cross-denomination conversion.
    - _Requirements: 4.1, 4.2_
  - [x] 2.3 Property 3 — insufficient funds → `ok:false` reason `'insufficient-funds'`, inputs unchanged.
    - _Requirements: 1.4, 2.4_
  - [x] 2.4 Property 4 — zero-total amount → `ok:false` reason `'zero-amount'`, inputs unchanged.
    - _Requirements: 6.4_
  - [x] 2.5 Property 5 — deposit then withdraw the same amount restores both pools (round-trip identity).
    - _Requirements: 1.2, 2.2, 4.1_

- [x] 3. Example/unit tests for `transferFunds`
  - Exact-balance transfer (source hits zero), single-denomination transfer, and zero-and-over precedence (zero-check wins → `'zero-amount'`).
  - _Requirements: 1.4, 6.4_

- [x] 4. Checkpoint — run `transferFunds` tests
  - Run the currency logic tests (`vitest --run`) and fix any failures before touching UI. Confirm no regressions in existing `currency.property.test.ts` / `ledger-currency.property.test.ts`.
  - _Requirements: 1.2, 1.4, 2.2, 2.4, 4.1, 4.2, 6.4_

- [x] 5. Build the shared `TransferControl` component (`src/components/shared/TransferControl.tsx`)
  - Props: `direction`, `source`, `destination`, `labels`, `onSubmit`, `error`.
  - Parse the amount with `parseCurrencyInput` on change (Req 6.1); compute preview via `transferFunds`; render per-denomination resulting source & destination balances (Req 6.2).
  - Wrap each resulting balance in `TooltipTriggerCell` + `Tooltip`; tooltip body shows `current +/- transferred = result` with all components including zeros (Req 6.3, calculated-total-tooltips steering; reuse shared `Tooltip`).
  - Render inline `error` via `role="alert"`; ensure input, submit button, and tooltip cells are ≥44px touch targets (ui-layout steering).
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. Render tests for `TransferControl` (`src/components/shared/__tests__/TransferControl.*.test.tsx`)
  - Parses via `parseCurrencyInput`; invalid input does not call `onSubmit`; preview equals `transferFunds` output; tooltip shows the additive breakdown; touch targets ≥44px.
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Wire the Deposit_Control into `CharacterPage` Wealth section
  - Add an `applyTransfer('deposit', amount)` handler and inline error state; mount `TransferControl` (direction `deposit`, source = personal wealth, destination = `estate.treasury`) under the existing `CurrencyInput` in the `<SectionHeader icon={Coins} title="Wealth" />` block.
  - On success perform a single `updateCharacter` mutation writing `wGC/wSS/wD` + `estate.treasury`, appending one `income` `LedgerEntry` ("Transfer: Personal Wealth → Treasury"), then `mirrorLedger` for the `wealth` event. On failure set the inline error and mutate nothing.
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.3, 3.4, 7.1, 7.2_

- [x] 8. Wire the Withdraw_Control into `EstatePage` Treasury panel
  - Add an `applyTransfer('withdraw', amount)` handler reusing the existing `treasuryError` state pattern; mount `TransferControl` (direction `withdraw`, source = `estate.treasury`, destination = personal wealth) in the `treasuryPanel` block beside the existing `CurrencyInput`.
  - On success perform a single `updateCharacter` mutation writing `estate.treasury` + `wGC/wSS/wD`, appending one `expense` `LedgerEntry` ("Transfer: Treasury → Personal Wealth"), then `mirrorLedger`. On failure set the Treasury-panel error and mutate nothing.
  - _Requirements: 2.1, 2.2, 2.3, 3.2, 3.3, 3.4, 7.1, 7.2_

- [x] 9. Render tests for Deposit_Control on `CharacterPage`
  - Control present in Wealth section; valid deposit → single mutation lowers wealth, raises treasury, +1 `income` ledger entry, +1 `wealth` event; over-amount → inline error and no change to any of the four artefacts; preview + tooltip breakdown correct; coin weight after deposit equals `calculateCoinWeight(newWealth)` and treasury-only changes don't affect it.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.3, 3.4, 5.1, 5.2, 6.2, 6.3, 7.1, 7.2_

- [x] 10. Render tests for Withdraw_Control on `EstatePage`
  - Control present in Treasury panel; valid withdrawal → single mutation lowers treasury, raises wealth, +1 `expense` ledger entry, +1 `wealth` event; over-amount and zero-amount → inline error and no change; preview + tooltip breakdown correct.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 6.2, 6.3, 6.4, 7.1, 7.2_

- [x] 11. Final checkpoint — full verification
  - Run `vitest --run`, `tsc`, and lint; fix any failures or type/lint errors introduced (fix-errors steering). Confirm the new controls render on both pages and existing wealth/ledger tests still pass.
  - _Requirements: 1.1, 2.1, 5.1, 5.2, 7.1, 7.2_

## Notes

- Each task references specific requirements (granular clauses) for traceability.
- All new game logic cites Core p.293 (coin weight preserved at 1 Enc per 200 coins; no automatic denomination conversion) in code comments per the rules-compliance steering; `transferFunds` introduces no new mechanic and composes existing validated helpers.
- Property-based tests use `fast-check`, run ≥100 iterations, and are tagged `// Feature: wealth-treasury-transfer, Property N: ...`.
- The `TransferControl` preview breakdowns follow the calculated-totals steering rule using the shared `Tooltip` component (`current +/- transferred = result`, including zero components).
- Each correctness property (1–5) maps to exactly one property-based test (tasks 2.1–2.5).
- Tasks 4 and 11 are checkpoints: run the relevant tests / full verification and pause if questions arise before continuing.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "3"] },
    { "id": 2, "tasks": ["4"] },
    { "id": 3, "tasks": ["5"] },
    { "id": 4, "tasks": ["6"] },
    { "id": 5, "tasks": ["7", "8"] },
    { "id": 6, "tasks": ["9", "10"] },
    { "id": 7, "tasks": ["11"] }
  ]
}
```
