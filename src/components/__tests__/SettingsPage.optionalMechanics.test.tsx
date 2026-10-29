import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { ArmourPoints } from '../../types/character';
import {
  OPTIONAL_MECHANICS,
  OPTIONAL_MECHANIC_CATEGORIES,
} from '../pages/settings/optionalMechanics';

// ─── Test helpers ────────────────────────────────────────────────────────────

const defaultArmourPoints: ArmourPoints = {
  head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Record<string, any> = {}): any {
  return {
    character: structuredClone(BLANK_CHARACTER),
    update: vi.fn(),
    updateCharacter: vi.fn(),
    totalWounds: 10,
    armourPoints: defaultArmourPoints,
    maxEncumbrance: 0,
    coinWeight: 0,
    ...overrides,
  };
}

/** Find the toggle button sibling to a label text within a toggleRow */
function findToggleButton(labelText: string): HTMLButtonElement {
  const label = screen.getByText(labelText);
  // label is ruleLabel div → parent is toggleInfo → parent is toggleRow
  const toggleRow = label.parentElement!.parentElement!;
  return toggleRow.querySelector('button')!;
}

// ─── Grouped Optional Mechanics rendering (data-driven refactor) ────────────

describe('SettingsPage — Optional Mechanics (grouped, data-driven)', () => {
  it('renders all Optional Mechanics toggles by label', () => {
    render(<SettingsPage {...makeProps()} />);
    for (const entry of OPTIONAL_MECHANICS) {
      expect(screen.getByText(entry.label)).toBeInTheDocument();
    }
  });

  it('renders each category as a heading with a matching labelled group', () => {
    render(<SettingsPage {...makeProps()} />);
    for (const category of OPTIONAL_MECHANIC_CATEGORIES) {
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: category })).toBeInTheDocument();
    }
  });

  it('orders the category headings per OPTIONAL_MECHANIC_CATEGORIES', () => {
    render(<SettingsPage {...makeProps()} />);
    const headings = OPTIONAL_MECHANIC_CATEGORIES.map(
      (c) => screen.getByRole('heading', { name: c }),
    );
    for (let i = 1; i < headings.length; i++) {
      // Earlier headings appear before later ones in document order.
      const position = headings[i - 1].compareDocumentPosition(headings[i]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('places each entry inside the group for its category', () => {
    render(<SettingsPage {...makeProps()} />);
    for (const entry of OPTIONAL_MECHANICS) {
      const group = screen.getByRole('group', { name: entry.category });
      expect(within(group).getByText(entry.label)).toBeInTheDocument();
    }
  });

  it('shows OFF for every mechanic on a blank character (all default false)', () => {
    render(<SettingsPage {...makeProps()} />);
    for (const entry of OPTIONAL_MECHANICS) {
      expect(findToggleButton(entry.label)).toHaveTextContent('OFF');
    }
  });

  it('clicking each toggle calls update with the exact literal path and flipped boolean', () => {
    for (const entry of OPTIONAL_MECHANICS) {
      const update = vi.fn();
      const { unmount } = render(<SettingsPage {...makeProps({ update })} />);
      fireEvent.click(findToggleButton(entry.label));
      expect(update).toHaveBeenCalledWith(`houseRules.${entry.key}`, true);
      unmount();
    }
  });

  it('shows ON and the "Find it on:" row only when the mechanic is enabled', () => {
    for (const entry of OPTIONAL_MECHANICS) {
      // OFF: no location row.
      const offProps = makeProps();
      const off = render(<SettingsPage {...offProps} />);
      expect(screen.queryByText(`Find it on: ${entry.location}`)).not.toBeInTheDocument();
      off.unmount();

      // ON: location row present with the exact string.
      const character = structuredClone(BLANK_CHARACTER);
      character.houseRules[entry.key] = true;
      const on = render(<SettingsPage {...makeProps({ character })} />);
      expect(findToggleButton(entry.label)).toHaveTextContent('ON');
      expect(screen.getByText(`Find it on: ${entry.location}`)).toBeInTheDocument();
      on.unmount();
    }
  });
});
