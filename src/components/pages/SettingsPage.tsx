import { useState } from 'react';
import type { Character, ArmourPoints, RangedDamageSBMode } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { exportToClipboard, exportToFile, importFromJSON } from '../../storage/export-import';
import { Settings, Download, Upload, Trash2, Printer, Palette, Sliders, Zap, X } from 'lucide-react';
import type { ThemeMode } from '../../hooks/useTheme';
import styles from './SettingsPage.module.css';
import { loadQuickActions, saveQuickActions } from '../../storage/quick-actions';
import type { QuickActionConfig } from '../../storage/quick-actions';

export { loadQuickActions };
export type { QuickActionConfig };

const MAX_QUICK_ACTIONS = 6;

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

export function SettingsPage({ character, update, updateCharacter, currentTheme, onThemeChange }: SettingsPageProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [quickActions, setQuickActions] = useState<QuickActionConfig[]>(loadQuickActions);
  const [selectedSkill, setSelectedSkill] = useState('');

  // Get all available skills from the character
  const allSkills = [...character.bSkills, ...character.aSkills]
    .map(s => s.n)
    .filter(name => name.trim() !== '')
    .sort();

  // Skills not already in quick actions
  const availableSkills = allSkills.filter(
    name => !quickActions.some(qa => qa.skillName === name)
  );

  const handleAddQuickAction = () => {
    if (!selectedSkill || quickActions.length >= MAX_QUICK_ACTIONS) return;
    if (quickActions.some(qa => qa.skillName === selectedSkill)) return;
    const newActions = [...quickActions, { id: crypto.randomUUID(), skillName: selectedSkill }];
    setQuickActions(newActions);
    saveQuickActions(newActions);
    setSelectedSkill('');
  };

  const handleRemoveQuickAction = (id: string) => {
    const newActions = quickActions.filter(qa => qa.id !== id);
    setQuickActions(newActions);
    saveQuickActions(newActions);
  };
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
    <div className={styles.sectionGap}>
      {/* Theme */}
      {onThemeChange && (
      <Card>
        <SectionHeader icon={Palette} title="Appearance" />
        <div className={styles.themeRow}>
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
              className={currentTheme === t.id ? styles.themeBtnActive : styles.themeBtn}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <SectionHeader icon={Zap} title="Quick Actions" />
        <div className={styles.ruleDesc} style={{ marginBottom: '12px' }}>
          Configure up to {MAX_QUICK_ACTIONS} skills for quick access from the floating action bar on mobile.
        </div>

        {quickActions.length > 0 && (
          <div className={styles.quickActionsList}>
            {quickActions.map(qa => (
              <div key={qa.id} className={styles.quickActionItem}>
                <span className={styles.quickActionName}>{qa.skillName}</span>
                <button
                  type="button"
                  className={styles.quickActionRemoveBtn}
                  onClick={() => handleRemoveQuickAction(qa.id)}
                  aria-label={`Remove ${qa.skillName}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {quickActions.length < MAX_QUICK_ACTIONS && (
          <div className={styles.quickActionAddRow}>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className={styles.quickActionSelect}
            >
              <option value="">Select a skill...</option>
              {availableSkills.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddQuickAction}
              disabled={!selectedSkill}
              className={styles.smallBtn}
            >
              Add
            </button>
          </div>
        )}

        {quickActions.length >= MAX_QUICK_ACTIONS && (
          <div className={styles.ruleDesc}>
            Maximum of {MAX_QUICK_ACTIONS} quick actions reached.
          </div>
        )}
      </Card>

      {/* House Rules */}
      <Card>
        <SectionHeader icon={Sliders} title="House Rules" />
        <div className={styles.ruleGroup}>
          {/* Ranged Damage SB Mode */}
          <div className={styles.ruleItem}>
            <div className={styles.ruleLabel}>Ranged Damage SB</div>
            <div className={styles.ruleDesc}>Add Strength Bonus to ranged weapon damage</div>
            <div className={styles.selectorRow}>
              {([
                { id: 'none' as RangedDamageSBMode, label: 'None (RAW)' },
                { id: 'halfSB' as RangedDamageSBMode, label: 'Half SB' },
                { id: 'fullSB' as RangedDamageSBMode, label: 'Full SB' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update('houseRules.rangedDamageSBMode', opt.id)}
                  className={character.houseRules.rangedDamageSBMode === opt.id ? styles.selectorBtnActive : styles.selectorBtn}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Impale Crits on 10s */}
          <div className={styles.ruleItem}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.ruleLabel}>Impale Crits on 10s</div>
                <div className={styles.ruleDesc}>Impale weapons crit on multiples of 10</div>
              </div>
              <button
                type="button"
                onClick={() => update('houseRules.impaleCritsOnTens', !character.houseRules.impaleCritsOnTens)}
                className={character.houseRules.impaleCritsOnTens ? styles.toggleBtnOn : styles.toggleBtnOff}
              >
                {character.houseRules.impaleCritsOnTens ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Minimum 1 Wound */}
          <div className={styles.ruleItem}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.ruleLabel}>Minimum 1 Wound (RAW)</div>
                <div className={styles.ruleDesc}>Hits that overcome TB+AP deal at least 1 wound</div>
              </div>
              <button
                type="button"
                onClick={() => update('houseRules.min1Wound', !character.houseRules.min1Wound)}
                className={character.houseRules.min1Wound ? styles.toggleBtnOn : styles.toggleBtnOff}
              >
                {character.houseRules.min1Wound ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Advantage Cap */}
          <div className={styles.ruleItem}>
            <div className={styles.numericRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.ruleLabel}>Advantage Cap</div>
                <div className={styles.ruleDesc}>Max advantage (0 = uncapped). RAW: IB</div>
              </div>
              <input
                type="number"
                min={0}
                max={99}
                value={character.houseRules.advantageCap}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(99, Number(e.target.value) || 0));
                  update('houseRules.advantageCap', val);
                }}
                className={styles.numericInput}
              />
            </div>
          </div>

          {/* Group Advantage */}
          <div className={styles.ruleItem}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.ruleLabel}>Group Advantage</div>
                <div className={styles.ruleDesc}>Party shares a single advantage pool (Up in Arms)</div>
              </div>
              <button
                type="button"
                onClick={() => update('houseRules.useGroupAdvantage', !character.houseRules.useGroupAdvantage)}
                className={character.houseRules.useGroupAdvantage ? styles.toggleBtnOn : styles.toggleBtnOff}
              >
                {character.houseRules.useGroupAdvantage ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Yenlui Balance */}
          <div className={styles.ruleItem}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.ruleLabel}>Yenlui Balance (High Elf)</div>
                <div className={styles.ruleDesc}>Track Elven spiritual balance (High Elf Player's Guide)</div>
              </div>
              <button
                type="button"
                onClick={() => update('houseRules.useYenlui', !character.houseRules.useYenlui)}
                className={character.houseRules.useYenlui ? styles.toggleBtnOn : styles.toggleBtnOff}
              >
                {character.houseRules.useYenlui ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Grudge Book */}
          <div className={styles.ruleItem}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.ruleLabel}>Grudge Book (Dwarf)</div>
                <div className={styles.ruleDesc}>Track Dwarf grudges for XP (Dwarf Player's Guide)</div>
              </div>
              <button
                type="button"
                onClick={() => update('houseRules.useGrudgeBook', !character.houseRules.useGrudgeBook)}
                className={character.houseRules.useGrudgeBook ? styles.toggleBtnOn : styles.toggleBtnOff}
              >
                {character.houseRules.useGrudgeBook ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Export/Import */}
      <Card>
        <SectionHeader icon={Download} title="Export / Import" />
        <div className={styles.btnRow}>
          <button type="button" onClick={handleExportClipboard} className={styles.smallBtn}>
            <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Copy to Clipboard
          </button>
          <button type="button" onClick={handleExportFile} className={styles.smallBtn}>
            <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Download File
          </button>
        </div>
        <div className={styles.importSection}>
          <div className={styles.importRow}>
            <label className={styles.importLabel}>
              <Upload size={14} style={{ marginRight: '4px' }} />
              Import from File
              <input type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
            </label>
          </div>
          {importError && <div className={styles.errorMsg}>{importError}</div>}
          {importSuccess && <div className={styles.successMsg}>{importSuccess}</div>}
        </div>
      </Card>

      {/* Utilities */}
      <Card>
        <SectionHeader icon={Settings} title="Utilities" />
        <div className={styles.btnRowNoMargin}>
          <button type="button" onClick={() => setShowClearConfirm(true)} className={styles.dangerBtn}>
            <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Clear Sheet
          </button>
          <button type="button" onClick={() => window.print()} className={styles.smallBtn}>
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

export default SettingsPage;
