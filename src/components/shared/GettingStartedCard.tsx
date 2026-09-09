import { useState, useCallback } from 'react';
import { Sparkles, X, User, Dices, Swords } from 'lucide-react';
import { Card } from './Card';
import styles from './GettingStartedCard.module.css';

/**
 * Getting-Started onboarding card (spec: ux-audit-improvements, Req 5).
 *
 * A dismissible, non-modal card shown only for a brand-new character. Offers
 * concise orientation and quick links to set up the character, roll a test, and
 * open Combat. Dismissal is persisted per-character in localStorage so the card
 * is never shown again once dismissed or once the character is no longer
 * brand-new (Req 5.3, 5.5).
 */

const STORAGE_PREFIX = 'wfrp-getting-started-dismissed-';

/**
 * "Brand-new" definition (design decision, Req 5.1): a character with no XP
 * spent and no career selected — i.e. a fresh quick-start character. Imported or
 * advanced characters are excluded.
 */
export function isBrandNewCharacter(xpSpent: number, career: string): boolean {
  return xpSpent === 0 && career === '';
}

function isDismissed(characterId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${characterId}`) === 'true';
  } catch {
    return false;
  }
}

function persistDismissal(characterId: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${characterId}`, 'true');
  } catch {
    // Graceful fallback — localStorage unavailable or quota exceeded
  }
}

export interface GettingStartedCardProps {
  characterId: string;
  xpSpent: number;
  career: string;
  /** Focus the identity/setup area to set characteristics and career (Req 5.2a). */
  onSetup: () => void;
  /** Open a test roll (Req 5.2b). */
  onRollTest: () => void;
  /** Navigate to the Combat page (Req 5.2c). */
  onOpenCombat: () => void;
}

export function GettingStartedCard({
  characterId,
  xpSpent,
  career,
  onSetup,
  onRollTest,
  onOpenCombat,
}: GettingStartedCardProps) {
  // Only brand-new characters that have not been dismissed for this id see the card.
  const [dismissed, setDismissed] = useState(() => isDismissed(characterId));

  const dismiss = useCallback(() => {
    persistDismissal(characterId);
    setDismissed(true);
  }, [characterId]);

  // Never show once dismissed or when the character is no longer brand-new (Req 5.3, 5.5).
  if (dismissed || !isBrandNewCharacter(xpSpent, career)) {
    return null;
  }

  return (
    <Card>
      {/* role="note" keeps the card non-modal — it never traps focus (Req 5.4). */}
      <section className={styles.card} role="note" aria-label="Getting started">
        <div className={styles.header}>
          <span className={styles.titleGroup}>
            <Sparkles size={18} className={styles.titleIcon} aria-hidden="true" />
            <h2 className={styles.title}>Getting started</h2>
          </span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={dismiss}
            aria-label="Dismiss getting started"
            title="Dismiss"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className={styles.intro}>
          Welcome to your new character. Set your characteristics and career, try
          a test roll, then jump into combat when you are ready.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={onSetup}>
            <User size={18} aria-hidden="true" />
            <span>Set characteristics &amp; career</span>
          </button>
          <button type="button" className={styles.action} onClick={onRollTest}>
            <Dices size={18} aria-hidden="true" />
            <span>Roll a test</span>
          </button>
          <button type="button" className={styles.action} onClick={onOpenCombat}>
            <Swords size={18} aria-hidden="true" />
            <span>Open Combat</span>
          </button>
        </div>
      </section>
    </Card>
  );
}
