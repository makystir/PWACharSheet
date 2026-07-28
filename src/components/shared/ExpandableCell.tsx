import { useState } from 'react';
import styles from './ExpandableCell.module.css';

interface ExpandableCellProps {
  text: string;
  maxWidth?: string;  // CSS max-width, defaults to responsive value
}

/**
 * Renders text with CSS truncation. Click toggles between truncated and expanded state.
 * Uses aria-expanded for accessibility.
 */
export function ExpandableCell({ text, maxWidth }: ExpandableCellProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      className={`${styles.cell} ${expanded ? styles.expanded : styles.truncated}`}
      style={{ maxWidth: expanded ? 'none' : maxWidth }}
      onClick={() => setExpanded(!expanded)}
      aria-expanded={expanded}
      title={expanded ? 'Click to collapse' : text}
    >
      {text}
    </button>
  );
}
