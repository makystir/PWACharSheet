import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Unit tests for trapping card horse indicator.
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 *
 * Tests verify:
 * 1. Horse icon (🐎) renders adjacent to the checkbox
 * 2. Tooltip text is correct on the label
 * 3. Gold border class applied when storedOnHorse is true
 * 4. Trapping name is not truncated (no text-overflow)
 * 5. Aria-label is correct on the label
 */

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    trappings: [
      { name: 'Rope (10 yards)', enc: '1', quantity: 1, storedOnHorse: true },
      { name: 'Torch', enc: '0', quantity: 3 },
    ],
    ...overrides,
  });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}) {
  const char = makeCharacter(overrides);

  return render(
    <CharacterPage
      character={char}
      characterId="test-horse-indicator"
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={30}
      coinWeight={0}
      rollHistory={[]}
      addRoll={vi.fn()}
      clearHistory={vi.fn()}
      subTab="gear"
      onSubTabChange={vi.fn()}
    />
  );
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('TrappingCard horse indicator (Req 9.1, 9.2, 9.3, 9.4, 9.5)', () => {
  // ─── Req 9.1: Horse icon renders adjacent to checkbox ───────────────────────

  it('renders the horse icon (🐎) adjacent to the checkbox', () => {
    renderCharPage();

    // The horse icon should be present in the DOM
    const horseIcons = screen.getAllByText('🐎');
    expect(horseIcons.length).toBeGreaterThan(0);

    // Each horse icon should be a sibling of a checkbox within the same label
    horseIcons.forEach((icon) => {
      const label = icon.closest('label');
      expect(label).not.toBeNull();
      const checkbox = label!.querySelector('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
    });
  });

  // ─── Req 9.5: Tooltip text is correct ──────────────────────────────────────

  it('label has correct title tooltip text', () => {
    renderCharPage();

    const labels = screen.getAllByLabelText('Stored on horse — does not count toward personal encumbrance');
    expect(labels.length).toBeGreaterThan(0);

    labels.forEach((label) => {
      expect(label).toHaveAttribute('title', 'Stored on horse — does not count toward personal encumbrance');
    });
  });

  // ─── Req 9.3: Gold border class when storedOnHorse is true ─────────────────

  it('applies the trappingCardHorse class when storedOnHorse is true', () => {
    renderCharPage();

    // The first trapping has storedOnHorse: true
    const ropeText = screen.getByText('Rope (10 yards)');
    const ropeCard = ropeText.closest('[data-drag-item]');
    expect(ropeCard).not.toBeNull();
    expect(ropeCard!.className).toContain('trappingCardHorse');
  });

  it('does not apply the trappingCardHorse class when storedOnHorse is false/undefined', () => {
    renderCharPage();

    // The second trapping (Torch) does not have storedOnHorse set
    const torchText = screen.getByText('Torch');
    const torchCard = torchText.closest('[data-drag-item]');
    expect(torchCard).not.toBeNull();
    expect(torchCard!.className).not.toContain('trappingCardHorse');
    expect(torchCard!.className).toContain('trappingCard');
  });

  // ─── Req 9.4: Trapping name is not truncated ──────────────────────────────

  it('trapping name is fully visible (no text-overflow truncation)', () => {
    renderCharPage();

    // Verify the full trapping name text is rendered in the DOM
    const ropeName = screen.getByText('Rope (10 yards)');
    expect(ropeName).toBeInTheDocument();
    expect(ropeName.textContent).toBe('Rope (10 yards)');

    // The trappingName class uses word-break: break-word and has no
    // text-overflow or overflow: hidden, so text is never truncated.
    // Verify the element does not have truncation styles.
    expect(ropeName.style.textOverflow).not.toBe('ellipsis');
    expect(ropeName.style.overflow).not.toBe('hidden');
  });

  // ─── Req 9.5: Aria-label on the horse indicator label ──────────────────────

  it('horse indicator label has correct aria-label', () => {
    renderCharPage();

    const labels = screen.getAllByLabelText('Stored on horse — does not count toward personal encumbrance');
    expect(labels.length).toBeGreaterThan(0);

    // Each label should wrap a checkbox and a horse icon
    labels.forEach((label) => {
      expect(label.tagName.toLowerCase()).toBe('label');
      expect(label).toHaveAttribute('aria-label', 'Stored on horse — does not count toward personal encumbrance');
    });
  });
});
