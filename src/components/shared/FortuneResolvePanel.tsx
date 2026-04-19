import { useState } from 'react';
import type { Character } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { spendFortune, spendResolve, burnFate, burnResilience, sessionReset } from '../../logic/fortune-resolve';
import type { FortuneSpendReason, ResolveSpendReason } from '../../logic/fortune-resolve';
import { EditableField } from '../shared/EditableField';
import { Star, Shield } from 'lucide-react';
import styles from './FortuneResolvePanel.module.css';

interface FortuneResolvePanelProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

type ConfirmAction = 'burnFate' | 'burnResilience' | 'sessionReset';

const FORTUNE_REASONS: FortuneSpendReason[] = ['Reroll', 'Add +1 SL', 'Special Ability'];
const RESOLVE_REASONS: ResolveSpendReason[] = ['Immunity to Psychology', 'Remove Conditions', 'Special Ability'];

const CONFIRM_MESSAGES: Record<ConfirmAction, string> = {
  burnFate: 'Permanently burn 1 Fate point? This represents avoiding death and cannot be undone. Your Fortune pool will also be clamped to the new Fate value.',
  burnResilience: 'Permanently burn 1 Resilience point? This represents avoiding mutation or corruption and cannot be undone. Your Resolve pool will also be clamped to the new Resilience value.',
  sessionReset: 'Reset Fortune and Resolve to their base values? Fortune will be set to your current Fate and Resolve will be set to your current Resilience.',
};

export function FortuneResolvePanel({ character, updateCharacter }: FortuneResolvePanelProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const handleSpendFortune = (_reason: FortuneSpendReason) => {
    const result = spendFortune(character.fate, character.fortune);
    if (result !== null) {
      updateCharacter((c) => ({ ...c, fortune: result }));
    }
  };

  const handleSpendResolve = (_reason: ResolveSpendReason) => {
    const result = spendResolve(character.resilience, character.resolve);
    if (result !== null) {
      updateCharacter((c) => ({ ...c, resolve: result }));
    }
  };

  const handleConfirm = () => {
    if (confirmAction === 'burnFate') {
      const result = burnFate(character.fate, character.fortune);
      if (result) {
        updateCharacter((c) => ({ ...c, fate: result.fate, fortune: result.fortune }));
      }
    } else if (confirmAction === 'burnResilience') {
      const result = burnResilience(character.resilience, character.resolve);
      if (result) {
        updateCharacter((c) => ({ ...c, resilience: result.resilience, resolve: result.resolve }));
      }
    } else if (confirmAction === 'sessionReset') {
      const result = sessionReset(character.fate, character.resilience);
      updateCharacter((c) => ({ ...c, fortune: result.fortune, resolve: result.resolve }));
    }
    setConfirmAction(null);
  };

  return (
    <>
      <Card>
        <div className={styles.gridRow}>
          {/* Fate / Fortune sub-section */}
          <div>
            <SectionHeader icon={Star} title="Fate / Fortune" />
            <div className={styles.valueRow}>
              <EditableField label="Fate" value={character.fate} type="number" onSave={(v) => updateCharacter((c) => ({ ...c, fate: Number(v) }))} />
              <EditableField label="Fortune" value={character.fortune} type="number" onSave={(v) => updateCharacter((c) => ({ ...c, fortune: Number(v) }))} />
            </div>
            <div className={styles.btnGroup}>
              {FORTUNE_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={character.fortune <= 0 ? styles.spendBtnDisabled : styles.spendBtn}
                  disabled={character.fortune <= 0}
                  onClick={() => handleSpendFortune(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            {character.fortune <= 0 && (
              <div className={styles.noPointsMsg}>No Fortune points remaining</div>
            )}
            <button
              type="button"
              className={character.fate <= 0 ? styles.burnBtnDisabled : styles.burnBtn}
              disabled={character.fate <= 0}
              onClick={() => setConfirmAction('burnFate')}
            >
              Burn Fate
            </button>
            {character.fate <= 0 && (
              <div className={styles.noPointsMsg}>No Fate points remaining</div>
            )}
          </div>

          {/* Resilience / Resolve sub-section */}
          <div>
            <SectionHeader icon={Shield} title="Resilience / Resolve" />
            <div className={styles.valueRow}>
              <EditableField label="Resilience" value={character.resilience} type="number" onSave={(v) => updateCharacter((c) => ({ ...c, resilience: Number(v) }))} />
              <EditableField label="Resolve" value={character.resolve} type="number" onSave={(v) => updateCharacter((c) => ({ ...c, resolve: Number(v) }))} />
            </div>
            <div className={styles.btnGroup}>
              {RESOLVE_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={character.resolve <= 0 ? styles.spendBtnDisabled : styles.spendBtn}
                  disabled={character.resolve <= 0}
                  onClick={() => handleSpendResolve(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            {character.resolve <= 0 && (
              <div className={styles.noPointsMsg}>No Resolve points remaining</div>
            )}
            <button
              type="button"
              className={character.resilience <= 0 ? styles.burnBtnDisabled : styles.burnBtn}
              disabled={character.resilience <= 0}
              onClick={() => setConfirmAction('burnResilience')}
            >
              Burn Resilience
            </button>
            {character.resilience <= 0 && (
              <div className={styles.noPointsMsg}>No Resilience points remaining</div>
            )}
          </div>
        </div>

        {/* Session Reset */}
        <button
          type="button"
          className={styles.resetBtn}
          onClick={() => setConfirmAction('sessionReset')}
        >
          Session Reset
        </button>
      </Card>

      {confirmAction && (
        <ConfirmDialog
          message={CONFIRM_MESSAGES[confirmAction]}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          confirmLabel={confirmAction === 'sessionReset' ? 'Reset' : 'Burn'}
        />
      )}
    </>
  );
}
