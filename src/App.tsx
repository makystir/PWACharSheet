import { useState, useEffect, useRef, useCallback, Component, lazy } from 'react';
import type { ReactNode } from 'react';
import type { Character, CharacteristicKey, FieldPath, FieldValue } from './types/character';
import { Navigation } from './components/layout/Navigation';
import { PageContainer } from './components/layout/PageContainer';
import { PageLoader } from './components/layout/PageLoader';
import { useTheme } from './hooks/useTheme';
import { useMediaQuery } from './hooks/useMediaQuery';
import { PrintLayout } from './components/layout/PrintLayout';
import { CharacterPage } from './components/pages/CharacterPage';
import { loadQuickActions, QUICK_ACTIONS_CHANGE_EVENT } from './storage/quick-actions';
import { CombatSkeleton, AdvancementSkeleton, SettingsSkeleton } from './components/skeletons';
import { useUndoStack } from './hooks/useUndoStack';

const CombatPage = lazy(() => import('./components/pages/CombatPage'));
const EstatePage = lazy(() => import('./components/pages/EstatePage'));
const EndeavoursPage = lazy(() => import('./components/pages/EndeavoursPage'));
const RetinuePage = lazy(() => import('./components/pages/RetinuePage'));
const AdvancementPage = lazy(() => import('./components/pages/AdvancementPage'));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage'));
import { CharacterWizard } from './components/shared/CharacterWizard';
import { NewCharacterChoice } from './components/shared/NewCharacterChoice';
import { CharacterManagementSheet } from './components/shared/CharacterManagementSheet';
import { QuickActionBar } from './components/shared/QuickActionBar';
import type { QuickAction } from './components/shared/QuickActionBar';
import { RollDialog } from './components/shared/RollDialog';
import { RollResultDisplay } from './components/shared/RollResultDisplay';
import { Toast } from './components/shared/Toast';
import { WhatsNewPanel } from './components/shared/WhatsNewPanel';
import { shouldShowWhatsNew } from './components/shared/whatsNewStorage';
import { computeSkillTarget, computeCharacteristicTarget } from './logic/dice-roller';
import { CHAR_FULL_NAMES } from './components/pages/characterConstants';
import { CHARACTERISTIC_KEYS } from './types/character';
import type { RollResult } from './logic/dice-roller';
import { useCharacterManager } from './hooks/useCharacterManager';
import { useCharacter } from './hooks/useCharacter';
import type { RollHistoryEntry } from './hooks/useRollHistory';
import { appendEvent, clearEventLog } from './logic/event-log';
import { rollEventsToHistory } from './components/shared/rollHistoryAdapter';
import type { RollEventPayload } from './types/character';
import { useHashRoute } from './hooks/useHashRoute';
import { useStorageErrorToast } from './hooks/useStorageErrorToast';
import { useStripLeadingZeros } from './hooks/useStripLeadingZeros';
import { runMigration } from './storage/migration';
import { saveCharacter } from './storage/character-manager';
import { getPortraitStore } from './storage/portrait-store';
import { runPortraitMigration } from './storage/portrait-migration';
import { WelcomeScreen } from './components/shared/WelcomeScreen';
import { generateRandomCharacter } from './logic/random-character-generator';
import type { PageSection } from './components/layout/Navigation';
import errorStyles from './ErrorBoundary.module.css';
import { SWUpdateProvider } from './hooks/useSWUpdate';
import { UpdateBanner } from './components/shared/UpdateBanner';
import { InstallHintBanner } from './components/shared/InstallPromptControl';
import { CommandPaletteProvider, useCommandPaletteContext } from './components/command-palette/CommandPaletteContext';
import { useCommandPalette } from './components/command-palette/useCommandPalette';
import { CommandPalette } from './components/command-palette/CommandPalette';
import { ShortcutsHelp } from './components/shared/ShortcutsHelp';

const APP_VERSION = '2.0.0';

const CHANGELOG_ENTRIES = [
  { title: 'Modernised UI', description: 'New card elevations, smoother animations, and improved spacing across all pages.' },
  { title: 'Combat Overhaul', description: 'Progressive disclosure with Attack/Defend/Status modes, sticky dashboard, and step indicators.' },
  { title: 'Desktop Layouts', description: 'Two-column layouts for Character and Combat pages on larger screens.' },
  { title: 'Navigation Upgrade', description: 'Scrollable mobile tabs, collapsible desktop sidebar, and badge indicators.' },
  { title: 'Accessibility Improvements', description: 'Better contrast ratios, reduced-motion support, and improved touch targets.' },
];

