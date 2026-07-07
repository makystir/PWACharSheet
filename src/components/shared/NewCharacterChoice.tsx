import { useState, useRef, useEffect } from 'react';
import styles from './WelcomeScreen.module.css';

interface NewCharacterChoiceProps {
  onQuickStart: (name: string) => void;
  onWizard: () => void;
  onCancel: () => void;
}

type ChoiceMode = 'choice' | 'name-entry';

/**
 * Modal overlay for creating a new character when the user already has characters.
 * Offers the same wizard / quick-start choice as the WelcomeScreen.
 */
export function NewCharacterChoice({ onQuickStart, onWizard, onCancel }: NewCharacterChoiceProps) {
  const [mode, setMode] = useState<ChoiceMode>('choice');
  const [name, setName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const wizardBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode === 'choice' && wizardBtnRef.current) {
      wizardBtnRef.current.focus();
    }
    if (mode === 'name-entry' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [mode]);

  if (mode === 'name-entry') {
    const trimmed = name.trim();
    const isValid = trimmed.length > 0;

    const handleSubmit = () => {
      if (isValid) onQuickStart(trimmed);
    };

    return (
      <div className={styles.centerScreen}>
        <div className={styles.panel}>
          <h2 className={styles.headingSmall}>Enter Character Name</h2>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Character name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            className={styles.nameInput}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className={isValid ? styles.primaryBtn : styles.primaryBtnDisabled}
          >
            Create Character
          </button>
          <button
            type="button"
            onClick={() => { setName(''); setMode('choice'); }}
            className={styles.secondaryBtn}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.centerScreen}>
      <div className={styles.panel}>
        <h2 className={styles.headingSmall}>New Character</h2>
        <p className={styles.subtitle}>
          Create a character using the guided wizard, or quick-start with just a name.
        </p>
        <button
          ref={wizardBtnRef}
          type="button"
          onClick={onWizard}
          className={styles.primaryBtn}
        >
          Create with Wizard
        </button>
        <button
          type="button"
          onClick={() => setMode('name-entry')}
          className={styles.secondaryBtn}
        >
          Quick Start
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={styles.importBtn}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
