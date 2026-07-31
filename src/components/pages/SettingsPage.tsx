import { useState, useRef } from 'react';
import type { Character, ArmourPoints, RangedDamageSBMode } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { RestoreConfirmDialog } from '../shared/RestoreConfirmDialog';
import { exportToFile, importFromJSON, exportToJSONWithPortrait } from '../../storage/export-import';
import { getPortraitStore } from '../../storage/portrait-store';
import { base64ToBlob, isValidPortraitDataUrl } from '../../storage/portrait-codec';
import { assembleBackup, downloadBackup } from '../../storage/backup-service';
import { validateBackupFile, detectDuplicates, restoreCharacters } from '../../storage/restore-service';
import type { BackupCharacterEntry } from '../../storage/backup-types';
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
  characterId: string;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
  currentTheme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

export function SettingsPage({ character, characterId, update, updateCharacter, currentTheme, onThemeChange }: SettingsPageProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<Character | null>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [quickActions, setQuickActions] = useState<QuickActionConfig[]>(loadQuickActions);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Bulk backup state
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');

  // Bulk restore state
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    characterCount: number;
    characterNames: string[];
    duplicateNames: string[];
    characters: BackupCharacterEntry[];
  } | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

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
        setPendingImport(result.character);
      } else {
        setImportError(result.error || 'Import failed.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (pendingImport) {
      const portraitValue = pendingImport.portrait || '';
      const store = getPortraitStore();

      if (portraitValue && isValidPortraitDataUrl(portraitValue)) {
        if (!store.isDegraded()) {
          // Store portrait in IndexedDB, strip from character
          const blob = base64ToBlob(portraitValue);
          if (blob) {
            await store.savePortrait(characterId, blob);
          }
          const charWithoutPortrait = { ...pendingImport, portrait: '' };
          updateCharacter(() => charWithoutPortrait);
        } else {
          // IndexedDB unavailable: keep portrait in character data (localStorage fallback)
          updateCharacter(() => pendingImport);
        }
      } else {
        // No portrait or invalid portrait: just update the character
        const charWithoutPortrait = { ...pendingImport, portrait: '' };
        updateCharacter(() => charWithoutPortrait);
      }

      setImportSuccess(`Imported "${pendingImport.name}" successfully.`);
      setPendingImport(null);
    }
  };

  const handleImportCancel = () => {
    setPendingImport(null);
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
      const json = await exportToJSONWithPortrait(character, characterId);
      await navigator.clipboard.writeText(json);
    } catch {
      // clipboard may not be available
    }
  };

  const handleExportFile = async () => {
    try {
      const json = await exportToJSONWithPortrait(character, characterId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (character.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_');
      const date = new Date();
      const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
      a.download = `${safeName}_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // export failure: fall back to exporting without portrait
      exportToFile(character);
    }
  };

  const handleBackupAll = async () => {
    setBackupError('');
    setBackupSuccess('');
    setBackupInProgress(true);
    setBackupProgress('Preparing backup...');

    try {
      const result = await assembleBackup((current, total) => {
        setBackupProgress(`Backing up... ${current}/${total} characters`);
      });

      if (!result.ok) {
        setBackupError(result.error);
        return;
      }

      const dlResult = downloadBackup(result.payload);
      if (!dlResult.ok) {
        setBackupError(dlResult.error);
        return;
      }

      setBackupSuccess(`Backup downloaded — ${result.payload.characterCount} character${result.payload.characterCount !== 1 ? 's' : ''} saved.`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : 'Backup failed unexpectedly.');
    } finally {
      setBackupInProgress(false);
      setBackupProgress('');
    }
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError('');
    setRestoreSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = validateBackupFile(text);

      if (!result.ok) {
        setRestoreError(result.error);
        return;
      }

      const duplicates = detectDuplicates(result.characters);
      const names = result.characters
        .map((c) => (c.character.name as string) || `Unnamed`)
        .filter((n) => n.length > 0);

      setRestoreConfirmData({
        characterCount: result.metadata.characterCount,
        characterNames: names,
        duplicateNames: duplicates,
        characters: result.characters,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreConfirm = async () => {
    if (!restoreConfirmData) return;

    setRestoreConfirmData(null);
    setRestoreInProgress(true);
    setRestoreProgress('Restoring...');
    setRestoreError('');
    setRestoreSuccess('');

    try {
      const summary = await restoreCharacters(restoreConfirmData.characters, (current, total) => {
        setRestoreProgress(`Restoring... ${current}/${total} characters`);
      });

      let msg = `Restored ${summary.imported} character${summary.imported !== 1 ? 's' : ''} successfully.`;
      if (summary.skipped > 0) {
        msg += ` ${summary.skipped} skipped.`;
      }
      if (summary.stoppedByQuota) {
        msg += ' Storage quota reached — some characters could not be imported.';
      }
      setRestoreSuccess(msg);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed unexpectedly.');
    } finally {
      setRestoreInProgress(false);
      setRestoreProgress('');
    }
  };

  const handleRestoreCancel = () => {
    setRestoreConfirmData(null);
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
          <div className={styles.quickActionsChips}>
            {quickActions.map(qa => (
              <div key={qa.id} className={styles.quickActionChip}>
                <span>{qa.skillName}</span>
                <button
                  type="button"
                  className={styles.quickActionRemoveBtn}
                  onClick={() => handleRemoveQuickAction(qa.id)}
                  aria-label={`Remove ${qa.skillName}`}
                >
                  <X size={12} />
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

        <CollapsibleSection title="Combat Rules" storageKey="collapsible-combat-rules" defaultExpanded={true}>
          <div className={styles.ruleGroup}>
            {/* Ranged Damage SB Mode */}
            <div className={styles.ruleItem}>
              <div className={styles.ruleLabel}>Ranged Damage SB</div>
              <div className={styles.ruleDesc} style={character.houseRules.rangedDamageSBMode === 'none' ? { color: 'var(--text-muted)' } : undefined}>
                Add Strength Bonus to ranged weapon damage
              </div>
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
                  <div className={styles.ruleDesc} style={!character.houseRules.impaleCritsOnTens ? { color: 'var(--text-muted)' } : undefined}>
                    Impale weapons crit on multiples of 10
                  </div>
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
                  <div className={styles.ruleDesc} style={!character.houseRules.min1Wound ? { color: 'var(--text-muted)' } : undefined}>
                    Hits that overcome TB+AP deal at least 1 wound
                  </div>
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
                  <div className={styles.ruleDesc} style={!character.houseRules.useGroupAdvantage ? { color: 'var(--text-muted)' } : undefined}>
                    Party shares a single advantage pool (Up in Arms)
                  </div>
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
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Optional Mechanics" storageKey="collapsible-optional-mechanics" defaultExpanded={true}>
          <div className={styles.ruleGroup}>
            {/* Yenlui Balance */}
            <div className={styles.ruleItem}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.ruleLabel}>Yenlui Balance (High Elf)</div>
                  <div className={styles.ruleDesc} style={!character.houseRules.useYenlui ? { color: 'var(--text-muted)' } : undefined}>
                    Track Elven spiritual balance (High Elf Player's Guide)
                  </div>
                  {character.houseRules.useYenlui && <div className={styles.ruleLocation}>Find it on: Character → Identity tab</div>}
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
                  <div className={styles.ruleDesc} style={!character.houseRules.useGrudgeBook ? { color: 'var(--text-muted)' } : undefined}>
                    Track Dwarf grudges for XP (Dwarf Player's Guide)
                  </div>
                  {character.houseRules.useGrudgeBook && <div className={styles.ruleLocation}>Find it on: Character → Identity tab</div>}
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

            {/* Psychology Tracker */}
            <div className={styles.ruleItem}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.ruleLabel}>Psychology Tracker</div>
                  <div className={styles.ruleDesc} style={!character.houseRules.usePsychologyTracker ? { color: 'var(--text-muted)' } : undefined}>
                    Track phobias, animosity, hatred, and trauma (Archives Vol. II)
                  </div>
                  {character.houseRules.usePsychologyTracker && <div className={styles.ruleLocation}>Find it on: Character → Identity tab, and Notes tab</div>}
                </div>
                <button
                  type="button"
                  onClick={() => update('houseRules.usePsychologyTracker', !character.houseRules.usePsychologyTracker)}
                  className={character.houseRules.usePsychologyTracker ? styles.toggleBtnOn : styles.toggleBtnOff}
                >
                  {character.houseRules.usePsychologyTracker ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Critical Deflection */}
            <div className={styles.ruleItem}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.ruleLabel}>Critical Deflection</div>
                  <div className={styles.ruleDesc} style={!character.houseRules.useCriticalDeflection ? { color: 'var(--text-muted)' } : undefined}>
                    Sacrifice 1 AP to ignore a Critical Wound (Archives Vol. III)
                  </div>
                  {character.houseRules.useCriticalDeflection && <div className={styles.ruleLocation}>Find it on: Combat → Take Damage panel</div>}
                </div>
                <button
                  type="button"
                  onClick={() => update('houseRules.useCriticalDeflection', !character.houseRules.useCriticalDeflection)}
                  className={character.houseRules.useCriticalDeflection ? styles.toggleBtnOn : styles.toggleBtnOff}
                >
                  {character.houseRules.useCriticalDeflection ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Enterprises */}
            <div className={styles.ruleItem}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.ruleLabel}>Enterprises</div>
                  <div className={styles.ruleDesc} style={!character.houseRules.useEnterprises ? { color: 'var(--text-muted)' } : undefined}>
                    Track business ventures and income sources (Archives Vol. III)
                  </div>
                  {character.houseRules.useEnterprises && <div className={styles.ruleLocation}>Find it on: Estate → Enterprises tab</div>}
                </div>
                <button
                  type="button"
                  onClick={() => update('houseRules.useEnterprises', !character.houseRules.useEnterprises)}
                  className={character.houseRules.useEnterprises ? styles.toggleBtnOn : styles.toggleBtnOff}
                >
                  {character.houseRules.useEnterprises ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </Card>

      {/* Export/Import */}
      <Card>
        <SectionHeader icon={Download} title="Export / Import" />
        <div className={styles.btnRow}>
          <div className={styles.exportDropdownWrapper}>
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className={styles.smallBtn}
              aria-expanded={exportDropdownOpen}
              aria-haspopup="true"
            >
              <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Export ▾
            </button>
            {exportDropdownOpen && (
              <div className={styles.exportDropdown}>
                <button
                  type="button"
                  className={styles.exportDropdownItem}
                  onClick={() => { handleExportClipboard(); setExportDropdownOpen(false); }}
                >
                  Copy to Clipboard
                </button>
                <button
                  type="button"
                  className={styles.exportDropdownItem}
                  onClick={() => { handleExportFile(); setExportDropdownOpen(false); }}
                >
                  Download File
                </button>
              </div>
            )}
          </div>
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

        {/* Bulk Backup & Restore */}
        <div className={styles.importSection}>
          <div className={styles.importRow}>
            <button
              type="button"
              onClick={handleBackupAll}
              disabled={backupInProgress}
              className={styles.smallBtn}
            >
              <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {backupInProgress ? 'Backing up...' : 'Back Up All Characters'}
            </button>
          </div>
          {backupInProgress && backupProgress && (
            <div className={styles.successMsg}>{backupProgress}</div>
          )}
          {backupError && <div className={styles.errorMsg}>{backupError}</div>}
          {backupSuccess && <div className={styles.successMsg}>{backupSuccess}</div>}

          <div className={styles.importRow}>
            <label className={restoreInProgress ? styles.smallBtn : styles.importLabel} style={restoreInProgress ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
              <Upload size={14} style={{ marginRight: '4px' }} />
              {restoreInProgress ? 'Restoring...' : 'Restore from Backup'}
              <input
                ref={restoreInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreFileSelect}
                disabled={restoreInProgress}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {restoreInProgress && restoreProgress && (
            <div className={styles.successMsg}>{restoreProgress}</div>
          )}
          {restoreError && <div className={styles.errorMsg}>{restoreError}</div>}
          {restoreSuccess && <div className={styles.successMsg}>{restoreSuccess}</div>}
        </div>
      </Card>

      {/* Utilities */}
      <Card>
        <SectionHeader icon={Settings} title="Utilities" />
        <div className={styles.btnRowNoMargin}>
          <button type="button" onClick={() => window.print()} className={styles.smallBtn}>
            <Printer size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Print
          </button>
        </div>
      </Card>

      {/* Danger Zone */}
      <div className={styles.dangerZone}>
        <CollapsibleSection title="⚠ Danger Zone" storageKey="collapsible-danger-zone" defaultExpanded={false}>
          <div className={styles.dangerZoneContent}>
            <p className={styles.dangerZoneDesc}>
              Actions in this section are destructive and cannot be undone.
            </p>
            <button type="button" onClick={() => setShowClearConfirm(true)} className={styles.dangerBtn}>
              <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Clear Sheet
            </button>
          </div>
        </CollapsibleSection>
      </div>

      {/* Dialogs */}
      {showClearConfirm && (
        <ConfirmDialog
          message="Clear all character data? This will reset to defaults."
          onConfirm={handleClear}
          onCancel={() => setShowClearConfirm(false)}
          confirmLabel="Clear"
        />
      )}
      {pendingImport && (
        <ConfirmDialog
          message={`Import "${pendingImport.name}"? This will overwrite your current character data.`}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
          confirmLabel="Import"
        />
      )}
      {restoreConfirmData && (
        <RestoreConfirmDialog
          characterCount={restoreConfirmData.characterCount}
          characterNames={restoreConfirmData.characterNames}
          duplicateNames={restoreConfirmData.duplicateNames}
          onConfirm={handleRestoreConfirm}
          onCancel={handleRestoreCancel}
        />
      )}
    </div>
  );
}

export default SettingsPage;
