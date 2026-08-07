# Rules Compliance

## Mandatory Rulebook Adherence

All game mechanics, calculations, data, and logic in this application MUST comply with the official WFRP4e rulebooks. The rulebook documents in `docs/` are the authoritative source of truth for how the app should behave.

## Authoritative Sources

Reference these documents (in priority order) when implementing or modifying any game logic:

1. #[[file:docs/WarhammerFantasyRoleplay4e.md]] — Core rulebook (highest authority)
2. #[[file:docs/Errata.pdf]] — Official errata (overrides core where they conflict)
3. #[[file:docs/Up_In_Arms.md]] — Combat and warrior careers supplement
4. #[[file:docs/windsofmagic.md]] — Magic system supplement
5. #[[file:docs/archivesoftheempire.md]] — Additional content (volume 1)
6. #[[file:docs/archivesoftheempire2.md]] — Additional content (volume 2)
7. #[[file:docs/archivesoftheempire3.md]] — Additional content (volume 3)
8. #[[file:docs/dwarfguide.md]] — Dwarf species guide
9. #[[file:docs/highelfguide.md]] — High Elf species guide
10. #[[file:docs/PLAYER-GUIDE.md]] — Player reference guide

## Rules

1. **Never invent mechanics.** If a calculation, cost table, threshold, or game rule is not documented in one of the rulebooks above, do not implement it. Ask the user for clarification instead.

2. **Errata takes precedence.** When the errata contradicts the core rulebook, follow the errata.

3. **Supplements extend, not override.** Supplement books (Up In Arms, Winds of Magic, Archives) add options but do not change core rules unless explicitly stated.

4. **Verify before implementing.** When implementing any game mechanic (XP costs, skill tests, combat calculations, encumbrance, conditions, magic, careers), read the relevant rulebook section first to confirm the formula/rule. Do not rely on memory or assumptions.

5. **Cite the source.** When implementing a rule, note which rulebook and section it comes from in a code comment (e.g., `// Core p.44: Advancement costs table`).

6. **Flag ambiguities.** If a rule is unclear or could be interpreted multiple ways, flag it to the user rather than picking an interpretation silently.

7. **New rulebooks.** Any new `.md` files added to `docs/` that document WFRP4e rules should be treated as additional authoritative sources and referenced where relevant.
