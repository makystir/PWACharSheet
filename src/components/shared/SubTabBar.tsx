import { useRef, useEffect, useCallback, useState } from 'react';
import { Pencil, Check, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './SubTabBar.module.css';

export interface SubTabBarProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Optional edit mode props — when omitted, component behaves as before */
  editMode?: {
    isActive: boolean;
    onToggle: () => void;
    onMoveLeft: (index: number) => void;
    onMoveRight: (index: number) => void;
    onReset: () => void;
    isDefaultOrder: boolean;
    saveError: boolean;
  };
}

/** Describes a pending focus target after a tab move */
interface FocusTarget {
  tabId: string;
  direction: 'left' | 'right';
}

export function SubTabBar({ tabs, activeTab, onTabChange, editMode }: SubTabBarProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<FocusTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // After render, apply pending focus to the correct arrow button
  useEffect(() => {
    if (pendingFocusRef.current && tablistRef.current) {
      const { tabId, direction } = pendingFocusRef.current;
      const selector = `[data-tab-id="${tabId}"][data-direction="${direction}"]`;
      const button = tablistRef.current.querySelector<HTMLButtonElement>(selector);
      if (button) {
        button.focus();
      }
      pendingFocusRef.current = null;
    }
  });

  const handleMoveLeft = useCallback((index: number, tabId: string) => {
    if (editMode && index > 0) {
      const tab = tabs[index];
      pendingFocusRef.current = { tabId, direction: 'left' };
      editMode.onMoveLeft(index);
      // Announce new position (moving left means new position = index, 1-based)
      setAnnouncement(`${tab.label} tab, position ${index} of ${tabs.length}`);
    }
  }, [editMode, tabs]);

  const handleMoveRight = useCallback((index: number, tabId: string) => {
    if (editMode && index < tabs.length - 1) {
      const tab = tabs[index];
      pendingFocusRef.current = { tabId, direction: 'right' };
      editMode.onMoveRight(index);
      // Announce new position (moving right means new position = index + 2, 1-based)
      setAnnouncement(`${tab.label} tab, position ${index + 2} of ${tabs.length}`);
    }
  }, [editMode, tabs]);

  const handleReset = useCallback(() => {
    if (editMode) {
      editMode.onReset();
      setAnnouncement('Tab order reset to default');
    }
  }, [editMode]);

  const renderTablist = () => {
    if (editMode?.isActive) {
      return (
        <div className={styles.subTabBar} role="tablist" ref={tablistRef}>
          {tabs.map((tab, index) => {
            const isFirst = index === 0;
            const isLast = index === tabs.length - 1;

            return (
              <div className={styles.tabEditMode} key={tab.id} aria-selected={tab.id === activeTab}>
                <button
                  type="button"
                  className={isFirst ? styles.arrowBtnDisabled : styles.arrowBtn}
                  aria-label={`Move ${tab.label} tab left`}
                  aria-disabled={isFirst}
                  data-tab-id={tab.id}
                  data-direction="left"
                  onClick={() => {
                    if (!isFirst) {
                      handleMoveLeft(index, tab.id);
                    }
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTab}
                  className={styles.tabLabel}
                  onClick={() => {
                    // Suppress navigation in edit mode
                  }}
                >
                  {tab.label}
                </button>
                <button
                  type="button"
                  className={isLast ? styles.arrowBtnDisabled : styles.arrowBtn}
                  aria-label={`Move ${tab.label} tab right`}
                  aria-disabled={isLast}
                  data-tab-id={tab.id}
                  data-direction="right"
                  onClick={() => {
                    if (!isLast) {
                      handleMoveRight(index, tab.id);
                    }
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={styles.subTabBar} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={tab.id === activeTab ? styles.tabActive : styles.tab}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  if (!editMode) {
    return renderTablist();
  }

  return (
    <div className={styles.editModeContainer}>
      {renderTablist()}
      <div className={styles.editControls}>
        <button
          type="button"
          className={styles.editToggleBtn}
          aria-label={editMode.isActive ? 'Done editing tab order' : 'Edit tab order'}
          onClick={editMode.onToggle}
        >
          {editMode.isActive ? <Check size={18} /> : <Pencil size={18} />}
        </button>
        <button
          type="button"
          className={styles.resetBtn}
          aria-label="Reset tab order"
          disabled={editMode.isDefaultOrder}
          onClick={handleReset}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      <div aria-live="polite" className={styles.srOnly}>
        {announcement}
      </div>
    </div>
  );
}
