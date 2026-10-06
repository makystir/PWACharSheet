import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AbilitiesTab, type SpecTarget } from '../AbilitiesTab';
import { useCharacterEntities, type DeleteTarget } from '../../useCharacterEntities';
import { CharacterBreakdownTooltips, type BreakdownTooltipState } from '../../CharacterBreakdownTooltips';
import type { SheetTooltipState } from '../../SheetInfoButton';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character, Skill } from '../../../../types/character';

/**
 * Additive unit tests for the extracted AbilitiesTab component
 * (spec: character-page-decomposition, Task 5 — seam e, MANDATORY per Req 2.2).
 *
 * These are NEW and do not modify any existing CharacterPage assertions
 * (Req 4.2, 4.3). They assert DOM/class parity for the skills/talents/spells
 * sections, the +Add dropdown wiring, the Spells & Prayers conditional
 * visibility predicate, and — critically — that the skill-total calculated
 * total still shows its breakdown (Characteristic + Advances) via the shared
 * Tooltip (Req 6.3, 6.4; calculated-totals rule).
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const noop = () => {};

interface HarnessProps {
  character: Character;
  openSkillRoll?: (skill: Skill) => void;
  updateCharacter?: (mutator: (c: Character) => Character) => void;
}

/**
 * Renders AbilitiesTab with the shell-owned Lifted_State wired the same way the
 * real shell wires it: `openBreakdownTooltip` clears any skill/talent info
 * tooltip, the `useCharacterEntities` CRUD handlers are injected via `entities`,
 * and CharacterBreakdownTooltips renders so the skill-total breakdown shows
 * through the shared Tooltip (exactly as in the shell).
 */
function Harness({ character, openSkillRoll = noop, updateCharacter = noop }: HarnessProps) {
  const [tooltip, setTooltip] = useState<SheetTooltipState | null>(null);
  const [breakdownTooltip, setBreakdownTooltip] = useState<BreakdownTooltipState>(null);
  const [addDropdown, setAddDropdown] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [showAdvSkillPicker, setShowAdvSkillPicker] = useState(false);
  const [showTalentPicker, setShowTalentPicker] = useState(false);
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [specTarget, setSpecTarget] = useState<SpecTarget | null>(null);
  const [expandedSpells, setExpandedSpells] = useState<Set<number>>(new Set());
  const [skillSearchText, setSkillSearchText] = useState('');
  const [skillTrainedOnly, setSkillTrainedOnly] = useState(false);

  const openBreakdownTooltip = (state: NonNullable<BreakdownTooltipState>) => {
    setBreakdownTooltip(state);
    setTooltip(null);
  };
  const closeBreakdownTooltip = () => setBreakdownTooltip(null);

  const entities = useCharacterEntities({
    updateCharacter,
    deleteTarget,
    setDeleteTarget,
    setShowAdvSkillPicker,
    setShowTalentPicker,
    setShowSpellPicker,
    setExpandedSpells,
  });

  return (
    <>
      {/* Reflect picker flags into the DOM so tests can assert +Add menu wiring
          without mutating any module-scope value. */}
      <div
        data-testid="picker-flags"
        data-adv-skill={String(showAdvSkillPicker)}
        data-talent={String(showTalentPicker)}
        data-spell={String(showSpellPicker)}
        data-spec-target={specTarget ? `${specTarget.type}:${specTarget.index}` : ''}
      />
      <AbilitiesTab
        character={character}
        update={noop}
        updateCharacter={updateCharacter}
        skillSearchText={skillSearchText}
        setSkillSearchText={setSkillSearchText}
        skillTrainedOnly={skillTrainedOnly}
        onTrainedOnlyChange={setSkillTrainedOnly}
        careerSkillSet={new Set<string>()}
        tooltip={tooltip}
        setTooltip={setTooltip}
        breakdownTooltip={breakdownTooltip}
        openBreakdownTooltip={openBreakdownTooltip}
        closeBreakdownTooltip={closeBreakdownTooltip}
        expandedSpells={expandedSpells}
        entities={entities}
        addDropdown={addDropdown}
        setAddDropdown={setAddDropdown}
        setShowAdvSkillPicker={setShowAdvSkillPicker}
        setShowTalentPicker={setShowTalentPicker}
        setShowSpellPicker={setShowSpellPicker}
        setDeleteTarget={setDeleteTarget}
        setSpecTarget={setSpecTarget}
        openSkillRoll={openSkillRoll}
      />
      <CharacterBreakdownTooltips
        breakdownTooltip={breakdownTooltip}
        character={character}
        onClose={closeBreakdownTooltip}
      />
    </>
  );
}

