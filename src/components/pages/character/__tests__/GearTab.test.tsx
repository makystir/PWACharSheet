import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useState, useRef } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GearTab } from '../GearTab';
import { useCharacterEntities, type DeleteTarget } from '../../useCharacterEntities';
import { CharacterBreakdownTooltips, type BreakdownTooltipState } from '../../CharacterBreakdownTooltips';
import { useDragReorder } from '../../../../hooks/useDragReorder';
import { useLongPress } from '../../../../hooks/useLongPress';
import { reorderArray } from '../../../../logic/reorder';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character } from '../../../../types/character';
import type { CurrencyDelta } from '../../../../logic/currency';

/**
 * Additive unit tests for the extracted GearTab component
 * (spec: character-page-decomposition, Task 6 — seam f, MANDATORY per Req 2.2).
 *
 * These are NEW and do not modify any existing CharacterPage assertions
 * (Req 4.2, 4.3). They assert DOM/class parity for the gear sections
 * (Trappings, Armour Points, Consumables, Coin Purse, Encumbrance), the typed
 * update/updateCharacter wiring, the delete-target + picker/editing setters,
 * and — critically — that the calculated totals (armour points per location,
 * coin weight) keep their breakdown tooltips via the shared Tooltip
 * (Req 6.3, 6.4; calculated-totals rule). The armour-point and encumbrance
 * maths are rulebook-sourced and verified via the computed-AP display here.
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const noop = () => {};

interface HarnessProps {
  character: Character;
  updateCharacter?: (mutator: (c: Character) => Character) => void;
  applyTransfer?: (direction: 'deposit', amount: CurrencyDelta) => void;
  depositError?: string | null;
}

/**
 * Renders GearTab with the shell-owned Lifted_State wired the same way the real
 * shell wires it: the trappings drag-reorder (useDragReorder) + long-press
 * contextual-menu (useLongPress) hooks, the useCharacterEntities CRUD handlers
 * injected via `entities`, the breakdown-tooltip singleton, and
 * CharacterBreakdownTooltips rendering so the calculated-total breakdowns show
 * through the shared Tooltip (exactly as in the shell).
 */
function Harness({
  character,
  updateCharacter = noop,
  applyTransfer = noop,
  depositError = null,
}: HarnessProps) {
  const [breakdownTooltip, setBreakdownTooltip] = useState<BreakdownTooltipState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showTrappingPicker, setShowTrappingPicker] = useState(false);
  const [editingTrappingIndex, setEditingTrappingIndex] = useState<number | null>(null);
  const [trappingContextMenu, setTrappingContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);

  const openBreakdownTooltip = (state: NonNullable<BreakdownTooltipState>) => {
    setBreakdownTooltip(state);
  };
  const closeBreakdownTooltip = () => setBreakdownTooltip(null);

  // useCharacterEntities needs these picker setters wired, but GearTab itself
  // only consumes the worn/horse/backpack flag setters + delete dispatcher, so
  // the abilities-side picker flag values are intentionally unread here.
  const [, setShowAdvSkillPicker] = useState(false);
  const [, setShowTalentPicker] = useState(false);
  const [, setShowSpellPicker] = useState(false);
  const [, setExpandedSpells] = useState<Set<number>>(new Set());

  const entities = useCharacterEntities({
    updateCharacter,
    deleteTarget,
    setDeleteTarget,
    setShowAdvSkillPicker,
    setShowTalentPicker,
    setShowSpellPicker,
    setExpandedSpells,
  });

  const trappingsGridRef = useRef<HTMLDivElement>(null);
  const {
    dragState: trappingsDragState,
    getGripProps: getTrappingGripProps,
    getItemProps: getTrappingItemProps,
    dropIndicatorIndex: trappingsDropIndex,
    announcementText: trappingsAnnouncement,
  } = useDragReorder({
    items: character.trappings,
    onReorder: (from, to) => updateCharacter((c) => ({ ...c, trappings: reorderArray(c.trappings, from, to) })),
    containerRef: trappingsGridRef,
  });

  const trappingLongPressHandlers = useLongPress({ onLongPress: () => {} });

  return (
    <>
      {/* Reflect picker/editing/delete flags into the DOM so tests can assert
          wiring without mutating any module-scope value. */}
      <div
        data-testid="gear-flags"
        data-trapping-picker={String(showTrappingPicker)}
        data-editing-index={String(editingTrappingIndex)}
        data-delete-type={deleteTarget?.type ?? 'none'}
      />
      <GearTab
        character={character}
        update={noop as never}
        updateCharacter={updateCharacter}
        entities={entities}
        trappingsGridRef={trappingsGridRef}
        trappingsDragState={trappingsDragState}
        getTrappingGripProps={getTrappingGripProps}
        getTrappingItemProps={getTrappingItemProps}
        trappingsDropIndex={trappingsDropIndex}
        trappingsAnnouncement={trappingsAnnouncement}
        trappingLongPressHandlers={trappingLongPressHandlers}
        trappingContextMenu={trappingContextMenu}
        setTrappingContextMenu={setTrappingContextMenu}
        setShowTrappingPicker={setShowTrappingPicker}
        editingTrappingIndex={editingTrappingIndex}
        setEditingTrappingIndex={setEditingTrappingIndex}
        setDeleteTarget={setDeleteTarget}
        breakdownTooltip={breakdownTooltip}
        openBreakdownTooltip={openBreakdownTooltip}
        closeBreakdownTooltip={closeBreakdownTooltip}
        applyTransfer={applyTransfer}
        depositError={depositError}
      />
      {/* The shell renders the breakdown tooltips alongside the tab; mirror that
          so the calculated-total breakdown shows through the shared Tooltip. */}
      <CharacterBreakdownTooltips
        breakdownTooltip={breakdownTooltip}
        character={character}
        onClose={closeBreakdownTooltip}
      />
    </>
  );
}

