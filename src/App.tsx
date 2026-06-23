import { useState, useEffect, useRef, Component } from 'react';
import type { ReactNode } from 'react';
import type { Character } from './types/character';
import { Navigation } from './components/layout/Navigation';
import { PageContainer } from './components/layout/PageContainer';
import { useTheme } from './hooks/useTheme';
import { PrintLayout } from './components/layout/PrintLayout';
import { CharacterPage } from './components/pages/CharacterPage';
import { CombatPage } from './components/pages/CombatPage';
import { EstatePage } from './components/pages/EstatePage';
import { AdvancementPage } from './components/pages/AdvancementPage';
import { EndeavoursPage } from './components/pages/EndeavoursPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { RetinuePage } from './components/pages/RetinuePage';
import { CharacterWizard } from './components/shared/CharacterWizard';
import { CharacterManagementSheet } from './components/shared/CharacterManagementSheet';
import { useCharacterManager } from './hooks/useCharacterManager';
import { useCharacter } from './hooks/useCharacter';
import { useRollHistory } from './hooks/useRollHistory';
import { runMigration } from './storage/migration';
import { saveCharacter } from './storage/character-manager';
import { WelcomeScreen } from './components/shared/WelcomeScreen';
import type { PageSection } from './components/layout/Navigation';

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
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}>
          <h2 style={{ color: 'var(--danger)', fontFamily: 'var(--font-heading)' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-tertiary)',
              color: 'var(--parchment)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
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
  const manager = useCharacterManager();
  const [page, setPage] = useState<PageSection>('character');

  // If no characters exist, show welcome screen
  if (manager.characters.length === 0 || !manager.activeCharacter) {
    return (
      <WelcomeScreen
        onCreateCharacter={(name) => {
          manager.createCharacter(name);
          manager.refresh();
        }}
        onWizardComplete={(character) => {
          saveCharacter(manager.createCharacter(character.name), character);
          manager.refresh();
        }}
        onImportCharacter={(character) => {
          const id = manager.createCharacter(character.name);
          saveCharacter(id, character);
          manager.refresh();
        }}
      />
    );
  }

  return (
    <AppWithCharacter
      manager={manager}
      page={page}
      setPage={setPage}
    />
  );
}

function AppWithCharacter({
  manager,
  page,
  setPage,
}: {
  manager: ReturnType<typeof useCharacterManager>;
  page: PageSection;
  setPage: (p: PageSection) => void;
}) {
  const { character, update, updateCharacter, totalWounds, armourPoints, maxEncumbrance, coinWeight } = useCharacter(manager.activeId, manager.activeCharacter!);
  const { history: rollHistory, addRoll, clearHistory } = useRollHistory();
  const { theme: currentTheme, setTheme } = useTheme();
  const [showWizard, setShowWizard] = useState(false);
  const [showCharSheet, setShowCharSheet] = useState(false);
  const charHeaderRef = useRef<HTMLButtonElement>(null);

  const handleWizardComplete = (wizardChar: Character) => {
    const id = manager.createCharacter(wizardChar.name);
    saveCharacter(id, wizardChar);
    manager.switchCharacter(id);
    manager.refresh();
    setShowWizard(false);
    setPage('character');
  };

  const handleCreateFromSheet = () => {
    setShowCharSheet(false);
    setShowWizard(true);
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
    setShowCharSheet(true);
  };

  const pageProps = { character, update, updateCharacter, totalWounds, armourPoints, maxEncumbrance, coinWeight };

  const renderPage = () => {
    switch (page) {
      case 'character':
        return <CharacterPage {...pageProps} rollHistory={rollHistory} addRoll={addRoll} clearHistory={clearHistory} />;
      case 'combat':
        return <CombatPage {...pageProps} rollHistory={rollHistory} addRoll={addRoll} clearHistory={clearHistory} />;
      case 'retinue':
        return <RetinuePage character={character} update={update} updateCharacter={updateCharacter} />;
      case 'estate':
        return <EstatePage {...pageProps} />;
      case 'endeavours':
        return <EndeavoursPage {...pageProps} />;
      case 'advancement':
        return <AdvancementPage {...pageProps} />;
      case 'settings':
        return <SettingsPage {...pageProps} currentTheme={currentTheme} onThemeChange={setTheme} />;
      default:
        return <CharacterPage {...pageProps} rollHistory={rollHistory} addRoll={addRoll} clearHistory={clearHistory} />;
    }
  };

  return (
    <>
      <div className="screen-only" style={{ display: 'flex', flex: 1 }}>
        <Navigation
          activePage={page}
          onPageChange={setPage}
          characterName={character.name}
          characters={manager.characters}
          activeId={manager.activeId}
          onSwitchCharacter={(id) => { manager.switchCharacter(id, character); }}
          onCreateCharacter={() => setShowWizard(true)}
          onRenameCharacter={(id, name) => { manager.renameCharacter(id, name); manager.refresh(); }}
          onDuplicateCharacter={(id) => { manager.duplicateCharacter(id); manager.refresh(); }}
          onDeleteCharacter={(id) => { manager.deleteCharacter(id); manager.refresh(); }}
        />
        <PageContainer
          characterName={character.name}
          onOpenCharacterSheet={() => setShowCharSheet(true)}
          headerRef={charHeaderRef}
        >
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </PageContainer>
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
      {showWizard && (
        <CharacterWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      )}
    </>
  );
}

export default function App() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    runMigration();
    setMigrated(true);
  }, []);

  if (!migrated) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
