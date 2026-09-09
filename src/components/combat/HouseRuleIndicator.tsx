import { AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import type { Character, HouseRules } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import styles from './HouseRuleIndicator.module.css';

/**
 * House_Rule_Indicator (spec: ux-audit-improvements, Req 11.1–11.4).
 *
 * A compact, READ-ONLY indicator listing the combat-affecting house rules that
 * are currently set to a non-default value. These rules alter WFRP4e combat math
 * (damage/wounds/critical resolution and Advantage limits — see Core Rulebook
 * combat chapter, p.155+, plus supplement variants), so the player is shown which
 * variant calculations are in effect.
 *
 * rules-compliance: every listed rule is a documented house-rule variant of a
 * core combat calculation; this component does not compute any mechanics itself,
 * it only reports which optional rules diverge from their defaults.
 *
 * The indicator is read-only (Req 11.2): it links to Settings to change a rule but
 * never toggles a rule in place. It renders nothing when every covered rule is at
 * its default value (Req 11.4).
 */

interface HouseRuleIndicatorProps {
  houseRules: HouseRules;
  /**
   * Navigates to the Settings surface where house rules can be changed.
   * Defaults to hash-based navigation (`#settings`), matching the app's router.
   */
  onOpenSettings?: () => void;
}

interface ActiveRule {
  label: string;
  detail: string;
}

/**
 * The default house-rule values are the single source of truth in
 * BLANK_CHARACTER.houseRules; "non-default" means "differs from that baseline".
 * Using the blank defaults keeps this indicator correct even if a default changes
 * (Req 11.3, 11.4) rather than hard-coding literals.
 */
const DEFAULTS = BLANK_CHARACTER.houseRules;

function collectActiveRules(hr: HouseRules): ActiveRule[] {
  const active: ActiveRule[] = [];

  // Ranged damage adds Strength Bonus (Core p.298 gives no SB to ranged; variants add it).
  if (hr.rangedDamageSBMode !== DEFAULTS.rangedDamageSBMode) {
    const modeLabel =
      hr.rangedDamageSBMode === 'halfSB' ? 'Half SB'
      : hr.rangedDamageSBMode === 'fullSB' ? 'Full SB'
      : String(hr.rangedDamageSBMode);
    active.push({
      label: 'Ranged Damage SB',
      detail: `Adds ${modeLabel} to ranged weapon damage`,
    });
  }

  // Minimum 1 Wound (Core p.297: a successful hit that beats TB+AP deals at least 1 Wound).
  if (hr.min1Wound !== DEFAULTS.min1Wound) {
    active.push({
      label: 'Minimum 1 Wound',
      detail: 'Off — hits that overcome TB+AP can deal 0 wounds',
    });
  }

  // Impale critical on multiples of 10 (Impale weapon quality variant, Core p.298).
  if (hr.impaleCritsOnTens !== DEFAULTS.impaleCritsOnTens) {
    active.push({
      label: 'Impale Crits on 10s',
      detail: hr.impaleCritsOnTens
        ? 'Impale weapons crit on multiples of 10'
        : 'Off — Impale weapons do not crit on multiples of 10',
    });
  }

  // Advantage cap (Core p.163; default here caps accrued Advantage).
  if (hr.advantageCap !== DEFAULTS.advantageCap) {
    active.push({
      label: 'Advantage Cap',
      detail: hr.advantageCap === 0
        ? 'Uncapped (RAW Initiative Bonus)'
        : `Capped at ${hr.advantageCap} (default ${DEFAULTS.advantageCap})`,
    });
  }

  // Critical Deflection (Archives of the Empire Vol. III): spend 1 AP to ignore a Critical Wound.
  if (hr.useCriticalDeflection !== DEFAULTS.useCriticalDeflection) {
    active.push({
      label: 'Critical Deflection',
      detail: 'Sacrifice 1 AP to ignore a Critical Wound',
    });
  }

  return active;
}

export function HouseRuleIndicator({ houseRules, onOpenSettings }: HouseRuleIndicatorProps) {
  const activeRules = collectActiveRules(houseRules);

  // Req 11.4: render nothing when all covered rules are at default.
  if (activeRules.length === 0) return null;

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    // Default navigation matches the app's hash router (see useHashRoute / hash-route.ts).
    window.location.hash = '#settings';
  };

  return (
    <div className={styles.indicator} role="note" aria-label="Active combat house rules">
      <div className={styles.header}>
        <AlertTriangle size={16} className={styles.icon} aria-hidden="true" />
        <span className={styles.title}>Active House Rules</span>
        <button
          type="button"
          className={styles.settingsLink}
          onClick={handleOpenSettings}
        >
          <SettingsIcon size={14} aria-hidden="true" />
          Change in Settings
        </button>
      </div>
      <ul className={styles.list}>
        {activeRules.map((rule) => (
          <li key={rule.label} className={styles.item}>
            <span className={styles.ruleName}>{rule.label}</span>
            <span className={styles.ruleDetail}>{rule.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HouseRuleIndicator;
