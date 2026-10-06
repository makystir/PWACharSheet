import { useMemo, useRef, useState, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import type { Character } from '../../types/character';
import { buildPortraitPrompt } from '../../logic/portrait-prompt';
import type { PortraitFraming } from '../../logic/portrait-prompt';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ModalOverlay } from './ModalOverlay';
import styles from './PortraitPromptDialog.module.css';

interface PortraitPromptDialogProps {
  character: Character;
  onClose: () => void;
}

/** Does this character have any companions or hirelings to include? */
function hasRetinue(character: Character): boolean {
  return (character.companions?.length ?? 0) > 0 || (character.hirelings?.length ?? 0) > 0;
}

/**
 * Modal that builds a copy-pasteable AI image-generation prompt for a WFRP4e
 * character portrait, from the character's personal details, gear, and weapons.
 * Players can toggle whether their retinue (companions + hirelings) is included.
 * The prompt embeds the app's portrait size/file-size requirements.
 */
export function PortraitPromptDialog({ character, onClose }: PortraitPromptDialogProps) {
  const retinueAvailable = hasRetinue(character);
  const [includeRetinue, setIncludeRetinue] = useState(false);
  const [framing, setFraming] = useState<PortraitFraming>('portrait');
  const [copied, setCopied] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef, true);

  const prompt = useMemo(
    () =>
      buildPortraitPrompt(character, {
        includeRetinue: includeRetinue && retinueAvailable,
        framing,
      }),
    [character, includeRetinue, retinueAvailable, framing],
  );

  // Close on Escape.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Reset the "Copied" confirmation shortly after it shows.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); selection fallback.
      const el = document.getElementById('portrait-prompt-text') as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  return (
    <ModalOverlay
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Generate portrait prompt"
      onClick={onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Generate Portrait Prompt</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <p className={styles.hint}>
          Copy this prompt into an AI image generator to create a portrait for your character.
        </p>

        <div className={styles.framingGroup} role="radiogroup" aria-label="Framing">
          <span className={styles.framingLabel}>Framing</span>
          <div className={styles.framingOptions}>
            <button
              type="button"
              role="radio"
              aria-checked={framing === 'portrait'}
              className={framing === 'portrait' ? styles.framingBtnActive : styles.framingBtn}
              onClick={() => setFraming('portrait')}
            >
              Portrait (bust)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={framing === 'fullBody'}
              className={framing === 'fullBody' ? styles.framingBtnActive : styles.framingBtn}
              onClick={() => setFraming('fullBody')}
            >
              Full body
            </button>
          </div>
        </div>

        <label className={styles.retinueToggle}>
          <input
            type="checkbox"
            checked={includeRetinue}
            disabled={!retinueAvailable}
            onChange={(e) => setIncludeRetinue(e.target.checked)}
          />
          <span>
            Include retinue (companions &amp; hirelings)
            {!retinueAvailable && <em className={styles.noRetinue}> — none to include</em>}
          </span>
        </label>

        <textarea
          id="portrait-prompt-text"
          className={styles.promptText}
          value={prompt}
          readOnly
          rows={14}
          aria-label="Generated portrait prompt"
        />

        <div className={styles.actions}>
          <button type="button" className={styles.copyBtn} onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}