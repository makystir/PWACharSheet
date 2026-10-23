# GM Read-Only Share / Export — Requirements

## Summary

Add a way for a player to share a character with their GM (or anyone) as a **read-only** view, with two delivery mechanisms (both confirmed, not to be re-litigated):

- **(a) Offline snapshot** — a downloadable snapshot file plus copy-to-clipboard of the snapshot payload, both openable offline to render a read-only viewer; plus a separate "Copy Combat Stat Block" button that copies a concise plain-text combat block.
- **(b) URL-hash share link** — a shareable link whose compressed hash fragment encodes the whole read-only sheet, decoded entirely client-side with no backend.

Both mechanisms render the **same** read-only character viewer, reachable via a dedicated hash route. The viewer reuses the app's existing calculators and breakdown/tooltip components so every displayed number and every breakdown tooltip matches the live sheet exactly. Nothing in this feature mutates, auto-saves, or silently imports the viewed character.

This is additive. Existing export/import, bulk backup/restore, print, and all existing tests remain unchanged and green.

### Context from the codebase (confirmed, build on these)

- Stack: Vite + React + TypeScript; Vitest + fast-check; CSS modules; PWA (service worker `src/sw.ts` / `src/sw-register.ts`); hash routing (`src/logic/hash-route.ts`, `src/hooks/useHashRoute.ts`).
- Single-character serialization already exists: `exportToJSONWithPortrait(character, characterId)` and `importFromJSON(json)` / `importFromJSONWithPortrait(json)` in `src/storage/export-import.ts`, with `_v` version field and `CURRENT_VERSION = 8`. Portraits live in IndexedDB (`src/storage/portrait-store.ts`, codec in `src/storage/portrait-codec.ts`).
- Settings (`src/components/pages/SettingsPage.tsx`) already hosts Export ▾ (clipboard/file), Import, Back Up All, Restore, and Print Character Sheet controls — the new share actions belong here alongside them.
- Derived stats are computed by `src/logic/calculators.ts`, `encumbrance.ts`, `armour*.ts`, `weapons.ts`, etc. Read-only presentation precedent is `src/components/layout/PrintLayout.tsx`, which reuses those calculators.
- Breakdown/tooltip pattern: `src/components/shared/Tooltip.tsx` + `src/components/shared/TooltipTriggerCell.tsx` + the `*BreakdownContent.tsx` components under `src/components/pages/`.
- Routing currently has `VALID_PAGES = ['character','combat','retinue','estate','endeavours','advancement','settings']`; the app shell (`AppWithCharacter`) assumes an active saved character exists.

---

## Functional Requirements

### FR1 — Read-only character viewer (shared by both mechanisms)

**US1.** As a GM, I want to view a shared character's full sheet in a read-only presentation so I can reference their capabilities without being able to change anything.

The viewer MUST present, where present on the character: identity (name, species, class, career/level/path, status, descriptive fields), characteristics (initial/advances/total and bonuses), basic + advanced/grouped skills with totals, talents, weapons and armour with computed values, derived combat stats (wounds max, encumbrance total + max, armour points per location, movement), and the following when present: spells/prayers, active conditions, and other sections the print layout already renders (e.g. trappings, psychology, corruption/mutation, ammunition). Section visibility SHOULD follow the same "render when present" logic the print layout uses.

- The viewer MUST contain no inputs, no editable fields, no roll/mutation actions, and MUST NOT write to storage, trigger auto-save, or append to the event log.
- Every displayed derived/calculated stat MUST be produced by the app's existing calculators (reused, not reimplemented) so values match the live sheet. (rules-compliance)
- Every displayed **calculated total** MUST have a breakdown tooltip rendered via the existing `Tooltip` + `TooltipTriggerCell` pattern, reusing the existing `*BreakdownContent` components, so the breakdown matches the live sheet. (calculated-total-tooltips)
- The viewer MUST be reachable via a dedicated hash route and MUST be used by BOTH delivery mechanisms (one viewer, not two).

### FR2 — Viewer route and app-shell coexistence

**US2.** As a viewer, I want opening a share link or snapshot to land me on the read-only viewer without the app forcing me into the normal (editable) app shell or the welcome screen.

- A dedicated hash route MUST render the viewer independently of whether the user has any saved characters (today the shell shows the welcome screen when `characters.length === 0`).
- The source of the viewed character MUST be the decoded payload (link or snapshot), NOT the saved character list; viewing MUST NOT require or modify any saved character.
- `[OPEN QUESTION — for design]` The exact route shape (e.g. a `view`/`share` page added to `VALID_PAGES` vs. a separate top-level hash segment), and how the viewer coexists with / bypasses the `AppWithCharacter` shell, portrait migration, and welcome-screen gating, is a design decision to resolve.

### FR3 — Mechanism (a): offline snapshot (file + clipboard)

**US3.** As a player, I want a "Share with GM" action in Settings that gives me a snapshot I can hand off offline, so my GM can open it without any internet connection or backend.

