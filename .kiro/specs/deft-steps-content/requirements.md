# Spec: Deft Steps, Light Fingers — Content & Functionality Integration

## Overview

Integrate content and mechanics from the WFRP 4e supplement **_Deft Steps, Light Fingers_** (`docs/deftsteps.md`) into the app. The book is a crime / wilderness / religion supplement covering the **Cult of Ranald**, the **Cult of Taal**, the **criminal underworld**, **law & bounty hunting**, **pathfinding / wilderness travel**, and **hunting**.

This spec is organized so the high-value, low-risk **content data** (careers, miracles, talents, trappings, careers-as-modifications) ships first, and the larger **rules systems** (new endeavour sub-systems, wilderness travel, gang management) are scoped as separate, optional later phases. Everything follows the project's steering rules: **rules-compliance** (nothing invented; cite `docs/deftsteps.md` section + Core cross-refs; errata overrides), **calculated-total-tooltips**, and **fix-errors**.

> ⚠️ **BLOCKER FLAGGED FOR THE USER — career advance schemes.** The per‑characteristic advance‑scheme tables (the WS/BS/S/T/I/Ag/Dex/Int/WP/Fel ↑ rows) did **not** survive the markdown conversion of `docs/deftsteps.md` — they came through as empty or garbled cells (e.g. the Gambler‑Priest row reads `| | | | | h | | h | | | h |`; Shadow Prowler / Liberator‑Priest rows are blank). The app's `src/data/careeradvanceschemes.json` requires an exact `T1/T2/T3/T4`-per-characteristic mapping, and I will **not invent** these (rules-compliance). **See "Advance schemes needed from the user" below for the exact list to provide.** Skills, talents, trappings, and miracle text all came through cleanly and can be extracted with confidence.

---

## Source content inventory (what's in the book)

