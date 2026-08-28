import { useState } from 'react';
import type { Character } from '../../types/character';
import type { DiseaseEntry } from '../../data/diseases';
import { DISEASE_REGISTRY } from '../../data/diseases';
import {
  addDisease,
  removeDisease,
  updateDiseaseNotes,
  findDisease,
  getDiseaseSymptoms,
  rollDiseaseTiming,
  setDiseaseTiming,
  adjustDiseaseElapsed,
  getDiseaseProgress,
  getSymptomTest,
  symptomRollsHitLocation,
  getSymptomTestBaseTarget,
  getToughnessBonus,
} from '../../logic/diseases';
import type { RolledTiming } from '../../logic/diseases';
import { performRoll } from '../../logic/dice-roller';
import type { RollResult } from '../../logic/dice-roller';
import { getHitLocation } from '../combat/hitLocationTable';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { AddButton } from './AddButton';
import { EmptyState } from './EmptyState';
import { Picker } from './Picker';
import { HeartPulse, ChevronDown, ChevronRight, Dices } from 'lucide-react';
import styles from './DiseasePanel.module.css';

interface DiseasePanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /** Optional callback so disease Tests can be recorded in the shared roll history. */
  onRoll?: (result: RollResult) => void;
}

/** Roll a d100 (1–100). */
function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/** Transient (non-persisted) result of a symptom Test or Gangrene location roll. */
interface SymptomRollResult {
  kind: 'test' | 'location';
  text: string;
}

