import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  children: ReactNode;
}

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
    <main ref={ref} className={styles.container}>
      {children}
      {showScroll && (
        <button
          type="button"
          onClick={scrollToTop}
          className={styles.scrollBtn}
          aria-label="Scroll to top"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </main>
  );
}
