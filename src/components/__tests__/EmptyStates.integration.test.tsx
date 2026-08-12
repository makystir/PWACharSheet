import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArmourMap } from '../combat/ArmourMap';
import { CriticalWoundsPanel } from '../combat/CriticalWoundsPanel';
import { DiseasePanel } from '../shared/DiseasePanel';
import { CorruptionCard } from '../shared/CorruptionCard';
import { SessionNotesPanel } from '../shared/SessionNotesPanel';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, ArmourPoints } from '../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChar(overrides: Partial<Character> = {}): Character {
  return { ...BLANK_CHARACTER, species: 'Human', ...overrides };
}

function makeArmourPoints(): ArmourPoints {
  return { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };
}

// ─── Armour EmptyState ───────────────────────────────────────────────────────

describe('EmptyState Integration — Armour', () => {
  it('renders "No Armour" heading when armour list is empty', () => {
    render(
      <ArmourMap
        armourPoints={makeArmourPoints()}
        armourList={[]}
        onOpenArmourPicker={vi.fn()}
      />,
    );
    expect(screen.getByText('No Armour')).toBeInTheDocument();
  });

  it('renders action button that triggers add armour flow', () => {
    const onOpenArmourPicker = vi.fn();
    render(
      <ArmourMap
        armourPoints={makeArmourPoints()}
        armourList={[]}
        onOpenArmourPicker={onOpenArmourPicker}
      />,
    );
    fireEvent.click(screen.getByText('Add Armour'));
    expect(onOpenArmourPicker).toHaveBeenCalledTimes(1);
  });
});

// ─── Critical Wounds (Injuries) EmptyState ───────────────────────────────────

describe('EmptyState Integration — Critical Wounds (Injuries)', () => {
  it('renders "No Critical Wounds" heading when no active wounds', () => {
    render(
      <CriticalWoundsPanel
        criticalWounds={[]}
        onAdd={vi.fn()}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText('No Critical Wounds')).toBeInTheDocument();
  });

  it('renders action button that triggers add wound flow', () => {
    const onAdd = vi.fn();
    render(
      <CriticalWoundsPanel
        criticalWounds={[]}
        onAdd={onAdd}
        onHeal={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Add Wound'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

// ─── Disease EmptyState ──────────────────────────────────────────────────────

describe('EmptyState Integration — Diseases', () => {
  it('renders "No Diseases" heading when diseases array is empty', () => {
    const character = makeChar({ diseases: [] });
    render(
      <DiseasePanel character={character} updateCharacter={vi.fn()} />,
    );
    expect(screen.getByText('No Diseases')).toBeInTheDocument();
  });

  it('renders action button that triggers add disease picker', () => {
    const character = makeChar({ diseases: [] });
    render(
      <DiseasePanel character={character} updateCharacter={vi.fn()} />,
    );
    // Click the EmptyState action button
    fireEvent.click(screen.getByRole('button', { name: /Add Disease/i }));
    // The picker dialog should now be visible
    expect(screen.getByRole('dialog', { name: 'Add Disease' })).toBeInTheDocument();
  });
});

// ─── Corruption / Mutations EmptyState ───────────────────────────────────────

describe('EmptyState Integration — Mutations (Corruption)', () => {
  it('renders "No Physical Mutations" heading when no physical mutations', () => {
    const character = makeChar({ mutations: [] });
    render(
      <CorruptionCard character={character} update={vi.fn()} updateCharacter={vi.fn()} />,
    );
    expect(screen.getByText('No Physical Mutations')).toBeInTheDocument();
  });

  it('renders "No Mental Mutations" heading when no mental mutations', () => {
    const character = makeChar({ mutations: [] });
    render(
      <CorruptionCard character={character} update={vi.fn()} updateCharacter={vi.fn()} />,
    );
    expect(screen.getByText('No Mental Mutations')).toBeInTheDocument();
  });

  it('renders action buttons for adding custom mutations', () => {
    const updateCharacter = vi.fn();
    const character = makeChar({ mutations: [] });
    render(
      <CorruptionCard character={character} update={vi.fn()} updateCharacter={updateCharacter} />,
    );
    // Both "Add Custom" buttons in EmptyState areas
    const addCustomButtons = screen.getAllByText('Add Custom');
    expect(addCustomButtons.length).toBeGreaterThanOrEqual(2);
    // Clicking the EmptyState action button triggers the add mutation flow
    fireEvent.click(addCustomButtons[0]);
    expect(updateCharacter).toHaveBeenCalled();
  });
});

// ─── Session Notes EmptyState ────────────────────────────────────────────────

describe('EmptyState Integration — Session Notes', () => {
  it('renders "No Session Notes" heading when log is empty', () => {
    const character = makeChar({ log: [] });
    render(
      <SessionNotesPanel character={character} updateCharacter={vi.fn()} />,
    );
    expect(screen.getByText('No Session Notes')).toBeInTheDocument();
  });

  it('renders "No Session Notes" heading when log is undefined', () => {
    const character = makeChar();
    // Ensure log is undefined/empty
    delete (character as Record<string, unknown>).log;
    render(
      <SessionNotesPanel character={character} updateCharacter={vi.fn()} />,
    );
    expect(screen.getByText('No Session Notes')).toBeInTheDocument();
  });
});