export function DiseasePanel({ character, updateCharacter, onRoll }: DiseasePanelProps) {
  const diseases = character.diseases ?? [];
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Transient symptom roll results keyed by `${diseaseId}:${symptomDisplayName}`.
  const [symptomRolls, setSymptomRolls] = useState<Record<string, SymptomRollResult>>({});

  const handleSelectDisease = (entry: DiseaseEntry) => {
    updateCharacter((char) => ({
      ...char,
      diseases: addDisease(char.diseases ?? [], entry.name),
    }));
    setShowPicker(false);
  };

  const handleRemoveDisease = (id: number) => {
    updateCharacter((char) => ({
      ...char,
      diseases: removeDisease(char.diseases ?? [], id),
    }));
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const handleNotesChange = (id: number, notes: string) => {
    updateCharacter((char) => ({
      ...char,
      diseases: updateDiseaseNotes(char.diseases ?? [], id, notes),
    }));
  };

  function toggleExpand(id: number) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  /** Roll (or re-roll) a timing field for a disease and persist the result. */
  function handleRollTiming(id: number, field: 'rolledIncubation' | 'rolledDuration', timingStr: string) {
    const result = rollDiseaseTiming(timingStr);
    if (!result) return; // e.g. "Instant" — nothing to roll
    const rolled: RolledTiming = {
      total: result.dice.total,
      unit: result.unit,
      breakdown: result.breakdown,
    };
    updateCharacter((char) => ({
      ...char,
      diseases: setDiseaseTiming(char.diseases ?? [], id, field, rolled),
    }));
  }

  /** Adjust the in-game elapsed days for a disease (clamped ≥ 0). */
  function handleAdjustElapsed(id: number, delta: number) {
    updateCharacter((char) => ({
      ...char,
      diseases: adjustDiseaseElapsed(char.diseases ?? [], id, delta),
    }));
  }

  /** Roll a symptom Test (Endurance/Cool) and record it transiently + in history. */
  function handleSymptomTest(
    diseaseId: number,
    symptomKey: string,
    symptomLabel: string,
    skill: 'Endurance' | 'Cool',
    difficulty: Parameters<typeof performRoll>[1],
  ) {
    const baseTarget = getSymptomTestBaseTarget(character, skill);
    const roll = Math.floor(Math.random() * 100) + 1;
    const result = performRoll(baseTarget, difficulty, `${skill} — ${symptomLabel}`, roll);
    onRoll?.(result);
    const slText = result.sl >= 0 ? `+${result.sl}` : `${result.sl}`;
    setSymptomRolls((prev) => ({
      ...prev,
      [`${diseaseId}:${symptomKey}`]: {
        kind: 'test',
        text: `Rolled ${result.roll} vs ${result.targetNumber} — ${result.outcome} (SL ${slText})`,
      },
    }));
  }

  /** Roll a Hit Location for Gangrene (Core p.188). */
  function handleGangreneLocation(diseaseId: number, symptomKey: string) {
    const roll = rollD100();
    const { location } = getHitLocation(roll);
    // Core p.188: Body = no gangrene this time; Head = nose; Arms = fingers; Legs = feet.
    const affected =
      location === 'Body' ? 'Body — no gangrene settles this time'
      : location === 'Head' ? 'Head (nose)'
      : location.includes('Arm') ? `${location} (fingers)`
      : `${location} (feet)`;
    setSymptomRolls((prev) => ({
      ...prev,
      [`${diseaseId}:${symptomKey}`]: {
        kind: 'location',
        text: `Rolled ${roll} → ${affected}`,
      },
    }));
  }

  return (
    <Card>
      <SectionHeader icon={HeartPulse} title="Diseases" />

      {diseases.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          heading="No Diseases"
          description="No active diseases — add one from the registry when contracted."
          compact
          action={{ label: 'Add Disease', onClick: () => setShowPicker(true) }}
        />
      ) : (
        <div className={styles.diseaseList}>
          {diseases.map((disease) => {
            const isExpanded = expandedId === disease.id;
            const diseaseEntry = isExpanded ? findDisease(disease.diseaseName) : null;
            const symptoms = isExpanded ? getDiseaseSymptoms(disease.diseaseName) : null;
            const tb = getToughnessBonus(character);

            return (
              <div key={disease.id} className={styles.diseaseItem}>
                <div className={styles.diseaseHeaderRow}>
                  <button
                    type="button"
                    className={styles.diseaseHeader}
                    onClick={() => toggleExpand(disease.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle ${disease.diseaseName} details`}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={14} className={styles.chevron} aria-hidden="true" />
                    )}
                    <span className={styles.diseaseName}>{disease.diseaseName}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemoveDisease(disease.id)}
                    aria-label={`Remove ${disease.diseaseName}`}
                  >
                    ✕
                  </button>
                </div>

                {isExpanded && diseaseEntry && (
                  <div className={styles.diseaseDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Contraction:</span>
                      <span className={styles.detailValue}>{diseaseEntry.contraction}</span>
                    </div>

                    {/* Incubation — with roll button when it contains dice */}
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Incubation:</span>
                      <span className={styles.detailValue}>{diseaseEntry.incubation}</span>
                      <TimingRoll
                        field="rolledIncubation"
                        timing={diseaseEntry.incubation}
                        rolled={disease.rolledIncubation}
                        onRoll={() => handleRollTiming(disease.id, 'rolledIncubation', diseaseEntry.incubation)}
                      />
                    </div>

                    {/* Duration — with roll button when it contains dice */}
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Duration:</span>
                      <span className={styles.detailValue}>{diseaseEntry.duration}</span>
                      <TimingRoll
                        field="rolledDuration"
                        timing={diseaseEntry.duration}
                        rolled={disease.rolledDuration}
                        onRoll={() => handleRollTiming(disease.id, 'rolledDuration', diseaseEntry.duration)}
                      />
                    </div>

                    {diseaseEntry.permanent && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Permanent:</span>
                        <span className={styles.detailValue}>{diseaseEntry.permanent}</span>
                      </div>
                    )}

                    {/* Elapsed in-game time tracker */}
                    {(() => {
                      const progress = getDiseaseProgress(disease);
                      return (
                        <div className={styles.elapsedRow} data-testid={`disease-elapsed-${disease.id}`}>
                          <span className={styles.detailLabel}>Elapsed:</span>
                          <div className={styles.elapsedControls}>
                            <button
                              type="button"
                              className={styles.elapsedBtn}
                              onClick={() => handleAdjustElapsed(disease.id, -1)}
                              disabled={progress.elapsed <= 0}
                              aria-label={`Subtract a day from ${disease.diseaseName}`}
                            >
                              −
                            </button>
                            <span className={styles.elapsedValue}>
                              {progress.elapsed}
                              {progress.durationTotal != null ? ` / ${progress.durationTotal}` : ''}
                              {' '}
                              {progress.durationUnit ?? 'days'}
                            </span>
                            <button
                              type="button"
                              className={styles.elapsedBtn}
                              onClick={() => handleAdjustElapsed(disease.id, 1)}
                              aria-label={`Add a day to ${disease.diseaseName}`}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className={styles.elapsedWeekBtn}
                              onClick={() => handleAdjustElapsed(disease.id, 7)}
                              aria-label={`Add a week to ${disease.diseaseName}`}
                            >
                              +7
                            </button>
                          </div>
                          {progress.durationReached && (
                            <span className={styles.durationReached} data-testid={`duration-reached-${disease.id}`}>
                              Duration reached — the disease ends (roll any Lingering Test)
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {symptoms && symptoms.length > 0 && (
                      <div className={styles.symptomsList}>
                        <span className={styles.symptomsHeading}>Symptoms</span>
                        {symptoms.map((symptom) => {
                          const test = getSymptomTest(symptom.name, symptom.severity);
                          const rollsLocation = symptomRollsHitLocation(symptom.name);
                          const rollKey = `${disease.id}:${symptom.displayName}`;
                          const rollResult = symptomRolls[rollKey];
                          return (
                            <div key={symptom.displayName} className={styles.symptomItem}>
                              <span className={styles.symptomName}>{symptom.displayName}</span>
                              <span className={styles.symptomDescription}>{symptom.description}</span>
                              <span className={styles.symptomEffects}>{symptom.effects}</span>

                              {(test || rollsLocation) && (
                                <div className={styles.symptomActions}>
                                  {rollsLocation && (
                                    <button
                                      type="button"
                                      className={styles.symptomRollBtn}
                                      onClick={() => handleGangreneLocation(disease.id, symptom.displayName)}
                                      aria-label={`Roll Hit Location for ${symptom.displayName}`}
                                    >
                                      <Dices size={12} aria-hidden="true" /> Roll Location
                                    </button>
                                  )}
                                  {test && (
                                    <button
                                      type="button"
                                      className={styles.symptomRollBtn}
                                      onClick={() => handleSymptomTest(disease.id, symptom.displayName, symptom.displayName, test.skill, test.difficulty)}
                                      aria-label={`Roll ${test.difficulty} ${test.skill} Test for ${symptom.displayName}`}
                                      title={test.cadence}
                                    >
                                      <Dices size={12} aria-hidden="true" /> {test.difficulty} {test.skill} Test
                                    </button>
                                  )}
                                  {test && (
                                    <span className={styles.symptomCadence}>{test.cadence}{symptom.name === 'Gangrene' ? ` (fail > ${tb}× = lose location)` : ''}</span>
                                  )}
                                </div>
                              )}

                              {rollResult && (
                                <div className={styles.symptomRollResult} data-testid={`symptom-roll-result-${disease.id}`}>
                                  {rollResult.text}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className={styles.notesSection}>
                      <label className={styles.notesLabel} htmlFor={`disease-notes-${disease.id}`}>Notes</label>
                      <textarea
                        id={`disease-notes-${disease.id}`}
                        className={styles.notesTextarea}
                        value={disease.notes}
                        onBlur={(e) => handleNotesChange(disease.id, e.target.value)}
                        onChange={(e) => handleNotesChange(disease.id, e.target.value)}
                        placeholder="Add notes (GM rulings, duration, treatment...)"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {diseases.length > 0 && (
        <div className={styles.addRow}>
          <AddButton label="Add Disease" onClick={() => setShowPicker(true)} />
        </div>
      )}

      {showPicker && (
        <Picker
          items={[...DISEASE_REGISTRY]}
          getLabel={(entry) => entry.name}
          onSelect={handleSelectDisease}
          onClose={() => setShowPicker(false)}
          title="Add Disease"
        />
      )}
    </Card>
  );
}

/**
 * Renders the roll control for an Incubation/Duration row. Shows a Roll button
 * when the timing contains a dice expression, and the persisted rolled result
 * (with a re-roll affordance) once rolled.
 */
function TimingRoll({
  timing,
  rolled,
  onRoll,
}: {
  field: 'rolledIncubation' | 'rolledDuration';
  timing: string;
  rolled: RolledTiming | undefined;
  onRoll: () => void;
}) {
  // Only show a roll control if the timing actually contains dice.
  const hasDice = /\d+\s*d\s*\d+/i.test(timing);
  if (!hasDice) return null;

  if (rolled) {
    return (
      <span className={styles.timingRolled}>
        <span className={styles.timingRolledValue} title={rolled.breakdown}>
          = {rolled.total} {rolled.unit}
        </span>
        <button type="button" className={styles.timingRerollBtn} onClick={onRoll} aria-label="Re-roll">
          <Dices size={12} aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <button type="button" className={styles.timingRollBtn} onClick={onRoll} aria-label={`Roll ${timing}`}>
      <Dices size={12} aria-hidden="true" /> Roll
    </button>
  );
}
