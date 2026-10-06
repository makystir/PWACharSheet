import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { Character, FieldPath, FieldValue } from '../../../types/character';
import { Card } from '../../shared/Card';
import { SectionHeader } from '../../shared/SectionHeader';
import { EditableField } from '../../shared/EditableField';
import { AddButton } from '../../shared/AddButton';
import { EmptyState } from '../../shared/EmptyState';
import { Package, Coins, Scale, Shield, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { calculateMaxEncumbrance, calculateCoinWeight, calculateArmourPoints } from '../../../logic/calculators';
import { getEncumbranceLevel, formatEncumbrance, calculateArmourEncumbrance, isWearableTrapping, calculateCarriedTrappingEnc, calculateHorseTrappingEnc } from '../../../logic/encumbrance';
import { applyCurrencyDelta } from '../../../logic/currency';
import { reorderArray } from '../../../logic/reorder';
import { ProgressBar } from '../../shared/ProgressBar';
import { DragHandle } from '../../shared/DragHandle';
import { AriaLiveAnnouncer } from '../../shared/AriaLiveAnnouncer';
import { ContextualMenu } from '../../shared/ContextualMenu';
import { CurrencyInput } from '../../shared/CurrencyInput';
import { ConsumablesPanel } from '../../shared/ConsumablesPanel';
import { ViewModeToggle } from '../../shared/ViewModeToggle';
import { useViewMode } from '../../../hooks/useViewMode';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { TransferControl } from '../../shared/TransferControl';
import { TooltipTriggerCell } from '../../shared/TooltipTriggerCell';
import type { CurrencyDelta } from '../../../logic/currency';
import type { UseDragReorderResult, DragState } from '../../../hooks/useDragReorder';
import type { BreakdownTooltipState } from '../CharacterBreakdownTooltips';
import type { DeleteTarget, useCharacterEntities } from '../useCharacterEntities';
// Import the SAME stylesheet as the CharacterPage shell so class names stay
// byte-identical after extraction (spec: character-page-decomposition, Req 3.3).
import styles from '../CharacterPage.module.css';

/** Touch handlers produced by `useLongPress` (shell-owned, injected). */
interface TrappingLongPressHandlers {
  onTouchStart: ((e: React.TouchEvent) => void) | undefined;
  onTouchEnd: ((e: React.TouchEvent) => void) | undefined;
  onTouchMove: ((e: React.TouchEvent) => void) | undefined;
}

interface GearTabProps {
  character: Character;
  /** Typed single-field update, unchanged from CharacterPageProps (Req 6.1, 6.2). */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /** The `useCharacterEntities` result (CRUD handlers), injected per Req 5.3. */
  entities: ReturnType<typeof useCharacterEntities>;
  /** Trappings drag-reorder state + handlers (useDragReorder), injected per Req 5.2/5.3. */
  trappingsGridRef: RefObject<HTMLDivElement | null>;
  trappingsDragState: DragState;
  getTrappingGripProps: UseDragReorderResult['getGripProps'];
  getTrappingItemProps: UseDragReorderResult['getItemProps'];
  trappingsDropIndex: number | null;
  trappingsAnnouncement: string;
  /** Long-press contextual-menu handlers + state (Lifted_State in the shell). */
  trappingLongPressHandlers: TrappingLongPressHandlers;
  trappingContextMenu: { x: number; y: number; index: number } | null;
  setTrappingContextMenu: Dispatch<SetStateAction<{ x: number; y: number; index: number } | null>>;
  /** Picker / editing / delete setters (Lifted_State in the shell). */
  setShowTrappingPicker: Dispatch<SetStateAction<boolean>>;
  editingTrappingIndex: number | null;
  setEditingTrappingIndex: Dispatch<SetStateAction<number | null>>;
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
  /**
   * Breakdown tooltip state owned by the shell (Lifted_State — Req 5.1, 5.4):
   * the encumbrance / coin-weight / trappings-enc calculated-total breakdowns.
   */
  breakdownTooltip: BreakdownTooltipState;
  openBreakdownTooltip: (state: NonNullable<BreakdownTooltipState>) => void;
  closeBreakdownTooltip: () => void;
  /** Wealth → Treasury deposit, injected from `useWealthTransfer` (seam h / Task 4). */
  applyTransfer: (direction: 'deposit', amount: CurrencyDelta) => void;
  depositError: string | null;
}

/**
 * Gear Sub_Tab content extracted verbatim from CharacterPage
 * (spec: character-page-decomposition, seam f — MANDATORY per Req 2.2):
 * Encumbrance indicator + Trappings grid (drag-reorder + long-press contextual
 * menu) + Armour Points auto-calculation + Consumables + Coin Purse / Wealth →
 * Treasury deposit + Encumbrance breakdown.
 *
 * Behaviour-preserving: DOM structure, ARIA, and CSS module classes are
 * identical to the pre-refactor inline blocks (Req 3.1, 3.2, 3.3). All
 * Lifted_State (trapping context menu, picker/editing/delete flags, the
 * breakdown-tooltip singleton) stays owned by the shell and is injected here as
 * props (Req 5.1, 5.4); the `useCharacterEntities` worn/horse/backpack flag
 * setters + delete dispatcher are injected via `entities` rather than
 * re-declared (Req 5.3), and the Wealth → Treasury deposit (`applyTransfer` /
 * `depositError`) is injected from `useWealthTransfer` (seam h / Task 4).
 *
 * Armour-point and encumbrance maths are rulebook-sourced and copied VERBATIM
 * with their source-citing comments preserved (rules-compliance). The
 * calculated totals (armour points per location, encumbrance totals, coin
 * weight) keep their breakdown tooltips via the shared Tooltip /
 * TooltipTriggerCell wiring unchanged (Req 6.3, 6.4; calculated-totals rule).
 */
export function GearTab({
  character,
  update,
  updateCharacter,
  entities,
  trappingsGridRef,
  trappingsDragState,
  getTrappingGripProps,
  getTrappingItemProps,
  trappingsDropIndex,
  trappingsAnnouncement,
  trappingLongPressHandlers,
  trappingContextMenu,
  setTrappingContextMenu,
  setShowTrappingPicker,
  editingTrappingIndex,
  setEditingTrappingIndex,
  setDeleteTarget,
  breakdownTooltip,
  openBreakdownTooltip,
  closeBreakdownTooltip,
  applyTransfer,
  depositError,
}: GearTabProps) {
  const { setWorn, setStoredOnHorse, setInBackpack } = entities;
  const { mode: trappingsView, setMode: setTrappingsView } = useViewMode('viewmode-trappings', 'cards');
  // On mobile the small gear cards misalign, so list view is the only option there.
  const isMobile = useMediaQuery('(max-width: 767px)');
  const effectiveTrappingsView = isMobile ? 'list' : trappingsView;

  return (
    <>
      {/* Encumbrance Indicator */}
      {(() => {
        const eW = character.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
        const eA = character.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
        const eT = calculateCarriedTrappingEnc(character.trappings, character.houseRules.ignoreBackpackEnc);
        const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
        const currentEnc = eW + eA + eT + eCoin;
        const strongBackTalent = character.talents.find(t => t.n === 'Strong Back');
        const strongBackLevel = strongBackTalent ? strongBackTalent.lvl : 0;
        const sturdyTalent = character.talents.find(t => t.n === 'Sturdy');
        const sturdyLevel = sturdyTalent ? sturdyTalent.lvl : 0;
        const maxEnc = calculateMaxEncumbrance(character.chars, strongBackLevel, sturdyLevel);
        const level = getEncumbranceLevel(currentEnc, maxEnc);
        const label = formatEncumbrance(currentEnc, maxEnc);
        return (
          <ProgressBar
            current={currentEnc}
            max={maxEnc}
            level={level}
            label={label}
            ariaLabel="Encumbrance progress"
          />
        );
      })()}
      {/* Trappings */}
      <Card>
        <SectionHeader icon={Package} title="Trappings" action={
          <div className={styles.actionRow}>
            {character.trappings.length > 0 && !isMobile && (
              <ViewModeToggle mode={trappingsView} onChange={setTrappingsView} label="Trappings view" />
            )}
            <AddButton label="Add from Rulebook" onClick={() => setShowTrappingPicker(true)} />
            <AddButton label="Add Custom" onClick={() => updateCharacter((c) => ({ ...c, trappings: [...c.trappings, { name: '', enc: '0', quantity: 1 }] }))} />
          </div>
        } />
        {character.trappings.length === 0 ? (
          <EmptyState
            icon={Package}
            heading="No gear yet — add trappings"
            compact
            action={{ label: '+ Add', onClick: () => setShowTrappingPicker(true) }}
          />
        ) : effectiveTrappingsView === 'list' ? (
          <div className={styles.trappingsList}>
            {character.trappings.map((t, i) =>
              editingTrappingIndex === i ? (
                <div key={i} className={styles.trappingListRow} data-trapping-index={i}>
                  <div className={styles.trappingEditForm} style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => update(`trappings.${i}.name`, e.target.value)}
                      placeholder="Trapping name"
                      className={styles.trappingEditInput}
                      aria-label="Trapping name"
                    />
                    <div className={styles.trappingEditRow}>
                      <input
                        type="text"
                        value={t.enc}
                        onChange={(e) => update(`trappings.${i}.enc`, e.target.value)}
                        placeholder="Enc"
                        className={styles.trappingEditInputSmall}
                        aria-label="Encumbrance"
                      />
                      <input
                        type="number"
                        value={t.quantity || 1}
                        onChange={(e) => update(`trappings.${i}.quantity`, Math.max(1, Number(e.target.value) || 1))}
                        placeholder="Qty"
                        className={styles.trappingEditInputSmall}
                        aria-label="Quantity"
                        min={1}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.trappingEditDoneBtn}
                      onClick={() => setEditingTrappingIndex(null)}
                    >Done</button>
                  </div>
                </div>
              ) : (
              <div key={i} className={styles.trappingListRow} data-trapping-index={i}>
                <span className={styles.trappingListName}>{t.name || '(unnamed)'}</span>
                <span className={styles.trappingListMeta}>Enc {t.enc || '0'} · Qty {t.quantity || 1}</span>
                <span className={styles.trappingListActions}>
                  <label
                    className={styles.horseIndicator}
                    aria-label="Stored on horse — does not count toward personal encumbrance"
                    title="Stored on horse — does not count toward personal encumbrance"
                  >
                    <input
                      type="checkbox"
                      checked={!!t.storedOnHorse}
                      onChange={(e) => setStoredOnHorse(i, e.target.checked)}
                      className={styles.trappingHorseCheckbox}
                    />
                    <span className={styles.horseIcon} aria-hidden="true">🐎</span>
                  </label>
                  {isWearableTrapping(t.name) && (
                    <label
                      className={styles.wornIndicator}
                      aria-label={`Worn — reduces ${t.name || 'this trapping'}'s encumbrance by 1 per item (min 0)`}
                      title="Worn — reduces encumbrance by 1 per item (min 0)"
                    >
                      <input
                        type="checkbox"
                        checked={!!t.worn}
                        onChange={(e) => setWorn(i, e.target.checked)}
                        className={styles.trappingWornCheckbox}
                      />
                      <span className={styles.wornIcon} aria-hidden="true">👕</span>
                    </label>
                  )}
                  {character.houseRules.ignoreBackpackEnc && (
                    <label
                      className={styles.wornIndicator}
                      aria-label={`In backpack — ${t.name || 'this trapping'} counts as 0 encumbrance (house rule)`}
                      title="In backpack — counts as 0 encumbrance (house rule)"
                    >
                      <input
                        type="checkbox"
                        checked={!!t.inBackpack}
                        onChange={(e) => setInBackpack(i, e.target.checked)}
                        className={styles.trappingWornCheckbox}
                      />
                      <span className={styles.wornIcon} aria-hidden="true">🎒</span>
                    </label>
                  )}
                  <button type="button" onClick={() => setEditingTrappingIndex(i)} className={styles.trappingEditBtn} aria-label={`Edit ${t.name || 'trapping'}`}>✎</button>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'trapping', index: i })} className={styles.deleteBtn} aria-label="Remove trapping">✕</button>
                </span>
              </div>
              ),
            )}
          </div>
        ) : (
          <div className={styles.trappingsGrid} ref={trappingsGridRef}>
            {character.trappings.map((t, i) => (
              <div
                key={i}
                data-drag-item=""
                data-trapping-index={i}
                aria-grabbed={trappingsDragState.status === 'dragging' && trappingsDragState.dragIndex === i ? true : undefined}
                style={getTrappingItemProps(i).style}
                className={`${t.storedOnHorse ? styles.trappingCardHorse : styles.trappingCard}${trappingsDragState.status === 'dragging' && trappingsDragState.dragIndex === i ? ` ${styles.trappingDragging}` : ''}${trappingsDropIndex === i ? ` ${styles.trappingDropTarget}` : ''}`}
                onTouchStart={trappingLongPressHandlers.onTouchStart}
                onTouchEnd={trappingLongPressHandlers.onTouchEnd}
                onTouchMove={trappingLongPressHandlers.onTouchMove}
              >
                {editingTrappingIndex === i ? (
                  <div className={styles.trappingEditForm}>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => update(`trappings.${i}.name`, e.target.value)}
                      placeholder="Trapping name"
                      className={styles.trappingEditInput}
                      aria-label="Trapping name"
                    />
                    <div className={styles.trappingEditRow}>
                      <input
                        type="text"
                        value={t.enc}
                        onChange={(e) => update(`trappings.${i}.enc`, e.target.value)}
                        placeholder="Enc"
                        className={styles.trappingEditInputSmall}
                        aria-label="Encumbrance"
                      />
                      <input
                        type="number"
                        value={t.quantity || 1}
                        onChange={(e) => update(`trappings.${i}.quantity`, Math.max(1, Number(e.target.value) || 1))}
                        placeholder="Qty"
                        className={styles.trappingEditInputSmall}
                        aria-label="Quantity"
                        min={1}
                      />
                    </div>
                    <div className={styles.trappingEditRow}>
                      <input
                        type="checkbox"
                        checked={!!t.storedOnHorse}
                        onChange={(e) => setStoredOnHorse(i, e.target.checked)}
                        className={styles.trappingHorseCheckbox}
                        aria-label="Stored on horse"
                      />
                      <span className={styles.trappingEditLabel}>Stored on horse</span>
                    </div>
                    {/* Worn toggle — wearable trappings only (Core p.293 Worn Items). Req 2.4, 2.5, 8.1-8.3 */}
                    {isWearableTrapping(t.name) && (
                      <div className={styles.trappingEditRow}>
                        <input
                          type="checkbox"
                          checked={!!t.worn}
                          onChange={(e) => setWorn(i, e.target.checked)}
                          className={styles.trappingWornCheckbox}
                          aria-label={`Worn — reduces ${t.name || 'this trapping'}'s encumbrance by 1 per item (min 0)`}
                        />
                        <span className={styles.trappingEditLabel}>Worn</span>
                      </div>
                    )}
                    {/* In backpack — house rule: when ignoreBackpackEnc is on, packed items count 0 Enc */}
                    {character.houseRules.ignoreBackpackEnc && (
                      <div className={styles.trappingEditRow}>
                        <input
                          type="checkbox"
                          checked={!!t.inBackpack}
                          onChange={(e) => setInBackpack(i, e.target.checked)}
                          className={styles.trappingWornCheckbox}
                          aria-label={`In backpack — ${t.name || 'this trapping'} counts as 0 encumbrance (house rule)`}
                        />
                        <span className={styles.trappingEditLabel}>In backpack</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className={styles.trappingEditDoneBtn}
                      onClick={() => setEditingTrappingIndex(null)}
                    >Done</button>
                  </div>
                ) : (
                  <>
                    <div className={styles.trappingActions}>
                      <DragHandle
                        onMoveUp={() => updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, i, i - 1) }))}
                        onMoveDown={() => updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, i, i + 1) }))}
                        isFirst={i === 0}
                        isLast={i === character.trappings.length - 1}
                        itemLabel={t.name || 'trapping'}
                        gripProps={getTrappingGripProps(i)}
                      />
                      <label
                        className={styles.horseIndicator}
                        aria-label="Stored on horse — does not count toward personal encumbrance"
                        title="Stored on horse — does not count toward personal encumbrance"
                      >
                        <input
                          type="checkbox"
                          checked={!!t.storedOnHorse}
                          onChange={(e) => setStoredOnHorse(i, e.target.checked)}
                          className={styles.trappingHorseCheckbox}
                          disabled={trappingsDragState.status === 'dragging'}
                        />
                        <span className={styles.horseIcon} aria-hidden="true">🐎</span>
                      </label>
                      {/* Worn toggle — wearable trappings only (Core p.293 Worn Items). Req 2.4, 2.5, 8.1-8.3 */}
                      {isWearableTrapping(t.name) && (
                        <label
                          className={styles.wornIndicator}
                          aria-label={`Worn — reduces ${t.name || 'this trapping'}'s encumbrance by 1 per item (min 0)`}
                          title="Worn — reduces encumbrance by 1 per item (min 0)"
                        >
                          <input
                            type="checkbox"
                            checked={!!t.worn}
                            onChange={(e) => setWorn(i, e.target.checked)}
                            className={styles.trappingWornCheckbox}
                            disabled={trappingsDragState.status === 'dragging'}
                          />
                          <span className={styles.wornIcon} aria-hidden="true">👕</span>
                        </label>
                      )}
                      {/* In-backpack toggle — only when the house rule is enabled */}
                      {character.houseRules.ignoreBackpackEnc && (
                        <label
                          className={styles.wornIndicator}
                          aria-label={`In backpack — ${t.name || 'this trapping'} counts as 0 encumbrance (house rule)`}
                          title="In backpack — counts as 0 encumbrance (house rule)"
                        >
                          <input
                            type="checkbox"
                            checked={!!t.inBackpack}
                            onChange={(e) => setInBackpack(i, e.target.checked)}
                            className={styles.trappingWornCheckbox}
                            disabled={trappingsDragState.status === 'dragging'}
                          />
                          <span className={styles.wornIcon} aria-hidden="true">🎒</span>
                        </label>
                      )}
                      <button type="button" onClick={() => setEditingTrappingIndex(i)} className={styles.trappingEditBtn} aria-label={`Edit ${t.name || 'trapping'}`} disabled={trappingsDragState.status === 'dragging'}>✎</button>
                      <button type="button" onClick={() => setDeleteTarget({ type: 'trapping', index: i })} className={styles.deleteBtn} aria-label="Remove trapping">✕</button>
                    </div>
                    <div className={styles.trappingInfo}>
                      <span className={styles.trappingName}>{t.name || '(unnamed)'}</span>
                      <span className={styles.trappingMeta}>
                        Enc {t.enc || '0'} · Qty {t.quantity || 1}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <AriaLiveAnnouncer message={trappingsAnnouncement} />

        {trappingContextMenu && (
          <ContextualMenu
            x={trappingContextMenu.x}
            y={trappingContextMenu.y}
            items={[
              {
                label: 'Edit',
                icon: Pencil,
                onAction: () => setEditingTrappingIndex(trappingContextMenu.index),
              },
              {
                label: 'Delete',
                icon: Trash2,
                onAction: () => setDeleteTarget({ type: 'trapping', index: trappingContextMenu.index }),
                destructive: true,
              },
              {
                label: 'Move',
                icon: ArrowUpDown,
                onAction: () => {
                  const idx = trappingContextMenu.index;
                  if (idx > 0) {
                    updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, idx, idx - 1) }));
                  } else if (idx < character.trappings.length - 1) {
                    updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, idx, idx + 1) }));
                  }
                },
              },
            ]}
            onDismiss={() => setTrappingContextMenu(null)}
          />
        )}
      </Card>

      {/* AP Auto-Calculation */}
      {(() => {
        const computedAP = calculateArmourPoints(character.armour);
        const manualAP = character.ap;
        const locations: { key: 'head' | 'lArm' | 'rArm' | 'body' | 'lLeg' | 'rLeg'; computedKey: keyof typeof computedAP; label: string }[] = [
          { key: 'head', computedKey: 'head', label: 'Head' },
          { key: 'lArm', computedKey: 'lArm', label: 'L Arm' },
          { key: 'rArm', computedKey: 'rArm', label: 'R Arm' },
          { key: 'body', computedKey: 'body', label: 'Body' },
          { key: 'lLeg', computedKey: 'lLeg', label: 'L Leg' },
          { key: 'rLeg', computedKey: 'rLeg', label: 'R Leg' },
        ];
        const hasAnyDiscrepancy = locations.some(loc => manualAP[loc.key] !== computedAP[loc.computedKey]);

        return (
          <Card>
            <SectionHeader icon={Shield} title="Armour Points" action={
              <button
                type="button"
                className={styles.apSyncBtn}
                disabled={!hasAnyDiscrepancy}
                onClick={() => {
                  updateCharacter((c) => ({
                    ...c,
                    ap: {
                      ...c.ap,
                      head: computedAP.head,
                      lArm: computedAP.lArm,
                      rArm: computedAP.rArm,
                      body: computedAP.body,
                      lLeg: computedAP.lLeg,
                      rLeg: computedAP.rLeg,
                    },
                  }));
                }}
                title="Set manual AP values to match computed values from armour"
                aria-label="Sync AP to computed values"
              >
                Sync
              </button>
            } />
            <div className={styles.apGrid}>
              {locations.map(loc => {
                const manual = manualAP[loc.key];
                const computed = computedAP[loc.computedKey];
                const hasDiscrepancy = manual !== computed;
                return (
                  <div
                    key={loc.key}
                    className={hasDiscrepancy ? styles.apLocationCellDiscrepancy : styles.apLocationCell}
                    data-testid={`ap-location-${loc.key}`}
                  >
                    <span className={styles.apLocationLabel}>{loc.label}</span>
                    <div className={styles.apValues}>
                      <input
                        type="number"
                        value={manual}
                        onChange={(e) => update(`ap.${loc.key}`, Math.max(0, Number(e.target.value) || 0))}
                        className={styles.numInput}
                        aria-label={`${loc.label} AP`}
                        min={0}
                      />
                      <span className={hasDiscrepancy ? styles.apComputedValueDiscrepancy : styles.apComputedValue} title="Computed from worn armour">
                        ({computed})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Consumables */}
      <ConsumablesPanel character={character} updateCharacter={updateCharacter} />

      {/* Wealth & Encumbrance */}
      <Card>
        <div className={styles.wealthEncGrid}>
          <div>
            <SectionHeader icon={Coins} title="Coin Purse (carried)" />
            {/* Balance group: the three editable denomination fields.
                Core p.294 "Money": the three currency denominations are Gold
                Crowns (GC), Silver Shillings (SS), and Brass Pennies (d), each a
                whole-coin count. EditableField hands back `string | number`, so
                coerce to a number (empty/invalid → 0) at the source to keep the
                stored coin counts numeric — do not cast (spec: state-safety-core,
                Req 2.1/2.3). */}
            <div className={styles.coinPurseGroup}>
              <EditableField label="Gold Crowns (GC)" value={character.wGC} type="number" mode="always-editable" onSave={(v) => update('wGC', Number(v) || 0)} />
              <EditableField label="Silver Shillings (SS)" value={character.wSS} type="number" mode="always-editable" onSave={(v) => update('wSS', Number(v) || 0)} />
              <EditableField label="Brass Pennies (D)" value={character.wD} type="number" mode="always-editable" onSave={(v) => update('wD', Number(v) || 0)} />
            </div>
            {/* Quick Adjust group: add/subtract coin from the carried purse. */}
            <div className={styles.coinPurseGroup}>
              <div className={styles.coinPurseGroupLabel}>Quick Adjust</div>
              <CurrencyInput onSubmit={(delta) => {
                const current = { gc: character.wGC || 0, ss: character.wSS || 0, d: character.wD || 0 };
                const result = applyCurrencyDelta(current, delta);
                update('wGC', result.gc);
                update('wSS', result.ss);
                update('wD', result.d);
              }} />
            </div>
            {/* Deposit to Treasury group. */}
            <div className={styles.coinPurseGroup}>
              <div className={styles.coinPurseGroupLabel}>Deposit to Treasury</div>
              {/* Deposit_Control: move coin from Personal Wealth into the estate
                  Treasury (wealth-treasury-transfer Req 1.1). */}
              <TransferControl
                direction="deposit"
                source={{ gc: character.wGC || 0, ss: character.wSS || 0, d: character.wD || 0 }}
                destination={{
                  gc: character.estate.treasury?.gc || 0,
                  ss: character.estate.treasury?.ss || 0,
                  d: character.estate.treasury?.d || 0,
                }}
                labels={{ source: 'Coin Purse', destination: 'Treasury' }}
                onSubmit={(amount) => applyTransfer('deposit', amount)}
                error={depositError}
              />
              {/* Coin Purse → Treasury cross-reference hint (money-locations-clarity
                  Req 4.1/4.2/4.3). Rendered unconditionally: character.estate is a
                  required field always present via BLANK_CHARACTER (Design Decision 1). */}
              <p className={styles.crossRefHint}>Estate funds are stored in the Treasury (Estate page).</p>
            </div>
          </div>
          <div>
            <SectionHeader icon={Scale} title="Encumbrance" />
            {(() => {
              const eW = character.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
              const eA = character.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
              const eT = calculateCarriedTrappingEnc(character.trappings, character.houseRules.ignoreBackpackEnc);
              const eHorse = calculateHorseTrappingEnc(character.trappings);
              const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
              const eTotal = eW + eA + eT + eCoin;
              const strongBackTalent = character.talents.find(t => t.n === 'Strong Back');
              const strongBackLevel = strongBackTalent ? strongBackTalent.lvl : 0;
              const sturdyTalent = character.talents.find(t => t.n === 'Sturdy');
              const sturdyLevel = sturdyTalent ? sturdyTalent.lvl : 0;
              const maxEnc = calculateMaxEncumbrance(character.chars, strongBackLevel, sturdyLevel);
              const over = eTotal > maxEnc;
              return (
                <div className={styles.encBreakdown}>
                  <div className={styles.encRow}><span className={styles.encLabel}>Weapons</span><span>{eW}</span></div>
                  <div className={styles.encRow}><span className={styles.encLabel}>Armour</span><span>{eA}</span></div>
                  <div className={styles.encRow}>
                    <span className={styles.encLabel}>Trappings</span>
                    <TooltipTriggerCell
                      tooltipId="tooltip-breakdown-trappingEnc"
                      displayValue={eT}
                      isTooltipOpen={breakdownTooltip?.type === 'trappingEnc'}
                      onOpen={(anchorEl) => openBreakdownTooltip({ type: 'trappingEnc', anchorEl })}
                      onClose={closeBreakdownTooltip}
                      ariaLabel="Trappings encumbrance breakdown"
                    />
                  </div>
                  <div className={styles.encRow}>
                    <span className={styles.encLabel}>Coins</span>
                    <TooltipTriggerCell
                      tooltipId="tooltip-breakdown-coinWeight"
                      displayValue={eCoin}
                      isTooltipOpen={breakdownTooltip?.type === 'coinWeight'}
                      onOpen={(anchorEl) => openBreakdownTooltip({ type: 'coinWeight', anchorEl })}
                      onClose={closeBreakdownTooltip}
                      ariaLabel="Coin weight breakdown"
                    />
                  </div>
                  <div className={styles.encTotalRow}>
                    <span className={over ? styles.encTotalOver : styles.encTotalNormal}>Total</span>
                    <span className={over ? styles.encTotalValueOver : styles.encTotalValueNormal}>{eTotal} / <TooltipTriggerCell
                      tooltipId="tooltip-breakdown-encumbrance"
                      displayValue={maxEnc}
                      isTooltipOpen={breakdownTooltip?.type === 'encumbrance'}
                      onOpen={(anchorEl) => openBreakdownTooltip({ type: 'encumbrance', anchorEl })}
                      onClose={closeBreakdownTooltip}
                      ariaLabel="Max encumbrance breakdown"
                    /></span>
                  </div>
                  {over && <div className={styles.overburdenedMsg}>⚠ Overburdened</div>}
                  {eHorse > 0 && (() => {
                    const packAnimal = character.companions.find(c => c.isPackAnimal);
                    const packName = packAnimal ? packAnimal.name || packAnimal.species : 'Pack Animal';
                    return (
                      <div className={styles.horseEncRow}>
                        <span className={styles.horseEncLabel}>🐴 {packName}</span>
                        <span className={styles.horseEncValue}>{eHorse}</span>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
    </>
  );
}
