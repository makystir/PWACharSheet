import { useState } from 'react';
import type { Character, MutationEntry } from '../../types/character';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { Skull } from 'lucide-react';
import {
  getCorruptionThreshold,
  getCorruptionStatus,
  getPureSoulLevel,
  getSinRiskLevel,
  getWrathRiskValues,
  getMutationTypeDistribution,
  lookupMutation,
  getCorruptionLossOnMutation,
  getPhysicalMutationLimit,
  getMentalMutationLimit,
} from '../../logic/corruption';
import type { MutationType } from '../../logic/corruption';
import type { MutationTableEntry } from '../../data/mutation-tables';
import styles from './CorruptionCard.module.css';

interface CorruptionCardProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

const STATUS_CLASS: Record<string, string> = {
  normal: styles.statusNormal,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
};

const SIN_CLASS: Record<string, string> = {
  none: styles.sinNone,
  mild: styles.sinMild,
  moderate: styles.sinModerate,
  danger: styles.sinDanger,
};

export function CorruptionCard({ character, update, updateCharacter }: CorruptionCardProps) {
  const [rollResult, setRollResult] = useState<{
    roll: number;
    type: MutationType;
    entry: MutationTableEntry;
  } | null>(null);

  const pureSoulLevel = getPureSoulLevel(character.talents);
  const threshold = getCorruptionThreshold(character.chars, pureSoulLevel);
  const status = getCorruptionStatus(character.corr, threshold);
  const sinRisk = getSinRiskLevel(character.sin);
  const wrathValues = getWrathRiskValues(character.sin);
  const dist = getMutationTypeDistribution(character.species);
  const physicalLimit = getPhysicalMutationLimit(character.chars);
  const mentalLimit = getMentalMutationLimit(character.chars);

  const mutations = character.mutations ?? [];
  const physicalMutations = mutations.filter(m => m.type === 'physical');
  const mentalMutations = mutations.filter(m => m.type === 'mental');

  const handleRoll = (type: MutationType) => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const entry = lookupMutation(roll, type);
    setRollResult({ roll, type, entry });
  };

  const handleAddRolledMutation = () => {
    if (!rollResult) return;
    const wpbLoss = getCorruptionLossOnMutation(character.chars);
    updateCharacter((c) => ({
      ...c,
      corr: Math.max(0, c.corr - wpbLoss),
      mutations: [
        ...(c.mutations ?? []),
        {
          id: Date.now(),
          type: rollResult.type,
          name: rollResult.entry.name,
          effect: rollResult.entry.effect,
        },
      ],
    }));
    setRollResult(null);
  };

  const removeMutation = (id: number) => {
    updateCharacter((c) => ({
      ...c,
      mutations: (c.mutations ?? []).filter(m => m.id !== id),
    }));
  };

  const addCustomMutation = (type: MutationType) => {
    updateCharacter((c) => ({
      ...c,
      mutations: [
        ...(c.mutations ?? []),
        { id: Date.now(), type, name: '', effect: '' },
      ],
    }));
  };

  return (
    <Card>
      <SectionHeader icon={Skull} title="Corruption & Mutation" />

      {/* 1. CORRUPTION TRACKER */}
      <div className={styles.section}>
        <div className={styles.label}>Corruption Tracker</div>
        <div className={styles.counterRow}>
          <button
            type="button"
            onClick={() => update('corr', Math.max(0, character.corr - 1))}
            className={styles.pmBtnDanger}
            aria-label="Decrease corruption"
          >
            −
          </button>
          <span className={`${styles.counterValue} ${STATUS_CLASS[status]}`}>
            {character.corr} / {threshold}
          </span>
          <button
            type="button"
            onClick={() => update('corr', character.corr + 1)}
            className={styles.pmBtnSuccess}
            aria-label="Increase corruption"
          >
            +
          </button>
        </div>
        {status === 'danger' && (
          <div className={styles.dangerWarning}>
            ⚠ Corruption Test Required
          </div>
        )}
      </div>

      {/* 2. SIN TRACKER */}
      <div className={styles.section}>
        <div className={styles.label}>Sin Tracker</div>
        <div className={styles.counterRow}>
          <button
            type="button"
            onClick={() => update('sin', Math.max(0, character.sin - 1))}
            className={styles.pmBtnDanger}
            aria-label="Decrease sin"
          >
            −
          </button>
          <span className={`${styles.sinValue} ${SIN_CLASS[sinRisk]}`}>
            {character.sin}
          </span>
          <button
            type="button"
            onClick={() => update('sin', character.sin + 1)}
            className={styles.pmBtnSuccess}
            aria-label="Increase sin"
          >
            +
          </button>
        </div>
        {character.sin > 0 && (
          <div className={styles.wrathInfo}>
            <span className={`${SIN_CLASS[sinRisk]} ${styles.wrathLabel}`}>
              Wrath: 1–{character.sin}
            </span>
            <span className={styles.wrathMuted}>
              (units die {wrathValues.join(', ')} triggers Wrath)
            </span>
          </div>
        )}
      </div>

      {/* 3. MUTATION TYPE ROLLER */}
      <div className={styles.section}>
        <div className={styles.label}>Mutation Roller</div>
        <div className={styles.speciesInfo}>
          {character.species || 'Human'}: Physical 1–{dist.physicalMax || '—'} / Mental {dist.mentalMin}–100
        </div>
        <div className={styles.rollBtnRow}>
          <button
            type="button"
            onClick={() => handleRoll('physical')}
            className={styles.rollBtn}
          >
            Roll Physical
          </button>
          <button
            type="button"
            onClick={() => handleRoll('mental')}
            className={styles.rollBtn}
          >
            Roll Mental
          </button>
        </div>
        {rollResult && (
          <div className={styles.rollResultBox}>
            <div className={styles.rollResultMeta}>
              d100: {rollResult.roll} ({rollResult.type})
            </div>
            <div className={styles.rollResultName}>
              {rollResult.entry.name}
            </div>
            <div className={styles.rollResultEffect}>
              {rollResult.entry.effect}
            </div>
            <button
              type="button"
              onClick={handleAddRolledMutation}
              className={styles.addMutationBtn}
            >
              Add to Character
            </button>
          </div>
        )}
      </div>

      {/* 4. PHYSICAL MUTATIONS LIST */}
      <div className={styles.section}>
        <div className={styles.mutationHeaderRow}>
          <div className={styles.label}>
            Physical Mutations ({physicalMutations.length} / {physicalLimit})
          </div>
          <button
            type="button"
            onClick={() => addCustomMutation('physical')}
            className={styles.addCustomBtn}
          >
            Add Custom
          </button>
        </div>
        {physicalMutations.length >= physicalLimit && physicalLimit > 0 && (
          <div className={styles.chaosWarning}>
            ⚠ Lost to Chaos if another gained
          </div>
        )}
        {physicalMutations.map((m) => (
          <MutationRow key={m.id} mutation={m} onRemove={() => removeMutation(m.id)} updateCharacter={updateCharacter} />
        ))}
      </div>

      {/* 5. MENTAL MUTATIONS LIST */}
      <div className={styles.sectionNoBorder}>
        <div className={styles.mutationHeaderRow}>
          <div className={styles.label}>
            Mental Mutations ({mentalMutations.length} / {mentalLimit})
          </div>
          <button
            type="button"
            onClick={() => addCustomMutation('mental')}
            className={styles.addCustomBtn}
          >
            Add Custom
          </button>
        </div>
        {mentalMutations.length >= mentalLimit && mentalLimit > 0 && (
          <div className={styles.chaosWarning}>
            ⚠ Lost to Chaos if another gained
          </div>
        )}
        {mentalMutations.map((m) => (
          <MutationRow key={m.id} mutation={m} onRemove={() => removeMutation(m.id)} updateCharacter={updateCharacter} />
        ))}
      </div>
    </Card>
  );
}


function MutationRow({
  mutation,
  onRemove,
  updateCharacter,
}: {
  mutation: MutationEntry;
  onRemove: () => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}) {
  const updateField = (field: 'name' | 'effect', value: string) => {
    updateCharacter((c) => ({
      ...c,
      mutations: (c.mutations ?? []).map((m) =>
        m.id === mutation.id ? { ...m, [field]: value } : m
      ),
    }));
  };

  return (
    <div className={styles.mutationRow}>
      <div className={styles.mutationContent}>
        <input
          type="text"
          value={mutation.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Mutation name"
          className={styles.mutationNameInput}
        />
        <input
          type="text"
          value={mutation.effect}
          onChange={(e) => updateField('effect', e.target.value)}
          placeholder="Effect"
          className={styles.mutationEffectInput}
        />
      </div>
      <button type="button" onClick={onRemove} className={styles.removeBtn} aria-label={`Remove ${mutation.name || 'mutation'}`}>
        ✕
      </button>
    </div>
  );
}
