import type { SearchResultEntry } from './searchIndex';
import type { SpellDisplayData, TalentDisplayData, SkillDisplayData, CareerDisplayData, RuneDisplayData, ConditionDisplayData } from './searchIndex';
import styles from './ResultCard.module.css';

export interface ResultCardProps {
  entry: SearchResultEntry;
  isSelected: boolean;
  onClick: () => void;
  id: string;
}

function getTypeBadgeLabel(type: string): string {
  switch (type) {
    case 'spell': return 'Spell';
    case 'talent': return 'Talent';
    case 'skill': return 'Skill';
    case 'career': return 'Career';
    case 'rune': return 'Rune';
    case 'ritual': return 'Ritual';
    case 'condition': return 'Condition';
    default: return type;
  }
}

function getTypeSummary(entry: SearchResultEntry): string {
  const data = entry.entity.displayData;
  switch (data.type) {
    case 'spell': {
      const spell = data as SpellDisplayData;
      const cn = spell.cn ? `CN ${spell.cn}` : '';
      const lore = spell.lore || '';
      return [cn, lore].filter(Boolean).join(' · ') || '—';
    }
    case 'talent': {
      const talent = data as TalentDisplayData;
      return talent.max ? `Max: ${talent.max}` : '—';
    }
    case 'skill': {
      const skill = data as SkillDisplayData;
      return skill.characteristic || '—';
    }
    case 'career': {
      const career = data as CareerDisplayData;
      return career.class || '—';
    }
    case 'rune': {
      const rune = data as RuneDisplayData;
      return rune.category || '—';
    }
    case 'condition': {
      const condition = data as ConditionDisplayData;
      return condition.stackable ? 'Stackable' : 'Non-stackable';
    }
    default:
      return '—';
  }
}

export function ResultCard({ entry, isSelected, onClick, id }: ResultCardProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      className={styles.card}
      onClick={onClick}
      data-testid={`result-${entry.entity.id}`}
    >
      <span className={styles.name}>{entry.entity.name}</span>
      <span className={styles.badge}>{getTypeBadgeLabel(entry.entity.type)}</span>
      <span className={styles.summary}>{getTypeSummary(entry)}</span>
    </div>
  );
}
