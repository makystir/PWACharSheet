import { getDoomRunesForCharacter, isDoomRuneUsedThisSession } from '../../logic/doomRunes';
import type { DoomRuneActivation } from '../../types/character';
import styles from './DoomRuneSection.module.css';

interface DoomRuneSectionProps {
  knownRunes: string[];
  doomRuneActivations: DoomRuneActivation[];
  onActivate: (runeId: string) => void;
}

export default function DoomRuneSection({
  knownRunes,
  doomRuneActivations,
  onActivate,
}: DoomRuneSectionProps) {
  const doomRunes = getDoomRunesForCharacter(knownRunes);

  if (doomRunes.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.lockedContainer}>
          <p className={styles.lockedMessage}>
            Doom Runes are locked. You must learn a Master Rune before Doom Runes become available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.cardList}>
        {doomRunes.map((rune) => {
          const used = isDoomRuneUsedThisSession(rune.id, doomRuneActivations);

          return (
            <div key={rune.id} className={styles.card}>
              <h4 className={styles.cardName}>{rune.name}</h4>
              <p className={styles.cardEffect}>{rune.effects[0].description}</p>
              <div className={styles.cardMeta}>
                <span className={styles.metaLabel}>Hard (-20) Runesmithing Test</span>
                <span className={styles.metaLabel}>Requires access to an Anvil of Doom</span>
              </div>
              <button
                type="button"
                className={styles.activateBtn}
                disabled={used}
                onClick={() => onActivate(rune.id)}
              >
                {used ? 'Used this session' : 'Activate'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
