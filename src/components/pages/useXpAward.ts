import { useCallback, useState } from 'react';
import type { Character } from '../../types/character';
import { awardXp, removeXpAward, formatXpFeedback } from '../../logic/advancement';

/**
 * Manages the "award / remove XP" workflow and the transient over-spend
 * feedback (shake + toast) on the Advancement page. Extracted from
 * AdvancementPage: it only needs `updateCharacter`, so pulling it into a hook
 * keeps a cohesive slice of state + handlers out of the page body.
 *
 * `triggerXpFeedback` is returned so the various advance handlers (characteristic
 * / skill / talent) can flash the "not enough XP" feedback when a purchase is
 * unaffordable.
 */
export interface UseXpAwardResult {
  xpAwardAmount: string;
  setXpAwardAmount: (v: string) => void;
  xpAwardReason: string;
  setXpAwardReason: (v: string) => void;
  /** Transient over-spend message for the Toast, or null. */
  xpToastMessage: string | null;
  /** Whether the XP display should play its shake animation. */
  xpShake: boolean;
  /** Flash the over-spend feedback (shake + toast) for an unaffordable cost. */
  triggerXpFeedback: (cost: number, available: number) => void;
  /** Grant the entered XP amount as a logged/audited award. */
  handleAwardXp: () => void;
  /** Remove a previously logged XP award by its timestamp. */
  handleRemoveXpAward: (timestamp: number) => void;
}

export function useXpAward(
  updateCharacter: (mutator: (char: Character) => Character) => void,
): UseXpAwardResult {
  const [xpAwardAmount, setXpAwardAmount] = useState('');
  const [xpAwardReason, setXpAwardReason] = useState('');
  const [xpToastMessage, setXpToastMessage] = useState<string | null>(null);
  const [xpShake, setXpShake] = useState(false);

  const triggerXpFeedback = useCallback((cost: number, available: number) => {
    // Reset to null first so repeated identical messages still trigger the Toast.
    setXpToastMessage(null);
    requestAnimationFrame(() => setXpToastMessage(formatXpFeedback(cost, available)));
    setXpShake(true);
    setTimeout(() => setXpShake(false), 400);
  }, []);

  // Award XP: logged/audited grant instead of directly editing the XP fields.
  const handleAwardXp = () => {
    const amount = Number(xpAwardAmount);
    if (!Number.isFinite(amount) || amount === 0) return;
    updateCharacter((c) => awardXp(c, amount, xpAwardReason));
    setXpAwardAmount('');
    setXpAwardReason('');
  };

  const handleRemoveXpAward = (timestamp: number) => {
    updateCharacter((c) => removeXpAward(c, timestamp));
  };

  return {
    xpAwardAmount,
    setXpAwardAmount,
    xpAwardReason,
    setXpAwardReason,
    xpToastMessage,
    xpShake,
    triggerXpFeedback,
    handleAwardXp,
    handleRemoveXpAward,
  };
}
