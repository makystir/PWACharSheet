import { useState } from 'react';
import type { CSSProperties } from 'react';
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

const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle: CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' };
const tdStyle: CSSProperties = { padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const diceBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1, opacity: 0.7 };

const manageBtn: CSSProperties = {
  padding: '6px 14px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '12px',
};

const channelProgressStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--accent-gold)',
  fontFamily: 'var(--font-heading)',
};

const cancelChannelBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--danger)',
  cursor: 'pointer',
  fontSize: '13px',
  padding: '2px 4px',
};

const pettyRowStyle: CSSProperties = {
  opacity: 0.65,
};

const checkboxLabel: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 0',
  fontSize: '13px',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};

const manageSectionStyle: CSSProperties = {
  marginTop: '12px',
  padding: '12px',
  background: 'var(--bg-tertiary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
};

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
              style={manageBtn}
              onClick={() => setShowManageSpells(!showManageSpells)}
            >
              {showManageSpells ? 'Hide' : 'Manage Spells'}
            </button>
          }
        />

        {/* Memorized spells list */}
        {memorizedSpells.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
            No spells memorized
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>CN</th>
                <th style={thStyle}>Range</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Effect</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {memorizedSpells.map((spell) => {
                const isPetty = spell.cn === '0';
                const cp = getChannellingProgress(spell.name);
                const cn = parseInt(spell.cn, 10) || 0;
                const isReady = cp != null && cp.accumulatedSL >= cn && cn > 0;

                return (
                  <tr key={spell.name} style={isPetty ? pettyRowStyle : undefined}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: isReady ? 'var(--success)' : 'var(--parchment)' }}>
                        {spell.name}
                      </span>
                    </td>
                    <td style={tdStyle}>{spell.cn}</td>
                    <td style={tdStyle}>{spell.range}</td>
                    <td style={tdStyle}>{spell.target}</td>
                    <td style={tdStyle}>{spell.duration}</td>
                    <td style={{ ...tdStyle, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {spell.effect}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* Cast button */}
                        <button
                          type="button"
                          style={diceBtn}
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
                            style={diceBtn}
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
                            <span style={channelProgressStyle}>
                              {cp.accumulatedSL} / {cn}
                            </span>
                            <button
                              type="button"
                              style={cancelChannelBtn}
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
                          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase' }}>
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
          <div style={manageSectionStyle}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
              Toggle Memorized Spells
            </div>
            {character.spells.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                No spells on character sheet
              </div>
            ) : (
              character.spells.map((spell, i) => (
                <label key={spell.name + i} style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={spell.memorized === true}
                    onChange={() => toggleMemorized(i)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: spell.memorized ? 'var(--parchment)' : 'var(--text-muted)' }}>
                    {spell.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
