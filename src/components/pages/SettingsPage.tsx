import { useState } from 'react';
import type { Character, ArmourPoints } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { exportToClipboard, exportToFile, importFromJSON } from '../../storage/export-import';
import { Settings, Download, Upload, Trash2, Printer, Palette } from 'lucide-react';
import type { ThemeMode } from '../../hooks/useTheme';

interface SettingsPageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
  currentTheme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

const sectionGap = { display: 'flex', flexDirection: 'column' as const, gap: '16px' };
const smallBtn = { padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' };

export function SettingsPage({ character, updateCharacter, currentTheme, onThemeChange }: SettingsPageProps) {
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
      {/* Theme */}
      {onThemeChange && (
      <Card>
        <SectionHeader icon={Palette} title="Appearance" />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {([
            { id: 'dark' as ThemeMode, label: '🌙 Dark', desc: 'Default dark fantasy theme' },
            { id: 'light' as ThemeMode, label: '☀️ Light', desc: 'Light parchment theme' },
            { id: 'high-contrast' as ThemeMode, label: '◐ High Contrast', desc: 'Maximum readability' },
            { id: 'old-guy' as ThemeMode, label: '🔍 Old Guy Mode', desc: 'Larger text, easier on the eyes' },
          ]).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onThemeChange(t.id)}
              title={t.desc}
              style={{
                ...smallBtn,
                flex: '1 1 auto',
                minWidth: '120px',
                padding: '10px 14px',
                textAlign: 'center',
                background: currentTheme === t.id ? 'rgba(200,168,76,0.15)' : 'var(--bg-tertiary)',
                border: currentTheme === t.id ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                color: currentTheme === t.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontWeight: currentTheme === t.id ? 700 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>
      )}

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
      {showClearConfirm && (
        <ConfirmDialog
          message="Clear all character data? This will reset to defaults."
          onConfirm={handleClear}
          onCancel={() => setShowClearConfirm(false)}
          confirmLabel="Clear"
        />
      )}
    </div>
  );
}
