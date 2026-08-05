import { useState, useMemo } from 'react';
import type { ArmourItem, ArmourPoints, WeaponItem } from '../../types/character';
import type { HitLocation } from './hitLocationTable';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { ShieldAlert } from 'lucide-react';
import { resolveArmourCombatEffects, canDeflectCritical, applyDeflection, resolvePenetratingEffect } from '../../logic/armourCombat';
import { calculateCriticalModifier, parseShieldRating, findEquippedShield } from '../../logic/combat';
import type { CombatArmourContext } from '../../logic/armourCombat';
import { coversLocation, type LocationKey } from '../../logic/armourLayering';
import styles from './TakeDamagePanel.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TakeDamagePanelProps {
  toughnessBonus: number;
  armourPoints: ArmourPoints;
  armourList?: ArmourItem[];
  weapons?: WeaponItem[];
  useCriticalDeflection?: boolean;
  onArmourUpdate?: (updatedItem: ArmourItem, index: number) => void;
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
  armourList = [],
  weapons = [],
  useCriticalDeflection = false,
  onArmourUpdate,
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

  // Expanded armour system: to-hit roll parity and Impale quality (task 7.1)
  const [toHitRollEven, setToHitRollEven] = useState(false); // false = Odd (safe default)
  const [attackerHasImpale, setAttackerHasImpale] = useState(false);

  // Critical Deflection state (task 7.3)
  const [criticalDeflected, setCriticalDeflected] = useState(false);

  // Penetrating weapon quality toggle (Req 1.6)
  const [penetratingEnabled, setPenetratingEnabled] = useState(false);

  // Shield defence toggle (Req 3.1–3.6)
  const [defendedWithShield, setDefendedWithShield] = useState(false);

  // Detect equipped shield from character weapons
  const equippedShield = useMemo(() => findEquippedShield(weapons), [weapons]);
  const shieldRating = useMemo(() => equippedShield ? parseShieldRating(equippedShield) : 0, [equippedShield]);

  // Helmet special abilities: frontal missile toggle for Bascinet (task 7.4)
  const [isMissileFrontal, setIsMissileFrontal] = useState(false);

  // Look up AP at the selected location
  const selectedLocationOption = HIT_LOCATIONS.find(l => l.label === selectedLocation)!;
  const apAtLocation = armourPoints[selectedLocationOption.apKey];

  // ─── Armour combat effects integration ───────────────────────────────────────
  // Filter worn armour items covering the selected hit location
  const locationKey = selectedLocationOption.apKey as LocationKey;
  const armourAtLocation = useMemo(() => {
    return armourList.filter(
      (item) => item.worn !== false && coversLocation(item, locationKey),
    );
  }, [armourList, locationKey]);

  // ─── Helmet special ability detection (task 7.4) ─────────────────────────────
  const isHeadLocation = selectedLocation === 'Head';

  const bascinetAtLocation = useMemo(() => {
    if (!isHeadLocation) return null;
    return armourAtLocation.find(
      (item) => item.name.toLowerCase().includes('bascinet') && item.visorOpen !== true,
    ) ?? null;
  }, [armourAtLocation, isHeadLocation]);

  const armetAtLocation = useMemo(() => {
    if (!isHeadLocation) return null;
    return armourAtLocation.find(
      (item) => item.name.toLowerCase().includes('armet'),
    ) ?? null;
  }, [armourAtLocation, isHeadLocation]);

  const salletAtLocation = useMemo(() => {
    if (!isHeadLocation) return null;
    return armourAtLocation.find(
      (item) => item.name.toLowerCase().includes('sallet') && item.visorOpen !== true,
    ) ?? null;
  }, [armourAtLocation, isHeadLocation]);

  // Determine if this is a critical hit (wounds would reduce character to 0 or below)
  // We compute this based on current damage inputs with the raw AP to check threshold
  const totalIncomingRaw = incomingDamage + sl;
  const rawReduction = apAtLocation + toughnessBonus;
  const rawNetWounds = Math.max(0, totalIncomingRaw - rawReduction);
  const wouldCauseCritical = rawNetWounds > 0 && wCur - rawNetWounds <= 0;

  // Resolve armour combat effects (Partial, Impenetrable, Weakpoints)
  const armourCombatResult = useMemo(() => {
    if (armourAtLocation.length === 0) {
      return {
        effectiveAP: apAtLocation,
        partialBypassed: false,
        impenetrableNegatesCrit: false,
        weakpointsBypassed: false,
        notes: [] as string[],
      };
    }
    const context: CombatArmourContext = {
      armourItems: armourAtLocation,
      toHitRollEven,
      isCriticalHit: wouldCauseCritical,
      attackerHasImpale,
      isMissileFrontal: bascinetAtLocation ? isMissileFrontal : undefined,
    };
    return resolveArmourCombatEffects(context);
  }, [armourAtLocation, toHitRollEven, wouldCauseCritical, attackerHasImpale, apAtLocation, bascinetAtLocation, isMissileFrontal]);

  // Use effective AP from combat effects (uses currentAp values, handles Partial/Weakpoints bypasses)
  const effectiveAPBeforePenetrating = armourAtLocation.length > 0 ? armourCombatResult.effectiveAP : apAtLocation;

  // Apply Penetrating weapon quality after standard armour combat effects (Req 1.1–1.5)
  const penetratingResult = useMemo(() => {
    return resolvePenetratingEffect(armourAtLocation, effectiveAPBeforePenetrating, penetratingEnabled);
  }, [armourAtLocation, effectiveAPBeforePenetrating, penetratingEnabled]);

  const effectiveAPBeforeShield = penetratingEnabled ? penetratingResult.effectiveAP : effectiveAPBeforePenetrating;

  // Add Shield Rating to effective AP when "Defended with Shield" is enabled (Req 3.2, 3.5)
  const shieldAPContribution = (defendedWithShield && equippedShield) ? shieldRating : 0;
  const effectiveAP = effectiveAPBeforeShield + shieldAPContribution;

  // Calculate net wounds using the combat damage formula (weaponDamage + SL - AP - TB)
  // The min-1-wound rule only applies when incoming damage exceeds reduction (TB+AP);
  // when damage does not penetrate armor, result is 0.
  const netWounds = (() => {
    if (incomingDamage <= 0 && sl === 0) return 0;
    const totalIncoming = incomingDamage + sl;
    const reduction = effectiveAP + toughnessBonus;
    const raw = totalIncoming - reduction;
    if (raw >= 1) return raw;
    // Min-1-wound rule: if totalIncoming > reduction → at least 1 wound
    if (min1Wound && totalIncoming > reduction && raw < 1) return 1;
    return Math.max(0, raw);
  })();

  // ─── Critical Wound Modifier (Req 6.1–6.5) ───────────────────────────────────
  // Calculate critical wound modifier when net wounds would reduce character to 0 or below
  const criticalModifierResult = useMemo(() => {
    if (netWounds <= 0) return null;
    return calculateCriticalModifier(netWounds, wCur, toughnessBonus);
  }, [netWounds, wCur, toughnessBonus]);

  // ─── Critical Deflection availability (task 7.3, Req 6.4, 6.8, 6.9) ─────────
  // Critical Wound triggers when net wounds exceeds remaining wounds (character goes to 0 or below)
  const criticalWoundTriggered = netWounds > 0 && netWounds >= wCur;
  const deflectionAvailable =
    !criticalDeflected &&
    criticalWoundTriggered &&
    canDeflectCritical(armourAtLocation, locationKey, useCriticalDeflection);

  function handleDeflectCritical() {
    if (!deflectionAvailable || !onArmourUpdate) return;

    // Find the first armour item at the location with currentAp > 0
    const deflectableItem = armourAtLocation.find((item) => {
      const currentAp = item.currentAp ?? item.ap;
      return currentAp > 0;
    });
    if (!deflectableItem) return;

    // Find the index of this item in the full armourList
    const itemIndex = armourList.indexOf(deflectableItem);
    if (itemIndex === -1) return;

    // Apply deflection (reduce AP by 1) and update
    const updatedItem = applyDeflection(deflectableItem);
    onArmourUpdate(updatedItem, itemIndex);

    // Mark as deflected — cancels the Critical Wound
    setCriticalDeflected(true);
  }

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
    setCriticalDeflected(false);
  }

  function handleDamageChange(value: string) {
    const num = Math.max(0, Number(value) || 0);
    setIncomingDamage(num);
    setShowDownAlert(false);
    setCriticalDeflected(false);
  }

  function handleSlChange(value: string) {
    const num = Number(value) || 0;
    setSl(num);
    setShowDownAlert(false);
    setCriticalDeflected(false);
  }

  function handleLocationChange(value: string) {
    setSelectedLocation(value as HitLocation);
    setShowDownAlert(false);
    setCriticalDeflected(false);
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
        <div className={styles.defenseTint}>
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

          {/* To-hit roll parity selector (Req 11.3, 12.3) */}
          <div className={styles.formRow}>
            <span className={styles.label}>To-Hit Roll:</span>
            <div className={styles.radioGroup} role="radiogroup" aria-label="To-hit roll parity">
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="toHitParity"
                  value="odd"
                  checked={!toHitRollEven}
                  onChange={() => setToHitRollEven(false)}
                  className={styles.radioInput}
                />
                Odd
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="toHitParity"
                  value="even"
                  checked={toHitRollEven}
                  onChange={() => setToHitRollEven(true)}
                  className={styles.radioInput}
                />
                Even
              </label>
            </div>
          </div>

          {/* Impale weapon quality toggle (Req 13.2) */}
          <div className={styles.formRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={attackerHasImpale}
                onChange={(e) => setAttackerHasImpale(e.target.checked)}
                className={styles.checkboxInput}
              />
              Impale
            </label>
          </div>

          {/* Penetrating weapon quality toggle (Req 1.6) */}
          <div className={styles.formRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={penetratingEnabled}
                onChange={(e) => setPenetratingEnabled(e.target.checked)}
                className={styles.checkboxInput}
                data-testid="penetrating-toggle"
              />
              Penetrating
            </label>
          </div>

          {/* Bascinet frontal missile toggle (Req 7.1, task 7.4) */}
          {bascinetAtLocation && (
            <div className={styles.formRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isMissileFrontal}
                  onChange={(e) => setIsMissileFrontal(e.target.checked)}
                  className={styles.checkboxInput}
                  data-testid="frontal-missile-toggle"
                />
                Frontal Missile?
              </label>
            </div>
          )}

          {/* Defended with Shield toggle (Req 3.1, 3.4) — only shown when shield is equipped */}
          {equippedShield && (
            <div className={styles.formRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={defendedWithShield}
                  onChange={(e) => setDefendedWithShield(e.target.checked)}
                  className={styles.checkboxInput}
                  data-testid="defended-with-shield-toggle"
                />
                Defended with Shield
              </label>
            </div>
          )}

          {/* 8.4 & 8.5: AP at location and Toughness Bonus display */}
          <div className={styles.formRow}>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>AP</span>
              <span className={styles.statChipValue} data-testid="ap-at-location">{effectiveAP}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>TB</span>
              <span className={styles.statChipValue} data-testid="toughness-bonus">{toughnessBonus}</span>
            </div>
          </div>

          {/* Armour combat effect indicators (Req 11.1, 11.2, 12.1, 12.2, 13.1) */}
          {armourCombatResult.notes.length > 0 && (
            <div className={styles.armourNotesBox} data-testid="armour-combat-notes">
              {armourCombatResult.partialBypassed && (
                <div className={styles.armourNote} data-testid="partial-bypass-indicator">
                  ⚠ Partial: AP bypassed
                </div>
              )}
              {armourCombatResult.impenetrableNegatesCrit && (
                <div className={styles.armourNotePositive} data-testid="impenetrable-negate-indicator">
                  🛡 Impenetrable: Critical negated
                </div>
              )}
              {armourCombatResult.weakpointsBypassed && (
                <div className={styles.armourNote} data-testid="weakpoints-bypass-indicator">
                  ⚠ Weakpoints: All AP ignored
                </div>
              )}
            </div>
          )}

          {/* Shield AP contribution display (Req 3.6) */}
          {defendedWithShield && shieldAPContribution > 0 && (
            <div className={styles.armourNotesBox} data-testid="shield-ap-note">
              <div className={styles.armourNotePositive}>
                🛡 Shield: +{shieldAPContribution} AP
              </div>
            </div>
          )}

          {/* Penetrating weapon quality notes (Req 1.7) */}
          {penetratingEnabled && penetratingResult.notes.length > 0 && (
            <div className={styles.armourNotesBox} data-testid="penetrating-notes">
              {penetratingResult.notes.map((note, idx) => (
                <div key={idx} className={styles.armourNote}>
                  ⚔ {note}
                </div>
              ))}
            </div>
          )}

          {/* Helmet special ability notes (Req 7.1–7.5, task 7.4) */}
          {isHeadLocation && (bascinetAtLocation || armetAtLocation || salletAtLocation) && (
            <div className={styles.helmetNotesBox} data-testid="helmet-special-notes">
              {bascinetAtLocation && isMissileFrontal && (
                <div className={styles.armourNotePositive} data-testid="bascinet-missile-note">
                  🛡 Bascinet: +1 AP (frontal missile)
                </div>
              )}
              {armetAtLocation && netWounds > 0 && (
                <div className={styles.armourNotePositive} data-testid="armet-damage-note">
                  🎲 Armet: Roll d10 — 1-5: damaged normally, 6-9: not damaged, 10: not damaged but visor jams
                </div>
              )}
              {salletAtLocation && wouldCauseCritical && (
                <div className={styles.armourNotePositive} data-testid="sallet-critical-note">
                  🛡 Sallet: Critical Hit deals 1 less Wound
                </div>
              )}
            </div>
          )}

          {/* 8.6: Net wounds calculation */}
          <div className={styles.netWoundsBox}>
            <div className={styles.netWoundsRow}>
              <span className={styles.netWoundsLabel}>Net Wounds</span>
              <span className={styles.netWoundsValue} data-testid="net-wounds">{netWounds}</span>
            </div>
            <div className={styles.breakdownText}>
              {incomingDamage} + {sl} (SL) − {toughnessBonus} (TB) − {effectiveAP} (AP) = {incomingDamage + sl - toughnessBonus - effectiveAP}
              {netWounds === 1 && incomingDamage + sl - toughnessBonus - effectiveAP < 1 && min1Wound && incomingDamage + sl > effectiveAP + toughnessBonus
                ? ' → min 1 wound'
                : ''}
            </div>
          </div>

          {/* Critical Deflection button (Req 6.4, 6.5, 6.6, 6.8, 6.9 — task 7.3) */}
          {deflectionAvailable && (
            <button
              type="button"
              className={styles.deflectBtn}
              onClick={handleDeflectCritical}
              data-testid="deflect-critical-btn"
              aria-label="Deflect Critical"
            >
              🛡 Deflect Critical — Sacrifice 1 AP to ignore Critical Wound
            </button>
          )}

          {criticalDeflected && (
            <div className={styles.deflectedNote} role="status" data-testid="critical-deflected-note">
              ✓ Critical Wound deflected! Armour AP reduced by 1.
            </div>
          )}

          {/* Critical Wound Modifier Notification (Req 6.1–6.5) */}
          {criticalModifierResult && !criticalDeflected && (
            <div className={styles.criticalWoundNotification} role="status" data-testid="critical-wound-notification">
              <div className={styles.criticalWoundTitle}>⚠ Critical Wound</div>
              <div className={styles.criticalWoundDetail}>
                Excess Damage: {criticalModifierResult.excessDamage} | TB: {criticalModifierResult.toughnessBonus}
              </div>
              <div className={styles.criticalWoundModifier}>
                {criticalModifierResult.modifier === -20
                  ? '→ Critical table roll modifier: -20'
                  : '→ No modifier to Critical table roll'}
              </div>
              <div className={styles.criticalWoundDesc}>
                {criticalModifierResult.description}
              </div>
            </div>
          )}

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
              💀 Character is Down!{criticalDeflected ? ' Critical Wound deflected.' : ' May take a Critical Wound.'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
