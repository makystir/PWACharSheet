import { useState } from 'react';
import type { Character, JourneyRosterMember, JourneyStage } from '../../types/character';
import type { JourneyEvent } from '../../logic/wilderness-travel/types';
import {
  CAMP_ENDEAVOUR_OPTIONS,
  TRAVEL_ENDEAVOUR_OPTIONS,
} from '../../logic/wilderness-travel/types';
import {
  PRECIPITATION_OPTIONS,
  TEMPERATURE_OPTIONS,
  TERRAIN_TYPES,
  VISIBILITY_OPTIONS,
  computeEndeavourNetSL,
  type ModifierTarget,
  type NetSLResult,
  type Precipitation,
  type Temperature,
  type TerrainType,
  type Visibility,
} from '../../logic/wilderness-travel/journey-modifiers';
import {
  getJourneyEndeavour,
  type JourneyEndeavour,
} from '../../logic/wilderness-travel/journey-endeavours';
import { resolveSeededTarget } from '../../logic/reminders-target';
import { Tooltip } from '../shared/Tooltip';
import type { SeededRollRequest } from './JourneyTrackerPanel';
import { StageEventRoller } from './StageEventRoller';
import styles from './JourneyTrackerPanel.module.css';

interface StageCardProps {
  character: Character;
  stage: JourneyStage;
  roster: JourneyRosterMember[];
  dispatch: (event: JourneyEvent) => void;
  /** Deft Steps p.114: party has tents → Make Camp seeds Average instead of Challenging. */
  hasTents: boolean;
  /** Open the panel's single seeded RollDialog for a bare-skill/characteristic test. */
  onSeededRoll: (req: SeededRollRequest) => void;
}

/** Which anchored breakdown tooltip (if any) is open within this Stage card. */
type OpenInfo = { key: string; anchorEl: HTMLElement } | null;

/** Format an SL number for display, e.g. +2 / −3 / 0. */
function formatSL(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `\u2212${Math.abs(n)}`;
  return '0';
}

/**
 * A single Stage of the journey: terrain/weather selection for the Stage, then
 * one row per roster member with a Travel- and Camp-endeavour selector, the
 * catalog test/difficulty, a GUIDANCE net-SL suggestion (with breakdown
 * tooltip), an optional one-tap seeded roll button, and per-member notes.
 *
 * Weather and terrain modifiers are surfaced as GUIDANCE only — nothing is
 * auto-applied to any roll (Deft Steps p.114/p.124; "Modifiers caused by the
 * weather are used at the discretion of the GM").
 *
 * The "both endeavours" reminder is transcribed, cited guidance — advisory only:
 * // Deft Steps, "Travel Endeavours and Camp Endeavours": "If a character does
 * // both a travel endeavour and a camp endeavour, they must pass a Hard (-20)
 * // Endurance Test or gain a Fatigued Condition." (not auto-applied).
 */
