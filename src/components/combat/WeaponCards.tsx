import type { WeaponItem, Character } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
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
        <div className={styles.emptyMsg}>No weapons — add one to get started.</div>
      )}

      {weapons.length > 0 && (
        <div className={styles.cardGrid}>
          {weapons.map((w, i) => {
            const calc = calcWeaponDamage(w, SB, character.talents, w.runes ?? []);
            const isRanged = RANGED_GROUPS.includes(w.group);
            const runeQualities = getRuneQualities(w.runes ?? []);
            const hasRunes = (w.runes?.length ?? 0) > 0;
            const rangeReach = w.rangeReach || w.maxR || '—';

            return (
              <div key={i} className={styles.weaponCard} data-testid={`weapon-card-${i}`}>
                {/* Top: name + actions */}
                <div className={styles.topRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.weaponName} title={w.name}>{w.name || 'Unnamed'}</div>
                    <div className={styles.groupLabel}>{w.group || 'Unknown'}{isRanged ? ' (Ranged)' : ''}</div>
                  </div>
                  <button
                    type="button"
                    className={styles.rollBtn}
                    onClick={() => onRollWeapon(w)}
                    title={`Roll ${w.name}`}
                    aria-label={`Roll ${w.name}`}
                  >
                    🎲
                  </button>
                  {onDeleteWeapon && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => onDeleteWeapon(i)}
                      aria-label={`Delete ${w.name}`}
                    >✕</button>
                  )}
                </div>

                {/* Stats row: Total Damage, Range/Reach */}
                <div className={styles.statsRow}>
                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>Damage</span>
                    <span className={styles.statValue}>{calc.num !== null ? calc.num : '—'}</span>
                  </div>
                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>{isRanged ? 'Range' : 'Reach'}</span>
                    <span className={styles.statValue} style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{rangeReach}</span>
                  </div>
                  {calc.breakdown && (
                    <div style={{ flex: 1 }}>
                      <span className={styles.breakdownText}>{calc.breakdown}</span>
                    </div>
                  )}
                </div>

                {/* Qualities */}
                {(w.qualities && w.qualities !== '—') || runeQualities.length > 0 ? (
                  <div className={styles.qualitiesText}>
                    {w.qualities && w.qualities !== '—' ? w.qualities : ''}
                    {runeQualities.length > 0 && (
                      <span className={styles.runeQualitiesText}>
                        {w.qualities && w.qualities !== '—' ? ', ' : ''}
                        +{runeQualities.join(', ')}
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Rune management */}
                {onOpenRuneManager && (
                  <div>
                    <button
                      type="button"
                      className={styles.runeBadge}
                      onClick={() => onOpenRuneManager(i)}
                      aria-label={`Manage runes for ${w.name}`}
                    >
                      ⚒ {hasRunes ? `${w.runes!.length}/3 Runes` : 'Add Runes'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footnote}>
        Total = base damage + SB (or ½SB for ranged) + talent bonuses. Final damage = Total + attack SL.
      </div>
    </Card>
  );
}
