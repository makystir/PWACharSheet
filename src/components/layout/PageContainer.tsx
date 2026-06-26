import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ChevronUp } from 'lucide-react';
import { CharacterNameHeader } from '../shared/CharacterNameHeader';
import { OfflineIndicator } from '../shared/OfflineIndicator';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  children: ReactNode;
  characterName?: string;
  onOpenCharacterSheet?: () => void;
  headerRef?: RefObject<HTMLButtonElement | null>;
}

export function PageContainer({ children, characterName, onOpenCharacterSheet, headerRef }: PageContainerProps) {
  const ref = useRef<HTMLElement>(null);
  const [showScroll, setShowScroll] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

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
    <main ref={ref} id="main-content" className={styles.container}>
      <div className={styles.offlineWrapper}>
        <OfflineIndicator />
      </div>
      {isMobile && characterName && onOpenCharacterSheet && (
        <CharacterNameHeader
          characterName={characterName}
          onOpen={onOpenCharacterSheet}
          ref={headerRef}
        />
      )}
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