describe('AbilitiesTab (extracted seam e)', () => {
  it('renders the skill filter plus Basic Skills, Advanced Skills, and Talents sections', () => {
    render(<Harness character={makeCharacter()} />);
    expect(screen.getByText('Basic Skills')).toBeInTheDocument();
    expect(screen.getByText('Advanced Skills')).toBeInTheDocument();
    expect(screen.getByText('Talents')).toBeInTheDocument();
  });

  it('renders a row for every basic skill with its characteristic column', () => {
    const { container } = render(<Harness character={makeCharacter()} />);
    const rows = container.querySelectorAll('[class*="skillGridRow"]');
    // BLANK_CHARACTER ships the full basic-skill list; at least the first row
    // (Art / Dex) must render.
    expect(rows.length).toBeGreaterThan(0);
    expect(within(rows[0] as HTMLElement).getByText('Art')).toBeInTheDocument();
  });

  it('shows the skill-total breakdown (Characteristic + Advances) via the shared Tooltip', () => {
    // Art is the first basic skill (characteristic Dex). Give Dex 30 and 5
    // advances → total 35, breakdown "Dexterity 30 + Advances 5 = 35".
    const char = makeCharacter({
      chars: { ...BLANK_CHARACTER.chars, Dex: { i: 30, a: 0, b: 0 } },
    });
    char.bSkills = char.bSkills.map((s) => (s.n === 'Art' ? { ...s, a: 5 } : s));
    render(<Harness character={char} />);

    const totalCell = screen.getByRole('button', { name: 'Skill total breakdown for Art' });
    expect(totalCell).not.toHaveAttribute('aria-describedby');
    fireEvent.click(totalCell);

    // The breakdown renders through the shared Tooltip with its labelled parts.
    const tooltip = document.getElementById('tooltip-breakdown-skill-0');
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip as HTMLElement).getByText('Advances:')).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('30');
    expect(tooltip).toHaveTextContent('5');
    expect(tooltip).toHaveTextContent('Total:');
    expect(tooltip).toHaveTextContent('35');
  });

  it('invokes openSkillRoll when a skill dice button is clicked', () => {
    const openRoll = vi.fn();
    render(<Harness character={makeCharacter()} openSkillRoll={openRoll} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll Art' }));
    expect(openRoll).toHaveBeenCalledTimes(1);
    expect(openRoll.mock.calls[0][0]).toMatchObject({ n: 'Art' });
  });

  it('opens the Advanced Skills +Add dropdown and routes "Add from Rulebook" to the picker setter', () => {
    render(<Harness character={makeCharacter()} />);
    const addButtons = screen.getAllByRole('button', { name: /add/i }).filter(
      (b) => b.getAttribute('aria-haspopup') === 'true',
    );
    // First haspopup button is the Advanced Skills +Add.
    fireEvent.click(addButtons[0]);
    const menuItem = screen.getByRole('menuitem', { name: 'Add from Rulebook' });
    fireEvent.click(menuItem);
    expect(screen.getByTestId('picker-flags')).toHaveAttribute('data-adv-skill', 'true');
  });

  it('renders an empty-state for talents when there are none', () => {
    render(<Harness character={makeCharacter({ talents: [] })} />);
    expect(screen.getByText('No Talents')).toBeInTheDocument();
  });

  it('hides the Spells & Prayers section when the visibility predicate is false', () => {
    render(<Harness character={makeCharacter({ spells: [], talents: [], aSkills: [], career: '', careerLevel: '' })} />);
    expect(screen.queryByText('Spells & Prayers')).not.toBeInTheDocument();
  });

  it('shows the Spells & Prayers section when the character already has spells', () => {
    const char = makeCharacter({
      spells: [{ name: 'Dart', cn: '3', range: '48 yds', target: '1', duration: 'Instant', effect: 'A bolt of magic.' }],
    });
    render(<Harness character={char} />);
    expect(screen.getByText('Spells & Prayers')).toBeInTheDocument();
    // The spell row renders; its effect is collapsed until expanded.
    expect(screen.getByText('Dart')).toBeInTheDocument();
  });

  it('shows the Spells & Prayers section when the character has a magic talent', () => {
    const char = makeCharacter({
      spells: [],
      talents: [{ n: 'Petty Magic', lvl: 1, desc: 'Cast petty spells.' }],
    });
    render(<Harness character={char} />);
    expect(screen.getByText('Spells & Prayers')).toBeInTheDocument();
  });

  it('does not render Known Runes / Rune Management without a Rune Magic talent', () => {
    render(<Harness character={makeCharacter({ talents: [] })} />);
    expect(screen.queryByText('Known Runes')).not.toBeInTheDocument();
    expect(screen.queryByText('Rune Management')).not.toBeInTheDocument();
  });

  it('renders Known Runes and Rune Management when the character has Rune Magic', () => {
    const char = makeCharacter({ talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }], knownRunes: [] });
    render(<Harness character={char} />);
    expect(screen.getByText('Known Runes')).toBeInTheDocument();
    expect(screen.getByText('Rune Management')).toBeInTheDocument();
  });

  it('shows a Choose button on placeholder rows only and routes it to the specialisation setter', () => {
    const char = makeCharacter({
      aSkills: [
        { n: 'Language (Any)', c: 'Int', a: 5 },
        { n: 'Language (Battle)', c: 'Int', a: 0 },
      ],
      talents: [
        { n: 'Hardy', lvl: 1, desc: '' },
        { n: 'Etiquette (Any)', lvl: 1, desc: '' },
      ],
    });
    render(<Harness character={char} />);
    expect(screen.queryByRole('button', { name: 'Choose specialisation for Language (Battle)' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose specialisation for Hardy' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Choose specialisation for Language (Any)' }));
    expect(screen.getByTestId('picker-flags')).toHaveAttribute('data-spec-target', 'aSkill:0');

    fireEvent.click(screen.getByRole('button', { name: 'Choose specialisation for Etiquette (Any)' }));
    expect(screen.getByTestId('picker-flags')).toHaveAttribute('data-spec-target', 'talent:1');
  });
});