### New full careers (with level progressions in the text)
- **Priest of Ranald** variants (Cleric class): **Shadow Prowler** line (Initiate → Thief‑Priest → High Priest → Shadow Prowler), **Gambler‑Priest** line (Initiate → Gambler‑Priest → High Priest → Master of Chance), **Trickster‑Priest** line (Initiate → Trickster‑Priest → High Priest → Lord of Misrule), **Liberator‑Priest** line (Initiate → Liberator‑Priest → High Priest → People's Champion).
- **Forger** (Rogue class): Fraudster → Forger → Counterfeiter → Master Counterfeiter.
- **Muleskinner** (Ranger class): Driver → Muleskinner → Caravan Guide → Caravan Master.
- **Poacher** (Ranger class): Scrumper → Poacher → Master Poacher → Champion Poacher.
- **Ranger‑Priest of Taal** (Cleric class): (Initiate) → Ranger‑Priest → High Priest → Vice‑hierarch. (First tier label needs confirming from source.)
- **Outlaw Chief** (partial — "Brass 4" tier shown; likely a career exemplar/NPC rather than a full 4‑tier player career — design to confirm whether it's a full career or an NPC profile).

### Careers expressed as MODIFICATIONS to the existing Thief career (not standalone)
The book defines **Pickpocket**, **Burglar**, and **Embezzler** as the existing **Thief** career with swap lists (different skills/talents/trappings per tier). The app currently models careers as standalone schemes, so these need a design decision (see FR‑2).

### New miracles (map to `src/data/spells.ts` as `lore: "Miracles of Ranald"` / existing `"Miracles of Taal"`)
- **Miracles of the Night Prowler**: Distant Sounds, Long Reach, Lose the Loot, Silence Reigns, Talk Your Way Out, The Heat Is Off.
- **Miracles of the Gamester**: Bountiful Fortune, Crisis of Confidence, Force the Hand of Chance, Perfect Empathy, The Gamemaster, Up the Stakes.
- **Miracles of the Deceiver**: A Suitable Sucker, Bamboozle, One Almighty Lie, Ranald's Mischief, Unremembered Face.
- **Miracles of the Protector**: Back at You, Class War, Free Your Mind, Moment of Clarity, Rally Round, Under My Protection.
- **Miracles of Taal**: Auroch's Heart, Earthshudder, Nature's Repast, Pax of Taal, Rending Paw, River's Blessing, Wild Wind, Wilderness Way. (Check whether any already exist in `spells.ts` under a Taal lore to avoid duplicates.)
- Each miracle needs CN, Range, Target, Duration, Effect transcribed verbatim-ish from the book (design/coder reads the effect paragraphs; this inventory only lists names).

### New talents (map to `src/data/talents.ts`)
Candidate new talents referenced in careers that may not already be in `TALENT_DB` — the design step MUST diff against the existing DB and only add genuinely new ones, transcribing `max` + `desc` from the book: **Cardsharp, Diceman, Kingpin, Embezzle, Numismatics, Dealmaker, Super Numerate, Schemer, Secret Identity, Master of Disguise, Blather** (and any others surfaced). Several of these may already exist from prior supplements — **diff first, never duplicate**.

### New trappings / tools (map to `src/data/trappings.ts`)
Thieves' tools: **Bag of Tarrabeth Seed, Bag of Soot, Caltrops, Crampons, Glass Cutter, Periscope, Smoke Bomb, Steel Mummit, Telescopic Stick**. Each with Enc + price + effect from the book.

### Rules systems (larger — scoped as later phases, not v1)
- **Pathfinding / Wilderness Travel**: travel stages, weather table, journey endeavours (Planning / Travel / Camp endeavours: Forage, Haste, Hunt, Navigate, Map, Scout, Track, Water, Cook, Journal, Make Camp, Recuperate, Trap, Watch).
- **Law, Outlaws & Bounty Hunters**: crime/watch rules, trial & punishment tables, crimes-by-career, gaol endeavours (incl. Gaol Break), bounty hunting (warrants, random warrant tables).
- **Organised Crime / Running a Gang**: gang endeavours (Build Gang, Call on Muscle, Get Resources, Maintain/Exert Influence, Resolve Legal Issues), criminal events.
- **Criminal & Journey Endeavours**: extend the existing endeavours catalog (`src/logic/endeavours.ts` `GENERAL_ENDEAVOURS` / `CLASS_ENDEAVOURS`) with the new endeavour types (Black Market, Money in the Bank, Whisper Campaign, Establishing a Contact, Hunting, the Journey endeavours, Gaol Break, etc.).
- **Hunting**: hunting-as-endeavour, hounds & hawks (animal companion templates → `src/data/animals.ts`), hunting lodges.

---

## Requirements

### FR‑1 — Add new standalone careers (DATA)
Add the Ranald priest variants, Forger, Muleskinner, Poacher, and Ranger‑Priest of Taal to the career system:
- Career skills/talents/trappings per tier → the careers data the app reads (`src/data/careers.ts` / `CAREER_SCHEMES`, and `src/data/careeradvanceschemes.json` for the characteristic advance scheme).
- Class assignment: Ranald/Taal priests = **Cleric**; Forger = **Rogue**; Muleskinner/Poacher = **Ranger**.
- **Advance schemes:** the skills/talents/trappings are extractable now; the **characteristic advance‑scheme rows are BLOCKED on user input** (see the flagged section). Ship skills/talents/trappings and wire the scheme once the user supplies the per‑characteristic tiers.
- **AC:** each new career appears in career selection filtered to its class; its tiers list the correct skills/talents/trappings transcribed from the book; the advance scheme matches the user‑supplied data exactly; no invented data.

### FR‑2 — Thief sub‑careers (Pickpocket / Burglar / Embezzler) — DESIGN DECISION REQUIRED
The book models these as the Thief career with per‑tier swap lists, not standalone careers. Options for the design step to settle and recommend:
- (a) Add them as standalone career variants in the data (duplicating Thief + applying the swaps) — simplest for the current data model, but denormalized.
- (b) Model them as documented "career variant" notes/reference only (searchable content), not selectable careers.
- (c) Defer to a later phase.
- **AC:** the design picks one, justified; nothing invented; the swaps are transcribed exactly from the book if (a).

### FR‑3 — Add new miracles (DATA)
Add all Ranald miracles (four aspect lores) and the Taal miracles to `src/data/spells.ts`, each with verbatim‑sourced CN/Range/Target/Duration/Effect and an appropriate `lore` string. Register any new lore category strings in `LORE_CATEGORIES`. Diff against existing spells to avoid duplicates (esp. Taal).
- **AC:** every new miracle is searchable (command palette) and learnable where the rules allow; cn/range/target/duration/effect are non‑empty and sourced; no invented effects; the Bless/Invoke (Ranald)/(Taal) talents resolve correctly for these.

### FR‑4 — Add new talents (DATA)
Diff the book's referenced talents against `TALENT_DB`; add only genuinely new ones with `max` + `desc` transcribed from the book.
- **AC:** no duplicates; each new talent searchable; `max`/`desc` sourced; new careers reference talents that now all exist in the DB.

### FR‑5 — Add new trappings/tools (DATA)
Add the thieves' tools to `src/data/trappings.ts` with Enc, price, and effect from the book.
- **AC:** each appears in the trapping picker; Enc/price sourced; no invented values.

### FR‑6 (LATER PHASE) — Endeavour catalog extensions
Extend `src/logic/endeavours.ts` with the book's new endeavour types (criminal, journey/wilderness, gaol, gang) as catalog entries, reusing the existing endeavour UI and (where test‑driven and bare‑skill) the Downtime/Endeavour Assistant seed path. Scope and per‑endeavour tests to be settled in that phase's design.

### FR‑7 (LATER PHASE) — Rules‑systems features
Pathfinding/wilderness travel, law/crime/bounty hunting, running a gang, hunting — each is its own feature (and candidate for the assistant/guided‑flow treatment). NOT in the content‑integration phase. Listed here so they're tracked, not lost.

### FR‑8 — Hunting animal companions (DATA, small)
Add the hounds (Hochland Lockhund, Nordlander Bamse, Grootscher Marsh Hound) and hawks (Dove Hawk, Arabyan Redhawk) as animal‑companion templates in `src/data/animals.ts`, with stats/traits from the book.
- **AC:** selectable as companion templates; stats sourced; no invented traits.

### FR‑9 — Rulebook registration (steering)
Per the `rules-compliance` steering rule ("Any new `.md` files added to `docs/` that document WFRP4e rules should be treated as additional authoritative sources"), add `docs/deftsteps.md` to the authoritative-sources list in the workspace steering file so future work treats it as canonical. (Note: `*.pdf` and the other rulebooks are gitignored as copyrighted; confirm whether `deftsteps.md` should likewise be gitignored — it currently is untracked.)

## Non-Functional Requirements
- **NFR‑1 rules-compliance:** every added datum is transcribed from `docs/deftsteps.md` (cite section) or an existing rulebook; nothing invented. Advance‑scheme characteristic rows come from the user, not guessed.
- **NFR‑2 additive:** existing tests stay green unchanged; new data covered by the existing data‑integrity test patterns (e.g. `static-data.test.ts`, the Dwarf‑miracles property test pattern) — every new spell/career/talent/trapping has non‑empty required fields; careers reference only talents/skills that exist.
- **NFR‑3 calculated-total-tooltips:** no new bare calculated totals expected (data only); if any surface, tooltip them.
- **NFR‑4 verification:** tsc / build / vitest / eslint all clean.

---

## Advance schemes — PROVIDED BY USER (blocker resolved)

User confirmed the Ranald line mapping (each scheme attaches to the whole aspect line) and the Thief sub-careers (Pickpocket/Burglar/Embezzler) are to be modeled as **variants** (FR-2 option a). All advance schemes below are authoritative (user-supplied); characteristics not listed are `null`. Format: `T1/T2/T3/T4` = tier at which each characteristic becomes advanceable.

- **Forger** (Fraudster→Forger→Counterfeiter→Master Counterfeiter): T1 = T, I, Dex · T2 = Int · T3 = WP · T4 = Fel
- **Thief-Priest / Shadow Prowler line** (Initiate→Thief-Priest→High Priest→Shadow Prowler): T1 = I, Ag, Dex · T2 = Fel · T3 = WP · T4 = Int
- **Gambler-Priest line** (Initiate→Gambler-Priest→High Priest→Master of Chance): T1 = I, Dex, Fel · T2 = WP · T3 = Int · T4 = Ag
- **Trickster-Priest line** (Initiate→Trickster-Priest→High Priest→Lord of Misrule): T1 = I, WP, Fel · T2 = Dex · T3 = Ag · T4 = Int
- **Liberator-Priest line** (Initiate→Liberator-Priest→High Priest→People's Champion): T1 = Ag, WP, Fel · T2 = Int · T3 = I · T4 = WS
- **Ranger-Priest of Taal line**: T1 = T, Ag, WP · T2 = Fel · T3 = I · T4 = Int
- **Muleskinner** (Driver→Muleskinner→Caravan Guide→Caravan Master): T1 = BS, Ag, WP · T2 = Int · T3 = I · T4 = T
- **Poacher** (Scrumper→Poacher→Master Poacher→Champion Poacher): T1 = BS, Ag, Dex · T2 = Int · T3 = WS · T4 = I
- **Gamekeeper**: T1 = BS, I, Int · T2 = WS · T3 = Ag · T4 = WP — NOTE: design must verify whether Gamekeeper is a full 4-tier player career or a single NPC profile in the book before wiring; if single-profile, model accordingly, scheme still as given.

---

## (historical) Advance schemes needed from the user (the blocker)

For each career below, please provide the **characteristic advance scheme** — which of the 10 characteristics the career advances, as `T1 / T2 / T3 / T4` (the tier at which each becomes available), matching the format in `src/data/careeradvanceschemes.json`. (The book shows these as the ↑‑marked row under WS | BS | S | T | I | Ag | Dex | Int | WP | Fel for each career; that row didn't survive the markdown conversion.)

1. **Shadow Prowler** line (Priest of Ranald — Night Prowler)
2. **Gambler‑Priest** line (Priest of Ranald — Gamester)
3. **Trickster‑Priest** line (Priest of Ranald — Deceiver)
4. **Liberator‑Priest** line (Priest of Ranald — Protector)
5. **Forger** line (Fraudster → Forger → Counterfeiter → Master Counterfeiter)
6. **Muleskinner** line (Driver → Muleskinner → Caravan Guide → Caravan Master)
7. **Poacher** line (Scrumper → Poacher → Master Poacher → Champion Poacher)
8. **Ranger‑Priest of Taal** line

Example format per career (characteristics the career does NOT advance are `null`):
```
Forger:  WS null, BS null, S null, T null, I T2, Ag T1, Dex T1, Int T3, WP null, Fel T4
```
Any careers you'd rather I treat as reference‑only (not selectable) — tell me and I'll scope them out of FR‑1.

---

## Suggested phasing
- **Phase 1 (content, ship first):** FR‑3 miracles, FR‑4 talents, FR‑5 trappings, FR‑8 animals, FR‑9 rulebook registration — all pure data, no advance‑scheme blocker.
- **Phase 2 (careers):** FR‑1 + FR‑2 — once you provide the advance schemes.
- **Phase 3+ (systems, optional/later):** FR‑6 endeavours, then FR‑7 rules systems (each its own spec), with the guided‑flow/assistant treatment where it fits.

## Open questions for the design step
1. FR‑2: standalone‑variant vs reference‑only vs defer for Pickpocket/Burglar/Embezzler.
2. Outlaw Chief: full player career or NPC profile only?
3. Ranger‑Priest of Taal first‑tier label (the "Initiate" row wasn't clearly captured).
4. Which Taal miracles (if any) already exist in `spells.ts` and must not be duplicated.
5. Whether `docs/deftsteps.md` should be gitignored like the other copyrighted rulebooks.