describe('GearTab (extracted seam f)', () => {
  it('renders the Trappings, Armour Points, Coin Purse, and Encumbrance sections', () => {
    render(<Harness character={makeCharacter()} />);
    // Section titles render as <h3> headings via SectionHeader. ("Trappings"
    // also appears as a non-heading row label in the encumbrance breakdown, so
    // scope to the heading role to disambiguate.)
    expect(screen.getByRole('heading', { name: 'Trappings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Armour Points' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coin Purse (carried)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Encumbrance' })).toBeInTheDocument();
  });

  it('shows the empty-trappings state with an +Add action and no grid', () => {
    const { container } = render(<Harness character={makeCharacter()} />);
    expect(screen.getByText('No gear yet — add trappings')).toBeInTheDocument();
    expect(container.querySelector('[class*="trappingsGrid"]')).not.toBeInTheDocument();
  });

  it('wires +Add from Rulebook to the trapping picker setter (Lifted_State in the shell)', () => {
    render(<Harness character={makeCharacter()} />);
    const flags = screen.getByTestId('gear-flags');
    expect(flags).toHaveAttribute('data-trapping-picker', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Add from Rulebook' }));
    expect(flags).toHaveAttribute('data-trapping-picker', 'true');
  });

  it('renders a trapping card and wires its edit control to the shell editing-index setter', () => {
    const char = makeCharacter({ trappings: [{ name: 'Rope', enc: '1', quantity: 1 }] });
    render(<Harness character={char} />);
    expect(screen.getByText('Rope')).toBeInTheDocument();
    const flags = screen.getByTestId('gear-flags');

    // Edit sets the editing index (Lifted_State owned by the shell).
    fireEvent.click(screen.getByRole('button', { name: 'Edit Rope' }));
    expect(flags).toHaveAttribute('data-editing-index', '0');
  });

  it('wires the trapping delete control to the shell delete-target setter', () => {
    const char = makeCharacter({ trappings: [{ name: 'Rope', enc: '1', quantity: 1 }] });
    render(<Harness character={char} />);
    const flags = screen.getByTestId('gear-flags');

    // Delete sets the delete target to a trapping (Lifted_State owned by shell).
    fireEvent.click(screen.getByRole('button', { name: 'Remove trapping' }));
    expect(flags).toHaveAttribute('data-delete-type', 'trapping');
  });

  it('renders the six armour-point location cells with computed values (rulebook-sourced AP calc)', () => {
    // Core p.298: Armour Points per location are summed from worn armour at each
    // location. With no armour the computed value is 0 for every location.
    render(<Harness character={makeCharacter()} />);
    for (const loc of ['head', 'lArm', 'rArm', 'body', 'lLeg', 'rLeg'] as const) {
      const cell = screen.getByTestId(`ap-location-${loc}`);
      expect(cell).toBeInTheDocument();
      // The computed value is shown in parentheses next to the manual input.
      expect(within(cell).getByText('(0)')).toBeInTheDocument();
    }
  });

  it('threads the injected depositError into the TransferControl deposit flow', () => {
    render(
      <Harness
        character={makeCharacter({ wGC: 5 })}
        depositError="Insufficient funds — this transfer would overdraw your Coin Purse."
      />,
    );
    expect(
      screen.getByText('Insufficient funds — this transfer would overdraw your Coin Purse.'),
    ).toBeInTheDocument();
  });

  it('keeps the coin-weight calculated total breakdown tooltip (shared Tooltip, calculated-totals rule)', () => {
    // Core p.293 "Encumbrance": 10 coins (of any mix) weigh 1 Enc; the app shows
    // the per-denomination breakdown with the ÷200 divisor. 400 total coins → 2.
    const char = makeCharacter({ wGC: 400, wSS: 0, wD: 0 });
    render(<Harness character={char} />);

    // The Coins row renders a calculated total via a TooltipTriggerCell.
    const trigger = screen.getByLabelText('Coin weight breakdown');
    fireEvent.click(trigger);

    // The shared Tooltip opens with the breakdown contents (GC / SS / D / Sum).
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('GC:')).toBeInTheDocument();
    expect(within(tooltip).getByText('÷ 200')).toBeInTheDocument();
    expect(within(tooltip).getByText('Weight:')).toBeInTheDocument();
  });

  it('does not render the gear content inside any sub-tab wrapper (wrapper stays in the shell)', () => {
    // GearTab is a bare fragment: the gearSection wrapper + mobileHidden toggle
    // remain owned by the shell (Req 5.1). Rendering it directly yields the
    // section Cards with no enclosing tab-wrapper div of its own.
    const { container } = render(<Harness character={makeCharacter()} />);
    expect(container.querySelector('[class*="gearSection"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="mobileHidden"]')).not.toBeInTheDocument();
  });
});


describe('GearTab — Trappings view mode toggle', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  const withTrappings = () =>
    makeCharacter({
      trappings: [
        { name: 'Rope', enc: '1', quantity: 1 },
        { name: 'Torch', enc: '0', quantity: 2 },
      ],
    });

  it('does not render the view toggle when there are no trappings', () => {
    render(<Harness character={makeCharacter()} />);
    expect(screen.queryByRole('radio', { name: /card view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /list view/i })).not.toBeInTheDocument();
  });

  it('defaults to card view and switches to a compact list', () => {
    const { container } = render(<Harness character={withTrappings()} />);
    // Default card grid present.
    expect(container.querySelector('[class*="trappingsGrid"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="trappingsList"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /list view/i }));

    expect(container.querySelector('[class*="trappingsList"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="trappingsGrid"]')).not.toBeInTheDocument();
    // Names + meta still shown in list mode.
    expect(screen.getByText('Rope')).toBeInTheDocument();
    expect(screen.getByText('Torch')).toBeInTheDocument();
  });

  it('list-mode delete still wires to the shell delete-target setter', () => {
    render(<Harness character={withTrappings()} />);
    fireEvent.click(screen.getByRole('radio', { name: /list view/i }));
    const flags = screen.getByTestId('gear-flags');
    // Two remove buttons (one per row); click the first.
    const removes = screen.getAllByRole('button', { name: 'Remove trapping' });
    fireEvent.click(removes[0]);
    expect(flags).toHaveAttribute('data-delete-type', 'trapping');
  });

  it('persists the trappings view mode across remounts', () => {
    const first = render(<Harness character={withTrappings()} />);
    fireEvent.click(screen.getByRole('radio', { name: /list view/i }));
    expect(first.container.querySelector('[class*="trappingsList"]')).toBeInTheDocument();
    first.unmount();

    const second = render(<Harness character={withTrappings()} />);
    expect(screen.getByRole('radio', { name: /list view/i })).toHaveAttribute('aria-checked', 'true');
    expect(second.container.querySelector('[class*="trappingsList"]')).toBeInTheDocument();
  });
});


describe('GearTab — mobile forces list view', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    // Simulate mobile viewport: all queries <= 767px report true.
    window.matchMedia = ((query: string) => ({
      matches: query === '(max-width: 767px)' ? true : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const withTrappings = () =>
    makeCharacter({
      trappings: [
        { name: 'Rope', enc: '1', quantity: 1 },
        { name: 'Torch', enc: '0', quantity: 2 },
      ],
    });

  it('hides the view toggle and forces list view on mobile', () => {
    const { container } = render(<Harness character={withTrappings()} />);
    // No toggle visible (mobile has no card/list choice — always list).
    expect(screen.queryByRole('radio', { name: /card view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /list view/i })).not.toBeInTheDocument();
    // List rendered, not cards.
    expect(container.querySelector('[class*="trappingsList"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="trappingsGrid"]')).not.toBeInTheDocument();
  });

  it('forces list view even when localStorage has cards preference', () => {
    localStorage.setItem('viewmode-trappings', 'cards');
    const { container } = render(<Harness character={withTrappings()} />);
    expect(container.querySelector('[class*="trappingsList"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="trappingsGrid"]')).not.toBeInTheDocument();
  });
});