- Settings MUST offer a snapshot action producing both (i) a downloadable snapshot file and (ii) copy-to-clipboard of the snapshot payload.
- The snapshot payload MUST reuse the existing single-character serialization format (the `exportToJSONWithPortrait` shape with `_v`); the feature MUST NOT fork the stat math or invent a second character format.
- Opening/loading a snapshot MUST render the read-only viewer and MUST work fully offline (no network calls).
- `[OPEN QUESTION — for design]` The exact snapshot payload shape and how a snapshot is "opened into" the viewer (e.g. a load-snapshot control on the viewer route that reads a pasted/opened payload, vs. encoding into the link) — prefer reusing the existing export format — is a design decision to resolve.

### FR4 — Mechanism (a): Copy Combat Stat Block (plain text)

**US4.** As a player, I want a separate "Copy Combat Stat Block" button that copies a concise plain-text combat summary, so I can paste it into chat/VTT quickly.

- The button MUST copy plain text (not JSON) containing at minimum: name, combat-relevant characteristics, wounds, movement, armour by location, weapons with computed damage/reach/qualities, and active conditions.
- All derived numbers in the block (wounds, armour points, weapon damage, movement) MUST come from the existing calculators so they match the sheet. (rules-compliance)
- This button MUST be distinct from the snapshot action and MUST work offline.

### FR5 — Mechanism (b): URL-hash share link

**US5.** As a player, I want a "Copy Share Link" action that produces a URL whose hash encodes my whole read-only sheet, so my GM can open it in a browser with no backend and no account.

- The share action MUST produce a link whose hash fragment contains the compressed, read-only-encoded character.
- Opening the link MUST decode the payload entirely client-side and render the read-only viewer. Decoding MUST NOT write into the saved character list.
- Compression MUST be client-side (lightweight/standard). `[OPEN QUESTION — for design]` Choose the concrete compression method (e.g. native `CompressionStream`/`DecompressionStream` with base64url, vs. a small bundled library) and the encode/decode format, including versioning of the encoded envelope. No such dependency exists today.
- `[OPEN QUESTION — for design]` Per-mechanism **portrait size policy**: the link SHOULD exclude or shrink the portrait (concrete thresholds to be defined), while the offline snapshot MAY retain the full portrait. Define the concrete thresholds and whether the portrait is dropped, downscaled, or re-encoded for the link.
- The share-link UI MUST warn clearly when the resulting link is too long (threshold to be defined in design) and explain the likely cause (e.g. portrait, large sheet) and remedy (use the offline snapshot instead).

### FR6 — Privacy disclosure for the share link

**US6.** As a player, I want the UI to plainly tell me that the link embeds my character data, so I understand the difference from the local-only file/clipboard option.

- The share-link UI MUST state that the character data is embedded in the link itself (anyone with the link can read the sheet).
- This MUST be visually contrasted with the local-only snapshot (file/clipboard) option, which does not transmit anything.

### FR7 — Untrusted input handling on decode

**US7.** As a user, I want a malformed, tampered, or oversized shared payload to fail safely, so a bad link/snapshot can never corrupt my data or run embedded content.

