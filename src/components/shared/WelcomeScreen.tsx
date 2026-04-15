import { useState, useRef, useEffect } from 'react';
import type { Character } from '../../types/character';
import { CharacterWizard } from './CharacterWizard';
import { importFromJSON } from '../../storage/export-import';

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          textAlign: 'center',
          maxWidth: '440px',
          width: '90%',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--parchment)',
            fontSize: '20px',
            marginBottom: '16px',
          }}>
            Enter Character Name
          </h2>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Character name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              marginBottom: '12px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              width: '100%',
              padding: '12px',
              background: isValid ? 'var(--accent-gold)' : 'var(--border)',
              color: isValid ? 'var(--bg-primary)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isValid ? 'pointer' : 'default',
              marginBottom: '10px',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Create Character
          </button>
          <button
            type="button"
            onClick={handleBack}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-secondary)',
              color: 'var(--parchment)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // initial mode
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        textAlign: 'center',
        maxWidth: '440px',
        width: '90%',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--parchment)',
          fontSize: '24px',
          marginBottom: '8px',
        }}>
          WFRP 4e Character Sheet
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          fontSize: '14px',
          lineHeight: '1.5',
        }}>
          Create a character using the guided wizard, or quick-start with just a name.
        </p>
        <button
          ref={wizardBtnRef}
          type="button"
          onClick={() => setMode('wizard')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--accent-gold)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '10px',
            fontFamily: 'var(--font-heading)',
          }}
        >
          Create with Wizard
        </button>
        <button
          type="button"
          onClick={() => setMode('quick-start')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg-secondary)',
            color: 'var(--parchment)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
          }}
        >
          Quick Start
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg-secondary)',
            color: 'var(--parchment)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '10px',
            fontFamily: 'var(--font-heading)',
          }}
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
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              color: 'var(--danger)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            {importError}
          </div>
        )}
      </div>
    </div>
  );
}
