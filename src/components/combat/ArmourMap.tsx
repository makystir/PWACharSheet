import { useState, useCallback } from 'react';
import type { ArmourPoints, ArmourItem, WeaponData } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
import { EmptyState } from '../shared/EmptyState';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import { Tooltip } from '../shared/Tooltip';
import { APBreakdownContent } from '../pages/APBreakdownContent';
import { getAPBreakdown } from '../../logic/breakdown-helpers';
import { getRuneQualities } from '../../logic/runes';
import { QUALITY_DEFINITIONS } from '../../data/armourQualities';
import { validateLayering, isWeakpointsSuppressed } from '../../logic/armourLayering';
import type { LocationKey as LayeringLocationKey } from '../../logic/armourLayering';
import { getStealthPenalty, getPerceptionPenalty } from '../../logic/armourPenalties';
import { Shield } from 'lucide-react';
import styles from './ArmourMap.module.css';

export interface ArmourMapProps {
  armourPoints: ArmourPoints;
  armourList: ArmourItem[];
  weapons?: WeaponData[];
  toughnessBonus?: number;
  onDeleteArmour?: (armourIndex: number) => void;
  onUpdateArmour?: (armourIndex: number, field: keyof ArmourItem, value: string | number | boolean) => void;
  onOpenRuneManager?: (armourIndex: number) => void;
  onOpenArmourPicker?: () => void;
  onAddCustomArmour?: () => void;
  /** Externally controlled selected location (for communication with TakeDamagePanel) */
  selectedLocation?: LocationKey | null;
  /** Callback when a hit location is selected/deselected */
  onSelectLocation?: (location: LocationKey | null) => void;
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
export type { LocationKey as ArmourLocationKey };

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

/** Helmet special ability descriptions (when visor is closed or always) */
const HELMET_ABILITIES: Record<string, string> = {
  Bascinet: '+1 AP vs frontal missile',
  Armet: 'Damage resistance (d10 table)',
  Sallet: 'Critical Hits deal 1 less Wound',
};

/** Get the helmet special ability label for a named helmet item, if applicable */
function getHelmetAbility(item: ArmourItem): string | null {
  // If visor is open, hide the special ability (per Req 4.5)
  if (item.visorOpen === true) return null;
  for (const [helmetName, ability] of Object.entries(HELMET_ABILITIES)) {
    if (item.name === helmetName) return ability;
  }
  return null;
}

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

/** Abbreviated labels for quality/flaw badges */
const QUALITY_ABBREV: Record<string, string> = {
  Impenetrable: 'Imp',
  Overcoat: 'OC',
  Reinforced: 'Ref',
  Visor: 'Vis',
  Partial: 'Par',
  'Requires Kit': 'RK',
  Weakpoints: 'WP',
};

/** Known quality names (to determine badge styling) */
const FLAW_NAMES: Set<string> = new Set(['Partial', 'Requires Kit', 'Weakpoints']);

/** Parse quality/flaw names from the comma-separated qualities string */
function parseQualities(qualitiesStr: string): string[] {
  if (!qualitiesStr || qualitiesStr === '—') return [];
  return qualitiesStr.split(',').map(q => q.trim()).filter(q => q && q !== '—');
}

/** Get the QualityDefinition for a given quality/flaw name */
function getQualityDefinition(name: string) {
  return QUALITY_DEFINITIONS.find(d => d.name === name);
}

/** Quality/Flaw badge component */
function QualityBadge({ name, expandedQuality, onToggle }: {
  name: string;
  expandedQuality: string | null;
  onToggle: (name: string) => void;
}) {
  const abbrev = QUALITY_ABBREV[name] || name.slice(0, 3);
  const isFlaw = FLAW_NAMES.has(name);
  const def = getQualityDefinition(name);
  const isExpanded = expandedQuality === name;

  return (
    <span className={styles.qualityBadgeWrapper}>
      <button
        type="button"
        className={isFlaw ? styles.flawBadge : styles.qualityBadge}
        onClick={(e) => { e.stopPropagation(); onToggle(name); }}
        aria-label={`${name}: ${def?.description || 'No description'}`}
        aria-expanded={isExpanded}
        title={def?.description || name}
        data-testid={`quality-badge-${name.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {abbrev}
      </button>
      {isExpanded && def && (
        <span className={styles.qualityTooltip} data-testid={`quality-tooltip-${name.replace(/\s+/g, '-').toLowerCase()}`}>
          <strong>{def.name}</strong>: {def.description}
          {def.combatEffect && (
            <span className={styles.combatEffect}> ({def.combatEffect})</span>
          )}
        </span>
      )}
    </span>
  );
}

export function ArmourMap({
  armourPoints,
  armourList,
  weapons = [],
  toughnessBonus,
  onDeleteArmour,
  onUpdateArmour,
  onOpenRuneManager,
  onOpenArmourPicker,
  onAddCustomArmour,
  selectedLocation: externalSelectedLocation,
  onSelectLocation,
}: ArmourMapProps) {
  const [internalSelectedLocation, setInternalSelectedLocation] = useState<LocationKey | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedArmourIndex, setExpandedArmourIndex] = useState<number | null>(null);
  const [showAllArmour, setShowAllArmour] = useState(false);
  const [expandedQuality, setExpandedQuality] = useState<string | null>(null);
  const [apTooltip, setApTooltip] = useState<{ location: LocationKey; anchorEl: HTMLElement } | null>(null);
  const [penaltyTooltip, setPenaltyTooltip] = useState<{ kind: 'stealth' | 'perception'; anchorEl: HTMLElement } | null>(null);

  // Use external prop if provided, otherwise use internal state
  const selectedLocation = externalSelectedLocation !== undefined ? externalSelectedLocation : internalSelectedLocation;

  const handleQualityToggle = useCallback((name: string) => {
    setExpandedQuality(prev => prev === name ? null : name);
  }, []);
  const [showRepairInfo, setShowRepairInfo] = useState(false);

  const handleArmourItemToggle = useCallback((index: number) => {
    setExpandedArmourIndex(prev => prev === index ? null : index);
  }, []);

  const handleLocationTap = (key: LocationKey) => {
    const newValue = selectedLocation === key ? null : key;
    if (onSelectLocation) {
      onSelectLocation(newValue);
    } else {
      setInternalSelectedLocation(newValue);
    }
  };

  const handleApTooltipOpen = useCallback((location: LocationKey, anchorEl: HTMLElement) => {
    // Setting a new tooltip automatically replaces any previous one (single-tooltip-at-a-time)
    setApTooltip({ location, anchorEl });
  }, []);

  const handleApTooltipClose = useCallback(() => {
    setApTooltip(null);
  }, []);

  // Get armour items that contribute to the selected location
  const contributingItems = selectedLocation
    ? armourList.filter(item => item.worn !== false && coversLocation(item, selectedLocation))
    : [];

  // Shield rating from equipped weapons
  const shieldRating = getShieldRating(weapons);

  // Armour test penalties (Core p.293): Stealth stacks -10 per worn Mail/Plate
  // piece; Perception is a per-item penalty (helmets). Each shows a breakdown.
  const stealthPenalty = getStealthPenalty(armourList);
  const perceptionPenalty = getPerceptionPenalty(armourList);

  const handlePenaltyTooltipToggle = (kind: 'stealth' | 'perception', anchorEl: HTMLElement) => {
    setPenaltyTooltip((prev) => (prev?.kind === kind ? null : { kind, anchorEl }));
  };
  const handlePenaltyTooltipClose = () => setPenaltyTooltip(null);

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
      <div className={`${styles.bodyGrid} ${styles.defenseTint}`} data-testid="armour-body-map">
        {LOCATIONS.map(loc => {
          const selected = selectedLocation === loc.key;
          const isTooltipOpen = apTooltip?.location === loc.key;
          return (
            <button
              key={loc.key}
              type="button"
              className={selected ? styles.locationCellSelected : styles.locationCell}
              style={{
                gridColumn: loc.gridColumn,
                gridRow: loc.gridRow,
              }}
              onClick={() => handleLocationTap(loc.key)}
              aria-pressed={selected}
              aria-label={`Select ${loc.label} location`}
              data-testid={`location-${loc.key}`}
            >
              <span className={styles.locationLabel}>{loc.label}</span>
              <TooltipTriggerCell
                tooltipId={`tooltip-ap-${loc.key}`}
                displayValue={armourPoints[loc.key]}
                isTooltipOpen={isTooltipOpen}
                onOpen={(anchorEl) => handleApTooltipOpen(loc.key, anchorEl)}
                onClose={handleApTooltipClose}
                className={styles.apValue}
                ariaLabel={`${loc.label} AP ${armourPoints[loc.key]}`}
              />
            </button>
          );
        })}
      </div>

      {/* Damage reduction summary: TB and Shield */}
      {(toughnessBonus !== undefined || shieldRating > 0) && (
        <div className={styles.damageReductionRow} data-testid="damage-reduction-summary">
          {toughnessBonus !== undefined && (
            <div className={styles.damageReductionItem}>
              <span className={styles.damageReductionLabel}>TB</span>
              <span className={styles.damageReductionValue}>{toughnessBonus}</span>
            </div>
          )}
          {shieldRating > 0 && (
            <div className={styles.damageReductionItem}>
              <Shield size={14} />
              <span className={styles.damageReductionLabel}>Shield</span>
              <span className={styles.damageReductionValue}>+{shieldRating}</span>
            </div>
          )}
        </div>
      )}

      {/* Armour test penalties — Stealth (stacks per Mail/Plate piece) and
          Perception (per-item helmet penalty). Core p.293. */}
      {(stealthPenalty.total > 0 || perceptionPenalty.total > 0) && (
        <div className={styles.penaltyRow} data-testid="armour-penalty-row">
          {stealthPenalty.total > 0 && (
            <button
              type="button"
              className={styles.stealthPenaltyBadge}
              data-testid="stealth-penalty-badge"
              aria-label={`Stealth penalty −${stealthPenalty.total}. Tap for breakdown.`}
              aria-expanded={penaltyTooltip?.kind === 'stealth'}
              onClick={(e) => handlePenaltyTooltipToggle('stealth', e.currentTarget)}
            >
              −{stealthPenalty.total} Stealth
            </button>
          )}
          {perceptionPenalty.total > 0 && (
            <button
              type="button"
              className={styles.perceptionPenaltyBadge}
              data-testid="perception-penalty-badge"
              aria-label={`Perception penalty −${perceptionPenalty.total}. Tap for breakdown.`}
              aria-expanded={penaltyTooltip?.kind === 'perception'}
              onClick={(e) => handlePenaltyTooltipToggle('perception', e.currentTarget)}
            >
              −{perceptionPenalty.total} Perception
            </button>
          )}
        </div>
      )}

      {/* Contributing armour items for selected location */}
      {selectedLocation && (
        <div className={styles.contributingSection} data-testid="contributing-armour">
          <div className={styles.contributingTitle}>
            {LOCATION_LABELS[selectedLocation]} — Contributing Armour
          </div>
          {/* Total Effective AP */}
          {contributingItems.length > 0 && (
            <div className={styles.effectiveApNote} data-testid="effective-ap-note">
              Total Effective AP: {armourPoints[selectedLocation]}
            </div>
          )}
          {contributingItems.length === 0 && (
            <div className={styles.contributingEmpty}>
              No armour covers this location.
            </div>
          )}
          {contributingItems.map((item, i) => {
            const qualities = parseQualities(item.qualities);
            const currentAp = item.currentAp ?? item.ap;
            const weakpointsSuppressed = isWeakpointsSuppressed(armourList, selectedLocation as LayeringLocationKey);
            const displayQualities = weakpointsSuppressed
              ? qualities.filter(q => q !== 'Weakpoints')
              : qualities;
            return (
              <div key={i} className={styles.contributingItem}>
                <span>
                  {item.name} —{' '}
                  {currentAp === 0 ? (
                    <span className={styles.apDestroyed}>0/{item.ap}</span>
                  ) : currentAp < item.ap ? (
                    <span className={styles.apDamaged}>{currentAp}/{item.ap}</span>
                  ) : (
                    <>AP {item.ap}</>
                  )}
                </span>
                {displayQualities.length > 0 && (
                  <span className={styles.badgeRow} data-testid={`contributing-badges-${i}`}>
                    {displayQualities.map(q => (
                      <QualityBadge
                        key={q}
                        name={q}
                        expandedQuality={expandedQuality}
                        onToggle={handleQualityToggle}
                      />
                    ))}
                  </span>
                )}
                {/* Visor open note in contributing view */}
                {qualities.includes('Visor') && item.visorOpen && (
                  <div className={styles.visorOpenNote} data-testid={`contributing-visor-note-${i}`}>
                    Partial (visor open), -10 Perception
                  </div>
                )}
                {/* Helmet special ability label in contributing view */}
                {getHelmetAbility(item) && (
                  <span className={styles.helmetAbilityLabel} data-testid={`contributing-helmet-ability-${i}`}>
                    {getHelmetAbility(item)}
                  </span>
                )}
              </div>
            );
          })}
          {/* Weakpoints suppressed note */}
          {isWeakpointsSuppressed(armourList, selectedLocation as LayeringLocationKey) && (
            <div className={styles.suppressedNote} data-testid="weakpoints-suppressed-note">
              (Weakpoints suppressed by Reinforced Kit)
            </div>
          )}
          {/* Layering validation warnings */}
          {(() => {
            const result = validateLayering(armourList, selectedLocation as LayeringLocationKey);
            if (result.warnings.length === 0) return null;
            return (
              <div className={styles.layeringWarning} data-testid="layering-warnings">
                {result.warnings.map((warning, idx) => (
                  <div key={idx}>{warning}</div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Worn Armour List */}
      <div className={styles.sectionLabel}>Worn Armour</div>
      {armourList.length === 0 && (
        <EmptyState
          icon={Shield}
          heading="No Armour"
          description="No armour worn — add pieces from the rulebook or create custom armour."
          compact
          action={onOpenArmourPicker ? { label: 'Add Armour', onClick: onOpenArmourPicker } : undefined}
        />
      )}
      <div className={styles.armourListSection}>
        {(() => {
          const shouldCap = armourList.length > 4 && !showAllArmour;
          const visibleItems = shouldCap ? armourList.slice(0, 3) : armourList;
          return (
            <>
              {visibleItems.map((item, i) => {
                const runeQualities = getRuneQualities(item.runes ?? []);
                const hasRunes = (item.runes?.length ?? 0) > 0;
                const isEditing = editingIndex === i;
                const isExpanded = expandedArmourIndex === i;
                const hasQualities = (item.qualities && item.qualities !== '—') || runeQualities.length > 0;

                return (
                  <div key={i} className={`${styles.armourRow}${item.worn === false ? ` ${styles.armourRowUnworn}` : ''}`} data-testid={`armour-item-${i}`}>
                    {/* Worn toggle checkbox */}
                    {onUpdateArmour && !isEditing && (
                      <input
                        type="checkbox"
                        checked={item.worn !== false}
                        onChange={() => onUpdateArmour(i, 'worn', !(item.worn !== false))}
                        aria-label={`${item.name} — ${item.worn !== false ? 'worn' : 'unworn'}`}
                        className={styles.wornToggle}
                        data-testid={`armour-worn-toggle-${i}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
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
                      <div
                        className={styles.armourInfo}
                        onClick={() => handleArmourItemToggle(i)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleArmourItemToggle(i); } }}
                        aria-expanded={isExpanded}
                        aria-label={`${item.name || 'Unnamed'} — tap to show details`}
                      >
                        <div className={styles.armourCompactRow}>
                          <span className={styles.armourName} title={item.name}>{item.name || 'Unnamed'}</span>
                          {(() => {
                            const currentAp = item.currentAp ?? item.ap;
                            if (currentAp === 0) {
                              return (
                                <span className={`${styles.armourAP} ${styles.apDestroyed}`} data-testid={`armour-ap-destroyed-${i}`}>
                                  0/{item.ap}
                                </span>
                              );
                            } else if (currentAp < item.ap) {
                              return (
                                <span className={`${styles.armourAP} ${styles.apDamaged}`} data-testid={`armour-ap-damaged-${i}`}>
                                  {currentAp}/{item.ap}
                                </span>
                              );
                            } else {
                              return (
                                <span className={styles.armourAP}>AP {item.ap}</span>
                              );
                            }
                          })()}
                          <span className={styles.armourLocations}>{item.locations}</span>
                        </div>
                        {isExpanded && (
                          <div className={styles.armourSecondary}>
                            {item.qualities && item.qualities !== '—' && (
                              <span className={styles.badgeRow} data-testid={`armour-badges-${i}`}>
                                {parseQualities(item.qualities).map(q => (
                                  <QualityBadge
                                    key={q}
                                    name={q}
                                    expandedQuality={expandedQuality}
                                    onToggle={handleQualityToggle}
                                  />
                                ))}
                                {/* Visor toggle button */}
                                {parseQualities(item.qualities).includes('Visor') && onUpdateArmour && (
                                  <button
                                    type="button"
                                    className={styles.visorToggle}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateArmour(i, 'visorOpen', !item.visorOpen);
                                    }}
                                    aria-label={`Visor: ${item.visorOpen ? 'Open' : 'Closed'}. Click to ${item.visorOpen ? 'close' : 'open'}.`}
                                    data-testid={`visor-toggle-${i}`}
                                  >
                                    {item.visorOpen ? 'Open' : 'Closed'}
                                  </button>
                                )}
                              </span>
                            )}
                            {/* Visor open: show Partial note and -10 Perception */}
                            {parseQualities(item.qualities).includes('Visor') && item.visorOpen && (
                              <div className={styles.visorOpenNote} data-testid={`visor-open-note-${i}`}>
                                Partial (visor open), -10 Perception
                              </div>
                            )}
                            {/* Helmet special ability label */}
                            {getHelmetAbility(item) && (
                              <span className={styles.helmetAbilityLabel} data-testid={`helmet-ability-${i}`}>
                                {getHelmetAbility(item)}
                              </span>
                            )}
                            {runeQualities.length > 0 && (
                              <span className={styles.runeQualitiesText}>
                                {item.qualities && item.qualities !== '—' ? ' ' : ''}
                                +{runeQualities.join(', ')}
                              </span>
                            )}
                            {/* AP +/- controls (only shown when expanded) */}
                            {onUpdateArmour && (
                              <div className={styles.apControls} data-testid={`armour-ap-controls-${i}`}>
                                <button
                                  type="button"
                                  className={styles.apControlBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentAp = item.currentAp ?? item.ap;
                                    onUpdateArmour(i, 'currentAp', Math.max(0, currentAp - 1));
                                  }}
                                  disabled={(item.currentAp ?? item.ap) <= 0}
                                  aria-label={`Reduce AP for ${item.name}`}
                                  data-testid={`armour-ap-minus-${i}`}
                                >
                                  −
                                </button>
                                <span className={styles.apControlValue}>
                                  {item.currentAp ?? item.ap} / {item.ap}
                                </span>
                                <button
                                  type="button"
                                  className={styles.apControlBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentAp = item.currentAp ?? item.ap;
                                    onUpdateArmour(i, 'currentAp', Math.min(item.ap, currentAp + 1));
                                  }}
                                  disabled={(item.currentAp ?? item.ap) >= item.ap}
                                  aria-label={`Restore AP for ${item.name}`}
                                  data-testid={`armour-ap-plus-${i}`}
                                >
                                  +
                                </button>
                              </div>
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
              {armourList.length > 4 && (
                <button
                  type="button"
                  className={styles.showAllToggle}
                  onClick={() => setShowAllArmour(prev => !prev)}
                  data-testid="armour-show-all-toggle"
                >
                  {showAllArmour ? 'Show less' : `Show all (${armourList.length})`}
                </button>
              )}
            </>
          );
        })()}
      </div>

      {/* Repair Info expandable section */}
      <button
        type="button"
        className={styles.repairInfoToggle}
        onClick={() => setShowRepairInfo(prev => !prev)}
        aria-expanded={showRepairInfo}
        data-testid="repair-info-toggle"
      >
        Repair Info {showRepairInfo ? '▼' : '▶'}
      </button>
      {showRepairInfo && (
        <div className={styles.repairInfoContent} data-testid="repair-info-content">
          <table className={styles.repairTable}>
            <thead>
              <tr>
                <th>Armour Type</th>
                <th>Trade Skill</th>
                <th>SLs per AP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Boiled Leather</td>
                <td>Trade (Tailor)</td>
                <td>5</td>
              </tr>
              <tr>
                <td>Brigandine</td>
                <td>Trade (Tailor)</td>
                <td>7</td>
              </tr>
              <tr>
                <td>Chainmail</td>
                <td>Trade (Smith)</td>
                <td>10</td>
              </tr>
              <tr>
                <td>Reinforced Soft Kit</td>
                <td>Trade (Smith)</td>
                <td>10</td>
              </tr>
              <tr>
                <td>Plate</td>
                <td>Trade (Smith)</td>
                <td>15</td>
              </tr>
            </tbody>
          </table>
          <div className={styles.repairNote}>
            NPC Repair Cost: 10% of base price per AP lost; 30% if section completely broken.
          </div>
        </div>
      )}

      {/* AP Breakdown Tooltip */}
      {apTooltip && (() => {
        const breakdown = getAPBreakdown(armourList, apTooltip.location, LOCATION_LABELS[apTooltip.location]);
        return (
          <Tooltip
            anchorEl={apTooltip.anchorEl}
            title={`${LOCATION_LABELS[apTooltip.location]} AP`}
            onClose={handleApTooltipClose}
            id={`tooltip-ap-${apTooltip.location}`}
          >
            <APBreakdownContent {...breakdown} />
          </Tooltip>
        );
      })()}

      {/* Armour penalty breakdown tooltip (Stealth / Perception) */}
      {penaltyTooltip && (() => {
        const isStealth = penaltyTooltip.kind === 'stealth';
        const result = isStealth ? stealthPenalty : perceptionPenalty;
        const title = isStealth ? 'Stealth Penalty' : 'Perception Penalty';
        const suffix = isStealth ? '' : '%';
        return (
          <Tooltip
            anchorEl={penaltyTooltip.anchorEl}
            title={title}
            onClose={handlePenaltyTooltipClose}
            id={`tooltip-penalty-${penaltyTooltip.kind}`}
          >
            <div className={styles.penaltyTooltipBody}>
              {result.items.map((item, i) => (
                <div key={i} className={styles.penaltyTooltipRow}>
                  <span>{item.name}:</span>
                  <span>−{item.penalty}{suffix}</span>
                </div>
              ))}
              <hr className={styles.penaltyTooltipSep} />
              <div className={styles.penaltyTooltipTotal}>
                <span>Total:</span>
                <span>−{result.total}{suffix}</span>
              </div>
              <div className={styles.penaltyTooltipNote}>
                {isStealth
                  ? 'Core p.293: −10 Stealth per worn Mail or Plate piece.'
                  : 'Core p.293: per-item Perception penalty from worn helmets.'}
              </div>
            </div>
          </Tooltip>
        );
      })()}

    </Card>
  );
}
