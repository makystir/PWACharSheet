import { useEffect, useState, useRef, useCallback } from 'react';
import { User, Swords, Users, Landmark, CalendarCheck, TrendingUp, Settings, Plus, ChevronDown, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CharacterSummary } from '../../types/character';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './Navigation.module.css';

export type PageSection = 'character' | 'combat' | 'retinue' | 'estate' | 'endeavours' | 'advancement' | 'settings';

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
  { id: 'retinue', label: 'Retinue', icon: Users, shortcut: '3' },
  { id: 'estate', label: 'Holdings & Wealth', icon: Landmark, shortcut: '4' },
  { id: 'endeavours', label: 'Endeavours', icon: CalendarCheck, shortcut: '5' },
  { id: 'advancement', label: 'Advancement', icon: TrendingUp, shortcut: '6' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '7' },
];

/** Primary tabs shown directly in mobile bottom bar */
const PRIMARY_MOBILE_ITEMS: NavItem[] = NAV_ITEMS.filter(item =>
  ['character', 'combat', 'retinue', 'settings'].includes(item.id)
);

/** Overflow tabs grouped behind the "More" button on mobile */
const OVERFLOW_ITEMS: NavItem[] = NAV_ITEMS.filter(item =>
  ['estate', 'endeavours', 'advancement'].includes(item.id)
);

/** Set of overflow page IDs for quick lookup */
const OVERFLOW_PAGE_IDS = new Set(OVERFLOW_ITEMS.map(item => item.id));

export function Navigation({ activePage, onPageChange, characterName, characters, activeId, onSwitchCharacter, onCreateCharacter, onRenameCharacter, onDuplicateCharacter, onDeleteCharacter }: NavigationProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const overflowRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Whether the currently active page is in the overflow group
  const isOverflowPageActive = OVERFLOW_PAGE_IDS.has(activePage);

  // Get the icon for the active overflow page (for showing on the More button)
  const activeOverflowItem = isOverflowPageActive
    ? OVERFLOW_ITEMS.find(item => item.id === activePage)
    : null;

  // Close overflow on outside tap
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      overflowRef.current &&
      !overflowRef.current.contains(e.target as Node) &&
      moreButtonRef.current &&
      !moreButtonRef.current.contains(e.target as Node)
    ) {
      setShowOverflow(false);
    }
  }, []);

  useEffect(() => {
    if (showOverflow) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [showOverflow, handleOutsideClick]);

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

  const handleOverflowSelect = (page: PageSection) => {
    onPageChange(page);
    setShowOverflow(false);
  };

  // Render mobile bottom bar tabs
  const renderMobileNav = () => (
    <>
      {PRIMARY_MOBILE_ITEMS.map((item) => {
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

      {/* More button */}
      <button
        ref={moreButtonRef}
        type="button"
        className={isOverflowPageActive ? styles.navItemActive : styles.navItem}
        onClick={() => setShowOverflow(!showOverflow)}
        aria-expanded={showOverflow}
        aria-haspopup="true"
        data-section="more"
      >
        {activeOverflowItem ? (
          <activeOverflowItem.icon size={18} />
        ) : (
          <MoreHorizontal size={18} />
        )}
        <span>{activeOverflowItem ? activeOverflowItem.label : 'More'}</span>
      </button>

      {/* Overflow popover */}
      {showOverflow && (
        <div ref={overflowRef} className={styles.overflowPopover} role="menu">
          {OVERFLOW_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? styles.overflowItemActive : styles.overflowItem}
                onClick={() => handleOverflowSelect(item.id)}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  // Render desktop sidebar tabs
  const renderDesktopNav = () => (
    <>
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
    </>
  );

  return (
    <>
      {/* Navigation (sidebar on desktop, bottom bar on mobile) */}
      <nav className={styles.sidebar} aria-label="Main navigation">
        {!isMobile && (
          <>
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
          </>
        )}

        {isMobile ? renderMobileNav() : renderDesktopNav()}
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
