import type { RefObject } from 'react';
import type { GroupedResults, SearchResultEntry } from './searchIndex';
import { ResultCard } from './ResultCard';
import styles from './ResultsList.module.css';

export interface ResultsListProps {
  results: GroupedResults;
  selectedIndex: number;
  onSelect: (entry: SearchResultEntry) => void;
  listRef?: RefObject<HTMLDivElement>;
}

export function ResultsList({ results, selectedIndex, onSelect, listRef }: ResultsListProps) {
  let globalIndex = 0;

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Search results"
      id="palette-results"
      data-testid="command-palette-results"
    >
      {results.groups.map((group) => (
        <div key={group.type} className={styles.group}>
          <div className={styles.groupHeading} aria-hidden="true">
            {group.label}
          </div>
          {group.entries.map((entry) => {
            const currentIndex = globalIndex++;
            return (
              <ResultCard
                key={entry.entity.id}
                entry={entry}
                isSelected={currentIndex === selectedIndex}
                onClick={() => onSelect(entry)}
                id={`palette-option-${currentIndex}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
