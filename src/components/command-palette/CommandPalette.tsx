import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useCommandPaletteContext } from './CommandPaletteContext';
import { buildSearchIndex, searchEntities } from './searchIndex';
import type { SearchResultEntry, GroupedResults } from './searchIndex';
import { SearchInput } from './SearchInput';
import { ResultsList } from './ResultsList';
import { DetailView } from './DetailView';
import styles from './CommandPalette.module.css';

// ─── State Machine ───────────────────────────────────────────────────────────

type PaletteView = 'results' | 'detail';

interface PaletteState {
  view: PaletteView;
  query: string;
  selectedIndex: number;
  selectedEntity: SearchResultEntry | null;
  scrollPosition: number;
}

type PaletteAction =
  | { type: 'OPEN' }
  | { type: 'TYPE'; query: string }
  | { type: 'ARROW_DOWN'; maxIndex: number }
  | { type: 'ARROW_UP' }
  | { type: 'SELECT_RESULT'; entity: SearchResultEntry; scrollPosition: number }
  | { type: 'BACK'; scrollPosition: number }
  | { type: 'CLOSE' };

const INITIAL_STATE: PaletteState = {
  view: 'results',
  query: '',
  selectedIndex: 0,
  selectedEntity: null,
  scrollPosition: 0,
};

function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'OPEN':
      return { ...INITIAL_STATE };
    case 'TYPE':
      return { ...state, query: action.query, selectedIndex: 0 };
    case 'ARROW_DOWN':
      return {
        ...state,
        selectedIndex: Math.min(state.selectedIndex + 1, action.maxIndex),
      };
    case 'ARROW_UP':
      return {
        ...state,
        selectedIndex: Math.max(state.selectedIndex - 1, 0),
      };
    case 'SELECT_RESULT':
      return {
        ...state,
        view: 'detail',
        selectedEntity: action.entity,
        scrollPosition: action.scrollPosition,
      };
    case 'BACK':
      return {
        ...state,
        view: 'results',
        selectedEntity: null,
      };
    case 'CLOSE':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { isOpen, close } = useCommandPaletteContext();
  const [state, dispatch] = useReducer(paletteReducer, INITIAL_STATE);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Build search index once
  const searchIndex = useMemo(() => buildSearchIndex(), []);

  // Compute results from query
  const results: GroupedResults = useMemo(() => {
    if (!state.query.trim()) {
      return { groups: [], totalCount: 0 };
    }
    return searchEntities(searchIndex, state.query);
  }, [searchIndex, state.query]);

  // Flatten results for index-based navigation
  const flatResults: SearchResultEntry[] = useMemo(() => {
    return results.groups.flatMap((g) => g.entries);
  }, [results]);

  // ── Open/Close Effects ──

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      dispatch({ type: 'OPEN' });
    }
  }, [isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Use a small delay to ensure portal is rendered
      const timer = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen]);

  // Restore focus on close
  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE' });
    close();
    // Restore focus to previously focused element
    requestAnimationFrame(() => {
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      } else {
        document.body.focus();
      }
    });
  }, [close]);

  // ── Backdrop click ──

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // ── Keyboard navigation ──

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.view === 'detail') {
          dispatch({ type: 'BACK', scrollPosition: state.scrollPosition });
        } else {
          handleClose();
        }
        e.preventDefault();
        return;
      }

      if (state.view === 'results') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          dispatch({ type: 'ARROW_DOWN', maxIndex: Math.max(0, flatResults.length - 1) });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          dispatch({ type: 'ARROW_UP' });
        } else if (e.key === 'Enter' && flatResults.length > 0) {
          e.preventDefault();
          const selected = flatResults[state.selectedIndex];
          if (selected) {
            const scrollPos = bodyRef.current?.scrollTop ?? 0;
            dispatch({ type: 'SELECT_RESULT', entity: selected, scrollPosition: scrollPos });
          }
        }
      } else if (state.view === 'detail') {
        if (e.key === 'Backspace') {
          e.preventDefault();
          dispatch({ type: 'BACK', scrollPosition: state.scrollPosition });
        }
      }
    },
    [state.view, state.selectedIndex, state.scrollPosition, flatResults, handleClose]
  );

  // ── Focus trap ──

  const handleFocusTrap = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    []
  );

  // Combined key handler
  const handleAllKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      handleFocusTrap(e);
      if (!e.defaultPrevented) {
        handleKeyDown(e);
      }
    },
    [handleFocusTrap, handleKeyDown]
  );

  // ── Scroll selected item into view ──

  useEffect(() => {
    if (state.view === 'results' && flatResults.length > 0) {
      const el = document.getElementById(`palette-option-${state.selectedIndex}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [state.selectedIndex, state.view, flatResults.length]);

  // ── Restore scroll position when going back to results ──

  useEffect(() => {
    if (state.view === 'results' && state.scrollPosition > 0 && bodyRef.current) {
      bodyRef.current.scrollTop = state.scrollPosition;
    }
  }, [state.view, state.scrollPosition]);

  // ── Result click handler ──

  const handleResultClick = useCallback(
    (entry: SearchResultEntry) => {
      const scrollPos = bodyRef.current?.scrollTop ?? 0;
      dispatch({ type: 'SELECT_RESULT', entity: entry, scrollPosition: scrollPos });
    },
    []
  );

  // ── Back handler ──

  const handleBack = useCallback(() => {
    dispatch({ type: 'BACK', scrollPosition: state.scrollPosition });
    // Refocus input after going back
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [state.scrollPosition]);

  // ── Don't render if closed ──

  if (!isOpen) return null;

  // ── Render ──

  const modalContent = (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="command-palette-backdrop"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Search game reference"
        onKeyDown={handleAllKeyDown}
      >
        {/* Header with search input and close button */}
        <div className={styles.header}>
          <SearchInput
            value={state.query}
            onChange={(query) => dispatch({ type: 'TYPE', query })}
            inputRef={inputRef}
            activeDescendantId={
              flatResults.length > 0 && state.view === 'results'
                ? `palette-option-${state.selectedIndex}`
                : undefined
            }
          />
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body: results or detail */}
        <div ref={bodyRef} className={styles.body}>
          {state.view === 'results' && (
            <>
              {state.query.trim() === '' && (
                <div className={styles.emptyState}>
                  Type to search game reference data
                </div>
              )}
              {state.query.trim() !== '' && results.totalCount === 0 && (
                <div className={styles.emptyState}>
                  No results found
                </div>
              )}
              {results.totalCount > 0 && (
                <ResultsList
                  results={results}
                  selectedIndex={state.selectedIndex}
                  onSelect={handleResultClick}
                />
              )}
            </>
          )}
          {state.view === 'detail' && state.selectedEntity && (
            <DetailView entity={state.selectedEntity} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
