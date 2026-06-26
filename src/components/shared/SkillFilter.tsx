import styles from './SkillFilter.module.css';

export interface SkillFilterProps {
  searchText: string;
  trainedOnly: boolean;
  onSearchChange: (text: string) => void;
  onTrainedOnlyChange: (enabled: boolean) => void;
}

export function SkillFilter({
  searchText,
  trainedOnly,
  onSearchChange,
  onTrainedOnlyChange,
}: SkillFilterProps) {
  return (
    <div className={styles.filterBar}>
      <input
        type="text"
        placeholder="Search skills…"
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
        aria-label="Filter skills by name"
      />
      <button
        type="button"
        className={trainedOnly ? styles.toggleActive : styles.toggle}
        onClick={() => onTrainedOnlyChange(!trainedOnly)}
        aria-pressed={trainedOnly}
      >
        Trained Only
      </button>
    </div>
  );
}
