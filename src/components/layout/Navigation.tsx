import { useEffect, useState, useRef, useCallback } from 'react';
import { User, Swords, Users, Landmark, CalendarCheck, TrendingUp, Settings, Plus, ChevronDown, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CharacterSummary } from '../../types/character';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useCommandPaletteContext } from '../command-palette/CommandPaletteContext';
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
  /** Whether badge dot should show on Advancement nav item (unspent XP > 0) */
  showAdvancementBadge?: boolean;
  /** Whether badge dot should show on Endeavours nav item (active endeavours exist) */
  showEndeavoursBadge?: boolean;
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

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem('nav-collapsed') === 'true';
  } catch {
    return false;
  }
}

export function Navigation({ activePage, onPageChange, characterName, characters, activeId, onSwitchCharacter, onCreateCharacter, onRenameCharacter, onDuplicateCharacter, onDeleteCharacter, showAdvancementBadge, showEndeavoursBadge }: NavigationProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  const { open } = useCommandPaletteContext();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nav-collapsed', String(next));
      } catch {
        // Private browsing or storage full — ignore
      }
      return next;
    });
  }, []);

  // Determine which nav items should show a badge dot
  const badgeItems: Partial<Record<PageSection, boolean>> = {
    advancement: !!showAdvancementBadge,
    endeavours: !!showEndeavoursBadge,
  };

  // Auto-scroll active item into view on mount (mobile scrollable bar)
  useEffect(() => {
    if (isMobile && activeItemRef.current) {
      const el = activeItemRef.current;
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
      }
    }
  }, [isMobile, activePage]);

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

  // Render mobile scrollable tab bar — all items in a single horizontal row
  const renderMobileNav = () => (
    <div className={styles.mobileScrollRow}>
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        const hasBadge = badgeItems[item.id];
        return (
          <button
            key={item.id}
            ref={isActive ? activeItemRef : undefined}
            type="button"
            className={isActive ? styles.navItemActive : styles.navItem}
            onClick={() => onPageChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            data-section={item.id}
          >
            <span className={styles.iconWrapper}>
              <Icon size={18} />
              {hasBadge && <span className={styles.badgeDot} aria-label="has updates" />}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Search button */}
      <button
        type="button"
        className={styles.navItem}
        onClick={() => open()}
        aria-label="Search game reference"
        data-section="search"
      >
        <Search size={18} />
        <span>Search</span>
      </button>
    </div>
  );

  // Render desktop sidebar tabs
  const renderDesktopNav = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        const hasBadge = badgeItems[item.id];
        return (
          <button
            key={item.id}
            type="button"
            className={`${isActive ? styles.navItemActive : styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`}
            onClick={() => onPageChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            title={collapsed ? item.label : undefined}
            data-section={item.id}
          >
            <span className={styles.iconWrapper}>
              <Icon size={18} />
              {hasBadge && <span className={styles.badgeDot} aria-label="has updates" />}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </>
  );

  return (
    <>
      {/* Navigation (sidebar on desktop, bottom bar on mobile) */}
      <nav className={`${styles.sidebar} ${!isMobile && collapsed ? styles.sidebarCollapsed : ''}`} aria-label="Main navigation">
        {!isMobile && (
          <>
            <div className={styles.appTitle}>
              {!collapsed && (
                <>
                  ⚔ WFRP 4e
                  <button
                    type="button"
                    className={styles.searchBtn}
                    onClick={() => open()}
                    aria-label="Search game reference"
                  >
                    <Search size={14} />
                  </button>
                </>
              )}
              {collapsed && (
                <button
                  type="button"
                  className={styles.searchBtn}
                  onClick={() => open()}
                  aria-label="Search game reference"
                  title="Search"
                >
                  <Search size={14} />
                </button>
              )}
            </div>
            {!collapsed && characterName && (
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

        {/* Collapse toggle button (desktop only) */}
        {!isMobile && (
          <button
            type="button"
            className={styles.collapseToggle}
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
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
