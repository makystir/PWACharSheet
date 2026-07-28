import styles from './QuickActionBar.module.css';
import pressableStyles from '../../styles/micro-interactions.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuickAction {
  id: string;
  skillName: string;
  icon?: string;
}

export interface QuickActionBarProps {
  actions: QuickAction[];
  onTrigger: (action: QuickAction) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ACTIONS = 6;

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickActionBar({ actions, onTrigger }: QuickActionBarProps) {
  // Hide when no actions configured (Req 21.5)
  if (actions.length === 0) {
    return null;
  }

  // Cap at max 6 actions (Req 21.3)
  const visibleActions = actions.slice(0, MAX_ACTIONS);

  return (
    <div className={styles.quickActionBar} data-testid="quick-action-bar">
      {visibleActions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`${styles.actionButton} ${pressableStyles.pressable}`}
          onClick={() => onTrigger(action)}
          aria-label={`Quick roll ${action.skillName}`}
        >
          {action.icon && <span className={styles.actionIcon}>{action.icon}</span>}
          <span className={styles.actionLabel}>{action.skillName}</span>
        </button>
      ))}
    </div>
  );
}
