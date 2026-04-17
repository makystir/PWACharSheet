import { useState } from 'react';
import type { Character, SpellItem } from '../../types/character';
import type { RollResult } from '../../logic/dice-roller';
import {
  computeCastingTarget,
  computeChannellingTarget,
  resolveCastingResult,
  resolveChannellingResult,
  lookupMiscast,
  type CastingResult,
  type MiscastResult,
} from '../../logic/spell-casting';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { RollDialog } from '../shared/RollDialog';
import { CastResultDisplay } from './CastResultDisplay';
import { Sparkles } from 'lucide-react';
import styles from './SpellCastingPanel.module.css';

interface SpellCastingPanelProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  addRoll?: (result: RollResult) => void;
}

interface RollDialogInfo {
  name: string;
  baseTarget: number;
  spell: SpellItem;
  isChannelling: boolean;
}

export function SpellCastingPanel({ character, update: _update, updateCharacter, addRoll }: SpellCastingPanelProps) {
  const [rollDialogState, setRollDialogState] = useState<RollDialogInfo | null>(null);
  const [castingResult, setCastingResult] = useState<CastingResult | null>(null);
  const [showManageSpells, setShowManageSpells] = useState(false);
  const [miscastResult, setMiscastResult] = useState<MiscastResult | null>(null);

  const memorizedSpells = character.spells.filter((s) => s.memorized);

  const getChannellingProgress = (spellName: string) => {
    return character.channellingProgress.find((cp) => cp.spellName === spellName);
  };

  const openCastDialog = (spell: typeof character.spells[number]) => {
    const baseTarget = computeCastingTarget(character);
    setRollDialogState({
      name: 'Language (Magick)',
      baseTarget,
      spell,
      isChannelling: false,
    });
  };

  const openChannelDialog = (spell: typeof character.spells[number]) => {
    const baseTarget = computeChannellingTarget(character);
    setRollDialogState({
      name: 'Channelling',
      baseTarget,
      spell,
      isChannelling: true,
    });
  };

  const cancelChannelling = (spellName: string) => {
    updateCharacter((c) => ({
      ...c,
      channellingProgress: c.channellingProgress.map((cp) =>
        cp.spellName === spellName ? { ...cp, accumulatedSL: 0 } : cp,
      ).filter((cp) => cp.spellName !== spellName),
    }));
  };

  const handleRollResult = (result: RollResult) => {
    if (!rollDialogState) return;
    const { spell, isChannelling } = rollDialogState;
    setRollDialogState(null);

    if (isChannelling) {
      // Channelling resolution
      const cn = parseInt(spell.cn, 10) || 0;
      const currentProgress = getChannellingProgress(spell.name)?.accumulatedSL ?? 0;
      const channelResult = resolveChannellingResult(result, currentProgress, cn);

      updateCharacter((c) => {
        const existing = c.channellingProgress.find((cp) => cp.spellName === spell.name);
        if (existing) {
          return {
            ...c,
            channellingProgress: c.channellingProgress.map((cp) =>
              cp.spellName === spell.name
                ? { ...cp, accumulatedSL: channelResult.accumulatedSL }
                : cp,
            ),
          };
        }
        return {
          ...c,
          channellingProgress: [
            ...c.channellingProgress,
            { spellName: spell.name, accumulatedSL: channelResult.accumulatedSL },
          ],
        };
      });
      addRoll?.(result);
    } else {
      // Casting resolution
      const cp = getChannellingProgress(spell.name);
      const cn = parseInt(spell.cn, 10) || 0;
      const isFullyChannelled = cp != null && cp.accumulatedSL >= cn && cn > 0;
      const options = isFullyChannelled ? { channelledCN: 0 } : undefined;

      const castResult = resolveCastingResult(result, spell, character, options);
      setCastingResult(castResult);
      addRoll?.(result);

      // Reset channelling on cast (success or failure) if was channelling
      if (isFullyChannelled) {
        updateCharacter((c) => ({
          ...c,
          channellingProgress: c.channellingProgress.filter((p) => p.spellName !== spell.name),
        }));
      }
    }
  };

  const handleCriticalChoice = (choice: 'critical_wound' | 'total_power' | 'unstoppable_force') => {
    if (!castingResult) return;

    if (choice === 'total_power') {
      const reResolved = resolveCastingResult(
        castingResult.rollResult,
        castingResult.spell,
        character,
        { totalPower: true },
      );
      setCastingResult(reResolved);
    } else if (choice === 'unstoppable_force') {
      const reResolved = resolveCastingResult(
        castingResult.rollResult,
        castingResult.spell,
        character,
        { unstoppableForce: true },
      );
      setCastingResult(reResolved);
    }
    // critical_wound: just display, no re-resolve needed
  };

  const handleMiscastRoll = (table: 'minor' | 'major') => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const entry = lookupMiscast(roll, table);
    setMiscastResult({ roll, entry });
  };

  const handleOvercastAllocated = () => {
    // Allocations are informational — just close
    setCastingResult(null);
    setMiscastResult(null);
  };

  const handleCloseCastResult = () => {
    setCastingResult(null);
    setMiscastResult(null);
  };

  const toggleMemorized = (spellIndex: number) => {
    updateCharacter((c) => ({
      ...c,
      spells: c.spells.map((s, i) =>
        i === spellIndex ? { ...s, memorized: !s.memorized } : s,
      ),
    }));
  };

  return (
    <>
      <Card>
        <SectionHeader
          icon={Sparkles}
          title="Spells & Prayers"
          action={
            <button
              type="button"
              className={styles.manageBtn}
              onClick={() => setShowManageSpells(!showManageSpells)}
            >
              {showManageSpells ? 'Hide' : 'Manage Spells'}
            </button>
          }
        />

        {/* Memorized spells list */}
        {memorizedSpells.length === 0 ? (
          <div className={styles.emptySpells}>
            No spells memorized
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>CN</th>
                <th className={styles.th}>Range</th>
                <th className={styles.th}>Target</th>
                <th className={styles.th}>Duration</th>
                <th className={styles.th}>Effect</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {memorizedSpells.map((spell) => {
                const isPetty = spell.cn === '0';
                const cp = getChannellingProgress(spell.name);
                const cn = parseInt(spell.cn, 10) || 0;
                const isReady = cp != null && cp.accumulatedSL >= cn && cn > 0;

                return (
                  <tr key={spell.name} className={isPetty ? styles.pettyRow : undefined}>
                    <td className={styles.td}>
                      <span className={isReady ? styles.spellNameReady : styles.spellNameDefault}>
                        {spell.name}
                      </span>
                    </td>
                    <td className={styles.td}>{spell.cn}</td>
                    <td className={styles.td}>{spell.range}</td>
                    <td className={styles.td}>{spell.target}</td>
                    <td className={styles.td}>{spell.duration}</td>
                    <td className={styles.effectCell}>
                      {spell.effect}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionRow}>
                        {/* Cast button */}
                        <button
                          type="button"
                          className={styles.diceBtn}
                          onClick={() => openCastDialog(spell)}
                          title={`Cast ${spell.name}`}
                          aria-label={`Cast ${spell.name}`}
                        >
                          🎲
                        </button>

                        {/* Channel button (non-Petty only) */}
                        {!isPetty && (
                          <button
                            type="button"
                            className={styles.diceBtn}
                            onClick={() => openChannelDialog(spell)}
                            title={`Channel ${spell.name}`}
                            aria-label={`Channel ${spell.name}`}
                          >
                            ⚡
                          </button>
                        )}

                        {/* Channelling progress */}
                        {cp != null && cp.accumulatedSL > 0 && (
                          <>
                            <span className={styles.channelProgress}>
                              {cp.accumulatedSL} / {cn}
                            </span>
                            <button
                              type="button"
                              className={styles.cancelChannelBtn}
                              onClick={() => cancelChannelling(spell.name)}
                              title="Cancel channelling"
                              aria-label={`Cancel channelling ${spell.name}`}
                            >
                              ✕
                            </button>
                          </>
                        )}

                        {/* Ready indicator */}
                        {isReady && (
                          <span className={styles.readyBadge}>
                            Ready
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Expandable memorization section */}
        {showManageSpells && (
          <div className={styles.manageSection}>
            <div className={styles.manageSectionTitle}>
              Toggle Memorized Spells
            </div>
            {character.spells.length === 0 ? (
              <div className={styles.noSpells}>
                No spells on character sheet
              </div>
            ) : (
              character.spells.map((spell, i) => (
                <label key={spell.name + i} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={spell.memorized === true}
                    onChange={() => toggleMemorized(i)}
                    className={styles.checkboxInput}
                  />
                  <span className={spell.memorized ? styles.spellMemorized : styles.spellNotMemorized}>
                    {spell.name}
                  </span>
                  <span className={styles.spellCn}>
                    (CN {spell.cn})
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Roll Dialog */}
      {rollDialogState && (
        <RollDialog
          skillOrCharName={rollDialogState.name}
          baseTarget={rollDialogState.baseTarget}
          onRoll={handleRollResult}
          onClose={() => setRollDialogState(null)}
        />
      )}

      {/* Cast Result Display */}
      {castingResult && (
        <CastResultDisplay
          castingResult={castingResult}
          character={character}
          miscastResult={miscastResult}
          onCriticalChoice={handleCriticalChoice}
          onMiscastRoll={handleMiscastRoll}
          onOvercastAllocated={handleOvercastAllocated}
          onClose={handleCloseCastResult}
        />
      )}
    </>
  );
}
