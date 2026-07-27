import type { RefObject } from 'react';
import styles from './CommandPalette.module.css';

export interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  activeDescendantId?: string;
}

export function SearchInput({ value, onChange, inputRef, activeDescendantId }: SearchInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      className={styles.searchInput}
      placeholder="Search spells, talents, skills, careers..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search"
      aria-controls="palette-results"
      aria-activedescendant={activeDescendantId}
      data-testid="command-palette-input"
    />
  );
}
