import { useState, useRef, useEffect } from 'react';
import type { Character, ArmourPoints, RangedDamageSBMode, InitiativeFormula, FieldPath, FieldValue } from '../../types/character';
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
import { getLastBackupAt, getBackupReminder } from '../../storage/backup-reminder';
import { validateBackupFile, detectDuplicates, restoreCharacters } from '../../storage/restore-service';
import type { BackupCharacterEntry } from '../../storage/backup-types';
import { getSnapshotStore } from '../../storage/snapshot-store';
import type { SnapshotMeta } from '../../storage/snapshot-store';
import { isAutoBackupEnabled, setAutoBackupEnabled } from '../../storage/snapshot-settings';
import { restoreFromSnapshot, startSnapshotController } from '../../storage/snapshot-service';
import type { SnapshotController } from '../../storage/snapshot-service';
import { Settings, Download, Upload, Trash2, Printer, Palette, Sliders, Zap, X, Dice6, Share2, Link as LinkIcon, FileDown, Clipboard, AlertTriangle, ShieldCheck } from 'lucide-react';
import { encodeSharePayload } from '../../logic/share-codec';
import { trimForLink, SHARE_SOFT_LIMIT, SHARE_HARD_LIMIT } from '../../logic/share-portrait';
import { formatViewHref } from '../../logic/view-route';
import { buildCombatStatBlock } from '../../logic/combat-stat-block';
import type { ThemeMode } from '../../hooks/useTheme';
import styles from './SettingsPage.module.css';
import { loadQuickActions, saveQuickActions } from '../../storage/quick-actions';
import { InstallPromptControl } from '../shared/InstallPromptControl';
import type { QuickActionConfig } from '../../storage/quick-actions';
import { useDiceEntryMode } from '../../hooks/useDiceEntryMode';
import { CHAR_FULL_NAMES } from './characterConstants';
import { CHARACTERISTIC_KEYS } from '../../types/character';
import { OPTIONAL_MECHANICS, OPTIONAL_MECHANIC_CATEGORIES } from './settings/optionalMechanics';
import { OptionalMechanicToggle } from './settings/OptionalMechanicToggle';

/** Build a stable id fragment for aria-labelledby from a category name. */
const slugifyCategory = (category: string) => category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export { loadQuickActions };
export type { QuickActionConfig };

const MAX_QUICK_ACTIONS = 6;

