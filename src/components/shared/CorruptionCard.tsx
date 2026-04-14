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

interface CorruptionCardProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

const sectionStyle: React.CSSProperties = {
  padding: '10px 0',
  borderBottom: '1px solid var(--border)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 600,
  marginBottom: '6px',
};

const counterRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const pmBtn = (color: string, bgAlpha: string): React.CSSProperties => ({
  padding: '2px 10px',
  background: bgAlpha,
  border: `1px solid ${color}`,
  borderRadius: 'var(--radius-sm)',
  color,
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 700,
  lineHeight: 1,
});

const rollBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--accent-gold-dark)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--accent-gold)',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--danger)',
  cursor: 'pointer',
  fontSize: '13px',
  padding: '2px 6px',
};

const mutationRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  padding: '6px 8px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-secondary)',
  marginBottom: '4px',
};

const STATUS_COLORS: Record<string, string> = {
  normal: 'var(--text-primary)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

const SIN_RISK_COLORS: Record<string, string> = {
  none: 'var(--text-muted)',
  mild: 'var(--success)',
  moderate: 'var(--warning)',
  danger: 'var(--danger)',
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
      <div style={sectionStyle}>
        <div style={labelStyle}>Corruption Tracker</div>
        <div style={counterRow}>
          <button
            type="button"
            onClick={() => update('corr', Math.max(0, character.corr - 1))}
            style={pmBtn('var(--danger)', 'rgba(200,80,80,0.2)')}
            aria-label="Decrease corruption"
          >
            −
          </button>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              color: STATUS_COLORS[status],
              minWidth: '60px',
              textAlign: 'center',
            }}
          >
            {character.corr} / {threshold}
          </span>
          <button
            type="button"
            onClick={() => update('corr', character.corr + 1)}
            style={pmBtn('var(--success)', 'rgba(90,154,90,0.2)')}
            aria-label="Increase corruption"
          >
            +
          </button>
        </div>
        {status === 'danger' && (
          <div
            style={{
              color: 'var(--danger)',
              fontSize: '12px',
              fontWeight: 600,
              marginTop: '6px',
            }}
          >
            ⚠ Corruption Test Required
          </div>
        )}
      </div>

      {/* 2. SIN TRACKER */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Sin Tracker</div>
        <div style={counterRow}>
          <button
            type="button"
            onClick={() => update('sin', Math.max(0, character.sin - 1))}
            style={pmBtn('var(--danger)', 'rgba(200,80,80,0.2)')}
            aria-label="Decrease sin"
          >
            −
          </button>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              color: SIN_RISK_COLORS[sinRisk],
              minWidth: '40px',
              textAlign: 'center',
            }}
          >
            {character.sin}
          </span>
          <button
            type="button"
            onClick={() => update('sin', character.sin + 1)}
            style={pmBtn('var(--success)', 'rgba(90,154,90,0.2)')}
            aria-label="Increase sin"
          >
            +
          </button>
        </div>
        {character.sin > 0 && (
          <div style={{ marginTop: '6px', fontSize: '12px' }}>
            <span style={{ color: SIN_RISK_COLORS[sinRisk], fontWeight: 600 }}>
              Wrath: 1–{character.sin}
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
              (units die {wrathValues.join(', ')} triggers Wrath)
            </span>
          </div>
        )}
      </div>

      {/* 3. MUTATION TYPE ROLLER */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Mutation Roller</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          {character.species || 'Human'}: Physical 1–{dist.physicalMax || '—'} / Mental {dist.mentalMin}–100
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => handleRoll('physical')}
            style={rollBtnStyle}
          >
            Roll Physical
          </button>
          <button
            type="button"
            onClick={() => handleRoll('mental')}
            style={rollBtnStyle}
          >
            Roll Mental
          </button>
        </div>
        {rollResult && (
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--accent-gold-dark)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              d100: {rollResult.roll} ({rollResult.type})
            </div>
            <div style={{ fontWeight: 600, color: 'var(--parchment)', marginBottom: '2px' }}>
              {rollResult.entry.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {rollResult.entry.effect}
            </div>
            <button
              type="button"
              onClick={handleAddRolledMutation}
              style={{
                ...rollBtnStyle,
                background: 'rgba(90,154,90,0.2)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
              }}
            >
              Add to Character
            </button>
          </div>
        )}
      </div>

      {/* 4. PHYSICAL MUTATIONS LIST */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={labelStyle}>
            Physical Mutations ({physicalMutations.length} / {physicalLimit})
          </div>
          <button
            type="button"
            onClick={() => addCustomMutation('physical')}
            style={{ ...rollBtnStyle, fontSize: '11px', padding: '3px 8px' }}
          >
            Add Custom
          </button>
        </div>
        {physicalMutations.length >= physicalLimit && physicalLimit > 0 && (
          <div style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
            ⚠ Lost to Chaos if another gained
          </div>
        )}
        {physicalMutations.map((m) => (
          <MutationRow key={m.id} mutation={m} onRemove={() => removeMutation(m.id)} updateCharacter={updateCharacter} />
        ))}
      </div>

      {/* 5. MENTAL MUTATIONS LIST */}
      <div style={{ paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={labelStyle}>
            Mental Mutations ({mentalMutations.length} / {mentalLimit})
          </div>
          <button
            type="button"
            onClick={() => addCustomMutation('mental')}
            style={{ ...rollBtnStyle, fontSize: '11px', padding: '3px 8px' }}
          >
            Add Custom
          </button>
        </div>
        {mentalMutations.length >= mentalLimit && mentalLimit > 0 && (
          <div style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
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
    <div style={mutationRowStyle}>
      <div style={{ flex: 1 }}>
        <input
          type="text"
          value={mutation.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Mutation name"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--parchment)',
            fontSize: '13px',
            fontWeight: 600,
            padding: '2px 0',
            outline: 'none',
          }}
        />
        <input
          type="text"
          value={mutation.effect}
          onChange={(e) => updateField('effect', e.target.value)}
          placeholder="Effect"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            padding: '2px 0',
            marginTop: '2px',
            outline: 'none',
          }}
        />
      </div>
      <button type="button" onClick={onRemove} style={removeBtnStyle} aria-label={`Remove ${mutation.name || 'mutation'}`}>
        ✕
      </button>
    </div>
  );
}
