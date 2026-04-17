import { useState } from 'react';
import type { ArmourPoints, ArmourItem } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
import { getRuneQualities } from '../../logic/runes';
import { Shield } from 'lucide-react';
import styles from './ArmourMap.module.css';

export interface ArmourMapProps {
  armourPoints: ArmourPoints;
  armourList: ArmourItem[];
  onDeleteArmour?: (armourIndex: number) => void;
  onOpenRuneManager?: (armourIndex: number) => void;
  onOpenArmourPicker?: () => void;
  onAddCustomArmour?: () => void;
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
  onDeleteArmour,
  onOpenRuneManager,
  onOpenArmourPicker,
  onAddCustomArmour,
}: ArmourMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationKey | null>(null);

  const handleLocationTap = (key: LocationKey) => {
    setSelectedLocation(prev => prev === key ? null : key);
  };

  // Get armour items that contribute to the selected location
  const contributingItems = selectedLocation
    ? armourList.filter(item => coversLocation(item, selectedLocation))
    : [];

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

          return (
            <div key={i} className={styles.armourRow} data-testid={`armour-item-${i}`}>
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

              {/* Rune management */}
              {onOpenRuneManager && (
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
              {onDeleteArmour && (
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
