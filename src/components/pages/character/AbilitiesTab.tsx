import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Character, CharacteristicKey, Skill, FieldPath, FieldValue, ProtectionItem, EngineeringItem } from '../../../types/character';
import { Card } from '../../shared/Card';
import { SectionHeader } from '../../shared/SectionHeader';
import { EditableField } from '../../shared/EditableField';
import { EmptyState } from '../../shared/EmptyState';
import { SkillFilter } from '../../shared/SkillFilter';
import { BookOpen, Sparkles, Wand2, Hammer, Lock, ChevronDown, ChevronRight, ChevronsUpDown, Plus } from 'lucide-react';
import RunePanel from '../../runes/RunePanel';
import { filterSkills } from '../../../logic/skill-filter';
import { getCareerSkills } from '../../../logic/careers';
import { inGroup, isPlaceholderName } from '../../../logic/grouped-names';
import { resolveSkillTooltip, resolveTalentTooltip } from '../../../logic/tooltip-content';
import { getRuneById } from '../../../logic/runes';
import { RUNE_CATALOGUE } from '../../../data/runes';
import { getRestrictedRunes, shouldApplyDeityFilter, isHighPriestLevel } from '../../../logic/priestRunes';
import { activateRuneOfForging, resetForgingCharges, calculateForgingCharges } from '../../../logic/engineeringRunes';
import { activateDoomRune } from '../../../logic/doomRunes';
import { CHAR_FULL_NAMES } from '../characterConstants';
import { SheetInfoButton, type SheetTooltipState } from '../SheetInfoButton';
import { TooltipTriggerCell } from '../../shared/TooltipTriggerCell';
import type { BreakdownTooltipState } from '../CharacterBreakdownTooltips';
import type { DeleteTarget, useCharacterEntities } from '../useCharacterEntities';
// Import the SAME stylesheet as the CharacterPage shell so class names stay
// byte-identical after extraction (spec: character-page-decomposition, Req 3.3).
import styles from '../CharacterPage.module.css';

/** A placeholder row ("Language (Any)") whose specialisation is being chosen. */
export interface SpecTarget {
  type: 'aSkill' | 'talent';
  index: number;
}

interface AbilitiesTabProps {
  character: Character;
  /** Typed single-field update, unchanged from CharacterPageProps (Req 6.1, 6.2). */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /** Skill-filter state (search + trained-only toggle) — Lifted_State in the shell. */
  skillSearchText: string;
  setSkillSearchText: (text: string) => void;
  skillTrainedOnly: boolean;
  onTrainedOnlyChange: (enabled: boolean) => void;
  /**
   * Names of the character's skills that count as career skills at the current
   * career level (highlighting). Grouped entries are already resolved, so
   * "Language (Bretonnian)" is in the set when the career lists "Language (Any)".
   */
  careerSkillSet: Set<string>;
  /**
   * Single-tooltip state owned by the shell (Lifted_State — Req 5.1, 5.4):
   * the skill/talent info tooltip and the skill-total CB breakdown tooltip.
   */
  tooltip: SheetTooltipState | null;
  setTooltip: Dispatch<SetStateAction<SheetTooltipState | null>>;
  breakdownTooltip: BreakdownTooltipState;
  openBreakdownTooltip: (state: NonNullable<BreakdownTooltipState>) => void;
  closeBreakdownTooltip: () => void;
  /** Set of expanded spell row indices (Lifted_State in the shell). */
  expandedSpells: Set<number>;
  /** The `useCharacterEntities` result (CRUD handlers), injected per Req 5.3. */
  entities: ReturnType<typeof useCharacterEntities>;
  /** Add-dropdown menu state for the Abilities tab (Lifted_State in the shell). */
  addDropdown: string | null;
  setAddDropdown: Dispatch<SetStateAction<string | null>>;
  /** Picker visibility setters (Lifted_State in the shell). */
  setShowAdvSkillPicker: Dispatch<SetStateAction<boolean>>;
  setShowTalentPicker: Dispatch<SetStateAction<boolean>>;
  setShowSpellPicker: Dispatch<SetStateAction<boolean>>;
  /** Pending-deletion setter (Lifted_State in the shell). */
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
  /** Opens the specialisation picker for a placeholder row (Lifted_State in the shell). */
  setSpecTarget: Dispatch<SetStateAction<SpecTarget | null>>;
  /** Opens the skill roll dialog (stays lifted in the shell). */
  openSkillRoll: (skill: Skill) => void;
}

