import { useRef, useState } from 'react';
import type { WeaponItem, Character } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
import { EmptyState } from '../shared/EmptyState';
import { HelpPopover } from '../shared/HelpPopover';
import { DragHandle } from '../shared/DragHandle';
import { AriaLiveAnnouncer } from '../shared/AriaLiveAnnouncer';
import { useDragReorder } from '../../hooks/useDragReorder';
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
  onUpdateWeapon?: (weaponIndex: number, field: keyof WeaponItem, value: string) => void;
  onOpenRuneManager?: (weaponIndex: number) => void;
  onOpenWeaponPicker?: () => void;
  onAddCustomWeapon?: () => void;
  onReorderWeapon?: (fromIndex: number, toIndex: number) => void;
}

export function WeaponCards({
  weapons,
  character,
  onRollWeapon,
  onDeleteWeapon,
  onUpdateWeapon,
  onOpenRuneManager,
  onOpenWeaponPicker,
  onAddCustomWeapon,
  onReorderWeapon,
}: WeaponCardsProps) {
  const SB = getBonus(character.chars.S.i + character.chars.S.a + character.chars.S.b);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { dragState, getGripProps, getItemProps, dropIndicatorIndex, announcementText } =
    useDragReorder({
      items: weapons,
      onReorder: onReorderWeapon || (() => {}),
      containerRef,
    });

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
        <div className={styles.cardGrid} ref={containerRef}>
          {weapons.map((w, i) => {
            const calc = calcWeaponDamage(w, SB, character.talents, w.runes ?? [], character.houseRules.rangedDamageSBMode);
            const isRanged = RANGED_GROUPS.includes(w.group);
            const runeQualities = getRuneQualities(w.runes ?? []);
            const hasRunes = (w.runes?.length ?? 0) > 0;
            const rangeReach = w.rangeReach || w.maxR || '—';
            const isExpanded = expandedIndex === i;
            const hasQualities = (w.qualities && w.qualities !== '—') || runeQualities.length > 0;
            const itemProps = getItemProps(i);
            const isDropTarget = dropIndicatorIndex !== null && dropIndicatorIndex === i;

            return (
              <div
                key={i}
                className={`${styles.weaponCard}${isExpanded ? ` ${styles.expanded}` : ''}${itemProps.className ? ` ${styles.dragging}` : ''}${isDropTarget ? ` ${styles.dropTarget}` : ''}`}
                data-testid={`weapon-card-${i}`}
                data-drag-item=""
                style={itemProps.style}
                aria-grabbed={itemProps['aria-grabbed']}
                onClick={() => { if (editingIndex !== i && dragState.status !== 'dragging') handleCardTap(i); }}
              >
                {editingIndex === i && onUpdateWeapon ? (
                  <div className={styles.editForm} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={w.name}
                      onChange={(e) => onUpdateWeapon(i, 'name', e.target.value)}
                      placeholder="Weapon name"
                      className={styles.editInput}
                      aria-label="Weapon name"
                    />
                    <div className={styles.editRow}>
                      <input
                        type="text"
                        value={w.group}
                        onChange={(e) => onUpdateWeapon(i, 'group', e.target.value)}
                        placeholder="Group (e.g. Basic)"
                        className={styles.editInput}
                        aria-label="Weapon group"
                      />
                      <input
                        type="text"
                        value={w.damage}
                        onChange={(e) => onUpdateWeapon(i, 'damage', e.target.value)}
                        placeholder="Damage (e.g. SB+4)"
                        className={styles.editInput}
                        aria-label="Weapon damage"
                      />
                    </div>
                    <div className={styles.editRow}>
                      <input
                        type="text"
                        value={w.rangeReach || ''}
                        onChange={(e) => onUpdateWeapon(i, 'rangeReach', e.target.value)}
                        placeholder="Range/Reach"
                        className={styles.editInput}
                        aria-label="Range or reach"
                      />
                      <input
                        type="text"
                        value={w.enc}
                        onChange={(e) => onUpdateWeapon(i, 'enc', e.target.value)}
                        placeholder="Enc"
                        className={styles.editInputSmall}
                        aria-label="Encumbrance"
                      />
                    </div>
                    <input
                      type="text"
                      value={w.qualities}
                      onChange={(e) => onUpdateWeapon(i, 'qualities', e.target.value)}
                      placeholder="Qualities (e.g. Fast, Impale)"
                      className={styles.editInput}
                      aria-label="Weapon qualities"
                    />
                    <button
                      type="button"
                      className={styles.editDoneBtn}
                      onClick={() => setEditingIndex(null)}
                    >Done</button>
                  </div>
                ) : (
                <>
                {/* Name row: full weapon name, always readable */}
                <div className={styles.nameRow}>
                  {onReorderWeapon && (
                    <DragHandle
                      onMoveUp={() => onReorderWeapon(i, i - 1)}
                      onMoveDown={() => onReorderWeapon(i, i + 1)}
                      isFirst={i === 0}
                      isLast={i === weapons.length - 1}
                      itemLabel={w.name || 'weapon'}
                      gripProps={getGripProps(i)}
                    />
                  )}
                  <div className={styles.weaponName}>{w.name || 'Unnamed'}</div>
                </div>

                {/* Stats row: damage + range/reach + action buttons */}
                <div className={styles.statsRow}>
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
                  <div className={styles.actionButtons}>
                    {onUpdateWeapon && (
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={(e) => { e.stopPropagation(); setEditingIndex(i); }}
                        aria-label={`Edit ${w.name || 'weapon'}`}
                      >✎</button>
                    )}
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
                </>
                )}
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

      <AriaLiveAnnouncer message={announcementText} />
    </Card>
  );
}
