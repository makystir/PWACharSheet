import { useState, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { Navigation } from './components/layout/Navigation';
import { PageContainer } from './components/layout/PageContainer';
import { PrintLayout } from './components/layout/PrintLayout';
import { CharacterPage } from './components/pages/CharacterPage';
import { CombatPage } from './components/pages/CombatPage';
import { EstatePage } from './components/pages/EstatePage';
import { AdvancementPage } from './components/pages/AdvancementPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { useCharacterManager } from './hooks/useCharacterManager';
import { useCharacter } from './hooks/useCharacter';
import { runMigration } from './storage/migration';
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

function CharacterCreationPrompt({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onCreate(trimmed);
    }
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
        maxWidth: '400px',
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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
          Create your first character to get started.
        </p>
        <input
          type="text"
          placeholder="Character name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
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
          }}
          autoFocus
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim()}
          style={{
            width: '100%',
            padding: '10px',
            background: name.trim() ? 'var(--accent-gold)' : 'var(--border)',
            color: name.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'default',
          }}
        >
          Create Character
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const manager = useCharacterManager();
  const [page, setPage] = useState<PageSection>('character');

  // If no characters exist, show creation prompt
  if (manager.characters.length === 0 || !manager.activeCharacter) {
    return (
      <CharacterCreationPrompt
        onCreate={(name) => {
          manager.createCharacter(name);
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

  const pageProps = { character, update, updateCharacter, totalWounds, armourPoints, maxEncumbrance, coinWeight };

  const renderPage = () => {
    switch (page) {
      case 'character':
        return <CharacterPage {...pageProps} />;
      case 'combat':
        return <CombatPage {...pageProps} />;
      case 'estate':
        return <EstatePage {...pageProps} />;
      case 'advancement':
        return <AdvancementPage {...pageProps} />;
      case 'settings':
        return <SettingsPage {...pageProps} manager={manager} />;
      default:
        return <CharacterPage {...pageProps} />;
    }
  };

  return (
    <>
      <div className="screen-only" style={{ display: 'flex', flex: 1 }}>
        <Navigation
          activePage={page}
          onPageChange={setPage}
          characterName={character.name}
        />
        <PageContainer>
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </PageContainer>
      </div>
      <div className="print-only" style={{ display: 'none' }}>
        <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
      </div>
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