/**
 * Abilities Sub_Tab content extracted verbatim from CharacterPage
 * (spec: character-page-decomposition, seam e — MANDATORY per Req 2.2):
 * SkillFilter + Basic Skills + Advanced Skills + Talents + Spells & Prayers +
 * Known Runes + Rune Management.
 *
 * Behaviour-preserving: DOM structure, ARIA, and CSS module classes are
 * identical to the pre-refactor inline blocks (Req 3.1, 3.2, 3.3). All
 * Lifted_State (tooltip singleton, picker flags, deleteTarget, skill-filter
 * state, addDropdown, expandedSpells) stays owned by the shell and is injected
 * here as props (Req 5.1, 5.4); the `useCharacterEntities` CRUD handlers are
 * injected via `entities` rather than re-declared (Req 5.3).
 *
 * Skill-total calculated-totals keep their breakdown tooltips via the shared
 * `Tooltip` / `TooltipTriggerCell` wiring unchanged (Req 6.3, 6.4;
 * calculated-totals rule — breakdown is Characteristic + Advances).
 *
 * The Spells & Prayers visibility predicate is the shell's original one (no
 * rules change — rules-compliance; design "Error Handling"); its Channelling
 * test reads the skill's group via `inGroup`, so any spelling or specialisation
 * of Channelling counts.
 */
