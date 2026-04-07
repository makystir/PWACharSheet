import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';

interface AddButtonProps {
  label?: string;
  onClick: () => void;
  style?: CSSProperties;
}

const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  background: 'var(--bg-tertiary)',
  color: 'var(--accent-gold)',
  border: '1px solid var(--accent-gold-dark)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'background 0.1s',
};

export function AddButton({ label = 'Add', onClick, style }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...buttonStyle, ...style }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-gold-dark)'; (e.currentTarget as HTMLElement).style.color = 'var(--bg-primary)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; }}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}
