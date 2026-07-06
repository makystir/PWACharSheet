import { useState } from 'react';
import type { ArmourPoints, ArmourItem, WeaponData } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
import { getRuneQualities } from '../../logic/runes';
import { Shield } from 'lucide-react';
import styles from './ArmourMap.module.css';

export interface ArmourMapProps {
  armourPoints: ArmourPoints;
  armourList: ArmourItem[];
  weapons?: WeaponData[];
  onDeleteArmour?: (armourIndex: number) => void;
  onUpdateArmour?: (armourIndex: number, field: keyof ArmourItem, value: string | number) => void;
  onOpenRuneManager?: (armourIndex: number) => void;
  onOpenArmourPicker?: () => void;
  onAddCustomArmour?: () => void;
}

/** Extract the Shield rating from a weapon's qualities string (e.g. "Shield 2, Defensive" → 2) */
function getShieldRating(weapons: WeaponData[]): number {
  let maxRating = 0;
  for (const w of weapons) {
    const match = w.qualities.match(/Shield\s+(\d+)/i);
    if (match) {
      maxRating = Math.max(maxRating, parseInt(match[1], 10));
    }
  }
  return maxRating;
}

type LocationKey = 'head' | 'lArm' | 'rArm' | 'body' | 'lLeg' | 'rLeg';

interface LocationDef {
  key: LocationKey;
  label: string;
  gridColumn: string;
  gridRow: string;
}

const LOCATIONS: LocationDef[] = [
  { key: 'head', label: 'Head', gridColumn: '2', gridRow: '1' },
  { key: 'lArm', label: 'L Arm', gridColumn: '1', gridRow: '2' },
  { key: 'body', label: 'Body', gridColumn: '2', gridRow: '2' },
  { key: 'rArm', label: 'R Arm', gridColumn: '3', gridRow: '2' },
  { key: 'lLeg', label: 'L Leg', gridColumn: '1', gridRow: '3' },
  { key: 'rLeg', label: 'R Leg', gridColumn: '3', gridRow: '3' },
];

const LOCATION_LABELS: Record<LocationKey, string> = {
  head: 'Head',
  lArm: 'L Arm',
  rArm: 'R Arm',
  body: 'Body',
  lLeg: 'L Leg',
  rLeg: 'R Leg',
};

/** Check if an armour item covers a given location key. */
function coversLocation(item: ArmourItem, locKey: LocationKey): boolean {
  const locStr = item.locations.toLowerCase();
  const label = LOCATION_LABELS[locKey].toLowerCase();

  // Direct label match (e.g. "head", "body", "l arm", "r arm", "l leg", "r leg")
  if (locStr.includes(label)) return true;

  // Handle common shorthand: "arms" covers both l arm and r arm, "legs" covers both
  if ((locKey === 'lArm' || locKey === 'rArm') && locStr.includes('arm')) return true;
  if ((locKey === 'lLeg' || locKey === 'rLeg') && locStr.includes('leg')) return true;

  // "All" covers everything
  if (locStr.includes('all')) return true;

  return false;
}

