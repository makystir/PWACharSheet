import type { CSSProperties } from 'react';
import type { Character } from '../../types/character';
import { canLearnRune, learnRune, getRunesByCategory } from '../../logic/runes';
import type { RuneDefinition } from '../../logic/runes';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { Sparkles } from 'lucide-react';

interface RuneLearningPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

const xpBadgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--accent-gold)',
  fontSize: '13px',
  marginBottom: '12px',
};

const categoryLabelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '12px 0 6px 0',
};

const runeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px',
  background: 'var(--bg-tertiary)',
  borderRadius: 'var(--radius-sm)',
  marginBottom: '4px',
};

const learnedRowStyle: CSSProperties = {
  ...runeRowStyle,
  borderLeft: '3px solid var(--success)',
};

const unavailableRowStyle: CSSProperties = {
  ...runeRowStyle,
  opacity: 0.5,
};

const runeNameStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '13px',
};

const masterBadgeStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '11px',
  marginLeft: '6px',
};

const xpCostStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '11px',
};

const learnedBadgeStyle: CSSProperties = {
  color: 'var(--success)',
  fontSize: '13px',
};

const prereqLabelStyle: CSSProperties = {
  color: 'var(--danger)',
  fontSize: '11px',
};

const learnBtnStyle: CSSProperties = {
  padding: '4px 10px',
  background: 'none',
  border: '1px solid var(--success)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--success)',
  cursor: 'pointer',
  fontSize: '12px',
};

const CATEGORIES: { key: 'weapon' | 'armour' | 'talisman'; label: string }[] = [
  { key: 'weapon', label: 'Weapon Runes' },
  { key: 'armour', label: 'Armour Runes' },
  { key: 'talisman', label: 'Talismanic Runes' },
];

function RuneRow({
  rune,
  character,
  updateCharacter,
}: {
  rune: RuneDefinition;
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}) {
  const knownRunes = character.knownRunes ?? [];
  const isLearned = knownRunes.includes(rune.id);
  const check = canLearnRune(rune.id, character);

  const handleLearn = () => {
    if (!check.canLearn) return;
    updateCharacter((char) => learnRune(char, rune.id));
  };

  const rowStyle = isLearned
    ? learnedRowStyle
    : !check.canLearn
      ? unavailableRowStyle
      : runeRowStyle;

  return (
    <div style={rowStyle}>
      <div>
        <span style={runeNameStyle}>{rune.name}</span>
        {rune.isMaster && <span style={masterBadgeStyle}>★ Master</span>}
        <div style={xpCostStyle}>{rune.xpCost} XP</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {isLearned ? (
          <span style={learnedBadgeStyle}>✓ Learned</span>
        ) : check.canLearn ? (
          <button
            type="button"
            style={learnBtnStyle}
            onClick={handleLearn}
            aria-label={`Learn ${rune.name} for ${rune.xpCost} XP`}
          >
            Learn ({rune.xpCost} XP)
          </button>
        ) : (
          <span style={prereqLabelStyle}>{check.error}</span>
        )}
      </div>
    </div>
  );
}

export function RuneLearningPanel({ character, updateCharacter }: RuneLearningPanelProps) {
  return (
    <Card>
      <SectionHeader icon={Sparkles} title="Rune Learning" />
      <div style={xpBadgeStyle}>Current XP: {character.xpCur}</div>

      {CATEGORIES.map(({ key, label }) => {
        const runes = getRunesByCategory(key);
        return (
          <div key={key}>
            <p style={categoryLabelStyle}>{label}</p>
            {runes.map((rune) => (
              <RuneRow
                key={rune.id}
                rune={rune}
                character={character}
                updateCharacter={updateCharacter}
              />
            ))}
          </div>
        );
      })}
    </Card>
  );
}
