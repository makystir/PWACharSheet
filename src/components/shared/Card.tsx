import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
}

const cardStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
  boxShadow: '0 2px 8px var(--shadow)',
};

export function Card({ children, style }: CardProps) {
  return (
    <div style={{ ...cardStyle, ...style }}>
      {children}
    </div>
  );
}
