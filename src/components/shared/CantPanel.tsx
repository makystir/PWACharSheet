import { useState } from 'react';
import type { Character } from '../../types/character';
import type { CantEntry } from '../../data/cants';
import { CANT_CATALOGUE } from '../../data/cants';
import { SPELL_LIST } from '../../data/spells';
import {
  computeCantState,
  deductSLFromProgress,
  canActivateCant,
} from '../../logic/cants';
import { CantActivationDialog } from './CantActivationDialog';
import styles from './CantPanel.module.css';

interface CantPanelProps {
  character: Character;
  updateCharacter: (mutator: (c: Character) => Character) => void;
  currentRound: number;
}

interface ActivationConfirmation {
  cantName: string;
  slDeducted: number;
  remainingSL: number;
}

export function CantPanel({ character, updateCharacter, currentRound }: CantPanelProps) {
  const [activatedThisRound, setActivatedThisRound] = useState(false);
  const [confirmation, setConfirmation] = useState<ActivationConfirmation | null>(null);
  const [variableDialog, setVariableDialog] = useState<{
    cant: CantEntry;
    availableSL: number;
  } | null>(null);
  const [lastRound, setLastRound] = useState(currentRound);

  // Reset one-Cant-per-round flag when currentRound changes
  if (lastRound !== currentRound) {
    setLastRound(currentRound);
    setActivatedThisRound(false);
    setConfirmation(null);
  }

  const state = computeCantState(character, CANT_CATALOGUE, SPELL_LIST);

  const wpChar = character.chars.WP;
  const wpBonus = Math.floor((wpChar.i + wpChar.a + wpChar.b) / 10);

  const handleLearn = (cant: CantEntry) => {
    updateCharacter((c) => ({
      ...c,
      learnedCants: [...(c.learnedCants ?? []), { lore: cant.lore, cantName: cant.name }],
    }));
  };

  const handleUnlearn = (cant: CantEntry) => {
    updateCharacter((c) => ({
      ...c,
      learnedCants: (c.learnedCants ?? []).filter(
        (lc) => !(lc.lore === cant.lore && lc.cantName === cant.name)
      ),
    }));
  };

  const handleActivate = (cant: CantEntry, aggregatedSL: number) => {
    if (cant.variableSL) {
      setVariableDialog({ cant, availableSL: aggregatedSL });
      return;
    }
    performActivation(cant, cant.slCost, aggregatedSL);
  };

  const performActivation = (cant: CantEntry, slToSpend: number, aggregatedSL: number) => {
    updateCharacter((c) => ({
      ...c,
      channellingProgress: deductSLFromProgress(
        c.channellingProgress,
        cant.lore,
        slToSpend,
        SPELL_LIST
      ),
    }));
    setActivatedThisRound(true);
    setConfirmation({
      cantName: cant.name,
      slDeducted: slToSpend,
      remainingSL: aggregatedSL - slToSpend,
    });
  };

  const handleVariableConfirm = (slSpent: number) => {
    if (!variableDialog) return;
    const { cant, availableSL } = variableDialog;
    setVariableDialog(null);
    performActivation(cant, slSpent, availableSL);
  };

  return (
    <div role="region" aria-label="Alternative Channelling Cants">
      {/* Over-limit violation warning */}
      {state.hasOverLimitViolation && (
        <div className={styles.violationBanner} role="alert">
          <strong>⚠️ Over-limit violation</strong>
          {state.violationMessages.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
          <p>Learning new Cants is disabled until resolved.</p>
        </div>
      )}

      {/* Activation confirmation */}
      {confirmation && (
        <div className={styles.confirmation} role="status" aria-live="polite">
          ✓ Activated <strong>{confirmation.cantName}</strong> — {confirmation.slDeducted} SL
          deducted, {confirmation.remainingSL} SL remaining.
        </div>
      )}

      {/* Lore groups in alphabetical order */}
      {state.loreGroups.map((group) => (
        <div key={group.lore} className={styles.loreGroup}>
          <div className={styles.loreHeader}>
            <span className={styles.loreName}>{group.windDisplayName}</span>
            <div className={styles.loreMeta}>
              <span className={styles.slBadge}>SL: {group.aggregatedSL}</span>
              <span className={styles.slotsBadge}>
                {group.learnedCants.length}/{group.permittedSlots} slots
              </span>
            </div>
          </div>

          {/* Learned Cants */}
          {group.learnedCants.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Learned</div>
              {group.learnedCants.map((cant) => {
                const canAct = canActivateCant(cant, group.aggregatedSL, activatedThisRound);
                const insufficientSL = group.aggregatedSL < cant.slCost;

                return (
                  <div key={cant.id} className={styles.cantRowLearned}>
                    <div className={styles.cantInfo}>
                      <span className={styles.cantName}>{cant.name}</span>
                      <span className={styles.cantCost}>{cant.slCost} SL</span>
                      <div className={styles.cantEffect}>{cant.effect}</div>
                    </div>
                    <div className={styles.cantActions}>
                      <button
                        type="button"
                        className={styles.activateBtn}
                        disabled={!canAct}
                        onClick={() => handleActivate(cant, group.aggregatedSL)}
                        aria-label={`Activate ${cant.name}`}
                        title={
                          activatedThisRound
                            ? 'Already activated a Cant this round'
                            : insufficientSL
                              ? `Requires ${cant.slCost} SL (have ${group.aggregatedSL})`
                              : `Activate ${cant.name}`
                        }
                      >
                        ⚡ Activate
                      </button>
                      {insufficientSL && (
                        <span className={styles.slRequirement}>
                          Need {cant.slCost} SL (have {group.aggregatedSL})
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.unlearnBtn}
                        onClick={() => handleUnlearn(cant)}
                        aria-label={`Unlearn ${cant.name}`}
                      >
                        Unlearn
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Available Cants */}
          {group.availableCants.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Available</div>
              {group.availableCants.map((cant) => (
                <div key={cant.id} className={styles.cantRowAvailable}>
                  <div className={styles.cantInfo}>
                    <span className={styles.cantName}>{cant.name}</span>
                    <span className={styles.cantCost}>{cant.slCost} SL</span>
                    <div className={styles.cantEffect}>{cant.effect}</div>
                  </div>
                  <div className={styles.cantActions}>
                    <button
                      type="button"
                      className={styles.learnBtn}
                      disabled={state.hasOverLimitViolation}
                      onClick={() => handleLearn(cant)}
                      aria-label={`Learn ${cant.name}`}
                      title={
                        state.hasOverLimitViolation
                          ? 'Resolve over-limit violation before learning'
                          : `Learn ${cant.name}`
                      }
                    >
                      + Learn
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Locked Cants */}
          {group.lockedCants.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Locked</div>
              {group.lockedCants.map((cant) => (
                <div key={cant.id} className={styles.cantRowLocked}>
                  <div className={styles.cantInfo}>
                    <span className={styles.cantName}>{cant.name}</span>
                    <span className={styles.cantCost}>{cant.slCost} SL</span>
                    <div className={styles.cantEffect}>{cant.effect}</div>
                  </div>
                  <div className={styles.cantActions}>
                    <span className={styles.lockedMessage}>
                      Max Cants learned for this Lore
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ))}

      {/* Variable SL activation dialog */}
      {variableDialog && (
        <CantActivationDialog
          cant={variableDialog.cant}
          availableSL={variableDialog.availableSL}
          wpBonus={wpBonus}
          onConfirm={handleVariableConfirm}
          onCancel={() => setVariableDialog(null)}
        />
      )}
    </div>
  );
}
