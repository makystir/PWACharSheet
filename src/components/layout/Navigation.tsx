import { useEffect, useState, useRef, useCallback } from 'react';
import { User, Swords, Users, Landmark, CalendarCheck, TrendingUp, Settings, Plus, ChevronDown, ChevronRight, Search, PanelLeftClose, PanelLeftOpen, Keyboard } from 'lucide-react';
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
  /** Opens the full character-management affordance (create/rename/duplicate/delete). Req 15.1/15.3 */
  onManageCharacters?: () => void;
  /** Whether badge dot should show on Advancement nav item (unspent XP > 0) */
  showAdvancementBadge?: boolean;
  /** Whether badge dot should show on Endeavours nav item (active endeavours exist) */
  showEndeavoursBadge?: boolean;
}

export interface NavItem {
  id: PageSection;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  /**
   * When set, the section contains multiple sub-tabs; the label conveys the
   * combined scope of those sub-tabs. Req 16.1/16.2 — the sub-label makes the
   * presence of sub-tabs discoverable without changing routing keys (Req 16.3).
   */
  subTabHint?: string;
}

/**
 * Page-navigation items. The `shortcut` field is the number key (1–7) handled
 * by the keydown listener below. This array is the single source of truth for
 * page-switch shortcuts and is re-exported to `config/shortcuts.ts` so the
 * ShortcutsHelp overlay never diverges from the actual handlers.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'character', label: 'Character', icon: User, shortcut: '1' },
  { id: 'combat', label: 'Combat', icon: Swords, shortcut: '2' },
  { id: 'retinue', label: 'Retinue', icon: Users, shortcut: '3' },
  // Navigation spec Req 16.1/16.2 originally chose "Holdings & Wealth" +
  // subTabHint "Estate · Holdings · Wealth" to convey the combined scope and
  // surface the sub-tabs. The money-locations-clarity spec (Req 2) supersedes
  // that *display text* — the label is now "Estate" and the hint is
  // "Estate · Holdings · Treasury · Finances" to remove the ambiguous word
  // "Wealth" — while preserving the same routing-key-stability guarantee: the
  // PageSection routing key stays 'estate' and the hash route '#estate' is
  // unchanged (Navigation Req 16.3 / money-locations-clarity Req 7).
  { id: 'estate', label: 'Estate', icon: Landmark, shortcut: '4', subTabHint: 'Estate · Holdings · Treasury · Finances' },
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

export function Navigation({ activePage, onPageChange, characterName, characters, activeId, onSwitchCharacter, onCreateCharacter, onRenameCharacter, onDuplicateCharacter, onDeleteCharacter, onManageCharacters, showAdvancementBadge, showEndeavoursBadge }: NavigationProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  const { open, openShortcuts } = useCommandPaletteContext();
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
            <span className={styles.mobileLabelRow}>
              {item.label}
              {item.subTabHint && (
                <ChevronRight size={10} className={styles.subTabCaret} aria-hidden="true" />
              )}
            </span>
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

      {/* Visible keyboard-shortcuts affordance (Req 14.2) */}
      <button
        type="button"
        className={styles.navItem}
        onClick={() => openShortcuts()}
        aria-label="Keyboard shortcuts"
        data-section="shortcuts"
      >
        <Keyboard size={18} />
        <span>Shortcuts</span>
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
            {!collapsed && (
              <span className={styles.navItemLabel}>
                <span className={styles.navItemLabelRow}>
                  {item.label}
                  {item.subTabHint && (
                    <ChevronRight size={12} className={styles.subTabCaret} aria-hidden="true" />
                  )}
                </span>
                {item.subTabHint && (
                  <span className={styles.navItemSubHint}>{item.subTabHint}</span>
                )}
              </span>
            )}
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
                    {/* Req 15.1/15.2: this quick-switch list is for switching the
                        active character. A distinct "Manage Characters" entry
                        below opens the full management affordance (Req 15.3). */}
                    <div className={styles.switcherHeading}>Switch Character</div>
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
                    {onManageCharacters && (
                      <button
                        type="button"
                        onClick={() => { setShowSwitcher(false); onManageCharacters(); }}
                        className={styles.manageCharsBtn}
                        title="Open full character management (create, rename, duplicate, delete)"
                      >
                        <Users size={12} /> Manage Characters…
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {isMobile ? renderMobileNav() : renderDesktopNav()}

        {/* Visible keyboard-shortcuts affordance, desktop sidebar (Req 14.2) */}
        {!isMobile && (
          <button
            type="button"
            className={`${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`}
            onClick={() => openShortcuts()}
            aria-label="Keyboard shortcuts"
            title={collapsed ? 'Keyboard shortcuts' : undefined}
            data-section="shortcuts"
          >
            <span className={styles.iconWrapper}>
              <Keyboard size={18} />
            </span>
            {!collapsed && <span>Keyboard Shortcuts</span>}
          </button>
        )}

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
