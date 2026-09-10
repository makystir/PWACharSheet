# Implementation Plan: Money Locations Clarity

## Overview

This plan implements a **display-label and information-architecture change only** — no new data model, logic, or game mechanic. It renames three UI labels (the Character gear sub-tab, the Estate nav item + its sub-tab hint, and the Estate money sub-tab), adds two small static cross-reference hints (Coin Purse → Treasury on the Character page, Treasury → Coin Purse on the Estate page), and updates one Settings terminology string for consistency. Work proceeds across the five verified touch-points (all independent string edits or small static nodes), then updates the existing tests that assert the old labels, adds new render/label + id-stability tests, and finishes with a verification checkpoint. All routing keys, section/sub-tab ids, the `#estate` hash route, and the `wGC`/`wSS`/`wD`/`estate.treasury` data fields are preserved (Req 7). Because the change is pure label/presence work over React components, property-based testing does not apply; the Testing Strategy uses render/label and id-stability assertions.

## Tasks

- [x] 1. Rename the Character gear sub-tab label to "Gear"
  - In `src/components/pages/CharacterPage.tsx`, in the `defaultTabs` array passed to `useTabOrder`, change `{ id: 'gear', label: 'Gear & Wealth' }` to `{ id: 'gear', label: 'Gear' }`.
  - Keep the `id: 'gear'` unchanged (routing-key stability).
  - Optionally tidy the stale `{/* ═══ GEAR & WEALTH ═══ */}` section comment banner (comment only, not display text).
  - _Requirements: 1.1, 1.2, 1.3, 7.2, 7.7_

- [x] 2. Rename the Estate navigation item label and sub-tab hint
  - In `src/components/layout/Navigation.tsx`, in `NAV_ITEMS`, change the estate entry `label` from `'Holdings & Wealth'` to `'Estate'` and `subTabHint` from `'Estate · Holdings · Wealth'` to `'Estate · Holdings · Treasury · Finances'`.
  - Keep `id: 'estate'`, `shortcut: '4'`, and `icon: Landmark` unchanged (routing-key stability; the `#estate` hash route derives from the id and is unaffected).
  - Update the existing comment referencing the Navigation spec's Req 16.x rationale to note this spec supersedes the display text while preserving the same routing-key-stability guarantee.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 6.3, 7.1, 7.3, 7.7_

- [x] 3. Rename the Estate money sub-tab label to "Treasury & Finances"
  - In `src/components/pages/EstatePage.tsx`, in the `defaultTabsList` `useMemo`, change `{ id: 'wealth', label: 'Wealth & Finances' }` to `{ id: 'wealth', label: 'Treasury & Finances' }`.
  - Keep the `id: 'wealth'` unchanged (routing-key stability).
  - _Requirements: 3.1, 3.2, 3.3, 6.2, 6.3, 7.2, 7.7_

- [x] 4. Add the Coin Purse → Treasury cross-reference hint
  - In `src/components/pages/CharacterPage.tsx`, inside the "Coin Purse (carried)" card, near the deposit `TransferControl`, add a static muted `<p>` with the copy `"Estate funds are stored in the Treasury (Estate page)."`.
  - Render it unconditionally (Design Decision 1 — `character.estate` is always present).
  - Add a small `.crossRefHint` class to `src/components/pages/CharacterPage.module.css` mirroring the existing muted-caption idiom (small font, `color: var(--text-muted)`, e.g. like `.woundFormulaCalculated`).
  - Do not change the `"Coin Purse (carried)"` card title.
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 7.7_

- [x] 5. Add the Treasury → Coin Purse cross-reference hint
  - In `src/components/pages/EstatePage.tsx`, inside the `styles.treasuryPanel` block, near the withdraw `TransferControl`, add a static muted `<p>` with the copy `"Carried coin is stored in your Coin Purse (Character page)."`.
  - Add a small `.crossRefHint` class to `src/components/pages/EstatePage.module.css` mirroring the same muted-caption idiom (small font, `color: var(--text-muted)`).
  - _Requirements: 5.1, 6.1, 6.2, 7.7_

