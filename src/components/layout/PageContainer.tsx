import type { CSSProperties, ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

const containerStyle: CSSProperties = {
  flex: 1,
  padding: '24px',
  maxWidth: '1000px',
  width: '100%',
  margin: '0 auto',
  overflowY: 'auto',
};

export function PageContainer({ children }: PageContainerProps) {
  return <main style={containerStyle}>{children}</main>;
}