export function StageCard({ character, stage, roster, dispatch, hasTents, onSeededRoll }: StageCardProps) {
  const [openInfo, setOpenInfo] = useState<OpenInfo>(null);
  const closeInfo = () => setOpenInfo(null);

  const recordFor = (memberId: string) =>
    stage.records.find((r) => r.memberId === memberId);

  const terrain = stage.terrain;
  const weather = stage.weather;

  /** Resolve the catalog entry for a selected option name (undefined for '', 'Other'). */
  const catalogFor = (name: string): JourneyEndeavour | undefined =>
    name && name !== 'Other' ? getJourneyEndeavour(name) : undefined;

  return (
    <div className={styles.stageCard}>
      <div className={styles.stageHeader}>
        <span className={styles.stageTitle}>Stage {stage.label}</span>
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={() => dispatch({ kind: 'removeStage', stageId: stage.id })}
          aria-label={`Remove Stage ${stage.label}`}
        >
          Remove Stage
        </button>
      </div>

      {/* Terrain + Weather selection (Deft Steps p.124 / p.114). */}
      <div className={styles.envGrid}>
        <div>
          <label className={styles.fieldLabel} htmlFor={`terrain-${stage.id}`}>Terrain</label>
          <select
            id={`terrain-${stage.id}`}
            className={styles.selectField}
            value={terrain ?? ''}
            onChange={(e) =>
              dispatch({
                kind: 'setStageTerrain',
                stageId: stage.id,
                terrain: (e.target.value || undefined) as TerrainType | undefined,
              })
            }
          >
            <option value="">— none —</option>
            {TERRAIN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.fieldLabel} htmlFor={`weather-temp-${stage.id}`}>Temperature</label>
          <select
            id={`weather-temp-${stage.id}`}
            className={styles.selectField}
            value={weather?.temperature ?? ''}
            onChange={(e) =>
              dispatch({
                kind: 'setStageWeather',
                stageId: stage.id,
                weather: { ...weather, temperature: (e.target.value || undefined) as Temperature | undefined },
              })
            }
          >
            <option value="">— none —</option>
            {TEMPERATURE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.fieldLabel} htmlFor={`weather-precip-${stage.id}`}>Precipitation</label>
          <select
            id={`weather-precip-${stage.id}`}
            className={styles.selectField}
            value={weather?.precipitation ?? ''}
            onChange={(e) =>
              dispatch({
                kind: 'setStageWeather',
                stageId: stage.id,
                weather: { ...weather, precipitation: (e.target.value || undefined) as Precipitation | undefined },
              })
            }
          >
            <option value="">— none —</option>
            {PRECIPITATION_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.fieldLabel} htmlFor={`weather-vis-${stage.id}`}>Visibility</label>
          <select
            id={`weather-vis-${stage.id}`}
            className={styles.selectField}
            value={weather?.visibility ?? ''}
            onChange={(e) =>
              dispatch({
                kind: 'setStageWeather',
                stageId: stage.id,
                weather: { ...weather, visibility: (e.target.value || undefined) as Visibility | undefined },
              })
            }
          >
            <option value="">— none —</option>
            {VISIBILITY_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {/* The d10 roll column never yields Fog directly; it is a cited, GM-set category (Deft Steps p.114). */}
          <span className={styles.caption}>
            The Weather Table&rsquo;s d10 roll never yields Fog directly; it is provided for GM-set weather (Deft Steps p.114).
          </span>
        </div>
      </div>

      {roster.length === 0 && (
        <p className={styles.emptyRoster}>Add party members above to record their endeavours.</p>
      )}

      {roster.map((member) => {
        const rec = recordFor(member.id);
        const travel = rec?.travelEndeavour ?? '';
        const camp = rec?.campEndeavour ?? '';
        const notes = rec?.notes ?? '';
        const bothChosen = travel !== '' && camp !== '';
        const travelCat = catalogFor(travel);
        const campCat = catalogFor(camp);

        /** Render a catalog-backed endeavour's guidance (test, net-SL, seed button). */
        const renderCatalogGuidance = (cat: JourneyEndeavour, slotKey: string) => {
          const net = computeEndeavourNetSL(cat as ModifierTarget, terrain, weather);
          // Make Camp difficulty default depends on tents (Deft Steps p.114).
          const seedDifficulty =
            cat.id === 'make-camp' && hasTents ? 'Average' : cat.seed?.difficulty;
          return (
            <div className={styles.endeavourGuidance}>
              <span className={styles.endeavourTest}>{cat.test}</span>
              {renderNetSL(cat, net, slotKey)}
              {cat.seed ? (
                renderSeedButton(cat, slotKey, seedDifficulty)
              ) : (
                <span className={styles.seedNote} role="note">{cat.seedNote}</span>
              )}
            </div>
          );
        };

        /** Net-SL suggestion with a calculated-total breakdown tooltip + advisory lines. */
        const renderNetSL = (cat: JourneyEndeavour, net: NetSLResult, slotKey: string) => {
          const infoKey = `net-${cat.id}-${member.id}-${slotKey}`;
          const hasComponents = net.components.length > 0;
          return (
            <>
              {hasComponents && (
                <button
                  type="button"
                  className={styles.netSlBadge}
                  aria-label={`Suggested net SL ${formatSL(net.net)} for ${cat.name}. Show breakdown.`}
                  aria-describedby={openInfo?.key === infoKey ? infoKey : undefined}
                  onClick={(e) => setOpenInfo({ key: infoKey, anchorEl: e.currentTarget })}
                >
                  Suggested: {formatSL(net.net)} SL
                </button>
              )}
              {net.advisory.length > 0 && (
                <span className={styles.advisory} role="note">
                  GM discretion: {net.advisory.join(' ')}
                </span>
              )}
              {openInfo?.key === infoKey && (
                <Tooltip id={infoKey} anchorEl={openInfo.anchorEl} title={`${cat.name} — suggested SL`} onClose={closeInfo}>
                  <div className={styles.tooltipBreakdown}>
                    {net.components.map((c) => (
                      <div key={c.label} className={styles.tooltipLine}>
                        <span>{c.label}</span>
                        <span>{formatSL(c.value)}</span>
                      </div>
                    ))}
                    <div className={styles.tooltipTotal}>
                      <span>Net SL</span>
                      <span>{formatSL(net.net)}</span>
                    </div>
                    <div className={styles.tooltipNote}>
                      Guidance only — SL is read off the roll result and recorded, never auto-applied.
                    </div>
                  </div>
                </Tooltip>
              )}
            </>
          );
        };

        /** One-tap seeded roll button + a base-target breakdown tooltip (NFR-3). */
        const renderSeedButton = (cat: JourneyEndeavour, slotKey: string, difficulty: JourneyEndeavour['difficulty'] | undefined) => {
          if (!cat.seed) return null;
          const seed = cat.seed;
          const infoKey = `target-${cat.id}-${member.id}-${slotKey}`;
          const resolved = resolveSeededTarget(character, seed.def);
          return (
            <span className={styles.seedRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() =>
                  onSeededRoll({
                    def: seed.def,
                    difficulty: difficulty ?? seed.difficulty,
                    rollName: seed.rollName,
                  })
                }
              >
                Roll {seed.rollName}
              </button>
              <button
                type="button"
                className={styles.targetBadge}
                aria-label={`Base target ${resolved.total} for ${seed.rollName}. Show breakdown.`}
                aria-describedby={openInfo?.key === infoKey ? infoKey : undefined}
                onClick={(e) => setOpenInfo({ key: infoKey, anchorEl: e.currentTarget })}
              >
                Base {resolved.total}
              </button>
              {openInfo?.key === infoKey && (
                <Tooltip id={infoKey} anchorEl={openInfo.anchorEl} title={`${seed.rollName} — base target`} onClose={closeInfo}>
                  <div className={styles.tooltipBreakdown}>
                    {resolved.lines.map((line, i) => (
                      <div key={i} className={styles.tooltipLine}>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </Tooltip>
              )}
            </span>
          );
        };

        return (
          <div key={member.id} className={styles.memberRow}>
            <div className={styles.memberName}>{member.name || '(unnamed)'}</div>

            <div>
              <label className={styles.fieldLabel} htmlFor={`travel-${stage.id}-${member.id}`}>
                Travel Endeavour
              </label>
              <select
                id={`travel-${stage.id}-${member.id}`}
                className={styles.selectField}
                value={travel}
                onChange={(e) =>
                  dispatch({
                    kind: 'setStageEndeavour',
                    stageId: stage.id,
                    memberId: member.id,
                    slot: 'travel',
                    value: e.target.value,
                  })
                }
              >
                <option value="">— none —</option>
                {TRAVEL_ENDEAVOUR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {travelCat && renderCatalogGuidance(travelCat, 'travel')}
            </div>

            <div>
              <label className={styles.fieldLabel} htmlFor={`camp-${stage.id}-${member.id}`}>
                Camp Endeavour
              </label>
              <select
                id={`camp-${stage.id}-${member.id}`}
                className={styles.selectField}
                value={camp}
                onChange={(e) =>
                  dispatch({
                    kind: 'setStageEndeavour',
                    stageId: stage.id,
                    memberId: member.id,
                    slot: 'camp',
                    value: e.target.value,
                  })
                }
              >
                <option value="">— none —</option>
                {CAMP_ENDEAVOUR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {campCat && renderCatalogGuidance(campCat, 'camp')}
            </div>

            {bothChosen && (
              <div className={styles.reminder} role="note">
                Both endeavours chosen: Hard (−20) Endurance Test or gain Fatigued
                (Deft Steps, &ldquo;Travel Endeavours and Camp Endeavours&rdquo;). Advisory only —
                not applied automatically.
              </div>
            )}

            <div className={styles.memberNotesRow}>
              <label className={styles.fieldLabel} htmlFor={`notes-${stage.id}-${member.id}`}>
                Result / notes
              </label>
              <textarea
                id={`notes-${stage.id}-${member.id}`}
                className={styles.textarea}
                value={notes}
                placeholder="SL, outcome, GM ruling…"
                onChange={(e) =>
                  dispatch({
                    kind: 'setMemberNotes',
                    stageId: stage.id,
                    memberId: member.id,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>
        );
      })}

      {/* Slice C: optional per-Stage event-roll helper (reference only, no auto-apply). */}
      <StageEventRoller terrain={terrain} />

      <div className={styles.memberNotesRow} style={{ marginTop: 8 }}>
        <label className={styles.fieldLabel} htmlFor={`stage-notes-${stage.id}`}>
          Stage notes
        </label>
        <textarea
          id={`stage-notes-${stage.id}`}
          className={styles.textarea}
          value={stage.notes}
          placeholder="Weather, terrain, events this Stage…"
          onChange={(e) => dispatch({ kind: 'setStageNotes', stageId: stage.id, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
