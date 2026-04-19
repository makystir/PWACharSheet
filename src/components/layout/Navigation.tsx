import { useEffect, useState } from 'react';
import { User, Swords, Landmark, CalendarCheck, TrendingUp, Settings, Plus, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CharacterSummary } from '../../types/character';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import styles from './Navigation.module.css';

export type PageSection = 'character' | 'combat' | 'estate' | 'endeavours' | 'advancement' | 'settings';

interface NavigationProps {
  activePage: PageSection;
  onPageChange: (page: PageSection) => void;
  characterName?: string;
  characters?: CharacterSummary[];
  activeId?: string;
  onSwitchCharacter?: (id: string) => void;
  onCreateCharacter?: () => void;
  onRenameCharacter?: (id: string, name: string) => void;
  onDuplicateCharacter?: (id: string) => void;
  onDeleteCharacter?: (id: string) => void;
}

interface NavItem {
  id: PageSection;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'character', label: 'Character', icon: User, shortcut: '1' },
  { id: 'combat', label: 'Combat', icon: Swords, shortcut: '2' },
  { id: 'estate', label: 'Holdings & Wealth', icon: Landmark, shortcut: '3' },
  { id: 'endeavours', label: 'Endeavours', icon: CalendarCheck, shortcut: '4' },
  { id: 'advancement', label: 'Advancement', icon: TrendingUp, shortcut: '5' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '6' },
];

export function Navigation({ activePage, onPageChange, characterName, characters, activeId, onSwitchCharacter, onCreateCharacter, onRenameCharacter, onDuplicateCharacter, onDeleteCharacter }: NavigationProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      const item = NAV_ITEMS.find((n) => n.shortcut === e.key);
      if (item) {
        onPageChange(item.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPageChange]);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.appTitle}>
          ⚔ WFRP 4e
        </div>
        {characterName && (
          <div className={styles.charName}>
            <div className={styles.charNameRow}>
              <button
                type="button"
                onClick={() => setShowSwitcher(!showSwitcher)}
                className={styles.switcherBtn}
                title="Switch character"
              >
                {characterName || 'No Character'}
                {characters && characters.length > 0 && <ChevronDown size={14} className={showSwitcher ? styles.chevronIconExpanded : styles.chevronIcon} />}
              </button>
              {onCreateCharacter && (
                <button
                  type="button"
                  onClick={onCreateCharacter}
                  className={styles.newCharBtn}
                  title="New character"
                  aria-label="Create new character"
                >
                  <Plus size={12} /> New
                </button>
              )}
            </div>
            {showSwitcher && characters && characters.length > 0 && (
              <div className={styles.charList}>
                {characters.map(c => {
                  const isActive = c.id === activeId;
                  if (renameId === c.id) {
                    return (
                      <div key={c.id} className={styles.renameRow}>
                        <input type="text" value={renameName} onChange={e => setRenameName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && renameName.trim()) { onRenameCharacter?.(c.id, renameName.trim()); setRenameId(null); } }} className={styles.renameInput} autoFocus />
                        <button type="button" onClick={() => { if (renameName.trim()) { onRenameCharacter?.(c.id, renameName.trim()); setRenameId(null); } }} className={styles.renameConfirmBtn}>✓</button>
                      </div>
                    );
                  }
                  return (
                    <div key={c.id} className={isActive ? styles.charCardActive : styles.charCard}>
                      <button type="button" onClick={() => { if (!isActive) { onSwitchCharacter?.(c.id); setShowSwitcher(false); } }} className={isActive ? styles.charSwitchBtnActive : styles.charSwitchBtn} title={c.name || 'Unnamed'}>
                        {c.name || 'Unnamed'}
                      </button>
                      <button type="button" onClick={() => { setRenameId(c.id); setRenameName(c.name); }} className={styles.charActionBtn} title="Rename">✎</button>
                      <button type="button" onClick={() => onDuplicateCharacter?.(c.id)} className={styles.charActionBtn} title="Duplicate">⧉</button>
                      <button type="button" onClick={() => setPendingDeleteId(c.id)} className={styles.charDeleteBtn} title="Delete">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? styles.navItemActive : styles.navItem}
              onClick={() => onPageChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              data-section={item.id}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {pendingDeleteId && (() => {
        const charToDelete = characters?.find(c => c.id === pendingDeleteId);
        return (
          <ConfirmDialog
            message={`Delete "${charToDelete?.name || 'this character'}"? This cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={() => {
              onDeleteCharacter?.(pendingDeleteId);
              setPendingDeleteId(null);
            }}
            onCancel={() => setPendingDeleteId(null)}
          />
        );
      })()}
    </>
  );
}
