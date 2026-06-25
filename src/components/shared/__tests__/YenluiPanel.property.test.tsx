import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { YenluiPanel } from '../YenluiPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

// Mock CSS modules
vi.mock('../YenluiPanel.module.css', () => ({
  default: {
    container: 'container',
    label: 'label',
    stateDisplay: 'stateDisplay',
    stateIcon: 'stateIcon',
    stateLabel: 'stateLabel',
    description: 'description',
    warning: 'warning',
    toggleGroup: 'toggleGroup',
    toggleBtn: 'toggleBtn',
    toggleBtnActive: 'toggleBtnActive',
    referenceSection: 'referenceSection',
    detailsGroup: 'detailsGroup',
    summary: 'summary',
    listItems: 'listItems',
    talentNotesSection: 'talentNotesSection',
    talentNoteItem: 'talentNoteItem',
    talentNoteName: 'talentNoteName',
    talentNoteText: 'talentNoteText',
  },
}));

vi.mock('../Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}));

function makeVisibleCharacter(): Character {
  return {
    ...BLANK_CHARACTER,
    species: 'High Elf',
    houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
  };
}

/**
 * Validates: Requirements 7.4
 */
describe('Feature: yenlui-balance-system, Property 9: Independent Collapse Toggle', () => {
  it('toggling one reference sub-list does not affect the other', () => {
    const arbToggleSequence = fc.array(
      fc.constantFrom('dark', 'light'),
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(arbToggleSequence, (toggleSequence) => {
        cleanup();
        const character = makeVisibleCharacter();
        const updateCharacter = vi.fn();

        const { container } = render(
          <YenluiPanel character={character} updateCharacter={updateCharacter} />
        );

        const detailsElements = container.querySelectorAll('details');
        // There should be exactly 2 details elements: Dark Influences & Light Influences
        expect(detailsElements.length).toBe(2);

        const darkDetails = detailsElements[0] as HTMLDetailsElement;
        const lightDetails = detailsElements[1] as HTMLDetailsElement;

        const darkSummary = darkDetails.querySelector('summary')!;
        const lightSummary = lightDetails.querySelector('summary')!;

        for (const target of toggleSequence) {
          // Record the OTHER element's open state before toggling
          const darkOpenBefore = darkDetails.open;
          const lightOpenBefore = lightDetails.open;

          if (target === 'dark') {
            fireEvent.click(darkSummary);
            // Light should not have changed
            expect(lightDetails.open).toBe(lightOpenBefore);
          } else {
            fireEvent.click(lightSummary);
            // Dark should not have changed
            expect(darkDetails.open).toBe(darkOpenBefore);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
