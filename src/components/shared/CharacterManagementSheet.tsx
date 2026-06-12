import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { ConfirmDialog } from './ConfirmDialog';
import type { CharacterSummary } from '../../types/character';
import styles from './CharacterManagementSheet.module.css';

interface CharacterCardProps {
  character: CharacterSummary;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSwitch: () => void;
  onRename: (newName: string) => void;
  onRenameStart: () => void;
  onRenameChange: (value: string) => void;
  onRenameCancel: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  announce: (message: string) => void;
}

function CharacterCard({
  character,
  isActive,
  isRenaming,
  renameValue,
  onSwitch,
  onRename,
  onRenameStart,
  onRenameChange,
  onRenameCancel,
  onDuplicate,
  onDelete,
  announce,
}: CharacterCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameConfirm = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed.length >= 1 && trimmed.length <= 50) {
      onRename(trimmed);
      announce(`Renamed to ${trimmed}`);
    } else {
      // Empty or whitespace-only — cancel
      onRenameCancel();
    }
  }, [renameValue, onRename, onRenameCancel, announce]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRenameConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onRenameCancel();
      }
    },
    [handleRenameConfirm, onRenameCancel]
  );

  const handleBlur = useCallback(() => {
    handleRenameConfirm();
  }, [handleRenameConfirm]);

  return (
    <div
      role="listitem"
      className={`${styles.characterCard}${isActive ? ` ${styles.characterCardActive}` : ''}`}
    >
      {isRenaming ? (
        <div className={styles.renameInputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.renameInput}
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            maxLength={50}
            aria-label="Rename character"
            style={{ fontSize: '16px' }}
            autoFocus
          />
        </div>
      ) : (
        <button
          className={styles.characterNameButton}
          onClick={onSwitch}
          type="button"
          aria-label={isActive ? `${character.name} (active)` : `Switch to ${character.name}`}
        >
          <span className={styles.characterName}>{character.name}</span>
          <span className={styles.characterCareer}>{character.career}</span>
        </button>
      )}
      <div className={styles.actionButtons}>
        <button
          className={styles.actionButton}
          onClick={onRenameStart}
          type="button"
          aria-label={`Rename ${character.name}`}
        >
          <Pencil size={18} />
        </button>
        <button
          className={styles.actionButton}
          onClick={onDuplicate}
          type="button"
          aria-label={`Duplicate ${character.name}`}
        >
          <Copy size={18} />
        </button>
        <button
          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
          onClick={onDelete}
          type="button"
          aria-label={`Delete ${character.name}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

interface CharacterManagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterSummary[];
  activeId: string;
  onSwitchCharacter: (id: string) => void;
  onCreateCharacter: () => void;
  onRenameCharacter: (id: string, name: string) => void;
  onDuplicateCharacter: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function CharacterManagementSheet({
  isOpen,
  onClose,
  characters,
  activeId,
  onSwitchCharacter,
  onCreateCharacter,
  onRenameCharacter,
  onDuplicateCharacter,
  onDeleteCharacter,
  triggerRef,
}: CharacterManagementSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rename state (sheet-level per design doc)
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation state
  const [deletingCharacter, setDeletingCharacter] = useState<CharacterSummary | null>(null);

  // Focus management after deletion: stores the index to focus after re-render
  const focusAfterDeleteTarget = useRef<'next' | 'prev' | 'newCharButton' | null>(null);
  const focusAfterDeleteIndex = useRef<number>(-1);
  const newCharButtonRef = useRef<HTMLButtonElement>(null);

  // Track previous character count to detect duplication (newest goes to top)
  const prevCharacterCount = useRef(characters.length);

  // Track swipe state on drag handle
  const dragStartY = useRef<number | null>(null);

  // Focus trap and scroll lock
  useFocusTrap(sheetRef, visible);
  useBodyScrollLock(visible);

  // Scroll to top when characters array grows (e.g., after duplication)
  useEffect(() => {
    if (characters.length > prevCharacterCount.current) {
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevCharacterCount.current = characters.length;
  }, [characters.length]);

  // Focus management after deletion (Requirement 9.7)
  useEffect(() => {
    if (focusAfterDeleteTarget.current === null) return;

    const target = focusAfterDeleteTarget.current;
    const targetIndex = focusAfterDeleteIndex.current;

    // Reset the ref
    focusAfterDeleteTarget.current = null;
    focusAfterDeleteIndex.current = -1;

    if (target === 'newCharButton') {
      // No cards remain — focus "New Character" button
      newCharButtonRef.current?.focus();
      return;
    }

    // Focus the card at the computed index
    const cardButtons = sheetRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="listitem"] button[class*="characterNameButton"]'
    );
    if (cardButtons && cardButtons.length > 0) {
      const idx = Math.min(targetIndex, cardButtons.length - 1);
      cardButtons[idx]?.focus();
    }
  }, [characters]);

  // Reset rename state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setRenamingId(null);
      setRenameValue('');
    }
  }, [isOpen]);

  // Handle open/close transitions
  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      // Force a reflow before applying the open class for CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else if (visible) {
      setVisible(false);
      // Wait for close animation to finish before unmounting
      const timer = setTimeout(() => {
        setAnimating(false);
        // Return focus to trigger on close
        triggerRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, visible, triggerRef]);

  // Handle Escape key
  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Don't close the sheet if we're in rename mode — let the input handle it
        if (renamingId) return;
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose, renamingId]);

  // Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Drag handle swipe-to-dismiss
  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleDragEnd = useCallback(
    (e: React.TouchEvent) => {
      if (dragStartY.current === null) return;
      const deltaY = e.changedTouches[0].clientY - dragStartY.current;
      // If swiped down more than 50px, close the sheet
      if (deltaY > 50) {
        onClose();
      }
      dragStartY.current = null;
    },
    [onClose]
  );

  // Announce helper for ARIA live region
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  // Rename handlers
  const handleRenameStart = useCallback((characterId: string, currentName: string) => {
    setRenamingId(characterId);
    setRenameValue(currentName);
  }, []);

  const handleRenameChange = useCallback((value: string) => {
    setRenameValue(value);
  }, []);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const handleRenameConfirm = useCallback(
    (characterId: string, newName: string) => {
      onRenameCharacter(characterId, newName);
      setRenamingId(null);
      setRenameValue('');
    },
    [onRenameCharacter]
  );

  // Handle duplicate: invoke callback, announce result
  const handleDuplicate = useCallback(
    (characterId: string, characterName: string) => {
      setErrorMessage(null);
      try {
        onDuplicateCharacter(characterId);
        announce(`Duplicated ${characterName}`);
      } catch {
        setErrorMessage('Could not duplicate character.');
        announce('Character duplication failed.');
      }
    },
    [onDuplicateCharacter, announce]
  );

  // Handle delete: open confirmation dialog
  const handleDeleteStart = useCallback(
    (character: CharacterSummary) => {
      setDeletingCharacter(character);
    },
    []
  );

  // Handle delete confirm: delete character, manage focus, announce result
  const handleDeleteConfirm = useCallback(() => {
    if (!deletingCharacter) return;

    // Compute the sorted list and find the index of the deleted character
    const sortedCharacters = [...characters].sort((a, b) => b.lastModified - a.lastModified);
    const deletedIndex = sortedCharacters.findIndex((c) => c.id === deletingCharacter.id);
    const remainingCount = sortedCharacters.length - 1;

    // Determine focus target after deletion
    if (remainingCount === 0) {
      focusAfterDeleteTarget.current = 'newCharButton';
      focusAfterDeleteIndex.current = -1;
    } else if (deletedIndex < remainingCount) {
      // Next card exists at same index after removal
      focusAfterDeleteTarget.current = 'next';
      focusAfterDeleteIndex.current = deletedIndex;
    } else {
      // Was last card, focus previous
      focusAfterDeleteTarget.current = 'prev';
      focusAfterDeleteIndex.current = deletedIndex - 1;
    }

    const deletedName = deletingCharacter.name;

    // Perform deletion (parent handles active character switching logic)
    onDeleteCharacter(deletingCharacter.id);

    // Clear dialog state
    setDeletingCharacter(null);

    // Announce the result
    announce(`Deleted ${deletedName}`);
  }, [deletingCharacter, characters, onDeleteCharacter, announce]);

  // Handle delete cancel: close dialog without changes
  const handleDeleteCancel = useCallback(() => {
    setDeletingCharacter(null);
  }, []);
  // Handle character switch: non-active cards switch and close, active card just closes
  const handleSwitch = useCallback(
    (characterId: string, characterName: string) => {
      setErrorMessage(null);
      const isActive = characterId === activeId;

      if (isActive) {
        // Active card tapped: close without switching
        onClose();
        return;
      }

      // Non-active card tapped: attempt switch
      const targetExists = characters.some((c) => c.id === characterId);
      if (!targetExists) {
        setErrorMessage('Could not load character. It may have been deleted.');
        announce('Character switch failed. Could not load character.');
        return;
      }

      onSwitchCharacter(characterId);
      announce(`Switched to ${characterName}`);
      onClose();
    },
    [activeId, characters, onSwitchCharacter, onClose, announce]
  );

  // Don't render anything if not animating and not open
  if (!animating && !isOpen) return null;

  const backdropClass = `${styles.backdrop}${visible ? ` ${styles.open}` : ''}`;
  const sheetClass = `${styles.sheet}${visible ? ` ${styles.open}` : ''}`;

  return createPortal(
    <div className={backdropClass} onClick={handleBackdropClick}>
      <div
        ref={sheetRef}
        className={sheetClass}
        role="dialog"
        aria-label="Character management"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.dragHandleArea}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
        >
          <div className={styles.dragHandle} />
        </div>

        <div className={styles.content} ref={contentRef}>
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              {errorMessage}
            </div>
          )}
          {characters.length === 0 ? (
            <p className={styles.emptyMessage}>No characters saved</p>
          ) : (
            <div role="list" className={styles.characterList}>
              {[...characters]
                .sort((a, b) => b.lastModified - a.lastModified)
                .map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isActive={character.id === activeId}
                    isRenaming={renamingId === character.id}
                    renameValue={renamingId === character.id ? renameValue : ''}
                    onSwitch={() => handleSwitch(character.id, character.name)}
                    onRename={(newName) => handleRenameConfirm(character.id, newName)}
                    onRenameStart={() => handleRenameStart(character.id, character.name)}
                    onRenameChange={handleRenameChange}
                    onRenameCancel={handleRenameCancel}
                    onDuplicate={() => handleDuplicate(character.id, character.name)}
                    onDelete={() => handleDeleteStart(character)}
                    announce={announce}
                  />
                ))}
            </div>
          )}
          <button
            type="button"
            className={styles.newCharacterButton}
            onClick={onCreateCharacter}
            ref={newCharButtonRef}
          >
            New Character
          </button>
        </div>

        {deletingCharacter && (
          <ConfirmDialog
            message={`Are you sure you want to delete ${deletingCharacter.name}?`}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            confirmLabel="Delete"
          />
        )}

        <div
          className={styles.liveRegion}
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          {announcement}
        </div>
      </div>
    </div>,
    document.body
  );
}
