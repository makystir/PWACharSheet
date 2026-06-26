import { useState } from 'react';
import type { ArmourPoints } from '../../types/character';
import type { HitLocation } from './hitLocationTable';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { ShieldAlert } from 'lucide-react';
import styles from './TakeDamagePanel.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TakeDamagePanelProps {
  toughnessBonus: number;
  armourPoints: ArmourPoints;
  wCur: number;
  totalWounds: number;
  onApplyWounds: (woundsToApply: number) => void;
  min1Wound?: boolean;
  onDown?: (location: HitLocation) => void;
}

// ─── Location mapping ────────────────────────────────────────────────────────

interface LocationOption {
  label: HitLocation;
  apKey: keyof ArmourPoints;
}

const HIT_LOCATIONS: LocationOption[] = [
  { label: 'Head', apKey: 'head' },
  { label: 'Left Arm', apKey: 'lArm' },
  { label: 'Right Arm', apKey: 'rArm' },
  { label: 'Body', apKey: 'body' },
  { label: 'Left Leg', apKey: 'lLeg' },
  { label: 'Right Leg', apKey: 'rLeg' },
];

// ─── Net wound calculation ───────────────────────────────────────────────────

/**
 * Calculate net wounds per WFRP 4e rules:
 * - net = max(0, incomingDamage − TB − AP)
 * - Minimum-1-wound rule (when min1Wound is true): if incomingDamage > 0 AND
 *   incomingDamage > TB + AP, at least 1 wound is dealt even if the math gives 0.
 * - If incomingDamage <= TB + AP, then 0 wounds.
 * - When min1Wound is false, the minimum-1 floor is skipped.
 */
