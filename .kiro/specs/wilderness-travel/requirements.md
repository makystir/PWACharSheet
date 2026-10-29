# Spec: Wilderness Travel / Pathfinding System (Deft Steps, optional mechanic)

## Overview

Add a **Wilderness Travel / Pathfinding** subsystem from _Deft Steps, Light Fingers_ (`docs/deftsteps.md`, "Pathfinding" chapter ~pp.112–127). It models a party's journey through the wilds as a sequence of **Stages**, each with a **Travel Endeavour** and a **Camp Endeavour**, modified by **weather** and **terrain**, with **shortfall** consequences and **Wilderness Travel Events**. This is a genuinely new, self-contained mechanic — not an extension of the existing downtime-endeavour catalog (the book explicitly says Journey Endeavours are *not* the same as downtime endeavours and must not be interchanged).

**This is an OPTIONAL MECHANIC**, gated behind a new House Rule toggle (`useWildernessTravel`), consistent with the app's existing optional mechanics (Psychology Tracker, Critical Deflection, Enterprises, Cants). When the toggle is off, nothing new appears anywhere in the UI (zero footprint); when on, the Wilderness Travel feature surfaces.

Follows the project steering rules: **rules-compliance** (every test/difficulty/modifier/table transcribed verbatim from `docs/deftsteps.md`, cited; nothing invented; flag anything the markdown truncated), **calculated-total-tooltips** (any calculated total — e.g. a journey's total Stages, a seeded test's base target — gets a breakdown tooltip), **fix-errors**.

## House-rule gating (how "optional" works)