// Simple error boundary
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className={errorStyles.container}>
          <h2 className={errorStyles.heading}>
            Something went wrong
          </h2>
          <p className={errorStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className={errorStyles.retryButton}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Renders the keyboard-shortcuts overlay when opened via the palette context. */
function ShortcutsHelpMount() {
  const { shortcutsOpen, closeShortcuts } = useCommandPaletteContext();
  if (!shortcutsOpen) return null;
  return <ShortcutsHelp onClose={closeShortcuts} />;
}

function AppContent() {
  useCommandPalette();
  const manager = useCharacterManager();
  const { page, subTab, navigate } = useHashRoute();
  const { message: storageErrorMessage } = useStorageErrorToast();
  const [showWhatsNew, setShowWhatsNew] = useState(() => shouldShowWhatsNew(APP_VERSION));

  // If no characters exist, show welcome screen
  if (manager.characters.length === 0 || !manager.activeCharacter) {
    return (
      <>
        <WelcomeScreen
          onCreateCharacter={(name) => {
            manager.createCharacter(name);
            manager.refresh();
          }}
          onWizardComplete={(character) => {
            saveCharacter(manager.createCharacter(character.name), character);
            manager.refresh();
          }}
          onRandomCharacter={() => {
            // Build a complete random character with the production RNG and route it
            // through the SAME creation/persistence path as onWizardComplete. The
            // generator never sets wCur; useCharacter's backfill initialises current
            // wounds to the wound maximum (spec: random-character-generator Req 12.1-12.2).
            const character = generateRandomCharacter(Math.random);
            saveCharacter(manager.createCharacter(character.name), character);
            manager.refresh();
          }}
          onImportCharacter={(_character) => {
            manager.refresh();
          }}
        />
        <Toast message={storageErrorMessage} duration={5000} />
        <CommandPalette />
        <ShortcutsHelpMount />
        {showWhatsNew && (
          <WhatsNewPanel
            version={APP_VERSION}
            entries={CHANGELOG_ENTRIES}
            onDismiss={() => setShowWhatsNew(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <AppWithCharacter
        manager={manager}
        page={page}
        subTab={subTab}
        navigate={navigate}
      />
      <Toast message={storageErrorMessage} duration={5000} />
      <CommandPalette />
      <ShortcutsHelpMount />
      {showWhatsNew && (
        <WhatsNewPanel
          version={APP_VERSION}
          entries={CHANGELOG_ENTRIES}
          onDismiss={() => setShowWhatsNew(false)}
        />
      )}
    </>
  );
}

/**
 * Retrieves the value at a typed dot-notation path within a `Character`.
 *
 * Typed over `P extends FieldPath<Character>` (spec: state-safety-core, Req 3.1)
 * so the returned value is `FieldValue<Character, P>` — the same leaf type the
 * typed `update` expects for that path. Runtime walk is unchanged: it splits the
 * path and reads each segment, returning `undefined` if a segment is missing.
 */
function getNestedValue<P extends FieldPath<Character>>(
  obj: Character,
  path: P,
): FieldValue<Character, P> {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined as FieldValue<Character, P>;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current as FieldValue<Character, P>;
}

/**
 * Generates a human-readable label from a dot-notation field path.
 * e.g. "chars.WS.a" → "WS advances", "name" → "name", "wCur" → "wCur"
 */
function fieldToLabel(field: FieldPath<Character>): string {
  const parts = field.split('.');
  // For characteristic fields like "chars.WS.a" or "chars.T.i"
  if (parts[0] === 'chars' && parts.length >= 2) {
    const charKey = parts[1];
    const sub = parts[2];
    if (sub === 'a') return `${charKey} advances`;
    if (sub === 'i') return `${charKey} initial`;
    if (sub === 'b') return `${charKey} bonus`;
    return charKey;
  }
  // Return the last meaningful segment for common fields
  return parts[parts.length - 1];
}

/**
 * Build a concise, human-readable summary for a roll event.
 * e.g. "Melee: 42/55 (SL +1, pass)"
 */
function buildRollSummary(result: RollResult): string {
  return `${result.skillOrCharName}: ${result.roll}/${result.targetNumber} (SL ${result.sl}, ${result.passed ? 'pass' : 'fail'})`;
}

/** Extract the `RollEventPayload` fields from a completed `RollResult`. (Req 4.2) */
function toRollPayload(result: RollResult): RollEventPayload {
  return {
    name: result.skillOrCharName,
    roll: result.roll,
    target: result.targetNumber,
    sl: result.sl,
    passed: result.passed,
    isCritical: result.isCritical,
    isFumble: result.isFumble,
  };
}

function AppWithCharacter({
  manager,
  page,
  subTab,
  navigate,
}: {
  manager: ReturnType<typeof useCharacterManager>;
  page: PageSection;
  subTab: string | null;
  navigate: (page: PageSection, subTab?: string | null) => void;
}) {
  const { character, update, updateCharacter, totalWounds, armourPoints, maxEncumbrance, coinWeight } = useCharacter(manager.activeId, manager.activeCharacter!);

  // Roll history is now sourced from the unified event log (Req 4.1–4.4, 4.6).
  // Live rolls are appended as `roll` LogEvents on the active character rather
  // than the legacy global `wfrp-roll-history` key.
  const addRoll = useCallback((result: RollResult) => {
    const summary = buildRollSummary(result);
    const payload = toRollPayload(result);
    // `kind` discriminates the roll type within the category; generic for now.
    const kind = 'generic';
    updateCharacter((c) =>
      appendEvent(c, {
        category: 'roll',
        type: `roll.${kind}`,
        summary,
        payload: payload as unknown as Record<string, unknown>,
      }),
    );
  }, [updateCharacter]);

  const clearHistory = useCallback(() => {
    // Clear routes through the unified timeline clear path (Req 9.3).
    updateCharacter((c) => clearEventLog(c));
  }, [updateCharacter]);

  // Derive the roll-history display list from the event log via the adapter.
  // The adapter filters to `roll` events and reverses to newest-first (task 6.2).
  const rollHistory: RollHistoryEntry[] = rollEventsToHistory(character.eventLog ?? []);
  const { theme: currentTheme, setTheme } = useTheme();
  const [showWizard, setShowWizard] = useState(false);
  const [showNewCharChoice, setShowNewCharChoice] = useState(false);
  const [showCharSheet, setShowCharSheet] = useState(false);
  const charHeaderRef = useRef<HTMLButtonElement>(null);

  // ── Undo Stack ──
  const undoStack = useUndoStack(10);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);
  // Mirror the latest character into a ref so undoableUpdate can read the
  // pre-change value without depending on `character`. Synced in an effect
  // (after commit) rather than during render to keep render pure.
  const characterRef = useRef(character);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  // Wrapped update that pushes to undo stack before applying. Fully typed over
  // the character field path (spec: state-safety-core, Req 3.1): the recorded
  // `previousValue`/`newValue` and the forwarded `update` are all checked
  // against `Character` — no boundary cast is needed here anymore.
  const undoableUpdate = useCallback(<P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => {
    const previousValue = getNestedValue(characterRef.current, field);
    undoStack.push({ field, previousValue, newValue: value });
    update(field, value);
  }, [update, undoStack]);

  // Clear undo stack on character switch
  const prevCharIdRef = useRef(manager.activeId);
  useEffect(() => {
    if (prevCharIdRef.current !== manager.activeId) {
      undoStack.clear();
      prevCharIdRef.current = manager.activeId;
    }
  }, [manager.activeId, undoStack]);

  // Global keydown listener for Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
      if (!isUndo) return;

      // Only fire when not in an input/textarea/contenteditable
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((active as HTMLElement).isContentEditable) return;
      }

      e.preventDefault();

      const entry = undoStack.undo();
      if (!entry) return;

      // Revert the field to its previous value. The undo entry is typed against
      // `Character` (state-safety-core task 4), so `field`/`previousValue` flow
      // into the typed `update` without a boundary cast.
      update(entry.field, entry.previousValue);

      // Show toast notification
      const label = fieldToLabel(entry.field);
      const valueStr = String(entry.previousValue ?? '');
      const displayValue = valueStr.length > 20 ? valueStr.slice(0, 20) + '…' : valueStr;
      setUndoToastMessage(`Reverted ${label} to ${displayValue}`);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, update]);

  // Quick Actions state. Refreshes live when edited in Settings (same tab) or
  // in another tab, so the Quick Rolls bar stays in sync without a reload.
  const [quickActions, setQuickActions] = useState(() => loadQuickActions());
  useEffect(() => {
    const refresh = () => setQuickActions(loadQuickActions());
    window.addEventListener(QUICK_ACTIONS_CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(QUICK_ACTIONS_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);

  const handleQuickActionTrigger = (action: QuickAction) => {
    // First try to resolve the favourite as a skill.
    const allSkills = [...character.bSkills, ...character.aSkills];
    const skill = allSkills.find(s => s.n === action.skillName);
    if (skill) {
      const charVal = character.chars[skill.c as CharacteristicKey];
      const baseTarget = charVal
        ? computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a)
        : skill.a;
      setRollDialogState({ name: action.skillName, baseTarget });
      return;
    }

    // Fall back to a characteristic test (#3 — favourites may be characteristics
    // too). Match either the short code (e.g. "WP") or the full name ("Willpower").
    const charKey = CHARACTERISTIC_KEYS.find(
      k => k === action.skillName || CHAR_FULL_NAMES[k] === action.skillName,
    );
    if (charKey) {
      const c = character.chars[charKey];
      const baseTarget = computeCharacteristicTarget(c.i, c.a, c.b);
      setRollDialogState({ name: CHAR_FULL_NAMES[charKey], baseTarget });
      return;
    }

    // Unknown favourite (e.g. a skill the character no longer has): open the
    // dialog with a 0 base target so the player can still roll with difficulty.
    setRollDialogState({ name: action.skillName, baseTarget: 0 });
  };

  const handleQuickRollResult = (result: RollResult) => {
    setRollDialogState(null);
    setRollResultState(result);
    addRoll(result);
  };

  const handleWizardComplete = (wizardChar: Character) => {
    const id = manager.createCharacter(wizardChar.name);
    saveCharacter(id, wizardChar);
    manager.switchCharacter(id);
    manager.refresh();
    setShowWizard(false);
    navigate('character');
  };

  const handleCreateFromSheet = () => {
    setShowCharSheet(false);
    setShowNewCharChoice(true);
  };

  const handleNewCharQuickStart = (name: string) => {
    manager.createCharacter(name);
    manager.refresh();
    setShowNewCharChoice(false);
    navigate('character');
  };

  const handleNewCharWizard = () => {
    setShowNewCharChoice(false);
    setShowWizard(true);
  };

  const handleNewCharRandom = () => {
    // Build a complete random character with the production RNG and persist it via
    // the SAME path handleWizardComplete uses (create -> save -> switch -> refresh),
    // then close the modal and show the sheet. The generator never sets wCur; the
    // useCharacter backfill sets current wounds to the wound maximum (spec:
    // random-character-generator Req 1.1, 1.2, 12.1-12.2).
    const character = generateRandomCharacter(Math.random);
    const id = manager.createCharacter(character.name);
    saveCharacter(id, character);
    manager.switchCharacter(id);
    manager.refresh();
    setShowNewCharChoice(false);
    navigate('character');
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
    setShowCharSheet(true);
  };

  const pageProps = { character, update: undoableUpdate, updateCharacter, totalWounds, armourPoints, maxEncumbrance, coinWeight };

  const getDomain = (): 'combat' | 'character' | 'advancement' | undefined => {
    switch (page) {
      case 'combat': return 'combat';
      case 'advancement': return 'advancement';
      case 'character': return 'character';
      default: return undefined;
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'character':
        return <CharacterPage {...pageProps} characterId={manager.activeId} rollHistory={rollHistory} addRoll={addRoll} clearHistory={clearHistory} subTab={subTab} onSubTabChange={(tab) => navigate('character', tab)} />;
      case 'combat':
        return <PageLoader skeleton={<CombatSkeleton />}><CombatPage {...pageProps} characterId={manager.activeId} rollHistory={rollHistory} addRoll={addRoll} clearHistory={clearHistory} /></PageLoader>;
      case 'retinue':
        return <PageLoader><RetinuePage character={character} update={undoableUpdate} updateCharacter={updateCharacter} subTab={subTab} onSubTabChange={(tab) => navigate('retinue', tab)} /></PageLoader>;
      case 'estate':
        return <PageLoader><EstatePage {...pageProps} subTab={subTab} onSubTabChange={(tab) => navigate('estate', tab)} /></PageLoader>;
      case 'endeavours':
        return <PageLoader><EndeavoursPage {...pageProps} /></PageLoader>;
      case 'advancement':
        return <PageLoader skeleton={<AdvancementSkeleton />}><AdvancementPage {...pageProps} /></PageLoader>;
      case 'settings':
        return <PageLoader skeleton={<SettingsSkeleton />}><SettingsPage {...pageProps} characterId={manager.activeId} currentTheme={currentTheme} onThemeChange={setTheme} /></PageLoader>;
      default:
        return <CharacterPage {...pageProps} characterId={manager.activeId} rollHistory={rollHistory} addRoll={addRoll} clearHistory={clearHistory} subTab={subTab} onSubTabChange={(tab) => navigate('character', tab)} />;
    }
  };

  return (
    <>
      <div className="screen-only" style={{ display: 'flex', flex: 1 }}>
        <Navigation
          activePage={page}
          onPageChange={(p) => navigate(p)}
          characterName={character.name}
          characters={manager.characters}
          activeId={manager.activeId}
          onSwitchCharacter={(id) => { manager.switchCharacter(id, character); }}
          onCreateCharacter={handleCreateFromSheet}
          onRenameCharacter={(id, name) => { manager.renameCharacter(id, name); manager.refresh(); }}
          onDuplicateCharacter={(id) => { manager.duplicateCharacter(id); manager.refresh(); }}
          onDeleteCharacter={(id) => { manager.deleteCharacter(id); manager.refresh(); }}
          onManageCharacters={() => setShowCharSheet(true)}
          showAdvancementBadge={character.xpCur > 0}
          showEndeavoursBadge={character.endeavours.some(period => period.entries.some(e => e.status === 'pending' || e.status === 'in_progress'))}
        />
        <PageContainer
          characterName={character.name}
          onOpenCharacterSheet={() => setShowCharSheet(true)}
          headerRef={charHeaderRef}
          domain={getDomain()}
          pageKey={page}
        >
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </PageContainer>
        {quickActions.length > 0 && (
          isMobile ? (
            <QuickActionBar actions={quickActions} onTrigger={handleQuickActionTrigger} variant="floating" />
          ) : (
            <QuickActionBar actions={quickActions} onTrigger={handleQuickActionTrigger} variant="docked" />
          )
        )}
      </div>
      <div className="print-only" style={{ display: 'none' }}>
        <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
      </div>
      <CharacterManagementSheet
        isOpen={showCharSheet}
        onClose={() => setShowCharSheet(false)}
        characters={manager.characters}
        activeId={manager.activeId}
        onSwitchCharacter={(id) => { manager.switchCharacter(id, character); }}
        onCreateCharacter={handleCreateFromSheet}
        onRenameCharacter={(id, name) => { manager.renameCharacter(id, name); manager.refresh(); }}
        onDuplicateCharacter={(id) => { manager.duplicateCharacter(id); manager.refresh(); }}
        onDeleteCharacter={(id) => { manager.deleteCharacter(id); manager.refresh(); }}
        triggerRef={charHeaderRef}
      />
      {rollDialogState && (
        <RollDialog
          skillOrCharName={rollDialogState.name}
          baseTarget={rollDialogState.baseTarget}
          onRoll={handleQuickRollResult}
          onClose={() => setRollDialogState(null)}
        />
      )}
      {rollResultState && (
        <RollResultDisplay
          result={rollResultState}
          onClose={() => setRollResultState(null)}
        />
      )}
      {showNewCharChoice && (
        <NewCharacterChoice
          onQuickStart={handleNewCharQuickStart}
          onWizard={handleNewCharWizard}
          onRandomCharacter={handleNewCharRandom}
          onCancel={() => { setShowNewCharChoice(false); setShowCharSheet(true); }}
        />
      )}
      {showWizard && (
        <CharacterWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      )}
      <Toast message={undoToastMessage} duration={3000} />
    </>
  );
}

export default function App() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    async function initApp() {
      runMigration();
      const store = getPortraitStore();
      await store.init();
      await runPortraitMigration(store);
      setMigrated(true);
    }
    initApp();
  }, []);

  // Typing into a number field that shows 0 gives "51", not "051".
  useStripLeadingZeros();

  if (!migrated) {
    return null;
  }

  return (
    <SWUpdateProvider>
      <ErrorBoundary>
        <CommandPaletteProvider>
          <AppContent />
        </CommandPaletteProvider>
      </ErrorBoundary>
      <UpdateBanner />
      {/* One-time PWA install hint, mounted outside Settings in the app shell (Req 6.3, 6.7) */}
      <InstallHintBanner />
    </SWUpdateProvider>
  );
}
