import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './CharacterNameHeader.module.css';

interface CharacterNameHeaderProps {
  characterName: string;
  onOpen: () => void;
}

export const CharacterNameHeader = forwardRef<HTMLButtonElement, CharacterNameHeaderProps>(
  function CharacterNameHeader({ characterName, onOpen }, ref) {
    const displayName = characterName.trim() === '' ? 'Unnamed Character' : characterName;

    return (
      <button
        ref={ref}
        type="button"
        role="button"
        aria-label="Character management"
        className={styles.header}
        onClick={onOpen}
      >
        <span className={styles.name}>{displayName}</span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>
    );
  }
);
