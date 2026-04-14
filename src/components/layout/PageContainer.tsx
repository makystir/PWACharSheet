import { useState, useEffect, useRef, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';

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

const scrollBtnStyle: CSSProperties = {
  position: 'fixed',
  bottom: '80px',
  right: '16px',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--accent-gold)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99,
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  transition: 'opacity 0.2s',
};

export function PageContainer({ children }: PageContainerProps) {
  const ref = useRef<HTMLElement>(null);
  const [showScroll, setShowScroll] = useState(false);

  const handleScroll = useCallback(() => {
    if (ref.current) {
      setShowScroll(ref.current.scrollTop > 300);
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    ref.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main ref={ref} style={containerStyle}>
      {children}
      {showScroll && (
        <button
          type="button"
          onClick={scrollToTop}
          style={scrollBtnStyle}
          aria-label="Scroll to top"
          className="scroll-to-top"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </main>
  );
}
