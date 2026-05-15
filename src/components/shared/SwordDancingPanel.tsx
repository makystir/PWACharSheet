import type { Character, SwordDancingTechnique } from '../../types/character';
import {
  hasSwordDancingTalent,
  getLearnedTechniques,
  canLearnTechnique,
  getTechniqueXpCost,
  learnTechnique,
} from '../../logic/swordDancing';
import { SWORD_DANCING_TECHNIQUES } from '../../data/swordDancingTechniques';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Swords } from 'lucide-react';
import styles from './SwordDancingPanel.module.css';

interface SwordDancingPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

function TechniqueRow({
  technique,
  character,
  updateCharacter,
}: {
  technique: SwordDancingTechnique;
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}) {
  const learned = getLearnedTechniques(character);
  const isLearned = learned.includes(technique.id);
  const check = canLearnTechnique(technique.id, character);
  const cost = getTechniqueXpCost(learned.length);

  const handleLearn = () => {
    if (!check.canLearn) return;
    const confirmed = window.confirm(
      `Learn "${technique.name}" for ${cost} XP?`
    );
    if (!confirmed) return;
    updateCharacter((char) => learnTechnique(char, technique.id));
  };

  const rowClass = isLearned
    ? styles.rowLearned
    : !check.canLearn
      ? styles.rowUnavailable
      : styles.rowDefault;

  return (
    <div className={rowClass}>
      <div>
        <span className={styles.techniqueName}>{technique.name}</span>
        <span className={styles.slBadge}>SL {technique.sl}</span>
        <div className={styles.description}>{technique.description}</div>
      </div>
      <div className={styles.rightCol}>
        {isLearned ? (
          <span className={styles.learnedBadge}>✓ Learned</span>
        ) : check.canLearn ? (
          <button
            type="button"
            className={styles.learnBtn}
            onClick={handleLearn}
            aria-label={`Learn ${technique.name} for ${cost} XP`}
          >
            Learn ({cost} XP)
          </button>
        ) : (
          <span className={styles.prereqLabel}>{check.error}</span>
        )}
      </div>
    </div>
  );
}

export function SwordDancingPanel({ character, updateCharacter }: SwordDancingPanelProps) {
  if (!hasSwordDancingTalent(character)) {
    return null;
  }

  const learned = getLearnedTechniques(character);
  const nextCost = getTechniqueXpCost(learned.length);
  const sortedTechniques = [...SWORD_DANCING_TECHNIQUES].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <SectionHeader icon={Swords} title="Sword-dancing Techniques" />
      <div className={styles.xpBadge}>Current XP: {character.xpCur}</div>
      <div className={styles.xpCost}>Next technique cost: {nextCost} XP</div>

      {sortedTechniques.map((technique) => (
        <TechniqueRow
          key={technique.id}
          technique={technique}
          character={character}
          updateCharacter={updateCharacter}
        />
      ))}
    </Card>
  );
}
