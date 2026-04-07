import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
  borderBottom: '2px solid var(--border)',
  borderImage: 'linear-gradient(to right, var(--accent-gold-dark), var(--border)) 1',
  paddingBottom: '8px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '18px',
  color: 'var(--parchment)',
  flex: 1,
  margin: 0,
};

export function SectionHeader({ icon: Icon, title, action }: SectionHeaderProps) {
  return (
    <div style={headerStyle}>
      <Icon size={20} color="var(--accent-gold)" />
      <h3 style={titleStyle}>{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}
