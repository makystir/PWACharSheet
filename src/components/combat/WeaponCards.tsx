import { useState } from 'react';
import type { WeaponItem, Character } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
import { EmptyState } from '../shared/EmptyState';
import { HelpPopover } from '../shared/HelpPopover';
import { calcWeaponDamage, RANGED_GROUPS } from '../../logic/weapons';
import { getRuneQualities } from '../../logic/runes';
import { getBonus } from '../../logic/calculators';
import { Sword } from 'lucide-react';
import styles from './WeaponCards.module.css';

export interface WeaponCardsProps {
  weapons: WeaponItem[];
  character: Character;
  onRollWeapon: (weapon: WeaponItem) => void;
  onDeleteWeapon?: (weaponIndex: number) => void;
  onOpenRuneManager?: (weaponIndex: number) => void;
  onOpenWeaponPicker?: () => void;
  onAddCustomWeapon?: () => void;
}

export function WeaponCards({
  weapons,
  character,
  onRollWeapon,
  onDeleteWeapon,
  onOpenRuneManager,
  onOpenWeaponPicker,
  onAddCustomWeapon,
}: WeaponCardsProps) {
  const SB = getBonus(character.chars.S.i + character.chars.S.a + character.chars.S.b);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleCardTap = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <Card>
      <SectionHeader icon={Sword} title="Weapons" action={
        <div style={{ display: 'flex', gap: '4px' }}>
          {onOpenWeaponPicker && (
            <AddButton label="Add from Rulebook" onClick={onOpenWeaponPicker} />
          )}
          {onAddCustomWeapon && (
            <AddButton label="Add Custom" onClick={onAddCustomWeapon} />
          )}
        </div>
      } />

      {weapons.length === 0 && (
        <EmptyState
          icon={Sword}
          heading="No Weapons"
          description="No weapons equipped — add one from the rulebook or create a custom weapon."
          action={onOpenWeaponPicker ? { label: 'Add Weapon', onClick: onOpenWeaponPicker } : undefined}
        />
      )}

      {weapons.length > 0 && (
        <div className={styles.cardGrid}>
          {weapons.map((w, i) => {
            const calc = calcWeaponDamage(w, SB, character.talents, w.runes ?? [], character.houseRules.rangedDamageSBMode);
            const isRanged = RANGED_GROUPS.includes(w.group);
            const runeQualities = getRuneQualities(w.runes ?? []);
            const hasRunes = (w.runes?.length ?? 0) > 0;
            const rangeReach = w.rangeReach || w.maxR || '—';
            const isExpanded = expandedIndex === i;
            const hasQualities = (w.qualities && w.qualities !== '—') || runeQualities.length > 0;

            return (
              <div
                key={i}
                className={`${styles.weaponCard}${isExpanded ? ` ${styles.expanded}` : ''}`}
                data-testid={`weapon-card-${i}`}
                onClick={() => handleCardTap(i)}
              >
                {/* Primary row: name + damage + range/reach + roll */}
                <div className={styles.primaryRow}>
                  <div className={styles.weaponName} title={w.name}>{w.name || 'Unnamed'}</div>
                  <div className={styles.primaryStats}>
                    <div className={styles.statChip}>
                      <span className={styles.statChipLabel}>DMG</span>
                      <span className={styles.statChipValue}>{calc.num !== null ? calc.num : '—'}</span>
                    </div>
                    <div className={styles.statChip}>
                      <span className={styles.statChipLabel}>{isRanged ? 'RNG' : 'RCH'}</span>
                      <span className={styles.statChipValueSecondary}>{rangeReach}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.rollBtn}
                    onClick={(e) => { e.stopPropagation(); onRollWeapon(w); }}
                    title={`Roll ${w.name}`}
                    aria-label={`Roll ${w.name}`}
                  >
                    🎲
                  </button>
                  {onDeleteWeapon && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); onDeleteWeapon(i); }}
                      aria-label={`Delete ${w.name}`}
                    >✕</button>
                  )}
                </div>

                {/* Secondary line: group + qualities (shown on hover/tap) */}
                <div className={styles.secondaryLine}>
                  <span className={styles.groupLabel}>{w.group || 'Unknown'}{isRanged ? ' (Ranged)' : ''}</span>
                  {hasQualities && (
                    <>
                      <span className={styles.separator}>·</span>
                      <span className={styles.qualitiesText}>
                        {w.qualities && w.qualities !== '—' ? w.qualities : ''}
                        {runeQualities.length > 0 && (
                          <span className={styles.runeQualitiesText}>
                            {w.qualities && w.qualities !== '—' ? ', ' : ''}
                            +{runeQualities.join(', ')}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                  {/* Show rune badge in secondary line only when weapon has runes */}
                  {onOpenRuneManager && hasRunes && (
                    <button
                      type="button"
                      className={styles.runeBadge}
                      onClick={(e) => { e.stopPropagation(); onOpenRuneManager(i); }}
                      aria-label={`Manage runes for ${w.name}`}
                    >
                      ⚒ {w.runes!.length}/3 Runes
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footnote behind help icon tooltip */}
      {weapons.length > 0 && (
        <div className={styles.footnoteHelp}>
          <HelpPopover concept="weapon-damage-formula">
            Total = base damage + SB (or ½SB for ranged) + talent bonuses. Final damage = Total + attack SL.
          </HelpPopover>
        </div>
      )}
    </Card>
  );
}
