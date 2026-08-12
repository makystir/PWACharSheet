import { useState, useEffect, useRef, useCallback, Component, lazy } from 'react';
import type { ReactNode } from 'react';
import type { Character, CharacteristicKey } from './types/character';
import { Navigation } from './components/layout/Navigation';
import { PageContainer } from './components/layout/PageContainer';
import { PageLoader } from './components/layout/PageLoader';
import { useTheme } from './hooks/useTheme';
import { useMediaQuery } from './hooks/useMediaQuery';
import { PrintLayout } from './components/layout/PrintLayout';
import { CharacterPage } from './components/pages/CharacterPage';
import { loadQuickActions } from './storage/quick-actions';
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
import { WhatsNewPanel, shouldShowWhatsNew } from './components/shared/WhatsNewPanel';
import { computeSkillTarget } from './logic/dice-roller';
import type { RollResult } from './logic/dice-roller';
import { useCharacterManager } from './hooks/useCharacterManager';
import { useCharacter } from './hooks/useCharacter';
import { useRollHistory } from './hooks/useRollHistory';
import { useHashRoute } from './hooks/useHashRoute';
import { useStorageErrorToast } from './hooks/useStorageErrorToast';
import { runMigration } from './storage/migration';
import { saveCharacter } from './storage/character-manager';
import { getPortraitStore } from './storage/portrait-store';
import { runPortraitMigration } from './storage/portrait-migration';
import { WelcomeScreen } from './components/shared/WelcomeScreen';
import type { PageSection } from './components/layout/Navigation';
import errorStyles from './ErrorBoundary.module.css';
import { SWUpdateProvider } from './hooks/useSWUpdate';
import { UpdateBanner } from './components/shared/UpdateBanner';
import { CommandPaletteProvider } from './components/command-palette/CommandPaletteContext';
import { useCommandPalette } from './components/command-palette/useCommandPalette';
import { CommandPalette } from './components/command-palette/CommandPalette';

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
          onImportCharacter={(_character) => {
            manager.refresh();
          }}
        />
        <Toast message={storageErrorMessage} duration={5000} />
        <CommandPalette />
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
 * Retrieves a nested value from an object using dot-notation path.
 * Returns undefined if any segment along the path is missing.
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Generates a human-readable label from a dot-notation field path.
 * e.g. "chars.WS.a" → "WS advances", "name" → "name", "wCur" → "wCur"
 */
function fieldToLabel(field: string): string {
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
  const { history: rollHistory, addRoll, clearHistory } = useRollHistory();
  const { theme: currentTheme, setTheme } = useTheme();
  const [showWizard, setShowWizard] = useState(false);
  const [showNewCharChoice, setShowNewCharChoice] = useState(false);
  const [showCharSheet, setShowCharSheet] = useState(false);
  const charHeaderRef = useRef<HTMLButtonElement>(null);

  // ── Undo Stack ──
  const undoStack = useUndoStack(10);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);
  const characterRef = useRef(character);
  characterRef.current = character;

  // Wrapped update that pushes to undo stack before applying
  const undoableUpdate = useCallback((field: string, value: unknown) => {
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

      // Revert the field to its previous value
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

  // Quick Actions state
  const [quickActions] = useState(() => loadQuickActions());
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [rollDialogState, setRollDialogState] = useState<{ name: string; baseTarget: number } | null>(null);
  const [rollResultState, setRollResultState] = useState<RollResult | null>(null);

  const handleQuickActionTrigger = (action: QuickAction) => {
    // Find the skill in character's basic or advanced skills
    const allSkills = [...character.bSkills, ...character.aSkills];
    const skill = allSkills.find(s => s.n === action.skillName);
    let baseTarget = 0;
    if (skill) {
      const charVal = character.chars[skill.c as CharacteristicKey];
      if (charVal) {
        baseTarget = computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a);
      } else {
        baseTarget = skill.a;
      }
    }
    setRollDialogState({ name: action.skillName, baseTarget });
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
        {isMobile && quickActions.length > 0 && (
          <QuickActionBar actions={quickActions} onTrigger={handleQuickActionTrigger} />
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
    </SWUpdateProvider>
  );
}
