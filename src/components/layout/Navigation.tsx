import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { User, Swords, Landmark, CalendarCheck, TrendingUp, Settings, Plus, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CharacterSummary } from '../../types/character';
import { ConfirmDialog } from '../shared/ConfirmDialog';

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
  { id: 'estate', label: 'Estate', icon: Landmark, shortcut: '3' },
  { id: 'endeavours', label: 'Endeavours', icon: CalendarCheck, shortcut: '4' },
  { id: 'advancement', label: 'Advancement', icon: TrendingUp, shortcut: '5' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '6' },
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
      <nav style={sidebarStyle} className="nav-sidebar" aria-label="Main navigation">
        <div style={{ padding: '4px 16px 12px', fontFamily: 'var(--font-heading)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-gold)', borderBottom: '1px solid var(--border)', marginBottom: '4px', textAlign: 'center' }}>
          ⚔ WFRP 4e
        </div>
        {characterName && (
          <div style={{ ...charNameStyle, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setShowSwitcher(!showSwitcher)}
                style={{ background: 'none', border: 'none', color: 'var(--parchment)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '14px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title="Switch character"
              >
                {characterName || 'No Character'}
                {characters && characters.length > 0 && <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6, transform: showSwitcher ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
              </button>
              {onCreateCharacter && (
                <button
                  type="button"
                  onClick={onCreateCharacter}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-gold)', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', flexShrink: 0 }}
                  title="New character"
                  aria-label="Create new character"
                >
                  <Plus size={12} /> New
                </button>
              )}
            </div>
            {showSwitcher && characters && characters.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {characters.map(c => {
                  const isActive = c.id === activeId;
                  if (renameId === c.id) {
                    return (
                      <div key={c.id} style={{ display: 'flex', gap: '2px' }}>
                        <input type="text" value={renameName} onChange={e => setRenameName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && renameName.trim()) { onRenameCharacter?.(c.id, renameName.trim()); setRenameId(null); } }} style={{ flex: 1, padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }} autoFocus />
                        <button type="button" onClick={() => { if (renameName.trim()) { onRenameCharacter?.(c.id, renameName.trim()); setRenameId(null); } }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', cursor: 'pointer', padding: '2px 6px', fontSize: '10px' }}>✓</button>
                      </div>
                    );
                  }
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: isActive ? 'rgba(201,168,76,0.1)' : 'var(--bg-tertiary)', border: `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', padding: '4px 6px' }}>
                      <button type="button" onClick={() => { if (!isActive) { onSwitchCharacter?.(c.id); setShowSwitcher(false); } }} style={{ flex: 1, background: 'none', border: 'none', color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: isActive ? 'default' : 'pointer', fontSize: '12px', textAlign: 'left', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name || 'Unnamed'}>
                        {c.name || 'Unnamed'}
                      </button>
                      <button type="button" onClick={() => { setRenameId(c.id); setRenameName(c.name); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', padding: '0 2px' }} title="Rename">✎</button>
                      <button type="button" onClick={() => onDuplicateCharacter?.(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', padding: '0 2px' }} title="Duplicate">⧉</button>
                      <button type="button" onClick={() => setPendingDeleteId(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '10px', padding: '0 2px' }} title="Delete">✕</button>
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
