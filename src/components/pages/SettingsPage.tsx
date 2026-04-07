import { useState } from 'react';
import type { Character, ArmourPoints } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import type { UseCharacterManagerResult } from '../../hooks/useCharacterManager';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { AddButton } from '../shared/AddButton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { CharacterWizard } from '../shared/CharacterWizard';
import { exportToClipboard, exportToFile, importFromJSON } from '../../storage/export-import';
import { saveCharacter } from '../../storage/character-manager';
import { Settings, Users, Download, Upload, Trash2, Printer } from 'lucide-react';

interface SettingsPageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
  manager: UseCharacterManagerResult;
}

const sectionGap = { display: 'flex', flexDirection: 'column' as const, gap: '16px' };
const smallBtn = { padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' };

export function SettingsPage({ character, updateCharacter, manager }: SettingsPageProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = importFromJSON(text);
      if (result.success && result.character) {
        updateCharacter(() => result.character!);
        setImportSuccess(`Imported "${result.character.name}" successfully.`);
      } else {
        setImportError(result.error || 'Import failed.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleWizardComplete = (wizardChar: Character) => {
    // Create the character entry in the index
    const id = manager.createCharacter(wizardChar.name);
    // Save the full wizard character data directly to localStorage
    saveCharacter(id, wizardChar);
    // Switch to it (this loads the saved data)
    manager.switchCharacter(id);
    manager.refresh();
    setShowWizard(false);
  };

  const handleRename = () => {
    if (renameId && renameName.trim()) {
      manager.renameCharacter(renameId, renameName.trim());
      setRenameId(null);
      setRenameName('');
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      manager.deleteCharacter(deleteId);
      setDeleteId(null);
    }
  };

  const handleClear = () => {
    updateCharacter((c) => ({
      ...structuredClone(BLANK_CHARACTER),
      name: c.name,
    }));
    setShowClearConfirm(false);
  };

  const handleExportClipboard = async () => {
    try {
      await exportToClipboard(character);
    } catch {
      // clipboard may not be available
    }
  };

  const handleExportFile = () => {
    exportToFile(character);
  };

  return (
    <div style={sectionGap}>
      {/* Character List */}
      <Card>
        <SectionHeader icon={Users} title="Characters" action={
          <AddButton label="New" onClick={() => setShowWizard(true)} />
        } />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {manager.characters.map((ch) => (
            <div key={ch.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: ch.id === manager.activeId ? 'rgba(212,175,55,0.1)' : 'transparent',
              border: `1px solid ${ch.id === manager.activeId ? 'var(--accent-gold)' : 'var(--border)'}`,
            }}>
              <div style={{ flex: 1 }}>
                {renameId === ch.id ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
                      style={{ flex: 1, padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      autoFocus
                    />
                    <button type="button" onClick={handleRename} style={{ ...smallBtn, padding: '4px 8px' }}>Save</button>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: 'var(--parchment)', fontWeight: 600 }}>{ch.name}</span>
                    {ch.species && <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '12px' }}>{ch.species}</span>}
                    {ch.career && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '12px' }}>{ch.career} — {ch.careerLevel}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {ch.id !== manager.activeId && (
                  <button type="button" onClick={() => manager.switchCharacter(ch.id, character)} style={{ ...smallBtn, padding: '4px 8px', fontSize: '12px' }}>Switch</button>
                )}
                <button type="button" onClick={() => { setRenameId(ch.id); setRenameName(ch.name); }} style={{ ...smallBtn, padding: '4px 8px', fontSize: '12px' }}>Rename</button>
                <button type="button" onClick={() => manager.duplicateCharacter(ch.id)} style={{ ...smallBtn, padding: '4px 8px', fontSize: '12px' }}>Dup</button>
                <button type="button" onClick={() => setDeleteId(ch.id)} style={{ ...smallBtn, padding: '4px 8px', fontSize: '12px', color: 'var(--danger)' }}>Del</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export/Import */}
      <Card>
        <SectionHeader icon={Download} title="Export / Import" />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button type="button" onClick={handleExportClipboard} style={smallBtn}>
            <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Copy to Clipboard
          </button>
          <button type="button" onClick={handleExportFile} style={smallBtn}>
            <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Download File
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ ...smallBtn, display: 'inline-flex', alignItems: 'center', background: 'var(--accent-gold)', color: 'var(--bg-primary)', cursor: 'pointer' }}>
              <Upload size={14} style={{ marginRight: '4px' }} />
              Import from File
              <input type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
            </label>
          </div>
          {importError && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{importError}</div>}
          {importSuccess && <div style={{ color: 'var(--success, #5a9a5a)', fontSize: '13px' }}>{importSuccess}</div>}
        </div>
      </Card>

      {/* Utilities */}
      <Card>
        <SectionHeader icon={Settings} title="Utilities" />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowClearConfirm(true)} style={{ ...smallBtn, color: 'var(--danger)' }}>
            <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Clear Sheet
          </button>
          <button type="button" onClick={() => window.print()} style={smallBtn}>
            <Printer size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Print
          </button>
        </div>
      </Card>

      {/* Dialogs */}
      {deleteId && (
        <ConfirmDialog
          message="Delete this character? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          confirmLabel="Delete"
        />
      )}
      {showClearConfirm && (
        <ConfirmDialog
          message="Clear all character data? This will reset to defaults."
          onConfirm={handleClear}
          onCancel={() => setShowClearConfirm(false)}
          confirmLabel="Clear"
        />
      )}

      {/* Character Creation Wizard */}
      {showWizard && (
        <CharacterWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
