import { Sparkles } from 'lucide-react';
import styles from './AssistantTrigger.module.css';

export type AssistantTriggerVariant = 'desktop' | 'collapsed' | 'mobile';

export interface AssistantTriggerProps {
  /** Number of visible suggestions; drives the count badge (0 => no count). */
  count: number;
  /** Opens the Character Assistant panel. Never navigates. */
  open: () => void;
  /** Which Navigation context this trigger renders in. */
  variant: AssistantTriggerVariant;
  /**
   * Class applied to the button so each Navigation context can reuse its own
   * nav-item styling (e.g. `styles.navItem` / `styles.navItemCollapsed`).
   */
  buttonClassName: string;
}

/**
 * A single Assistant trigger button, styled to sit alongside the Search /
 * Shortcuts triggers in Navigation. Rendered in three contexts: the desktop
 * expanded sidebar (labelled), the desktop collapsed sidebar (icon-only), and
 * the mobile scroll row.
 *
 * The trigger NEVER calls onPageChange — it only opens the assistant panel.
 * On mobile it uses BOTH onClick and onTouchEnd (with preventDefault) so the
 * synthesized-click suppression fix is preserved (see Navigation.handleNavTouchEnd):
 * without it the synthesized click would land on whatever is under the finger
 * after the panel opens.
 *
 * Badge accessibility: when count > 0 the button's accessible name announces
 * the count (`Assistant, N suggestions`) and the visible number is aria-hidden
 * so assistive tech reads the label once, not twice.
 */
export function AssistantTrigger({ count, open, variant, buttonClassName }: AssistantTriggerProps) {
  const hasCount = count > 0;
  const ariaLabel = hasCount ? `Assistant, ${count} suggestions` : 'Assistant';
  const isMobile = variant === 'mobile';
  const collapsed = variant === 'collapsed';

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => open()}
      onTouchEnd={isMobile ? (e) => { e.preventDefault(); open(); } : undefined}
      aria-label={ariaLabel}
      title={collapsed ? 'Assistant' : undefined}
      data-section="assistant"
    >
      <span className={styles.iconWrapper}>
        <Sparkles size={18} />
        {hasCount && (
          <span className={styles.countBadge} aria-hidden="true">
            {count}
          </span>
        )}
      </span>
      {!collapsed && <span>Assistant</span>}
    </button>
  );
}
