import { User, Swords, Users, Landmark, CalendarCheck, TrendingUp, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PageSection = 'character' | 'combat' | 'retinue' | 'estate' | 'endeavours' | 'advancement' | 'settings';

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
