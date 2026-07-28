import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../combat/CombatDashboard';
import { AdvancementPage } from '../pages/AdvancementPage';
import { SettingsPage } from '../pages/SettingsPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, CombatState, ArmourPoints } from '../../types/character';

/**
 * UI/UX Declutter — Default state tests for combat gating, collapsed sections.
 * Validates: Requirements 1.2, 6.1, 5.4
 */

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

// ─── CombatDashboard: Actions group hidden when combat not active (Req 1.2) ─

describe('CombatDashboard Actions group visibility (Req 1.2)', () => {
  const defaultCombatState: CombatState = {
    inCombat: false,
    initiative: 0,
    currentRound: 0,
    engaged: false,
    surprised: false,
  };

  function getDashboardProps(inCombat: boolean) {
    return {
      wCur: 10,
      totalWounds: 14,
      advantage: 0,
      combatState: { ...defaultCombatState, inCombat },
      conditions: [],
      fortune: 2,
      fate: 3,
      resolve: 1,
      resilience: 2,
      inCombat,
      onUpdateWounds: vi.fn(),
      onUpdateAdvantage: vi.fn(),
      onUpdateRound: vi.fn(),
      onToggleEngaged: vi.fn(),
      onRemoveCondition: vi.fn(),
      onSpendFortune: vi.fn(),
      onSpendResolve: vi.fn(),
      onOpenConditionPicker: vi.fn(),
    };
  }

  it('Actions group has aria-hidden="true" when inCombat is false', () => {
    render(<CombatDashboard {...getDashboardProps(false)} />);

    const actionsGroup = screen.getByRole('group', { name: 'Actions', hidden: true });
    const collapsedWrapper = actionsGroup.closest('[aria-hidden="true"]');
    expect(collapsedWrapper).toBeTruthy();
  });

  it('Actions group has aria-hidden="false" when inCombat is true', () => {
    render(<CombatDashboard {...getDashboardProps(true)} />);

    const actionsGroup = screen.getByRole('group', { name: 'Actions' });
    const expandedWrapper = actionsGroup.closest('[aria-hidden]');
    expect(expandedWrapper).toHaveAttribute('aria-hidden', 'false');
  });
});

// ─── AdvancementPage: "Other Skills" starts collapsed (Req 6.1) ──────────────

describe('AdvancementPage "Other Skills" default state (Req 6.1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function makeCharacterWithOutOfCareerSkills(): Character {
    return structuredClone({
      ...BLANK_CHARACTER,
      name: 'Test Character',
      species: 'Human',
      class: 'Warriors',
      career: 'Soldier',
      careerLevel: 'Recruit',
      status: 'Silver 1',
      xpCur: 200,
      xpTotal: 200,
      chars: {
        ...BLANK_CHARACTER.chars,
        WS: { i: 35, a: 0, b: 0 },
        BS: { i: 30, a: 0, b: 0 },
        S: { i: 30, a: 0, b: 0 },
        T: { i: 30, a: 0, b: 0 },
        I: { i: 30, a: 0, b: 0 },
        Ag: { i: 30, a: 0, b: 0 },
        Dex: { i: 25, a: 0, b: 0 },
        Int: { i: 25, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
        Fel: { i: 25, a: 0, b: 0 },
      },
      // Add an out-of-career skill to ensure "Other Skills" section renders
      skills: [
        { n: 'Lore (Heraldry)', adv: 5, grouped: false },
      ],
    });
  }

  it('"Other Skills" section header starts with aria-expanded="false"', () => {
    const char = makeCharacterWithOutOfCareerSkills();
    render(
      <AdvancementPage
        character={char}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={10}
        coinWeight={0}
      />
    );

    // The CollapsibleSection renders a button with the title text
    const otherSkillsHeader = screen.getByRole('button', { name: /other skills/i });
    expect(otherSkillsHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('"Other Skills" content wrapper has aria-hidden="true" by default', () => {
    const char = makeCharacterWithOutOfCareerSkills();
    render(
      <AdvancementPage
        character={char}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={10}
        coinWeight={0}
      />
    );

    const otherSkillsHeader = screen.getByRole('button', { name: /other skills/i });
    // The content div is the next sibling of the header inside the section wrapper
    const sectionWrapper = otherSkillsHeader.parentElement!;
    const contentDiv = sectionWrapper.querySelector('[aria-hidden="true"]');
    expect(contentDiv).toBeTruthy();
  });
});

// ─── SettingsPage: "Danger Zone" starts collapsed (Req 5.4) ──────────────────

describe('SettingsPage "Danger Zone" default state (Req 5.4)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function makeCharacter(): Character {
    return structuredClone({ ...BLANK_CHARACTER, name: 'Test' });
  }

  it('"Danger Zone" section header starts with aria-expanded="false"', () => {
    render(
      <SettingsPage
        character={makeCharacter()}
        characterId="test-char"
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={10}
        armourPoints={defaultAP}
        maxEncumbrance={5}
        coinWeight={0}
      />
    );

    const dangerZoneHeader = screen.getByRole('button', { name: /danger zone/i });
    expect(dangerZoneHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('"Danger Zone" content wrapper has aria-hidden="true" by default', () => {
    render(
      <SettingsPage
        character={makeCharacter()}
        characterId="test-char"
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={10}
        armourPoints={defaultAP}
        maxEncumbrance={5}
        coinWeight={0}
      />
    );

    const dangerZoneHeader = screen.getByRole('button', { name: /danger zone/i });
    const sectionWrapper = dangerZoneHeader.parentElement!;
    const contentDiv = sectionWrapper.querySelector('[aria-hidden="true"]');
    expect(contentDiv).toBeTruthy();
  });
});
