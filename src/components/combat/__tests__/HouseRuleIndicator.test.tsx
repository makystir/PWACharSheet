import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HouseRuleIndicator } from '../HouseRuleIndicator';
import { BLANK_CHARACTER } from '../../../types/character';
import type { HouseRules } from '../../../types/character';

/**
 * HouseRuleIndicator tests (spec: ux-audit-improvements, Req 11.1–11.4).
 *
 * The indicator is a READ-ONLY summary of combat-affecting house rules that
 * differ from their defaults. "Default" is defined by BLANK_CHARACTER.houseRules
 * (the single source of truth), NOT by hard-coded literals. Confirmed defaults:
 *   rangedDamageSBMode: 'none', min1Wound: true, impaleCritsOnTens: true,
 *   advantageCap: 10, useCriticalDeflection: false.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
 */

// The real defaults, used to build fixtures so tests track the source of truth.
const DEFAULTS = BLANK_CHARACTER.houseRules;

/** Build a HouseRules object starting from the real defaults, applying overrides. */
function makeHouseRules(overrides: Partial<HouseRules> = {}): HouseRules {
  return { ...DEFAULTS, ...overrides };
}

describe('HouseRuleIndicator', () => {
  // ─── Req 11.4: hidden when all rules are at their defaults ──────────────────
  describe('when all rules are at default (Req 11.4)', () => {
    it('renders nothing for the blank-character defaults', () => {
      const { container } = render(
        <HouseRuleIndicator houseRules={DEFAULTS} />,
      );
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('renders nothing for an explicit copy of the defaults', () => {
      const { container } = render(
        <HouseRuleIndicator houseRules={makeHouseRules()} />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ─── Req 11.1 & 11.3: shown listing the correct active rules ────────────────
  describe('when a single rule differs from default (Req 11.1, 11.3)', () => {
    it('shows Ranged Damage SB when rangedDamageSBMode is not "none"', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ rangedDamageSBMode: 'halfSB' })} />,
      );
      expect(screen.getByRole('note')).toBeInTheDocument();
      expect(screen.getByText('Ranged Damage SB')).toBeInTheDocument();
      expect(screen.getByText(/Half SB/i)).toBeInTheDocument();
    });

    it('shows full-SB detail when rangedDamageSBMode is "fullSB"', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ rangedDamageSBMode: 'fullSB' })} />,
      );
      expect(screen.getByText('Ranged Damage SB')).toBeInTheDocument();
      expect(screen.getByText(/Full SB/i)).toBeInTheDocument();
    });

    it('shows Minimum 1 Wound only when min1Wound is false (default is true)', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ min1Wound: false })} />,
      );
      expect(screen.getByText('Minimum 1 Wound')).toBeInTheDocument();
    });

    it('shows Impale Crits on 10s only when impaleCritsOnTens is false (default is true)', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ impaleCritsOnTens: false })} />,
      );
      expect(screen.getByText('Impale Crits on 10s')).toBeInTheDocument();
    });

    it('does NOT show Impale Crits on 10s at the default (true)', () => {
      // impaleCritsOnTens === true is the default, so it must not appear.
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ min1Wound: false })} />,
      );
      expect(screen.queryByText('Impale Crits on 10s')).not.toBeInTheDocument();
    });

    it('shows Advantage Cap only when advantageCap differs from the default (10)', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ advantageCap: 0 })} />,
      );
      expect(screen.getByText('Advantage Cap')).toBeInTheDocument();
      expect(screen.getByText(/Uncapped/i)).toBeInTheDocument();
    });

    it('does NOT show Advantage Cap when advantageCap equals the default (10)', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ min1Wound: false })} />,
      );
      expect(screen.queryByText('Advantage Cap')).not.toBeInTheDocument();
    });

    it('shows Critical Deflection only when useCriticalDeflection is true (default is false)', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ useCriticalDeflection: true })} />,
      );
      expect(screen.getByText('Critical Deflection')).toBeInTheDocument();
    });
  });

  // ─── Req 11.1: shown listing ALL active rules when several are non-default ───
  describe('when several rules differ from default (Req 11.1)', () => {
    it('lists every active rule', () => {
      render(
        <HouseRuleIndicator
          houseRules={makeHouseRules({
            rangedDamageSBMode: 'fullSB',
            min1Wound: false,
            impaleCritsOnTens: false,
            advantageCap: 5,
            useCriticalDeflection: true,
          })}
        />,
      );

      expect(screen.getByRole('note')).toBeInTheDocument();
      expect(screen.getByText('Ranged Damage SB')).toBeInTheDocument();
      expect(screen.getByText('Minimum 1 Wound')).toBeInTheDocument();
      expect(screen.getByText('Impale Crits on 10s')).toBeInTheDocument();
      expect(screen.getByText('Advantage Cap')).toBeInTheDocument();
      expect(screen.getByText('Critical Deflection')).toBeInTheDocument();

      // Five active rules → five list items.
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });

    it('lists only the rules that are actually non-default', () => {
      render(
        <HouseRuleIndicator
          houseRules={makeHouseRules({
            min1Wound: false,
            useCriticalDeflection: true,
          })}
        />,
      );

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByText('Minimum 1 Wound')).toBeInTheDocument();
      expect(screen.getByText('Critical Deflection')).toBeInTheDocument();
      // Rules left at default must not appear.
      expect(screen.queryByText('Ranged Damage SB')).not.toBeInTheDocument();
      expect(screen.queryByText('Impale Crits on 10s')).not.toBeInTheDocument();
      expect(screen.queryByText('Advantage Cap')).not.toBeInTheDocument();
    });
  });

  // ─── Req 11.2: read-only — links to Settings, never toggles a rule in place ──
  describe('read-only behaviour (Req 11.2)', () => {
    it('exposes only a "Change in Settings" affordance, no rule toggle/switch', () => {
      render(
        <HouseRuleIndicator houseRules={makeHouseRules({ min1Wound: false })} />,
      );

      // No toggles/switches/checkboxes that would change the rule in place.
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

      // The only interactive control is the settings link/button.
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent(/Change in Settings/i);
    });

    it('navigates to Settings (calls onOpenSettings) without changing the rule', () => {
      const onOpenSettings = vi.fn();
      render(
        <HouseRuleIndicator
          houseRules={makeHouseRules({ min1Wound: false })}
          onOpenSettings={onOpenSettings}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Change in Settings/i }));

      // Proves the control navigates (opens settings), it does not toggle a rule.
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('takes no rule-change handler prop — it cannot mutate a rule by contract', () => {
      // The component keeps rendering the same content regardless of interaction;
      // there is no callback through which it could flip a house rule.
      const { rerender } = render(
        <HouseRuleIndicator houseRules={makeHouseRules({ min1Wound: false })} />,
      );
      const before = screen.getByText('Minimum 1 Wound');
      expect(before).toBeInTheDocument();

      // Clicking the only control does not remove/alter the listed rule.
      fireEvent.click(screen.getByRole('button', { name: /Change in Settings/i }));
      expect(screen.getByText('Minimum 1 Wound')).toBeInTheDocument();

      // Re-render with the same (still non-default) rules keeps it listed.
      rerender(<HouseRuleIndicator houseRules={makeHouseRules({ min1Wound: false })} />);
      expect(screen.getByText('Minimum 1 Wound')).toBeInTheDocument();
    });
  });
});