export function AbilitiesTab({
  character,
  update,
  updateCharacter,
  skillSearchText,
  setSkillSearchText,
  skillTrainedOnly,
  onTrainedOnlyChange,
  careerSkillSet,
  tooltip,
  setTooltip,
  breakdownTooltip,
  openBreakdownTooltip,
  closeBreakdownTooltip,
  expandedSpells,
  entities,
  addDropdown,
  setAddDropdown,
  setShowAdvSkillPicker,
  setShowTalentPicker,
  setShowSpellPicker,
  setDeleteTarget,
  setSpecTarget,
  openSkillRoll,
}: AbilitiesTabProps) {
  const {
    addCustomAdvancedSkill,
    updateAdvancedSkill,
    addCustomTalent,
    updateTalent,
    addCustomSpell,
    updateSpell,
    toggleSpellExpanded,
  } = entities;

  return (
    <>
      {/* Skill Filter */}
      <SkillFilter
        searchText={skillSearchText}
        trainedOnly={skillTrainedOnly}
        onSearchChange={setSkillSearchText}
        onTrainedOnlyChange={onTrainedOnlyChange}
      />

      {/* Basic Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title="Basic Skills" />
        <div className={styles.skillGrid}>
          {/* Header */}
          <div className={styles.skillGridHeader}>
            <span>Skill</span>
            <span>Char</span>
            <span>Adv</span>
            <span>Total</span>
            <span></span>
          </div>
          {/* Rows */}
          {filterSkills(character.bSkills, { searchText: skillSearchText, trainedOnly: skillTrainedOnly }).map((skill) => {
            const i = character.bSkills.indexOf(skill);
            const charVal = character.chars[skill.c as CharacteristicKey];
            const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
            const isCareerSkill = careerSkillSet.has(skill.n);
            return (
              <div key={i} className={`${styles.skillGridRow}${isCareerSkill ? ` ${styles.skillGridRowCareer}` : ''}`}>
                <div className={styles.skillGridName}>
                  <div className={styles.inlineRow}>
                    <SheetInfoButton
                      type="skill"
                      index={i}
                      label={skill.n}
                      className={styles.infoBtn}
                      tooltip={tooltip}
                      setTooltip={setTooltip}
                      resolveContent={() => resolveSkillTooltip(skill.n, skill.c)}
                    />
                    <span className={styles.skillNameText}>{skill.n}</span>
                  </div>
                </div>
                <div className={styles.skillGridChar} title={CHAR_FULL_NAMES[skill.c as CharacteristicKey] || skill.c}>{skill.c}</div>
                <div>
                  <input type="number" value={skill.a} onChange={(e) => update(`bSkills.${i}.a`, Number(e.target.value) || 0)} className={styles.numInput} />
                </div>
                <TooltipTriggerCell
                  tooltipId={`tooltip-breakdown-skill-${i}`}
                  displayValue={total}
                  isTooltipOpen={breakdownTooltip?.type === 'skill' && breakdownTooltip.index === i}
                  onOpen={(anchorEl) => openBreakdownTooltip({ type: 'skill', index: i, anchorEl })}
                  onClose={closeBreakdownTooltip}
                  className={styles.skillGridTotal}
                  ariaLabel={`Skill total breakdown for ${skill.n}`}
                />
                <div>
                  <button type="button" className={styles.diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Advanced Skills */}
      <Card>
        <SectionHeader icon={BookOpen} title={<>Advanced Skills{character.aSkills.length > 20 && <span className={styles.countBadge}>{character.aSkills.length}</span>}</>} action={
          <div className={styles.addDropdownWrapper}>
            <button
              type="button"
              className={styles.addDropdownBtn}
              onClick={() => setAddDropdown(addDropdown === 'advSkill' ? null : 'advSkill')}
              aria-expanded={addDropdown === 'advSkill'}
              aria-haspopup="true"
            >
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </button>
            {addDropdown === 'advSkill' && (
              <div className={styles.addDropdownMenu} role="menu">
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { setShowAdvSkillPicker(true); setAddDropdown(null); }}>Add from Rulebook</button>
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { addCustomAdvancedSkill(); setAddDropdown(null); }}>Add Custom</button>
              </div>
            )}
          </div>
        } />
        <div className={styles.skillGridAdvanced}>
          {/* Header */}
          <div className={styles.skillGridHeader}>
            <span>Skill</span>
            <span>Char</span>
            <span>Adv</span>
            <span>Total</span>
            <span></span>
            <span></span>
          </div>
          {/* Rows */}
          {filterSkills(character.aSkills, { searchText: skillSearchText, trainedOnly: skillTrainedOnly }).map((skill) => {
            const i = character.aSkills.indexOf(skill);
            const charVal = character.chars[skill.c as CharacteristicKey];
            const total = charVal ? (charVal.i + charVal.a + charVal.b + skill.a) : skill.a;
            const isCareerSkill = careerSkillSet.has(skill.n);
            return (
              <div key={i} className={`${styles.skillGridRow}${isCareerSkill ? ` ${styles.skillGridRowCareer}` : ''}`}>
                <div className={styles.skillGridName}>
                  <div className={styles.inlineRow}>
                    <SheetInfoButton
                      type="skill"
                      index={character.bSkills.length + i}
                      label={skill.n}
                      className={styles.infoBtn}
                      tooltip={tooltip}
                      setTooltip={setTooltip}
                      resolveContent={() => resolveSkillTooltip(skill.n, skill.c)}
                    />
                    <EditableField label="" value={skill.n} onSave={(v) => updateAdvancedSkill(i, 'n', String(v))} />
                    {isPlaceholderName(skill.n) && (
                      <button
                        type="button"
                        className={styles.chooseSpecBtn}
                        onClick={() => setSpecTarget({ type: 'aSkill', index: i })}
                        title="Choose specialisation"
                        aria-label={`Choose specialisation for ${skill.n}`}
                      >
                        <ChevronsUpDown size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.skillGridChar}>
                  <EditableField label="" value={skill.c} onSave={(v) => updateAdvancedSkill(i, 'c', String(v))} />
                </div>
                <div>
                  <input type="number" value={skill.a} onChange={(e) => updateAdvancedSkill(i, 'a', Number(e.target.value) || 0)} className={styles.numInput} />
                </div>
                <TooltipTriggerCell
                  tooltipId={`tooltip-breakdown-skill-${character.bSkills.length + i}`}
                  displayValue={total}
                  isTooltipOpen={breakdownTooltip?.type === 'skill' && breakdownTooltip.index === character.bSkills.length + i}
                  onOpen={(anchorEl) => openBreakdownTooltip({ type: 'skill', index: character.bSkills.length + i, anchorEl })}
                  onClose={closeBreakdownTooltip}
                  className={styles.skillGridTotal}
                  ariaLabel={`Skill total breakdown for ${skill.n}`}
                />
                <div>
                  <button type="button" className={styles.diceBtn} onClick={() => openSkillRoll(skill)} title={`Roll ${skill.n}`} aria-label={`Roll ${skill.n}`}>🎲</button>
                </div>
                <div>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'aSkill', index: i })} className={styles.deleteBtn}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Talents */}
      <Card>
        <SectionHeader icon={Sparkles} title="Talents" action={
          <div className={styles.addDropdownWrapper}>
            <button
              type="button"
              className={styles.addDropdownBtn}
              onClick={() => setAddDropdown(addDropdown === 'talent' ? null : 'talent')}
              aria-expanded={addDropdown === 'talent'}
              aria-haspopup="true"
            >
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </button>
            {addDropdown === 'talent' && (
              <div className={styles.addDropdownMenu} role="menu">
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { setShowTalentPicker(true); setAddDropdown(null); }}>Add from Rulebook</button>
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { addCustomTalent(); setAddDropdown(null); }}>Add Custom</button>
              </div>
            )}
          </div>
        } />
        {character.talents.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            heading="No Talents"
            description="No talents acquired yet — add one from the rulebook or create a custom talent."
            action={{ label: 'Add Talent', onClick: () => setShowTalentPicker(true) }}
          />
        ) : (
        <table className={styles.tableBase}>
          <thead>
            <tr>
              <th className={styles.th}>Talent</th>
              <th className={styles.th}>Lvl</th>
              <th className={styles.th}>Description</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {character.talents.map((t, i) => (
              <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.td}>
                  <div className={styles.inlineRow}>
                    <SheetInfoButton
                      type="talent"
                      index={i}
                      label={t.n}
                      className={styles.infoBtn}
                      tooltip={tooltip}
                      setTooltip={setTooltip}
                      resolveContent={() => resolveTalentTooltip(t.n, t.desc)}
                    />
                    <EditableField label="" value={t.n} onSave={(v) => updateTalent(i, 'n', String(v))} />
                    {isPlaceholderName(t.n) && (
                      <button
                        type="button"
                        className={styles.chooseSpecBtn}
                        onClick={() => setSpecTarget({ type: 'talent', index: i })}
                        title="Choose specialisation"
                        aria-label={`Choose specialisation for ${t.n}`}
                      >
                        <ChevronsUpDown size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td className={styles.td}>
                  <EditableField label="" value={t.lvl} type="number" onSave={(v) => updateTalent(i, 'lvl', Number(v))} style={{ minWidth: '40px' }} />
                </td>
                <td className={styles.td}>
                  <EditableField label="" value={t.desc} onSave={(v) => updateTalent(i, 'desc', String(v))} />
                </td>
                <td className={styles.td}>
                  <button type="button" onClick={() => setDeleteTarget({ type: 'talent', index: i })} className={styles.deleteBtn}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>

      {/* Spells — only show if character has magic talents/skills, relevant career skills, or already has spells */}
      {(character.spells.length > 0 || character.talents.some(t =>
        t.n.includes('Magic') || t.n.includes('Pray') || t.n.includes('Invoke') || t.n.includes('Bless')
      ) || character.aSkills.some(s =>
        inGroup(s.n, 'Channelling') || s.n.startsWith('Language (Magick)') || s.n === 'Pray'
      ) || (() => {
        const careerSkills = getCareerSkills(character.career, character.careerLevel);
        return careerSkills.includes('Pray') || careerSkills.some(s => inGroup(s, 'Channelling'));
      })()) && (
      <Card>
        <SectionHeader icon={Wand2} title="Spells & Prayers" action={
          <div className={styles.addDropdownWrapper}>
            <button
              type="button"
              className={styles.addDropdownBtn}
              onClick={() => setAddDropdown(addDropdown === 'spell' ? null : 'spell')}
              aria-expanded={addDropdown === 'spell'}
              aria-haspopup="true"
            >
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </button>
            {addDropdown === 'spell' && (
              <div className={styles.addDropdownMenu} role="menu">
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { setShowSpellPicker(true); setAddDropdown(null); }}>Add from Rulebook</button>
                <button type="button" className={styles.addDropdownItem} role="menuitem" onClick={() => { addCustomSpell(); setAddDropdown(null); }}>Add Custom</button>
              </div>
            )}
          </div>
        } />
        {character.spells.length === 0 ? (
          <EmptyState
            icon={Wand2}
            heading="No Spells or Prayers"
            description="Add spells or prayers from the rulebook or create custom entries."
            action={{ label: 'Add Spell', onClick: () => setShowSpellPicker(true) }}
          />
        ) : (
        <table className={styles.tableBase}>
          <thead>
            <tr>
              <th className={styles.th}></th>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>CN</th>
              <th className={styles.th}>Range</th>
              <th className={styles.th}>Duration</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {character.spells.map((s, i) => {
              const isExpanded = expandedSpells.has(i);
              return (
                <React.Fragment key={i}>
                  <tr className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td className={styles.td}>
                      <button
                        type="button"
                        className={styles.spellExpandBtn}
                        onClick={() => toggleSpellExpanded(i)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${s.name || 'spell'} effect`}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={14} aria-hidden="true" />
                        )}
                      </button>
                    </td>
                    <td className={styles.td}>
                      <EditableField label="" value={s.name} onSave={(v) => updateSpell(i, 'name', String(v))} />
                    </td>
                    <td className={styles.td}>{s.cn}</td>
                    <td className={styles.td}>{s.range}</td>
                    <td className={styles.td}>{s.duration}</td>
                    <td className={styles.td}>
                      <button type="button" onClick={() => setDeleteTarget({ type: 'spell', index: i })} className={styles.deleteBtn}>✕</button>
                    </td>
                  </tr>
                  {isExpanded && s.effect && (
                    <tr className={styles.spellEffectRow}>
                      <td colSpan={6} className={styles.spellEffectCell}>
                        <div className={styles.spellEffectText}>{s.effect}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        )}
      </Card>
      )}

      {/* Known Runes — only show if character has Rune Magic talent */}
      {character.talents.some(t => t.n === 'Rune Magic' || t.n === 'Master Rune Magic') && (
      <Card>
        <SectionHeader icon={Hammer} title="Known Runes" />
        {(character.knownRunes ?? []).length === 0 ? (
          <div className={styles.runesEmpty}>
            No runes learned yet. Learn runes on the Advancement page.
          </div>
        ) : (
          (() => {
            const knownRunes = character.knownRunes ?? [];
            const isHighPriest = isHighPriestLevel(character.career, character.careerLevel);
            const restrictedSet = shouldApplyDeityFilter(character)
              ? new Set(getRestrictedRunes(knownRunes, character.patronDeity, isHighPriest))
              : new Set<string>();
            return (
              <div className={styles.runesGrid}>
                {knownRunes.map((runeId) => {
                  const rune = getRuneById(runeId);
                  if (!rune) return null;
                  const isRestricted = restrictedSet.has(runeId);
                  return (
                    <div key={runeId} className={`${styles.runeBadge}${isRestricted ? ` ${styles.runeBadgeRestricted}` : ''}`}>
                      <span className={styles.runeNameRow}>
                        <span className={styles.runeName}>{rune.name}</span>
                        {rune.isMaster && <span className={styles.runeMaster}>★</span>}
                        {isRestricted && (
                          <span className={styles.runeRestrictedBadge} aria-label="Restricted rune">
                            <Lock size={10} aria-hidden="true" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </span>
                      <div className={styles.runeCategory}>{rune.category}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
        <div className={styles.runeCount}>
          {(character.knownRunes ?? []).length} / {RUNE_CATALOGUE.length} runes known
        </div>
      </Card>
      )}

      {/* Rune Panel — Protection, Engineering, Doom management */}
      {character.talents.some(t => t.n.startsWith('Rune Magic') || t.n.startsWith('Master Rune Magic')) && (
      <Card>
        <SectionHeader icon={Hammer} title="Rune Management" />
        <RunePanel
          knownRunes={character.knownRunes ?? []}
          protectionItems={character.protectionItems ?? []}
          engineeringItems={character.engineeringItems ?? []}
          doomRuneActivations={character.doomRuneActivations ?? []}
          forgingCharges={character.forgingCharges ?? {}}
          onAddProtectionItem={(item: ProtectionItem) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: [...(c.protectionItems ?? []), item],
            }));
          }}
          onEditProtectionItem={(item: ProtectionItem) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).map(i => i.id === item.id ? item : i),
            }));
          }}
          onRemoveProtectionItem={(itemId: string) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).filter(i => i.id !== itemId),
            }));
          }}
          onInscribeProtectionRune={(itemId: string, runeId: string) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: [...i.runes, runeId] } : i
              ),
            }));
          }}
          onRemoveProtectionRune={(itemId: string, runeIndex: number) => {
            updateCharacter((c) => ({
              ...c,
              protectionItems: (c.protectionItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: i.runes.filter((_, idx) => idx !== runeIndex) } : i
              ),
            }));
          }}
          onAddEngineeringItem={(item: EngineeringItem) => {
            updateCharacter((c) => {
              const items = [...(c.engineeringItems ?? []), item];
              const charges = { ...(c.forgingCharges ?? {}), [item.id]: calculateForgingCharges(item) };
              return { ...c, engineeringItems: items, forgingCharges: charges };
            });
          }}
          onRemoveEngineeringItem={(itemId: string) => {
            updateCharacter((c) => {
              const charges = { ...(c.forgingCharges ?? {}) };
              delete charges[itemId];
              return {
                ...c,
                engineeringItems: (c.engineeringItems ?? []).filter(i => i.id !== itemId),
                forgingCharges: charges,
              };
            });
          }}
          onInscribeEngineeringRune={(itemId: string, runeId: string) => {
            updateCharacter((c) => {
              const items = (c.engineeringItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: [...i.runes, runeId] } : i
              );
              // Recalculate forging charges for the affected item
              const updatedItem = items.find(i => i.id === itemId);
              const charges = { ...(c.forgingCharges ?? {}) };
              if (updatedItem) {
                charges[itemId] = calculateForgingCharges(updatedItem);
              }
              return { ...c, engineeringItems: items, forgingCharges: charges };
            });
          }}
          onRemoveEngineeringRune={(itemId: string, runeIndex: number) => {
            updateCharacter((c) => {
              const items = (c.engineeringItems ?? []).map(i =>
                i.id === itemId ? { ...i, runes: i.runes.filter((_, idx) => idx !== runeIndex) } : i
              );
              // Recalculate forging charges for the affected item
              const updatedItem = items.find(i => i.id === itemId);
              const charges = { ...(c.forgingCharges ?? {}) };
              if (updatedItem) {
                charges[itemId] = calculateForgingCharges(updatedItem);
              }
              return { ...c, engineeringItems: items, forgingCharges: charges };
            });
          }}
          onActivateForging={(itemId: string) => {
            updateCharacter((c) => {
              const item = (c.engineeringItems ?? []).find(i => i.id === itemId);
              if (!item) return c;
              const result = activateRuneOfForging(item, c.forgingCharges ?? {});
              if (!result.success) return c;
              return { ...c, forgingCharges: result.updatedCharges };
            });
          }}
          onResetCharges={() => {
            updateCharacter((c) => ({
              ...c,
              forgingCharges: resetForgingCharges(c.engineeringItems ?? []),
            }));
          }}
          onActivateDoomRune={(runeId: string) => {
            updateCharacter((c) => {
              const result = activateDoomRune(runeId, c.doomRuneActivations ?? []);
              if (!result.success || !result.activation) return c;
              return {
                ...c,
                doomRuneActivations: [...(c.doomRuneActivations ?? []), result.activation],
              };
            });
          }}
        />
      </Card>
      )}
    </>
  );
}