export function ArmourMap({
  armourPoints,
  armourList,
  weapons = [],
  onDeleteArmour,
  onUpdateArmour,
  onOpenRuneManager,
  onOpenArmourPicker,
  onAddCustomArmour,
}: ArmourMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationKey | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleLocationTap = (key: LocationKey) => {
    setSelectedLocation(prev => prev === key ? null : key);
  };

  // Get armour items that contribute to the selected location
  const contributingItems = selectedLocation
    ? armourList.filter(item => coversLocation(item, selectedLocation))
    : [];

  // Shield rating from equipped weapons
  const shieldRating = getShieldRating(weapons);

  return (
    <Card>
      <SectionHeader icon={Shield} title="Armour" action={
        <div className={styles.headerActions}>
          {onOpenArmourPicker && (
            <AddButton label="Add from Rulebook" onClick={onOpenArmourPicker} />
          )}
          {onAddCustomArmour && (
            <AddButton label="Add Custom" onClick={onAddCustomArmour} />
          )}
        </div>
      } />

      {/* Body Map Grid */}
      <div className={styles.bodyGrid} data-testid="armour-body-map">
        {LOCATIONS.map(loc => {
          const selected = selectedLocation === loc.key;
          return (
            <button
              key={loc.key}
              type="button"
              className={selected ? styles.locationCellSelected : styles.locationCell}
              style={{
                gridColumn: loc.gridColumn,
                gridRow: loc.gridRow,
                minWidth: '44px',
                minHeight: '44px',
              }}
              onClick={() => handleLocationTap(loc.key)}
              aria-label={`${loc.label} AP ${armourPoints[loc.key]}`}
              aria-pressed={selected}
              data-testid={`location-${loc.key}`}
            >
              <span className={styles.locationLabel}>{loc.label}</span>
              <span className={styles.apValue}>{armourPoints[loc.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Shield rating display */}
      {shieldRating > 0 && (
        <div className={styles.shieldRow} data-testid="shield-rating">
          <Shield size={16} />
          <span>Shield: +{shieldRating} AP when opposing attacks</span>
        </div>
      )}

      {/* Contributing armour items for selected location */}
      {selectedLocation && (
        <div className={styles.contributingSection} data-testid="contributing-armour">
          <div className={styles.contributingTitle}>
            {LOCATION_LABELS[selectedLocation]} — Contributing Armour
          </div>
          {contributingItems.length === 0 && (
            <div className={styles.contributingEmpty}>
              No armour covers this location.
            </div>
          )}
          {contributingItems.map((item, i) => (
            <div key={i} className={styles.contributingItem}>
              {item.name} — AP {item.ap}
              {item.qualities && item.qualities !== '—' ? ` (${item.qualities})` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Worn Armour List */}
      <div className={styles.sectionLabel}>Worn Armour</div>
      {armourList.length === 0 && (
        <div className={styles.emptyMsg}>No armour worn.</div>
      )}
      <div className={styles.armourListSection}>
        {armourList.map((item, i) => {
          const runeQualities = getRuneQualities(item.runes ?? []);
          const hasRunes = (item.runes?.length ?? 0) > 0;
          const isEditing = editingIndex === i;

          return (
            <div key={i} className={styles.armourRow} data-testid={`armour-item-${i}`}>
              {isEditing && onUpdateArmour ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => onUpdateArmour(i, 'name', e.target.value)}
                    placeholder="Name"
                    className={styles.editInput}
                    aria-label="Armour name"
                  />
                  <div className={styles.editRow}>
                    <input
                      type="text"
                      value={item.locations}
                      onChange={(e) => onUpdateArmour(i, 'locations', e.target.value)}
                      placeholder="Locations (e.g. Arms, Body)"
                      className={styles.editInput}
                      aria-label="Armour locations"
                    />
                    <input
                      type="number"
                      value={item.ap}
                      onChange={(e) => onUpdateArmour(i, 'ap', Math.max(0, Number(e.target.value) || 0))}
                      placeholder="AP"
                      className={styles.editInputSmall}
                      aria-label="Armour points"
                      min={0}
                    />
                  </div>
                  <div className={styles.editRow}>
                    <input
                      type="text"
                      value={item.qualities}
                      onChange={(e) => onUpdateArmour(i, 'qualities', e.target.value)}
                      placeholder="Qualities (e.g. Flexible)"
                      className={styles.editInput}
                      aria-label="Armour qualities"
                    />
                    <input
                      type="text"
                      value={item.enc}
                      onChange={(e) => onUpdateArmour(i, 'enc', e.target.value)}
                      placeholder="Enc"
                      className={styles.editInputSmall}
                      aria-label="Encumbrance"
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.editDoneBtn}
                    onClick={() => setEditingIndex(null)}
                  >Done</button>
                </div>
              ) : (
                <div className={styles.armourInfo}>
                  <div className={styles.armourNameRow}>
                    <span className={styles.armourName} title={item.name}>{item.name || 'Unnamed'}</span>
                    <span className={styles.armourAP}>AP {item.ap}</span>
                  </div>
                  <div className={styles.armourDetail}>
                    {item.locations}
                  </div>
                  {((item.qualities && item.qualities !== '—') || runeQualities.length > 0) && (
                    <div className={styles.qualitiesText}>
                      {item.qualities && item.qualities !== '—' ? item.qualities : ''}
                      {runeQualities.length > 0 && (
                        <span className={styles.runeQualitiesText}>
                          {item.qualities && item.qualities !== '—' ? ', ' : ''}
                          +{runeQualities.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Edit button */}
              {onUpdateArmour && !isEditing && (
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => setEditingIndex(i)}
                  aria-label={`Edit ${item.name || 'armour'}`}
                >✎</button>
              )}

              {/* Rune management */}
              {onOpenRuneManager && !isEditing && (
                <button
                  type="button"
                  className={styles.runeBadge}
                  onClick={() => onOpenRuneManager(i)}
                  aria-label={`Manage runes for ${item.name}`}
                >
                  ⚒ {hasRunes ? `${item.runes!.length}/3` : 'Runes'}
                </button>
              )}

              {/* Delete button */}
              {onDeleteArmour && !isEditing && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => onDeleteArmour(i)}
                  aria-label={`Delete ${item.name}`}
                >✕</button>
              )}
            </div>
          );
        })}
      </div>

    </Card>
  );
}