export function calculateNetWounds(
  incomingDamage: number,
  toughnessBonus: number,
  ap: number,
  min1Wound: boolean = true,
): number {
  if (incomingDamage <= 0) return 0;
  const reduction = toughnessBonus + ap;
  const raw = Math.max(0, incomingDamage - reduction);
  // Minimum-1-wound rule: if damage exceeds TB+AP, at least 1 wound
  if (min1Wound && incomingDamage > reduction && raw < 1) return 1;
  return raw;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TakeDamagePanel({
  toughnessBonus,
  armourPoints,
  wCur,
  totalWounds: _totalWounds,
  onApplyWounds,
  min1Wound = true,
  onDown,
}: TakeDamagePanelProps) {
  // totalWounds kept in props interface for potential future use (e.g. percentage display)
  void _totalWounds;
  const [incomingDamage, setIncomingDamage] = useState(0);
  const [sl, setSl] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<HitLocation>('Body');
  const [collapsed, setCollapsed] = useState(false);
  const [showDownAlert, setShowDownAlert] = useState(false);

  // Look up AP at the selected location
  const selectedLocationOption = HIT_LOCATIONS.find(l => l.label === selectedLocation)!;
  const apAtLocation = armourPoints[selectedLocationOption.apKey];

  // Calculate net wounds using the combat damage formula (weaponDamage + SL - AP - TB)
  // The min-1-wound rule only applies when incoming damage exceeds reduction (TB+AP);
  // when damage does not penetrate armor, result is 0.
  const netWounds = (() => {
    if (incomingDamage <= 0 && sl === 0) return 0;
    const totalIncoming = incomingDamage + sl;
    const reduction = apAtLocation + toughnessBonus;
    const raw = totalIncoming - reduction;
    if (raw >= 1) return raw;
    // Min-1-wound rule: if totalIncoming > reduction → at least 1 wound
    if (min1Wound && totalIncoming > reduction && raw < 1) return 1;
    return Math.max(0, raw);
  })();

  function handleApplyWounds() {
    if (netWounds <= 0) return;

    const newWCur = Math.max(0, wCur - netWounds);
    onApplyWounds(netWounds);

    // Show alert if character is down
    if (newWCur <= 0) {
      setShowDownAlert(true);
      onDown?.(selectedLocation);
    } else {
      setShowDownAlert(false);
    }

    // Reset damage input but retain location selection (8.9)
    setIncomingDamage(0);
    setSl(0);
  }

  function handleDamageChange(value: string) {
    const num = Math.max(0, Number(value) || 0);
    setIncomingDamage(num);
    setShowDownAlert(false);
  }

  function handleSlChange(value: string) {
    const num = Number(value) || 0;
    setSl(num);
    setShowDownAlert(false);
  }

  function handleLocationChange(value: string) {
    setSelectedLocation(value as HitLocation);
    setShowDownAlert(false);
  }

  return (
    <Card>
      <div
        className={styles.panelHeader}
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label="Toggle Take Damage panel"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed(!collapsed);
          }
        }}
      >
        <SectionHeader icon={ShieldAlert} title="Take Damage" />
        <button type="button" className={styles.collapseBtn} tabIndex={-1} aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </button>
      </div>

      {!collapsed && (
        <div>
          {/* 8.2: Incoming damage input */}
          <div className={styles.formRow}>
            <label htmlFor="incoming-damage" className={styles.label}>Damage:</label>
            <input
              id="incoming-damage"
              type="number"
              value={incomingDamage}
              onChange={(e) => handleDamageChange(e.target.value)}
              className={styles.input}
              aria-label="Incoming damage"
              min={0}
            />
          </div>

          {/* SL input for combat damage formula */}
          <div className={styles.formRow}>
            <label htmlFor="attack-sl" className={styles.label}>SL:</label>
            <input
              id="attack-sl"
              type="number"
              value={sl}
              onChange={(e) => handleSlChange(e.target.value)}
              className={styles.input}
              aria-label="Success Levels"
            />
          </div>

          {/* 8.3: Hit location selector */}
          <div className={styles.formRow}>
            <label htmlFor="hit-location" className={styles.label}>Location:</label>
            <select
              id="hit-location"
              value={selectedLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              className={styles.select}
              aria-label="Hit location"
            >
              {HIT_LOCATIONS.map(loc => (
                <option key={loc.apKey} value={loc.label}>{loc.label}</option>
              ))}
            </select>
          </div>

          {/* 8.4 & 8.5: AP at location and Toughness Bonus display */}
          <div className={styles.formRow}>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>AP</span>
              <span className={styles.statChipValue} data-testid="ap-at-location">{apAtLocation}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>TB</span>
              <span className={styles.statChipValue} data-testid="toughness-bonus">{toughnessBonus}</span>
            </div>
          </div>

          {/* 8.6: Net wounds calculation */}
          <div className={styles.netWoundsBox}>
            <div className={styles.netWoundsRow}>
              <span className={styles.netWoundsLabel}>Net Wounds</span>
              <span className={styles.netWoundsValue} data-testid="net-wounds">{netWounds}</span>
            </div>
            <div className={styles.breakdownText}>
              {incomingDamage} + {sl} (SL) − {toughnessBonus} (TB) − {apAtLocation} (AP) = {incomingDamage + sl - toughnessBonus - apAtLocation}
              {netWounds === 1 && incomingDamage + sl - toughnessBonus - apAtLocation < 1 && min1Wound && incomingDamage + sl > apAtLocation + toughnessBonus
                ? ' → min 1 wound'
                : ''}
            </div>
          </div>

          {/* 8.7: Apply Wounds button */}
          <button
            type="button"
            className={netWounds > 0 ? styles.applyBtn : styles.applyBtnDisabled}
            onClick={handleApplyWounds}
            disabled={netWounds <= 0}
            aria-label="Apply wounds"
          >
            ⚔ Apply {netWounds} Wound{netWounds !== 1 ? 's' : ''}
          </button>

          {/* 8.8: Down alert */}
          {showDownAlert && (
            <div className={styles.alertBox} role="alert" data-testid="down-alert">
              💀 Character is Down! May take a Critical Wound.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
