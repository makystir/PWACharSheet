import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { User, Swords, Landmark, TrendingUp, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PageSection = 'character' | 'combat' | 'estate' | 'advancement' | 'settings';

interface NavigationProps {
  activePage: PageSection;
  onPageChange: (page: PageSection) => void;
  characterName?: string;
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
  { id: 'estate', label: 'Estate', icon: Landmark, shortcut: '3' },
  { id: 'advancement', label: 'Advancement', icon: TrendingUp, shortcut: '4' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '5' },
];

// Desktop sidebar styles
const sidebarStyle: CSSProperties = {
  width: 'var(--nav-width, 220px)',
  background: 'var(--bg-secondary)',
  borderRight: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  padding: '16px 0',
  flexShrink: 0,
};

const charNameStyle: CSSProperties = {
  padding: '8px 16px 16px',
  fontFamily: 'var(--font-heading)',
  fontSize: '14px',
  color: 'var(--parchment)',
  borderBottom: '1px solid var(--border)',
  marginBottom: '8px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const navItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
  transition: 'background 0.1s, color 0.1s',
};

const activeItemStyle: CSSProperties = {
  ...navItemStyle,
  background: 'var(--bg-tertiary)',
  color: 'var(--parchment)',
  borderLeft: '3px solid var(--accent-gold)',
  paddingLeft: '13px',
};

const shortcutStyle: CSSProperties = {
  marginLeft: 'auto',
  fontSize: '11px',
  color: 'var(--text-muted)',
  opacity: 0.6,
};

export function Navigation({ activePage, onPageChange, characterName }: NavigationProps) {
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
      <nav style={sidebarStyle} className="nav-sidebar" aria-label="Main navigation">
        <div style={{ padding: '4px 16px 12px', fontFamily: 'var(--font-heading)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-gold)', borderBottom: '1px solid var(--border)', marginBottom: '4px', textAlign: 'center' }}>
          ⚔ WFRP 4e
        </div>
        {characterName && (
          <div style={charNameStyle} title={characterName}>
            {characterName || 'No Character'}
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              style={isActive ? activeItemStyle : navItemStyle}
              onClick={() => onPageChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              data-section={item.id}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              <span style={shortcutStyle}>{item.shortcut}</span>
            </button>
          );
        })}
      </nav>

      {/* Inline responsive styles */}
      <style>{`
        @media (max-width: 767px) {
          .nav-sidebar {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            width: 100% !important;
            height: var(--nav-height-mobile, 60px) !important;
            flex-direction: row !important;
            border-right: none !important;
            border-top: 1px solid var(--border) !important;
            padding: 0 !important;
            z-index: 100;
          }
          .nav-sidebar > div:first-child {
            display: none !important;
          }
          .nav-sidebar button {
            flex: 1 !important;
            flex-direction: column !important;
            gap: 2px !important;
            padding: 8px 4px !important;
            font-size: 10px !important;
            justify-content: center !important;
            border-left: none !important;
            padding-left: 4px !important;
          }
          .nav-sidebar button span:last-child {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
