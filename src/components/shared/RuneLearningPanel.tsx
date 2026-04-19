import type { Character } from '../../types/character';
import { canLearnRune, learnRune, getRunesByCategory } from '../../logic/runes';
import type { RuneDefinition } from '../../logic/runes';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { Sparkles } from 'lucide-react';
import styles from './RuneLearningPanel.module.css';

interface RuneLearningPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

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

  const rowClass = isLearned
    ? styles.rowLearned
    : !check.canLearn
      ? styles.rowUnavailable
      : styles.rowDefault;

  return (
    <div className={rowClass}>
      <div>
        <span className={styles.runeName}>{rune.name}</span>
        {rune.isMaster && <span className={styles.masterBadge}>★ Master</span>}
        <div className={styles.xpCost}>{rune.xpCost} XP</div>
      </div>
      <div className={styles.rightCol}>
        {isLearned ? (
          <span className={styles.learnedBadge}>✓ Learned</span>
        ) : check.canLearn ? (
          <button
            type="button"
            className={styles.learnBtn}
            onClick={handleLearn}
            aria-label={`Learn ${rune.name} for ${rune.xpCost} XP`}
          >
            Learn ({rune.xpCost} XP)
          </button>
        ) : (
          <span className={styles.prereqLabel}>{check.error}</span>
        )}
      </div>
    </div>
  );
}

export function RuneLearningPanel({ character, updateCharacter }: RuneLearningPanelProps) {
  return (
    <Card>
      <SectionHeader icon={Sparkles} title="Rune Learning" />
      <div className={styles.xpBadge}>Current XP: {character.xpCur}</div>

      {CATEGORIES.map(({ key, label }) => {
        const runes = getRunesByCategory(key);
        return (
          <div key={key}>
            <p className={styles.categoryLabel}>{label}</p>
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