- [x] 6. Update the SettingsPage cross-reference terminology
  - In `src/components/pages/SettingsPage.tsx`, change the string `"Find it on: Holdings & Wealth page → Enterprises tab"` to `"Find it on: Estate page → Enterprises tab"` for terminology consistency (Design Decision 4).
  - _Requirements: 6.2, 6.3_

- [x] 7. Update existing tests that assert the OLD labels
  - `src/components/__tests__/pages/EstatePage.tabs.test.tsx`: change `"Wealth & Finances"` assertions to `"Treasury & Finances"`, and update the two test-name strings (`"renders three tabs: Estate, Holdings, Wealth & Finances"`, `"defaults to Wealth & Finances tab on mount"`).
  - `src/components/__tests__/Navigation.test.tsx`: change `"Holdings & Wealth"` and the `estate` label-map entry to `"Estate"`.
  - `src/components/layout/__tests__/Navigation.labels.test.tsx`: change label to `"Estate"`, `subTabHint` to `"Estate · Holdings · Treasury · Finances"`, and switch the item lookup to `id === 'estate'`.
  - `src/components/layout/__tests__/Navigation.mobile.test.tsx`: update the `expectedLabels` array and comment from `"Holdings & Wealth"` to `"Estate"`.
  - `src/hooks/__tests__/useTabOrder.test.tsx`, `src/components/shared/__tests__/SubTabBar.integration.test.tsx`, `src/components/shared/__tests__/SubTabBar.reorder.test.tsx`: update `'Gear & Wealth'` fixtures/expectations to `'Gear'`.
  - `src/components/pages/__tests__/CalculatedTooltips.integration.test.tsx`, `src/components/pages/__tests__/CharacterPage.deposit.test.tsx`: tidy stale `"Gear & Wealth"` comments (the `/gear/i` matcher still passes).
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 8. Add new render/label and id-stability tests
  - Gear sub-tab: renders `"Gear"`, does not render `"Gear & Wealth"`, keeps id `gear`.
  - Estate nav: renders `"Estate"` and the new `subTabHint` `"Estate · Holdings · Treasury · Finances"`, keeps id `estate` and `shortcut '4'`.
  - Estate money sub-tab: renders `"Treasury & Finances"` (not `"Wealth & Finances"`), keeps id `wealth`.
  - Coin Purse card: shows the Treasury hint unconditionally, card title `"Coin Purse (carried)"` unchanged.
  - Treasury panel: shows the Coin Purse hint.
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 2.4, 3.1, 3.3, 4.1, 4.3, 5.1, 7.1, 7.2_

- [x] 9. Final checkpoint — full verification
  - Run `npx vitest --run`, `npx tsc --noEmit`, and lint on the changed files; fix any failures introduced (fix-errors steering).
  - Confirm no bare "Wealth" primary labels remain on the three affected surfaces (Gear sub-tab, Estate nav item, Estate money sub-tab) and that existing routing/tab-order/sub-tab-preference behaviour is unaffected.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

## Notes

- This is a **display-only change**: no new mechanic or logic is introduced, so no rulebook citation is required (per rules-compliance, citations apply only to game mechanics).
- Routing keys, section/sub-tab ids (`character`, `estate`, `gear`, `wealth`), the `#estate` hash route, and the `wGC`/`wSS`/`wD`/`estate.treasury` data fields are preserved (Req 7).
- Tasks 1–6 are independent edits across different files/surfaces (Tasks 4 and 5 each touch a page file plus its own CSS module, with no cross-file conflict) and run in parallel.
- The Coin Purse hint renders unconditionally (Design Decision 1): `Character.estate` is a required field always present via `BLANK_CHARACTER`, so gating on it would never hide the hint.
- Property-based testing does not apply (label/presence UI, no pure function over a large input space); testing uses render/label and id-stability assertions.
- Task 9 is a checkpoint: run full verification and pause if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4", "5", "6"] },
    { "id": 1, "tasks": ["7", "8"] },
    { "id": 2, "tasks": ["9"] }
  ]
}
```
