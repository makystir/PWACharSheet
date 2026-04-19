import { useState, useRef, useEffect } from 'react';
import type { Character } from '../../types/character';
import { CharacterWizard } from './CharacterWizard';
import { importFromJSON } from '../../storage/export-import';
import styles from './WelcomeScreen.module.css';

export interface WelcomeScreenProps {
  onCreateCharacter: (name: string) => void;
  onWizardComplete: (character: Character) => void;
  onImportCharacter: (character: Character) => void;
}

export type WelcomeScreenMode = 'initial' | 'wizard' | 'quick-start';

export function WelcomeScreen({ onCreateCharacter, onWizardComplete, onImportCharacter }: WelcomeScreenProps) {
  const [mode, setMode] = useState<WelcomeScreenMode>('initial');
  const [name, setName] = useState('');
  const [importError, setImportError] = useState('');
  const wizardBtnRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = importFromJSON(text);
      if (result.success && result.character) {
        onImportCharacter(result.character);
      } else {
        setImportError(result.error || 'Import failed.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (mode === 'initial' && wizardBtnRef.current) {
      wizardBtnRef.current.focus();
    }
    if (mode === 'quick-start' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [mode]);

  if (mode === 'wizard') {
    return (
      <CharacterWizard
        onComplete={(character) => onWizardComplete(character)}
        onCancel={() => setMode('initial')}
      />
    );
  }

  if (mode === 'quick-start') {
    const trimmed = name.trim();
    const isValid = trimmed.length > 0;

    const handleSubmit = () => {
      if (isValid) {
        onCreateCharacter(trimmed);
      }
    };

    const handleBack = () => {
      setName('');
      setMode('initial');
    };

    return (
      <div className={styles.centerScreen}>
        <div className={styles.panel}>
          <h2 className={styles.headingSmall}>
            Enter Character Name
          </h2>
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
            onClick={handleBack}
            className={styles.secondaryBtn}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // initial mode
  return (
    <div className={styles.centerScreen}>
      <div className={styles.panel}>
        <h1 className={styles.heading}>
          WFRP 4e Character Sheet
        </h1>
        <p className={styles.subtitle}>
          Create a character using the guided wizard, or quick-start with just a name.
        </p>
        <button
          ref={wizardBtnRef}
          type="button"
          onClick={() => setMode('wizard')}
          className={styles.primaryBtn}
        >
          Create with Wizard
        </button>
        <button
          type="button"
          onClick={() => setMode('quick-start')}
          className={styles.secondaryBtn}
        >
          Quick Start
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={styles.importBtn}
        >
          Import from File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          style={{ display: 'none' }}
        />
        {importError && (
          <div
            role="alert"
            className={styles.importError}
          >
            {importError}
          </div>
        )}
      </div>
    </div>
  );
}