- Add `useWildernessTravel: boolean` to the `HouseRules` interface in `src/types/character.ts`, default `false` in `BLANK_CHARACTER.houseRules` (mirror `useEnterprises`/`usePsychologyTracker`).
- Add a toggle to the **House Rules** section of `SettingsPage.tsx` (Optional Mechanics group), with a "Find it on:" hint pointing to where the feature appears. Source label: "Wilderness Travel (Deft Steps)".
- All new UI is gated on `character.houseRules.useWildernessTravel === true` — zero DOM when off (mirror the Enterprises/Psychology gating pattern so there is no regression and no footprint for players who don't use it).

## Rules content to model (all from docs/deftsteps.md, transcribed verbatim)

### Journey structure
- A journey = an ordered list of **Stages**. Each Stage: the party may do one **Travel Endeavour** per member (en route) and one **Camp Endeavour** per member (end of day).
- **Planning Endeavour** (once, before departure, whole party): Challenging (+0) Outdoor Survival **or** Research Test; each SL buys a reroll (of a Travel Event, or of any Journey/Camp Endeavour test) during the journey.
- Doing both a Travel and a Camp Endeavour in one Stage → Hard (-20) Endurance Test or gain Fatigued (then a good night's sleep clears it).
- **Double Endeavour** option (Navigate, Map): spend both Travel+Camp slots on one task for +1 SL, no other Endeavour that Stage.
- **Simultaneous** option: Map+Navigate together at -1 SL each; two of Water/Hunt/Forage/Scout together at -1 SL each.

### Travel Endeavours (each a test, transcribe verbatim)
- **Forage** — Challenging (+0) Outdoor Survival / Lore (Herbs); SL → food/person-day; Fumble → tainted/poison.
- **Haste** — doubles the Stage's distance; whole party; Challenging (+0) Endurance or start Camp Fatigued.
- **Hunt/Fish** — Challenging (+0) Outdoor Survival; 2 person-days food per SL; Hunter's Eye/Fisherman bonus in listed terrain.
- **Navigate** — Challenging (+0) Navigation; mandatory at least once per Stage; full **Navigation Outcomes** table (+3 shortcut −1 Stage / +0..+2 proceed / −0..−2 +1 Stage + event / −3 lost, −3 SL until a success) and the **Factors Impacting Navigate** modifier table (double endeavour, terrain, weather, familiarity, lost, maps/journals, Map-done-prior, Trade Tools (Navigator), clear skies).
- **Map** — Average (+20) Trade (Cartography) / Challenging (+0) Art (Drawing); +1 SL to next Stage's Navigate; sellable.
- **Scout** — Challenging (+0) Perception; advance warning of adverse events; avoidable at +2 Stages.
- **Track** — Average (+20) Tracking (Opposed Stealth (Rural) if quarry aware).
- **Water** — Challenging (+0) Outdoor Survival; replenishes party; contaminated on Critical Failure → Bloody Flux risk.

### Camp Endeavours (each a test, transcribe verbatim)
- **Cook** — Average (+20) Trade (Cook) / Challenging (+0) Outdoor Survival; full **Cooking Critical Failure** 1d10 table.
- **Journal** — requires Read/Write; Average (+20) Art (Writing) or Language (Any).
- **Make Camp** — Challenging (+0) Outdoor Survival; affects overnight Healing difficulty + Exposure protection; tents make it Average instead of Challenging.
- **Recuperate** — clears Fatigued; spoiled if new Fatigue earned.
- **Trap** — Challenging (+0) Set Trap; food per SL.
- **Watch** — extra Endeavour; extra Fatigued; Average (+20) Willpower if watching while Fatigued or fall asleep.

### Weather (page 114 table) and Terrain (page 124 table)
- **Weather Table**: Temperature (Hot/Sweltering/Chilly/Bitter), Precipitation, Visibility, Wind — with per-endeavour modifiers. **FLAG:** the full Weather Table cells may be truncated/image-only in the markdown — the design MUST verify what survived and flag any missing modifiers rather than invent them.
- **Terrain Table** (transcribed, present in markdown): Light Woodland / Hills / Deep Forest / Temperate Plains / Wetland / Mountains × Navigation / Water / Foraging / Hunt-Fish / Make Camp / Watch SL modifiers.

### Shortfalls (page 124 table — present)
Food / Cooked Food / Adequate Shelter / Water / Rest & Recuperation → each with the mitigating Endeavour or the consequence (Starvation, Galloping Trots, Exposure, Thirst, lingering Fatigue/Wounds).

### Wilderness Travel Events (1d10, roll each Stage; 8+ = event)
Four terrain tables (1 Light Woodland/Hills/Temperate Plains, 2 Mountains, 3 Deep Forest, 4 Wetlands), each a 1d10 result table — transcribe verbatim (they're present). These are GM/reference content with dice rolls; see FR‑4 for how much to mechanize.

## Requirements

### FR‑1 — House-rule toggle (gating)
Add `useWildernessTravel` to HouseRules + BLANK_CHARACTER + a Settings toggle. AC: default off; off = zero new DOM; on = the feature appears; existing tests unchanged.

### FR‑2 — Journey tracker (the core feature)
A **Journey** data model stored on the character (new optional field, gated by the toggle; migration-safe like other added fields) and a Journey UI (design decides placement — likely a new sub-tab/section, or a new page shown only when the toggle is on). It lets the player:
- Create/name a journey and set/track its total **Stages** (a calculated running count, with a breakdown tooltip; Navigate outcomes can add/remove Stages).
- Advance Stage by Stage; per Stage, record each party member's chosen Travel Endeavour and Camp Endeavour (from the Journey-Endeavour catalog, which is SEPARATE from the downtime catalog), and the test results.
- Track **provisions/shortfalls** state (food, water, shelter, rest) and surface the shortfall consequences from the book as guidance.
- Record weather + terrain per Stage (selectable from the transcribed tables) and surface the resulting endeavour SL modifiers.
AC: nothing auto-applies — the player drives it; all data transcribed; totals have tooltips.

### FR‑3 — Journey Endeavour catalog + guided/seeded tests
- A new Journey-Endeavour catalog (Travel + Camp lists above), distinct from `GENERAL_ENDEAVOURS`/`CLASS_ENDEAVOURS` (do NOT pollute the downtime catalog — the book forbids interchange).
- For each endeavour whose test is a **bare skill / plain characteristic** (Outdoor Survival, Navigation, Perception, Set Trap, Endurance, Willpower, Tracking, etc.), offer a one-tap seeded roll via the EXISTING RollDialog + the reminder-roll seed path (same scope rule as the Downtime/Endeavour Assistant: seed only bare-skill/characteristic tests; specialisation-dependent (Trade (Cook), Art (Drawing), Lore (Herbs)) or GM-set = guidance-only). Nothing auto-applies; outcomes are player-entered.
- Apply weather/terrain SL modifiers as **surfaced guidance** next to the relevant endeavour (the GM/player applies them) — the design decides whether the app pre-computes a suggested net modifier (with a breakdown tooltip) or just displays the applicable rows. Prefer compute-and-tooltip where the modifiers are unambiguous table lookups.

### FR‑4 — Tables as reference (weather, terrain, events, shortfalls, Navigation outcomes, Cooking critical failure)
Transcribe the tables into data and surface them as reference within the Journey UI (and/or the command-palette search where it fits). **Wilderness Travel Events**: provide the four 1d10 tables as reference + an optional "roll an event for this Stage" helper (roll 1d10, 8+ triggers, show the terrain-appropriate result) — but DO NOT auto-apply event effects (they're heavily GM-adjudicated). Flag any table truncated in the markdown.

### FR‑5 — Reuse, don't fork
- Reuse the RollDialog + reminder-roll seed path for seeded tests; the shared Tooltip/TooltipTriggerCell for every calculated total; existing condition logic for Fatigued where the app already models it (the journey records Fatigued as guidance/reminders — it does NOT need to mutate combat conditions unless trivially reusing existing helpers).
- Journey-Endeavour catalog is its own module; the Downtime/Endeavour Assistant is NOT involved (different subsystem).

## Non-Functional Requirements
- **NFR‑1 rules-compliance:** every test/difficulty/modifier/table value transcribed from `docs/deftsteps.md`; cite sections; nothing invented; flag truncations (esp. the Weather Table and any image-only cells).
- **NFR‑2 optional/no-regression:** toggle default off; zero DOM + zero new character-data footprint when off (the Journey field is optional/absent until used); existing tests stay green unchanged.
- **NFR‑3 calculated-total-tooltips:** total Stages, seeded base targets, any net SL modifier shown → breakdown tooltip.
- **NFR‑4 verification:** tsc / build / vitest / eslint clean (re-run the known PrintLayout/property flake in isolation to confirm, not a regression).
- **NFR‑5 offline/no-network/no-LLM.** Pure deterministic logic; any dice (event roll) uses the existing dice utilities.

## Scope / phasing (this is large — the design should recommend slicing)
Recommended v1 slices (the design/planner may split into FEATs):
- **Slice A:** FR‑1 toggle + the Journey data model + a minimal Stage-by-Stage tracker (create journey, add/advance stages, record chosen endeavours + results, Stage count with tooltip).
- **Slice B:** FR‑3 the Journey Endeavour catalog + seeded/guided tests + weather/terrain modifier surfacing.
- **Slice C:** FR‑4 the reference tables + optional event-roll helper.
Keep each slice behind the toggle and independently shippable.

## Open questions for the design step
1. UI placement: a new toggle-gated **page** vs a sub-tab on an existing page (Estate? a new "Travel" nav item shown only when the house rule is on?). Recommend the least-intrusive option that doesn't add a nav item for players who don't use the mechanic.
2. Is the Journey party-level or character-level? The sheet is single-character; model the journey on the active character, with party members as free-text/roster entries (the app already has retinue/hirelings — decide whether to reference them or keep journeys self-contained). Flag and recommend.
3. How much to mechanize Travel Events vs leave as reference (recommend: reference + optional dice helper, no auto-apply).
4. Weather Table completeness — verify against source; if truncated, ship terrain + the weather categories that survived and flag the rest.
5. Whether to compute a suggested net endeavour SL modifier (weather+terrain+factors) or only display applicable rows — prefer compute+tooltip where unambiguous.
