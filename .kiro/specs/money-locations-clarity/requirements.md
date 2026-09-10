# Requirements Document

## Introduction

Across the app the word "Wealth" appears as a label in several competing places for what are really two distinct money pools plus estate bookkeeping. This confuses players about where money is stored and where to manage it. This feature establishes two clearly and consistently named homes for money — the **Coin Purse** (coin carried on the character, on the Character page) and the **Treasury** (the estate's central coin store, on the Estate page) — and removes the generic word "Wealth" as a primary label from the affected surfaces.

The change is display-text only. It renames sub-tab labels, the estate navigation item label, and the estate navigation sub-tab hint, and adds two small cross-reference hints so players can find the other pool. The underlying routing/section ids, sub-tab ids, hash routes, and data fields are unchanged, and existing transfer (deposit/withdraw), ledger, and event-log behaviour is unaffected.

This introduces no new WFRP4e game mechanic. It is a naming and information-architecture change; no rulebook citations are required. It follows the precedent set by the existing Navigation label work (see the Navigation Req 16.3 precedent), where display labels changed while routing ids stayed stable.

## Glossary

- **Coin_Purse**: The coin the character carries on their person, stored as `character.wGC`, `character.wSS`, `character.wD` (Gold Crowns, Silver Shillings, Brass Pennies). Surfaced on the Character page as a card titled "Coin Purse (carried)" (established by the wealth-treasury-transfer spec).
- **Treasury**: The estate's central coin store, stored as `character.estate.treasury.{gc, ss, d}`. Surfaced on the Estate page in the "Treasury" panel. Relevant only when the character has an estate (the existing `character.estate` object).
- **Character_Page**: The page reached by the navigation item with id `character` (routing/section key `character`).
- **Estate_Page**: The page reached by the navigation item with id `estate` (routing/section key `estate`, hash route `#estate`).
- **Gear_Sub_Tab**: The Character page sub-tab with id `gear` (defined in `CharacterPage.tsx` defaultTabs and consumed by `useTabOrder`). Currently labelled "Gear & Wealth".
- **Estate_Money_Sub_Tab**: The Estate page sub-tab with id `wealth` (defined in `EstatePage.tsx` defaultTabsList). Currently labelled "Wealth & Finances". Contains the Monthly Financial Summary, the Treasury panel (with the Withdraw control), and Transaction History.
- **Estate_Nav_Item**: The navigation entry with id `estate` in `Navigation.tsx` NAV_ITEMS. Currently labelled "Holdings & Wealth" with a `subTabHint` of "Estate · Holdings · Wealth".
- **Sub_Tab_Hint**: The `subTabHint` string shown under a navigation item to surface its sub-tabs.
- **Coin_Purse_Card**: The card titled "Coin Purse (carried)" inside the Gear_Sub_Tab, holding the GC/SS/D values and the Deposit control.
- **Treasury_Panel**: The "Treasury" panel inside the Estate_Money_Sub_Tab, containing the Withdraw control.
- **Routing_Keys**: The stable identifiers that navigation, hash routing, saved tab order, and saved sub-tab preferences depend on: the section keys `character` and `estate`, the hash route `#estate`, the Character sub-tab id `gear`, and the Estate sub-tab id `wealth`.

## Requirements

### Requirement 1: Rename the Character gear sub-tab label

**User Story:** As a player, I want the Character page's gear sub-tab labelled simply "Gear", so that I do not confuse the carried Coin Purse card there with the generic word "Wealth".

#### Acceptance Criteria

1. THE Character_Page SHALL display the Gear_Sub_Tab with the label "Gear".
2. THE Character_Page SHALL NOT display the label "Gear & Wealth" for the Gear_Sub_Tab.
3. THE Character_Page SHALL keep the Gear_Sub_Tab id `gear` unchanged.

### Requirement 2: Rename the Estate navigation item and its sub-tab hint

**User Story:** As a player, I want the estate navigation item labelled "Estate" with a hint listing its sub-tabs, so that I can tell it holds the Treasury and estate finances without the generic word "Wealth".

#### Acceptance Criteria

1. THE Estate_Nav_Item SHALL display the label "Estate".
2. THE Estate_Nav_Item SHALL NOT display the label "Holdings & Wealth".
3. THE Estate_Nav_Item SHALL display the Sub_Tab_Hint "Estate · Holdings · Treasury · Finances".
4. THE Estate_Nav_Item SHALL keep the navigation id `estate` unchanged.
5. THE Estate_Page SHALL keep the hash route `#estate` unchanged.

### Requirement 3: Rename the Estate money sub-tab label

**User Story:** As a player, I want the estate money sub-tab labelled "Treasury & Finances", so that I know the estate's central coin store lives there.

#### Acceptance Criteria

1. THE Estate_Page SHALL display the Estate_Money_Sub_Tab with the label "Treasury & Finances".
2. THE Estate_Page SHALL NOT display the label "Wealth & Finances" for the Estate_Money_Sub_Tab.
3. THE Estate_Page SHALL keep the Estate_Money_Sub_Tab id `wealth` unchanged.

### Requirement 4: Cross-reference hint on the Coin Purse card

**User Story:** As a player, I want a hint on the Coin Purse card pointing me to the Treasury, so that I know where the estate's central coin is managed.

#### Acceptance Criteria

1. THE Coin_Purse_Card SHALL display a hint stating that estate funds are held in the Treasury on the Estate page.
2. WHERE the character has an estate (the `character.estate` object is present), THE Coin_Purse_Card SHALL display the Treasury cross-reference hint.
3. THE Coin_Purse_Card SHALL keep the "Coin Purse (carried)" card title unchanged.

### Requirement 5: Cross-reference hint on the Treasury panel

**User Story:** As a player, I want a hint on the Treasury panel pointing me to the Coin Purse, so that I know where my character's carried coin is managed.

#### Acceptance Criteria

1. THE Treasury_Panel SHALL display a hint stating that carried coin is held in the character's Coin Purse on the Character page.

### Requirement 6: Consistent money terminology across the affected surfaces

**User Story:** As a player, I want money labelled consistently as "Coin Purse" and "Treasury", so that I always know which pool I am looking at.

#### Acceptance Criteria

1. THE System SHALL use the term "Coin Purse" for carried coin on the affected surfaces.
2. THE System SHALL use the term "Treasury" for the estate coin store on the affected surfaces.
3. THE System SHALL NOT use the bare word "Wealth" as a primary label on the Gear_Sub_Tab, the Estate_Nav_Item, or the Estate_Money_Sub_Tab.

### Requirement 7: Display-only, non-regression constraint

**User Story:** As a player, I want these renames to be display-text only, so that my saved routes, tab order, sub-tab preferences, and money data keep working unchanged.

#### Acceptance Criteria

1. THE System SHALL keep the section/routing keys `character` and `estate` unchanged.
2. THE System SHALL keep the sub-tab ids `gear` and `wealth` unchanged.
3. THE System SHALL keep the hash route `#estate` unchanged.
4. THE System SHALL keep the data fields `character.wGC`, `character.wSS`, `character.wD`, and `character.estate.treasury` unchanged.
5. THE System SHALL leave existing deposit and withdraw transfer behaviour unaffected.
6. THE System SHALL leave existing Financial_Ledger and event-log behaviour unaffected.
7. THE System SHALL apply all changes in this feature as display text only.

## Non-Goals / Out of Scope

- No change to the Estate page `estate`, `holdings`, or `enterprises` sub-tab labels.
- No change to the "Coin Purse (carried)" card title (already established by the wealth-treasury-transfer spec).
- No new data model, no new money pool, and no change to transfer, ledger, or event-log logic.
- No read-only display of the opposite pool's balance on each surface. Showing a mirrored balance of the other pool is a possible future enhancement, deferred and not required here.
- No change to the main navigation "Character" item.