interface SettingsPageProps {
  character: Character;
  characterId: string;
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
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
  const { mode: diceEntryMode, setMode: setDiceEntryMode } = useDiceEntryMode();
  // Data-safety reminder (#10): recompute after a backup so the nudge clears.
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => getLastBackupAt());
  const backupReminder = getBackupReminder(lastBackupAt);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // GM share card state (read-only share/export). Transient status for the
  // snapshot/stat-block/link copy actions and the generated share link.
  const [shareStatus, setShareStatus] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLink, setShareLink] = useState('');
  // CompressionStream is a Node>=20 / modern-browser global, not universal.
  // The share-link codec gzips via it; when absent the link action is disabled
  // and we steer the user to the offline snapshot (which never needs gzip).
  const compressionAvailable = typeof CompressionStream !== 'undefined';

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

  // Auto-backup (rolling snapshot) state (auto-backup design §5).
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState<boolean>(() => isAutoBackupEnabled());
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [snapshotsDegraded, setSnapshotsDegraded] = useState(false);
  const [autoBackupError, setAutoBackupError] = useState('');
  const snapshotControllerRef = useRef<SnapshotController | null>(null);

  // Load the snapshot list on mount so the Settings list + status line render.
  // Set-state happens inside the async callback (not synchronously in the effect
  // body), so no set-state-in-effect disable is needed.
  const refreshSnapshots = () => {
    const store = getSnapshotStore();
    void (async () => {
      if (store.isDegraded()) {
        setSnapshotsDegraded(true);
        setSnapshots([]);
        return;
      }
      const result = await store.listSnapshots();
      if (result.ok) {
        setSnapshots(result.value);
        setSnapshotsDegraded(false);
      } else {
        setSnapshotsDegraded(store.isDegraded());
      }
    })();
  };

  useEffect(() => {
    refreshSnapshots();
  }, []);

  // Get all available skills from the character
  const allSkills = [...character.bSkills, ...character.aSkills]
    .map(s => s.n)
    .filter(name => name.trim() !== '')
    .sort();

  // Characteristics can also be favourited for quick rolls (#3). Stored by full
  // name so App's handleQuickActionTrigger resolves them to a characteristic test.
  const allCharacteristics = CHARACTERISTIC_KEYS.map(k => CHAR_FULL_NAMES[k]);

  // Options not already in quick actions
  const availableSkills = allSkills.filter(
    name => !quickActions.some(qa => qa.skillName === name)
  );
  const availableCharacteristics = allCharacteristics.filter(
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

  // --- GM share helpers ---------------------------------------------------
  // Reuse the same safeName + YYYYMMDD-HHmm timestamp construction as the
  // Export card (do NOT call exportToFile — it omits the portrait).
  const buildSnapshotFilename = () => {
    const safeName = (character.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_');
    const date = new Date();
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    return `${safeName}_share_${timestamp}.json`;
  };

  // Download the full snapshot (portrait included) as a local file. Nothing
  // leaves the device — the file/clipboard path transmits no data anywhere.
  const handleShareDownloadSnapshot = async () => {
    setShareError('');
    setShareStatus('');
    try {
      const json = await exportToJSONWithPortrait(character, characterId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildSnapshotFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShareStatus('Snapshot downloaded.');
    } catch {
      setShareError('Could not create the snapshot file.');
    }
  };

  // Copy the same full snapshot payload to the clipboard (still local-only).
  const handleShareCopySnapshot = async () => {
    setShareError('');
    setShareStatus('');
    try {
      const json = await exportToJSONWithPortrait(character, characterId);
      await navigator.clipboard.writeText(json);
      setShareStatus('Snapshot copied to clipboard.');
    } catch {
      setShareError('Could not copy the snapshot.');
    }
  };

  // Copy the plain-text combat stat block (numbers come from the shared
  // calculators via buildCombatStatBlock -> deriveSheetTotals; AC7).
  const handleShareCopyStatBlock = async () => {
    setShareError('');
    setShareStatus('');
    try {
      await navigator.clipboard.writeText(buildCombatStatBlock(character));
      setShareStatus('Combat stat block copied to clipboard.');
    } catch {
      setShareError('Could not copy the combat stat block.');
    }
  };

  // Build a #view/ share link whose hash encodes the compressed character.
  // The link variant strips the portrait + event log (trimForLink) to keep the
  // URL small; the data is embedded in the link itself (no backend).
  const handleShareCopyLink = async () => {
    setShareError('');
    setShareStatus('');
    try {
      const json = await exportToJSONWithPortrait(trimForLink(character), characterId);
      const encoded = await encodeSharePayload(json);
      const href = formatViewHref(location.origin, location.pathname, encoded);
      setShareLink(href);
      await navigator.clipboard.writeText(href);
      setShareStatus('Share link copied to clipboard.');
    } catch {
      setShareError('Could not create the share link.');
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
      // downloadBackup recorded the timestamp; refresh the reminder state.
      setLastBackupAt(getLastBackupAt());
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
      // The restore fired the per-character change signal; refresh the list so
      // any newly-written snapshot shows up.
      refreshSnapshots();
    }
  };

  const handleRestoreCancel = () => {
    setRestoreConfirmData(null);
  };

  // --- Auto-backup (rolling snapshot) handlers ---

  const handleRestoreFromSnapshot = async (seq: number) => {
    setAutoBackupError('');
    setRestoreError('');
    setRestoreSuccess('');
    const outcome = await restoreFromSnapshot(getSnapshotStore(), seq);
    if (!outcome.ok) {
      setAutoBackupError(outcome.error);
      return;
    }
    // Route through the SAME validated confirm path as file restore.
    setRestoreConfirmData({
      characterCount: outcome.plan.characterCount,
      characterNames: outcome.plan.characterNames,
      duplicateNames: outcome.plan.duplicateNames,
      characters: outcome.plan.characters,
    });
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    setAutoBackupEnabledState(enabled);
    if (enabled) {
      const store = getSnapshotStore();
      void (async () => {
        if (store.isDegraded()) {
          // Attempt init in case it was never started this session.
          await store.init();
        }
        if (!snapshotControllerRef.current) {
          snapshotControllerRef.current = startSnapshotController(store);
        }
        refreshSnapshots();
      })();
    } else if (snapshotControllerRef.current) {
      snapshotControllerRef.current.stop();
      snapshotControllerRef.current = null;
    }
  };

  const handleClearSnapshots = async () => {
    setAutoBackupError('');
    const result = await getSnapshotStore().clearSnapshots();
    if (!result.ok) {
      setAutoBackupError(result.error);
      return;
    }
    refreshSnapshots();
  };

  const formatSnapshotTime = (exportedAt: string): string => {
    const d = new Date(exportedAt);
    if (Number.isNaN(d.getTime())) return exportedAt || 'unknown time';
    return d.toLocaleString();
  };

  const newestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

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
            { id: 'old-guy' as ThemeMode, label: '🔍 Old Nerd Mode', desc: 'Larger text, easier on the eyes' },
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

      {/* Dice Rolling — player preference for how the d100 is produced (#11) */}
      <Card>
        <SectionHeader icon={Dice6} title="Dice Rolling" />
        <div className={styles.ruleDesc} style={{ marginBottom: '12px' }}>
          Choose how test rolls are made. Auto-roll lets the app roll the d100 for you.
          Manual entry lets you roll a physical die and type the result — the app still
          works out Success Levels, criticals, and difficulty.
        </div>
        <div className={styles.themeRow}>
          {([
            { id: 'auto' as const, label: '🎲 Auto-roll', desc: 'The app rolls the d100' },
            { id: 'manual' as const, label: '✍️ Manual entry', desc: 'Type your physical d100 result' },
          ]).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDiceEntryMode(opt.id)}
              title={opt.desc}
              aria-pressed={diceEntryMode === opt.id}
              className={diceEntryMode === opt.id ? styles.themeBtnActive : styles.themeBtn}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <SectionHeader icon={Zap} title="Quick Actions" />
        <div className={styles.ruleDesc} style={{ marginBottom: '12px' }}>
          Configure up to {MAX_QUICK_ACTIONS} skills or characteristics for quick rolls. They appear on a
          docked Quick Rolls bar on desktop and a floating action bar on mobile.
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
              <option value="">Select a skill or characteristic...</option>
              {availableCharacteristics.length > 0 && (
                <optgroup label="Characteristics">
                  {availableCharacteristics.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
              )}
              {availableSkills.length > 0 && (
                <optgroup label="Skills">
                  {availableSkills.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
              )}
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

            {/* Initiative Formula (Core p.156 "Roll For Initiative!") */}
            <div className={styles.ruleItem}>
              <div className={styles.ruleLabel}>Initiative Formula</div>
              <div className={styles.ruleDesc}>
                How Initiative order is rolled in combat
              </div>
              <div className={styles.selectorRow}>
                {([
                  { id: 'initiativePlusD10' as InitiativeFormula, label: 'Initiative + 1d10' },
                  { id: 'initiativeAgilityTest' as InitiativeFormula, label: 'Initiative/Agility Test' },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update('houseRules.initiativeFormula', opt.id)}
                    className={character.houseRules.initiativeFormula === opt.id ? styles.selectorBtnActive : styles.selectorBtn}
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

            {/* Backpack ignores encumbrance (house rule) */}
            <div className={styles.ruleItem}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.ruleLabel}>Backpack Ignores Encumbrance</div>
                  <div className={styles.ruleDesc} style={!character.houseRules.ignoreBackpackEnc ? { color: 'var(--text-muted)' } : undefined}>
                    House rule: items marked as in a backpack count as 0 Enc (carrying capacity unchanged)
                  </div>
                  {character.houseRules.ignoreBackpackEnc && <div className={styles.ruleLocation}>Find it on: Character page → Gear tab → per-trapping 🎒 toggle</div>}
                </div>
                <button
                  type="button"
                  onClick={() => update('houseRules.ignoreBackpackEnc', !character.houseRules.ignoreBackpackEnc)}
                  className={character.houseRules.ignoreBackpackEnc ? styles.toggleBtnOn : styles.toggleBtnOff}
                >
                  {character.houseRules.ignoreBackpackEnc ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Optional Mechanics" storageKey="collapsible-optional-mechanics" defaultExpanded={true}>
          {OPTIONAL_MECHANIC_CATEGORIES.map((category) => {
            const entries = OPTIONAL_MECHANICS.filter((m) => m.category === category);
            if (entries.length === 0) return null; // defensive; coverage test guarantees ≥1
            const headingId = `om-cat-${slugifyCategory(category)}`;
            return (
              <div key={category} className={styles.ruleGroup} role="group" aria-labelledby={headingId}>
                <h4 id={headingId} className={styles.categoryHeading}>{category}</h4>
                {entries.map((entry) => {
                  const value = character.houseRules[entry.key];
                  return (
                    <OptionalMechanicToggle
                      key={entry.key}
                      entry={entry}
                      value={value}
                      onToggle={() => update(`houseRules.${entry.key}`, !value)}
                    />
                  );
                })}
              </div>
            );
          })}
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
          {/* Data-safety reminder (#10) — advisory only, never blocks. */}
          {backupReminder.show && (
            <div className={styles.backupReminder} role="status">
              {backupReminder.never
                ? "You haven't backed up your characters yet. Characters live in this browser only — back up to avoid losing them."
                : `It's been ${backupReminder.daysSince} days since your last backup. Consider backing up your characters.`}
            </div>
          )}
          {!backupReminder.show && !backupReminder.never && backupReminder.daysSince !== null && (
            <div className={styles.ruleDesc}>
              Last backup: {backupReminder.daysSince === 0 ? 'today' : `${backupReminder.daysSince} day${backupReminder.daysSince === 1 ? '' : 's'} ago`}.
            </div>
          )}
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

        {/* Auto-backup (rolling snapshot) — auto-backup design §5 */}
        <div className={styles.importSection}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              onChange={(e) => handleToggleAutoBackup(e.target.checked)}
            />
            <span>Automatic rolling backup</span>
          </label>
          <div className={styles.ruleDesc}>
            Keeps the last few snapshots of all your characters in this browser so a
            recent copy can be restored. Snapshots never leave your device.
          </div>

          {/* Status line — plain status text, NOT a calculated total, so no
              Tooltip breakdown is attached (calculated-totals steering scope). */}
          <div className={styles.ruleDesc} role="status">
            {snapshotsDegraded
              ? 'Auto-backup unavailable in this browser (private mode or storage blocked).'
              : newestSnapshot
                ? `Last auto-backup: ${formatSnapshotTime(newestSnapshot.exportedAt)}`
                : 'No auto-backup yet.'}
          </div>

          {!snapshotsDegraded && snapshots.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {snapshots.map((snap) => (
                <li key={snap.seq} className={styles.importRow}>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => void handleRestoreFromSnapshot(snap.seq)}
                  >
                    <Upload size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Restore {formatSnapshotTime(snap.exportedAt)} — {snap.characterCount} character{snap.characterCount !== 1 ? 's' : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!snapshotsDegraded && snapshots.length > 0 && (
            <div className={styles.importRow}>
              <button
                type="button"
                className={styles.smallBtn}
                onClick={() => void handleClearSnapshots()}
              >
                <Trash2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Clear auto-backups
              </button>
            </div>
          )}
          {autoBackupError && <div className={styles.errorMsg}>{autoBackupError}</div>}
        </div>
      </Card>

      {/* Share with GM — read-only share/export */}
      {(() => {
        // Length warnings are measured on the FULL href (>= operator). The link
        // is only present after the user generates it; before then neither
        // warning shows and the link stays the primary action.
        const hrefLen = shareLink.length;
        const softWarn = hrefLen >= SHARE_SOFT_LIMIT;
        const hardWarn = hrefLen >= SHARE_HARD_LIMIT;

        const downloadBtn = (
          <button
            type="button"
            onClick={handleShareDownloadSnapshot}
            className={hardWarn ? styles.sharePrimaryBtn : styles.smallBtn}
          >
            <FileDown size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Download snapshot
          </button>
        );
        const copySnapshotBtn = (
          <button type="button" onClick={handleShareCopySnapshot} className={styles.smallBtn}>
            <Clipboard size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Copy snapshot
          </button>
        );
        const copyStatBlockBtn = (
          <button type="button" onClick={handleShareCopyStatBlock} className={styles.smallBtn}>
            <Clipboard size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Copy Combat Stat Block
          </button>
        );
        const copyLinkBtn = (
          <button
            type="button"
            onClick={handleShareCopyLink}
            className={!hardWarn && compressionAvailable ? styles.sharePrimaryBtn : styles.smallBtn}
            disabled={!compressionAvailable}
            title={compressionAvailable ? undefined : 'Share links are unavailable in this browser.'}
          >
            <LinkIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Copy Share Link
          </button>
        );

        return (
          <Card>
            <SectionHeader icon={Share2} title="Share with GM" />

            {/* Privacy note: link embeds data vs. local-only snapshot. */}
            <div className={styles.shareNotes}>
              <div className={styles.sharePrivacyLink}>
                <LinkIcon size={14} style={{ marginRight: '6px', flexShrink: 0, verticalAlign: 'middle' }} />
                <span>
                  The share link <strong>embeds the character data in the link itself</strong>. Anyone
                  with the link can read the full sheet. Nothing is uploaded to a server.
                </span>
              </div>
              <div className={styles.sharePrivacyLocal}>
                <ShieldCheck size={14} style={{ marginRight: '6px', flexShrink: 0, verticalAlign: 'middle' }} />
                <span>
                  The snapshot (download or copy) stays <strong>local to this device</strong> —
                  it transmits nothing until you choose to send the file or text yourself.
                </span>
              </div>
            </div>

            {/* Actions. Normally Copy Share Link is the primary link action and
                appears first; once the full href reaches SHARE_HARD_LIMIT it is
                demoted below Download snapshot (which becomes primary). The
                snapshot/stat-block controls are local-only and unaffected. */}
            {hardWarn ? (
              <>
                <div className={styles.btnRow}>
                  {downloadBtn}
                  {copySnapshotBtn}
                  {copyStatBlockBtn}
                </div>
                <div className={styles.btnRow}>{copyLinkBtn}</div>
              </>
            ) : (
              <>
                <div className={styles.btnRow}>{copyLinkBtn}</div>
                <div className={styles.btnRow}>
                  {downloadBtn}
                  {copySnapshotBtn}
                  {copyStatBlockBtn}
                </div>
              </>
            )}

            {!compressionAvailable && (
              <div className={styles.ruleDesc}>
                Share links aren't available in this browser. Use <strong>Download snapshot</strong> or{' '}
                <strong>Copy snapshot</strong> instead.
              </div>
            )}

            {/* Soft caution: link is getting long but remains usable/primary. */}
            {softWarn && !hardWarn && (
              <div className={styles.shareSoftWarning} role="status">
                <AlertTriangle size={14} style={{ marginRight: '6px', flexShrink: 0, verticalAlign: 'middle' }} />
                <span>
                  This share link is getting long. A large sheet (many items or a long log) makes
                  links harder to share. The portrait is not included in links.
                </span>
              </div>
            )}

            {/* Hard warning: structurally distinct; link demoted below Download. */}
            {hardWarn && (
              <div className={styles.shareHardWarning} data-testid="share-hard-warning" role="alert">
                <AlertTriangle size={14} style={{ marginRight: '6px', flexShrink: 0, verticalAlign: 'middle' }} />
                <span>
                  This share link is too long to share reliably, usually because of a large sheet
                  (many items or a long log). The portrait is not included in links — use{' '}
                  <strong>Download snapshot</strong> instead.
                </span>
              </div>
            )}

            {shareLink && (
              <div className={styles.shareLinkBox}>
                <code className={styles.shareLinkText}>{shareLink}</code>
              </div>
            )}

            {shareStatus && <div className={styles.successMsg}>{shareStatus}</div>}
            {shareError && <div className={styles.errorMsg}>{shareError}</div>}
          </Card>
        );
      })()}

      {/* Utilities */}
      <Card>
        <SectionHeader icon={Settings} title="Utilities" />
        <div className={styles.ruleDesc} style={{ marginBottom: '12px' }}>
          Print produces a formatted, physical character sheet for
          <strong> {character.name || 'this character'}</strong> using a clean, ink-friendly
          layout. Use your browser's print dialog to preview it or save as PDF.
        </div>
        <div className={styles.btnRowNoMargin}>
          <button type="button" onClick={() => window.print()} className={styles.smallBtn}>
            <Printer size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Print Character Sheet
          </button>
          {/* PWA install button — renders nothing when the app can't be installed (Req 6.2, 6.5, 6.6) */}
          <InstallPromptControl />
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
