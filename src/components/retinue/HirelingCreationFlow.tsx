import { useState } from 'react';
import type { Hireling } from '../../types/character';
import type { HirelingProfile } from '../../data/hirelings';
import {
  HIRELING_PROFILES,
  HIRELING_TEMPLATES,
  PHYSICAL_QUIRKS,
  WORK_ETHICS,
  PERSONALITY_QUIRKS,
} from '../../data/hirelings';
import {
  createHirelingFromProfile,
  createBlankHireling,
  rollRandomQuirk,
} from '../../logic/hirelings';
import styles from './HirelingCreationFlow.module.css';

interface HirelingCreationFlowProps {
  onConfirm: (hireling: Hireling) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

/** Custom (Blank) sentinel used in profile selection */
const CUSTOM_BLANK_OPTION = '__custom_blank__';

export function HirelingCreationFlow({ onConfirm, onCancel }: HirelingCreationFlowProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 state: profile selection
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(null);

  // Step 2 state: template selection
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('None');

  // Step 3 state: quirks
  const [physicalQuirk, setPhysicalQuirk] = useState('');
  const [workEthic, setWorkEthic] = useState('');
  const [personalityQuirk, setPersonalityQuirk] = useState('');
  const [hasRolled, setHasRolled] = useState(false);

  const isCustomBlank = selectedProfileName === CUSTOM_BLANK_OPTION;

  const selectedProfile: HirelingProfile | null =
    !isCustomBlank && selectedProfileName
      ? HIRELING_PROFILES.find((p) => p.name === selectedProfileName) ?? null
      : null;

  function handleRollAll() {
    setPhysicalQuirk(rollRandomQuirk(PHYSICAL_QUIRKS));
    setWorkEthic(rollRandomQuirk(WORK_ETHICS));
    setPersonalityQuirk(rollRandomQuirk(PERSONALITY_QUIRKS));
    setHasRolled(true);
  }

  function handleConfirm() {
    // Create the hireling
    const hireling: Hireling = isCustomBlank
      ? createBlankHireling()
      : createHirelingFromProfile(selectedProfile!);

    // Apply template name
    if (selectedTemplateName !== 'None') {
      hireling.template = selectedTemplateName;
    }

    // Apply quirks
    hireling.physicalQuirk = physicalQuirk;
    hireling.workEthic = workEthic;
    hireling.personalityQuirk = personalityQuirk;

    onConfirm(hireling);
  }

  function canAdvanceFromStep1(): boolean {
    return selectedProfileName !== null;
  }

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-label="Hire New Follower">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Hire New Follower</span>
          <span className={styles.stepIndicator}>Step {step} of 3</span>
        </div>

        {/* Step 1: Profile Selection */}
        {step === 1 && (
          <div className={styles.pickerList}>
            {HIRELING_PROFILES.map((profile) => (
              <button
                key={profile.name}
                type="button"
                className={
                  selectedProfileName === profile.name
                    ? styles.pickerItemSelected
                    : styles.pickerItem
                }
                onClick={() => setSelectedProfileName(profile.name)}
              >
                <div className={styles.pickerItemName}>{profile.name}</div>
                <div className={styles.pickerItemDesc}>
                  {profile.role} · {profile.status}
                </div>
              </button>
            ))}
            <button
              type="button"
              className={
                isCustomBlank ? styles.pickerItemSelected : styles.pickerItem
              }
              onClick={() => setSelectedProfileName(CUSTOM_BLANK_OPTION)}
            >
              <div className={styles.pickerItemName}>Custom (Blank)</div>
              <div className={styles.pickerItemDesc}>
                Start with an empty hireling and fill in manually
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Template Selection */}
        {step === 2 && (
          <div className={styles.pickerList}>
            {HIRELING_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                className={
                  selectedTemplateName === template.name
                    ? styles.pickerItemSelected
                    : styles.pickerItem
                }
                onClick={() => setSelectedTemplateName(template.name)}
              >
                <div className={styles.pickerItemName}>{template.name}</div>
                {template.description && template.name !== 'None' && (
                  <div className={styles.pickerItemDesc}>{template.description}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Roll Random Quirks */}
        {step === 3 && (
          <div className={styles.quirkSection}>
            <button type="button" className={styles.rollBtn} onClick={handleRollAll}>
              {hasRolled ? 'Re-Roll All Quirks' : 'Roll Random Quirks'}
            </button>

            <div className={styles.quirkRow}>
              <span className={styles.quirkLabel}>Physical Quirk</span>
              <div className={styles.quirkValueRow}>
                <input
                  type="text"
                  className={styles.quirkInput}
                  value={physicalQuirk}
                  onChange={(e) => setPhysicalQuirk(e.target.value)}
                  placeholder="Roll or type a physical quirk..."
                />
                <button
                  type="button"
                  className={styles.rerollBtn}
                  onClick={() => setPhysicalQuirk(rollRandomQuirk(PHYSICAL_QUIRKS))}
                >
                  Re-roll
                </button>
              </div>
            </div>

            <div className={styles.quirkRow}>
              <span className={styles.quirkLabel}>Work Ethic</span>
              <div className={styles.quirkValueRow}>
                <input
                  type="text"
                  className={styles.quirkInput}
                  value={workEthic}
                  onChange={(e) => setWorkEthic(e.target.value)}
                  placeholder="Roll or type a work ethic..."
                />
                <button
                  type="button"
                  className={styles.rerollBtn}
                  onClick={() => setWorkEthic(rollRandomQuirk(WORK_ETHICS))}
                >
                  Re-roll
                </button>
              </div>
            </div>

            <div className={styles.quirkRow}>
              <span className={styles.quirkLabel}>Personality Quirk</span>
              <div className={styles.quirkValueRow}>
                <input
                  type="text"
                  className={styles.quirkInput}
                  value={personalityQuirk}
                  onChange={(e) => setPersonalityQuirk(e.target.value)}
                  placeholder="Roll or type a personality quirk..."
                />
                <button
                  type="button"
                  className={styles.rerollBtn}
                  onClick={() => setPersonalityQuirk(rollRandomQuirk(PERSONALITY_QUIRKS))}
                >
                  Re-roll
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation actions */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          {step > 1 && (
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              className={styles.nextBtn}
              disabled={step === 1 && !canAdvanceFromStep1()}
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