- Decoded link data AND loaded snapshot data MUST be treated as **untrusted**: validated/sanitized on decode before rendering, reusing the existing import validation (required-key checks, version ceiling) where applicable, and extended as needed for the viewer.
- On malformed/invalid payloads the viewer MUST fail gracefully with a clear, non-technical error message and MUST NOT crash the app or partially render corrupted data.
- Oversized payloads MUST be rejected with a clear message rather than attempting to decode unboundedly (guards against decompression-bomb / memory issues).
- Embedded content MUST never be executed (no `eval`, no HTML injection); all decoded strings are rendered as text/data only.
- A newer-than-supported encoded version MUST be rejected with a clear message (mirrors `importFromJSON`'s version-ceiling behavior).

### FR8 — Explicit, separate "import into my characters"

**US8.** As a viewer, I want importing a shared character into my own saved list to be a distinct, explicit action, so merely viewing a link never overwrites or adds to my data.

- Viewing (link or snapshot) MUST NOT add to or overwrite the saved character list.
- Any "import into my characters" capability MUST be a separate, explicit, user-initiated action, routed through the existing import path (`importFromJSONWithPortrait` / the Settings import flow), distinct from viewing.
- `[OPEN QUESTION — for design]` Whether to expose an "Import this character" action on the viewer at all (vs. directing the user to the existing Settings → Import), and if exposed, how it reuses the existing confirm-before-import flow, is a design decision to resolve.

---

## Non-Functional Requirements

- **NFR1 — No backend / no network / no telemetry.** All encode/decode/compression/rendering happens client-side. Mechanism (a) works with zero network access. No analytics or outbound requests are added.
- **NFR2 — Reuse, don't fork.** Reuse existing serialization (`export-import.ts`), calculators (`src/logic/*`), and breakdown components. Do not duplicate stat math or create a second character format. (rules-compliance)
- **NFR3 — Rulebook compliance.** Any displayed game mechanic/derived stat matches the WFRP4e rulebooks in `docs/`; where a stat is derived in new code, cite the Core page in a comment as existing calculators do (e.g. `calculators.ts` wound formula). Never invent mechanics. (rules-compliance)
- **NFR4 — Additive & green.** Existing tests remain unchanged and passing. Any surfaced type/lint/test/build error introduced by this work is fixed at root cause with no suppressions. (fix-errors)
- **NFR5 — Accessibility.** The viewer and new controls meet the app's existing a11y bar: tooltips openable on hover (desktop) and tap/focus (touch/keyboard) via the existing `TooltipTriggerCell`; readable in all themes.
- **NFR6 — Offline-first.** The viewer route is served by the existing PWA service worker so a snapshot opened on the same origin works offline.

---

## Acceptance Criteria

1. Opening the dedicated viewer route with a valid decoded payload renders a read-only sheet with no `<input>`/editable controls and performs no writes to `localStorage`, IndexedDB, or the event log.
2. For a given character, every calculated total shown in the viewer (characteristic totals/bonuses, skill totals, wounds max, encumbrance total/max, armour points per location, movement, weapon damage) equals the value computed by the corresponding existing calculator for the same character.
3. Every calculated total in the viewer exposes a breakdown tooltip via `TooltipTriggerCell` whose contents are produced by the existing `*BreakdownContent` component for that stat.
4. The viewer route renders even when the user has zero saved characters (it does not fall through to the welcome screen) and does not create, modify, or require a saved character.
5. Settings shows a "Share with GM" snapshot action that (a) downloads a snapshot file and (b) copies the snapshot payload to the clipboard; the payload parses with the existing `importFromJSON` validation.
6. A snapshot produced offline can be loaded into the viewer with no network access and renders identically to the source sheet.
7. Settings shows a separate "Copy Combat Stat Block" button that copies plain text containing name, combat characteristics, wounds, movement, armour by location, weapons (with computed damage/reach/qualities), and active conditions; the numbers match the calculators.
8. Settings shows a "Copy Share Link" action producing a URL whose hash encodes the compressed character; opening that URL in a fresh browser context (no saved data) renders the read-only viewer client-side with no network calls.
9. When the encoded link exceeds the defined length threshold, the UI shows a clear too-long warning naming the likely cause and recommending the offline snapshot; per the portrait policy, the link excludes/shrinks the portrait while the snapshot may retain it.
10. The share-link UI displays a privacy note stating the data is embedded in the link, visually contrasted with the local-only file/clipboard option.
11. Feeding the decoder a malformed, truncated, non-matching, or oversized payload yields a clear graceful error (no crash, no partial corrupt render) and never executes embedded content; a newer-than-`CURRENT_VERSION` payload is rejected with a version message.
12. Viewing a link/snapshot never adds to or overwrites the saved character list; importing into the saved list is only possible through a separate explicit action routed via the existing import flow.
13. `npm run typecheck`, `npm run build`, and `npm test` all pass; no existing test is modified to accommodate this feature; no new suppressions (`@ts-ignore`, `eslint-disable`) are introduced.

---

## Open Questions (for the design step to resolve — do not invent mechanics)

1. **Viewer route & app-shell coexistence** — route shape (new `VALID_PAGES` entry vs. separate hash segment) and how the viewer bypasses welcome-screen gating, the `AppWithCharacter` shell, and migration without disturbing them.
2. **Snapshot payload shape** — confirm reuse of the existing `exportToJSONWithPortrait` format and define how a snapshot is "opened into" the viewer (dedicated load control vs. link-embedded).
3. **Compression method & envelope** — concrete choice (native `CompressionStream` + base64url vs. a small library), the encoded-envelope format, and its versioning; no compression dependency exists today.
4. **Per-mechanism portrait-size policy** — concrete thresholds; whether the link drops, downscales, or re-encodes the portrait; whether the snapshot keeps the full portrait.
5. **Too-long link threshold & warning** — the concrete max link/hash length that triggers the warning and the exact remediation message.
6. **Explicit import action** — whether the viewer exposes "Import this character" at all, and if so how it reuses the existing confirm-before-import flow (kept strictly separate from viewing).
7. **Untrusted-input validation** — the exact validation/sanitization and size limits applied on decode (reusing `importFromJSON` checks + size ceiling), and the precise malformed/oversized/newer-version error behaviors.

## Out of Scope

- Any server, hosted link, account, or stored/shortened links.
- Editing or two-way sync of a shared character (shared view is strictly read-only).
- Live/real-time sharing or multi-user updates.
- Changes to existing export/import, bulk backup/restore, or print behavior beyond adding the new share controls.
- New game mechanics or changes to stat math.
