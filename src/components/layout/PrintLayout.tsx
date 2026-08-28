import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel-decorative/900.css';
import '@fontsource/im-fell-english/400.css';

import type { Character, ArmourPoints, CharacteristicKey } from '../../types/character';
import { getBonus, calculateMaxEncumbrance } from '../../logic/calculators';
import { calculateArmourEncumbrance, calculateCarriedTrappingEnc } from '../../logic/encumbrance';
import styles from './PrintLayout.module.css';

interface PrintLayoutProps {
  character: Character;
  totalWounds: number;
  armourPoints: ArmourPoints;
}

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

type SectionKey =
  | 'spells' | 'companions' | 'mutations' | 'criticalWounds'
  | 'hirelings' | 'enterprises' | 'grudgeBook' | 'psychologyTraits'
  | 'rituals' | 'yenlui' | 'estate' | 'conditions' | 'ammunition';

function shouldRenderSection(character: Character, key: SectionKey): boolean {
  switch (key) {
    case 'spells': return character.spells.length > 0;
    case 'companions': return character.companions.length > 0;
    case 'mutations': return character.mutations.length > 0;
    case 'criticalWounds': return character.criticalWounds.length > 0;
    case 'hirelings': return character.hirelings.length > 0;
    case 'enterprises':
      return character.houseRules.useEnterprises && (character.enterprises?.length ?? 0) > 0;
    case 'grudgeBook':
      return character.houseRules.useGrudgeBook && (character.grudges?.length ?? 0) > 0;
    case 'psychologyTraits':
      return character.houseRules.usePsychologyTracker && (character.psychologyTraits?.length ?? 0) > 0;
    case 'rituals': return (character.rituals?.length ?? 0) > 0;
    case 'yenlui': return character.houseRules.useYenlui;
    case 'estate': return character.estate.name.length > 0;
    case 'conditions': return character.conditions.filter(c => c.level > 0).length > 0;
    case 'ammunition': return character.ammo.length > 0;
  }
}

function renderPageFooter(characterName: string, pageNum: number) {
  return (
    <div className={styles.pageFooter}>
      {characterName || 'Unnamed Character'} — Page {pageNum} — Generated {new Date().toLocaleDateString()}
    </div>
  );
}

export function PrintLayout({ character, totalWounds, armourPoints }: PrintLayoutProps) {
  const ch = character;
  const SB = getBonus(ch.chars.S.i + ch.chars.S.a + ch.chars.S.b);
  const TB = getBonus(ch.chars.T.i + ch.chars.T.a + ch.chars.T.b);
  const WPB = getBonus(ch.chars.WP.i + ch.chars.WP.a + ch.chars.WP.b);
  const hardyLevel = ch.talents.find(t => t.n === 'Hardy')?.lvl ?? 0;
  const strongBackLevel = ch.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
  const maxEnc = calculateMaxEncumbrance(ch.chars, strongBackLevel);
  const eW = ch.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
  const eA = ch.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
  const eT = calculateCarriedTrappingEnc(ch.trappings, ch.houseRules?.ignoreBackpackEnc ?? false);
  const bSkills1 = ch.bSkills.slice(0, 13);
  const bSkills2 = ch.bSkills.slice(13);

  return (
    <div className={styles.printWrapper}>
      <div className={styles.page}>

        {/* ═══ PAGE 1 ═══ */}
        <div className={`${styles.pageBreak} ${styles.cornerOrnament}`}>
          {/* Heraldic glyph */}
          <div className={styles.heraldic}></div>

          {/* Title Block */}
          <div className={styles.titleArea}>
            <div className={styles.characterName}>
              {ch.name || 'Unnamed Character'}
            </div>
            <div className={styles.subtitle}>Warhammer Fantasy Roleplay — Character Record</div>
          </div>

          {/* Personal Details */}
          <div className={styles.sectionBox}>
            <table className={styles.tbl}>
              <tbody>
                <tr>
                  <td className={styles.hdrCell}>Name</td>
                  <td className={styles.valCellLeftBold} colSpan={3}>{ch.name}</td>
                  <td className={styles.hdrCell}>Species</td>
                  <td className={styles.valCell} colSpan={2}>{ch.species}</td>
                  <td className={styles.hdrCell}>Class</td>
                  <td className={styles.valCell} colSpan={2}>{ch.class}</td>
                </tr>
                <tr>
                  <td className={styles.hdrCell}>Career</td>
                  <td className={styles.valCellLeft} colSpan={3}>{ch.career}</td>
                  <td className={styles.hdrCell}>Level</td>
                  <td className={styles.valCell} colSpan={5}>{ch.careerLevel}</td>
                </tr>
                <tr>
                  <td className={styles.hdrCell}>Career Path</td>
                  <td className={styles.valCellLeft} colSpan={7}>{ch.careerPath}</td>
                  <td className={styles.hdrCell}>Status</td>
                  <td className={styles.valCell}>{ch.status}</td>
                </tr>
                <tr>
                  <td className={styles.hdrCell}>Age</td>
                  <td className={styles.valCell}>{ch.age}</td>
                  <td className={styles.hdrCell}>Height</td>
                  <td className={styles.valCell}>{ch.height}</td>
                  <td className={styles.hdrCell}>Hair</td>
                  <td className={styles.valCell} colSpan={2}>{ch.hair}</td>
                  <td className={styles.hdrCell}>Eyes</td>
                  <td className={styles.valCell} colSpan={2}>{ch.eyes}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Characteristics + Fate + Resilience */}
          <div className={styles.gridCharsRow}>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Characteristics</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <td className={styles.hdrCell}></td>
                    {CHAR_KEYS.map(k => <td key={k} className={styles.hdrCell}>{k}</td>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.hdrCell}>Initial</td>
                    {CHAR_KEYS.map(k => <td key={k} className={styles.valCell}>{ch.chars[k].i}</td>)}
                  </tr>
                  <tr>
                    <td className={styles.hdrCell}>Advances</td>
                    {CHAR_KEYS.map(k => <td key={k} className={styles.valCell}>{ch.chars[k].a}</td>)}
                  </tr>
                  <tr>
                    <td className={styles.hdrCell}>Current</td>
                    {CHAR_KEYS.map(k => <td key={k} className={styles.valCellBoldLg}>{ch.chars[k].i + ch.chars[k].a + ch.chars[k].b}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Fate</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>Fate</td><td className={styles.valCell}>{ch.fate}</td></tr>
                  <tr><td className={styles.hdrCell}>Fortune</td><td className={styles.valCell}>{ch.fortune}</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Resilience</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr>
                    <td className={styles.hdrCell}>Res</td><td className={styles.valCell}>{ch.resilience}</td>
                    <td className={styles.hdrCell}>Resolve</td><td className={styles.valCell}>{ch.resolve}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Movement + Wounds + XP status row */}
          <div className={styles.gridThreeCol}>
            <div className={styles.movementBox}>
              <table className={styles.tblInline}>
                <tbody>
                  <tr>
                    <td className={styles.hdrCell}>Move</td><td className={styles.valCell}>{ch.move.m}</td>
                    <td className={styles.hdrCell}>Walk</td><td className={styles.valCell}>{ch.move.w}</td>
                    <td className={styles.hdrCell}>Run</td><td className={styles.valCell}>{ch.move.r}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Wounds</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>SB</td><td className={styles.valCell}>{SB}</td></tr>
                  <tr><td className={styles.hdrCell}>TB×2</td><td className={styles.valCell}>{TB * 2}</td></tr>
                  <tr><td className={styles.hdrCell}>WPB</td><td className={styles.valCell}>{WPB}</td></tr>
                  <tr><td className={styles.hdrCell}>Hardy</td><td className={styles.valCell}>{hardyLevel > 0 ? hardyLevel * TB : 0}</td></tr>
                  <tr><td className={styles.hdrCellExtraBold}>Total</td><td className={styles.valCellBoldXl}>{totalWounds}</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Experience</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>Current</td><td className={styles.valCellBold}>{ch.xpCur}</td></tr>
                  <tr><td className={styles.hdrCell}>Spent</td><td className={styles.valCell}>{ch.xpSpent}</td></tr>
                  <tr><td className={styles.hdrCell}>Total</td><td className={styles.valCellBold}>{ch.xpTotal}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Skills Grid */}
          <div className={styles.gridSkills}>
            {[
              { title: 'Basic Skills', skills: bSkills1 },
              { title: 'Basic Skills', skills: bSkills2 },
              { title: 'Grouped & Advanced Skills', skills: ch.aSkills.filter(s => s.n) }
            ].map((block, bi) => (
              <div key={bi} className={styles.sectionBox}>
                <div className={styles.sectionTitle}>{block.title}</div>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th className={styles.hdrCell}>Name</th>
                      <th className={`${styles.hdrCell} ${styles.colW26}`}>Char</th>
                      <th className={`${styles.hdrCell} ${styles.colW22}`}>Adv</th>
                      <th className={`${styles.hdrCell} ${styles.colW26}`}>Skill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.skills.map((s, i) => {
                      const cv = ch.chars[s.c as CharacteristicKey];
                      const total = cv ? (cv.i + cv.a + cv.b) + s.a : s.a;
                      return (
                        <tr key={i}>
                          <td className={styles.cell}>{s.n}</td>
                          <td className={styles.valCell}>{s.c}</td>
                          <td className={styles.valCell}>{s.a || ''}</td>
                          <td className={styles.valCellBold}>{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Talents + Ambitions/Party */}
          <div className={styles.gridTalentsAmb}>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Talents</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Talent</th>
                    <th className={`${styles.hdrCell} ${styles.colW28}`}>Taken</th>
                    <th className={styles.hdrCell}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.talents.map((t, i) => (
                    <tr key={i}>
                      <td className={styles.cellBold}>{t.n}</td>
                      <td className={styles.valCell}>{t.lvl}</td>
                      <td className={styles.cellSmall}>{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className={styles.sectionBox}>
                <div className={styles.sectionTitle}>Ambitions</div>
                <table className={styles.tbl}>
                  <tbody>
                    <tr><td className={styles.hdrCell}>Short</td><td className={styles.valCellLeft}>{ch.ambS}</td></tr>
                    <tr><td className={styles.hdrCell}>Long</td><td className={styles.valCellLeft}>{ch.ambL}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className={styles.sectionBox}>
                <div className={styles.sectionTitle}>Party</div>
                <table className={styles.tbl}>
                  <tbody>
                    <tr><td className={styles.hdrCell}>Name</td><td className={styles.valCellLeft}>{ch.partyN}</td></tr>
                    <tr><td className={styles.hdrCell}>Members</td><td className={styles.valCellLeft}>{ch.partyM}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          {renderPageFooter(ch.name, 1)}
        </div>

        {/* ═══ PAGE 2 ═══ */}
        <div className={`${styles.pageBreak} ${styles.cornerOrnament}`}>
          {/* Heraldic glyph */}
          <div className={styles.heraldic}></div>

          {/* Armour + AP */}
          <div className={styles.gridArmourAp}>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Armour</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Name</th>
                    <th className={`${styles.hdrCell} ${styles.colW55}`}>Locations</th>
                    <th className={`${styles.hdrCell} ${styles.colW24}`}>Enc</th>
                    <th className={`${styles.hdrCell} ${styles.colW22}`}>AP</th>
                    <th className={styles.hdrCell}>Qualities</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.armour.map((a, i) => (
                    <tr key={i}>
                      <td className={styles.cell}>{a.name}</td>
                      <td className={styles.valCell}>{a.locations}</td>
                      <td className={styles.valCell}>{a.enc}</td>
                      <td className={styles.valCellBold}>{a.ap}</td>
                      <td className={styles.cellSmall}>{a.qualities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Armour Points</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>Head (01-09)</td><td className={styles.valCellBold}>{armourPoints.head}</td></tr>
                  <tr><td className={styles.hdrCell}>R Arm (25-44)</td><td className={styles.valCellBold}>{armourPoints.rArm}</td></tr>
                  <tr><td className={styles.hdrCell}>L Arm (10-24)</td><td className={styles.valCellBold}>{armourPoints.lArm}</td></tr>
                  <tr><td className={styles.hdrCell}>Body (45-79)</td><td className={styles.valCellBold}>{armourPoints.body}</td></tr>
                  <tr><td className={styles.hdrCell}>R Leg (80-89)</td><td className={styles.valCellBold}>{armourPoints.rLeg}</td></tr>
                  <tr><td className={styles.hdrCell}>L Leg (90-00)</td><td className={styles.valCellBold}>{armourPoints.lLeg}</td></tr>
                  <tr><td className={styles.hdrCell}>Shield</td><td className={styles.valCellBold}>{armourPoints.shield}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className={styles.sectionDivider} />

          {/* Trappings + Psychology + Corruption */}
          <div className={styles.gridTwoCol}>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Trappings</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Name</th>
                    <th className={`${styles.hdrCell} ${styles.colW24}`}>Enc</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.trappings.map((t, i) => (
                    <tr key={i}>
                      <td className={styles.cell}>{t.name}</td>
                      <td className={styles.valCell}>{t.enc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className={styles.sectionBox}>
                <div className={styles.sectionTitle}>Psychology</div>
                <div className={styles.textBlock}>{ch.psych}</div>
              </div>
              <div className={styles.sectionBox}>
                <div className={styles.sectionTitle}>Corruption &amp; Mutation</div>
                <table className={styles.tbl}>
                  <tbody>
                    <tr>
                      <td className={styles.hdrCell}>Corruption</td>
                      <td className={styles.valCell}>{ch.corr}</td>
                      <td className={styles.hdrCell}>Sin</td>
                      <td className={styles.valCell}>{ch.sin}</td>
                    </tr>
                  </tbody>
                </table>
                {ch.muts && <div className={styles.textBlockSmall}>{ch.muts}</div>}
              </div>
            </div>
          </div>

          <hr className={styles.sectionDivider} />

          {/* Wealth + Encumbrance + Wounds */}
          <div className={styles.gridThreeCol}>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Wealth</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>D</td><td className={styles.valCellBold}>{ch.wD}</td></tr>
                  <tr><td className={styles.hdrCell}>SS</td><td className={styles.valCellBold}>{ch.wSS}</td></tr>
                  <tr><td className={styles.hdrCell}>GC</td><td className={styles.valCellBold}>{ch.wGC}</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Encumbrance</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>Weapons</td><td className={styles.valCell}>{eW}</td></tr>
                  <tr><td className={styles.hdrCell}>Armour</td><td className={styles.valCell}>{eA}</td></tr>
                  <tr><td className={styles.hdrCell}>Trappings</td><td className={styles.valCell}>{eT}</td></tr>
                  <tr><td className={styles.hdrCell}>Max Enc.</td><td className={styles.valCell}>{maxEnc}</td></tr>
                  <tr><td className={styles.hdrCellExtraBold}>Total</td><td className={styles.valCellExtraBold}>{eW + eA + eT}</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Wounds</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr><td className={styles.hdrCell}>SB</td><td className={styles.valCell}>{SB}</td></tr>
                  <tr><td className={styles.hdrCell}>TB×2</td><td className={styles.valCell}>{TB * 2}</td></tr>
                  <tr><td className={styles.hdrCell}>WPB</td><td className={styles.valCell}>{WPB}</td></tr>
                  <tr><td className={styles.hdrCell}>Hardy</td><td className={styles.valCell}>{hardyLevel > 0 ? hardyLevel * TB : 0}</td></tr>
                  <tr><td className={styles.hdrCellExtraBold}>Wounds</td><td className={styles.valCellBoldXl}>{totalWounds}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className={styles.sectionDivider} />

          {/* Conditions (conditional) */}
          {shouldRenderSection(ch, 'conditions') && (
            <div className={styles.sectionBox} data-section="conditions">
              <div className={styles.sectionTitle}>Conditions</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Condition</th>
                    <th className={`${styles.hdrCell} ${styles.colW26}`}>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.conditions.filter(c => c.level > 0).map((c, i) => (
                    <tr key={i}>
                      <td className={styles.cell}>{c.name}</td>
                      <td className={styles.valCellBold}>{c.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <hr className={styles.sectionDivider} />

          {/* Weapons */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Weapons</div>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th className={styles.hdrCell}>Name</th>
                  <th className={`${styles.hdrCell} ${styles.colW45}`}>Group</th>
                  <th className={`${styles.hdrCell} ${styles.colW24}`}>Enc</th>
                  <th className={`${styles.hdrCell} ${styles.colW50}`}>Range/Reach</th>
                  <th className={`${styles.hdrCell} ${styles.colW40}`}>Damage</th>
                  <th className={styles.hdrCell}>Qualities</th>
                </tr>
              </thead>
              <tbody>
                {ch.weapons.map((w, i) => (
                  <tr key={i}>
                    <td className={styles.cellBold}>{w.name}</td>
                    <td className={styles.valCell}>{w.group}</td>
                    <td className={styles.valCell}>{w.enc}</td>
                    <td className={styles.valCell}>{w.rangeReach || w.maxR || ''}</td>
                    <td className={styles.valCellBold}>{w.damage}</td>
                    <td className={styles.cellSmall}>{w.qualities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ammunition (conditional) */}
          {shouldRenderSection(ch, 'ammunition') && (
            <div className={styles.sectionBox} data-section="ammunition">
              <div className={styles.sectionTitle}>Ammunition</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Name</th>
                    <th className={`${styles.hdrCell} ${styles.colW28}`}>Qty</th>
                    <th className={styles.hdrCell}>Qualities</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.ammo.map((a, i) => (
                    <tr key={i}>
                      <td className={styles.cell}>{a.name}</td>
                      <td className={styles.valCellBold}>{a.quantity}</td>
                      <td className={styles.cellSmall}>{a.qualities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Estate (conditional) */}
          {shouldRenderSection(ch, 'estate') && (
            <div className={styles.sectionBox} data-section="estate">
              <div className={styles.sectionTitle}>Estate</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr>
                    <td className={styles.hdrCell}>Name</td>
                    <td className={styles.valCellLeft}>{ch.estate.name}</td>
                    <td className={styles.hdrCell}>Location</td>
                    <td className={styles.valCellLeft}>{ch.estate.location}</td>
                  </tr>
                  <tr>
                    <td className={styles.hdrCell}>Treasury</td>
                    <td className={styles.valCell}>{ch.estate.treasury.gc}gc {ch.estate.treasury.ss}ss {ch.estate.treasury.d}d</td>
                    <td className={styles.hdrCell}>Income</td>
                    <td className={styles.valCell}>{ch.estate.monthlyIncome.gc}gc {ch.estate.monthlyIncome.ss}ss {ch.estate.monthlyIncome.d}d</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Page 2 Footer */}
          {renderPageFooter(ch.name, 2)}
        </div>

        {/* ═══ PAGE 3+ (CONDITIONAL) ═══ */}
        <div className={`${styles.conditionalPage} ${styles.cornerOrnament}`}>
          {/* Heraldic glyph */}
          <div className={styles.heraldic}></div>

          {/* Spells (conditional) */}
          {shouldRenderSection(ch, 'spells') && (
            <div className={styles.sectionBox} data-section="spells">
              <div className={styles.sectionTitle}>Spells and Prayers</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Name</th>
                    <th className={`${styles.hdrCell} ${styles.colW24}`}>TN</th>
                    <th className={`${styles.hdrCell} ${styles.colW45}`}>Range</th>
                    <th className={`${styles.hdrCell} ${styles.colW38}`}>Target</th>
                    <th className={`${styles.hdrCell} ${styles.colW45}`}>Duration</th>
                    <th className={styles.hdrCell}>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.spells.map((s, i) => (
                    <tr key={i}>
                      <td className={styles.cellBold}>{s.name}</td>
                      <td className={styles.valCell}>{s.cn}</td>
                      <td className={styles.valCell}>{s.range}</td>
                      <td className={styles.valCell}>{s.target}</td>
                      <td className={styles.valCell}>{s.duration}</td>
                      <td className={styles.cellSmall}>{s.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Companions (conditional) */}
          {shouldRenderSection(ch, 'companions') && (
            <div className={styles.sectionBox} data-section="companions">
              <div className={styles.sectionTitle}>Companions</div>
              {ch.companions.map((comp, i) => (
                <div key={i} style={{ marginBottom: i < ch.companions.length - 1 ? '8px' : 0 }}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th className={styles.hdrCell}>Name</th>
                        <th className={styles.hdrCell}>Species</th>
                        <th className={styles.hdrCell}>M</th>
                        <th className={styles.hdrCell}>WS</th>
                        <th className={styles.hdrCell}>BS</th>
                        <th className={styles.hdrCell}>S</th>
                        <th className={styles.hdrCell}>T</th>
                        <th className={styles.hdrCell}>I</th>
                        <th className={styles.hdrCell}>Ag</th>
                        <th className={styles.hdrCell}>Dex</th>
                        <th className={styles.hdrCell}>Int</th>
                        <th className={styles.hdrCell}>WP</th>
                        <th className={styles.hdrCell}>Fel</th>
                        <th className={styles.hdrCell}>W</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.cellBold}>{comp.name}</td>
                        <td className={styles.valCell}>{comp.species}</td>
                        <td className={styles.valCell}>{comp.M}</td>
                        <td className={styles.valCell}>{comp.WS}</td>
                        <td className={styles.valCell}>{comp.BS}</td>
                        <td className={styles.valCell}>{comp.S}</td>
                        <td className={styles.valCell}>{comp.T}</td>
                        <td className={styles.valCell}>{comp.I}</td>
                        <td className={styles.valCell}>{comp.Ag}</td>
                        <td className={styles.valCell}>{comp.Dex}</td>
                        <td className={styles.valCell}>{comp.Int}</td>
                        <td className={styles.valCell}>{comp.WP}</td>
                        <td className={styles.valCell}>{comp.Fel}</td>
                        <td className={styles.valCellBold}>{comp.W}</td>
                      </tr>
                      <tr>
                        <td className={styles.hdrCell}>Traits</td>
                        <td className={styles.cellSmall} colSpan={13}>{comp.traits}</td>
                      </tr>
                      <tr>
                        <td className={styles.hdrCell}>Trained</td>
                        <td className={styles.cell} colSpan={13}>{comp.trained.join(', ')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Mutations (conditional) */}
          {shouldRenderSection(ch, 'mutations') && (
            <div className={styles.sectionBox} data-section="mutations">
              <div className={styles.sectionTitle}>Mutations</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={`${styles.hdrCell} ${styles.colW45}`}>Type</th>
                    <th className={styles.hdrCell}>Name</th>
                    <th className={styles.hdrCell}>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.mutations.map((m, i) => (
                    <tr key={i}>
                      <td className={styles.valCell}>{m.type}</td>
                      <td className={styles.cellBold}>{m.name}</td>
                      <td className={styles.cellSmall}>{m.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Critical Wounds (conditional) */}
          {shouldRenderSection(ch, 'criticalWounds') && (
            <div className={styles.sectionBox} data-section="criticalWounds">
              <div className={styles.sectionTitle}>Critical Wounds</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Location</th>
                    <th className={styles.hdrCell}>Description</th>
                    <th className={styles.hdrCell}>Effects</th>
                    <th className={`${styles.hdrCell} ${styles.colW28}`}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.criticalWounds.map((cw, i) => (
                    <tr key={i}>
                      <td className={styles.valCell}>{cw.location}</td>
                      <td className={styles.cell}>{cw.description}</td>
                      <td className={styles.cellSmall}>{cw.effects}</td>
                      <td className={styles.valCellBold}>{cw.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Hirelings (conditional) */}
          {shouldRenderSection(ch, 'hirelings') && (
            <div className={styles.sectionBox} data-section="hirelings">
              <div className={styles.sectionTitle}>Hirelings</div>
              {ch.hirelings.map((h, i) => (
                <div key={i} style={{ marginBottom: i < ch.hirelings.length - 1 ? '8px' : 0 }}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th className={styles.hdrCell}>Name</th>
                        <th className={styles.hdrCell}>Role</th>
                        <th className={styles.hdrCell}>Status</th>
                        <th className={styles.hdrCell}>M</th>
                        <th className={styles.hdrCell}>WS</th>
                        <th className={styles.hdrCell}>BS</th>
                        <th className={styles.hdrCell}>S</th>
                        <th className={styles.hdrCell}>T</th>
                        <th className={styles.hdrCell}>I</th>
                        <th className={styles.hdrCell}>Ag</th>
                        <th className={styles.hdrCell}>Dex</th>
                        <th className={styles.hdrCell}>Int</th>
                        <th className={styles.hdrCell}>WP</th>
                        <th className={styles.hdrCell}>Fel</th>
                        <th className={styles.hdrCell}>W</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.cellBold}>{h.name}</td>
                        <td className={styles.valCell}>{h.role}</td>
                        <td className={styles.valCell}>{h.status}</td>
                        <td className={styles.valCell}>{h.M}</td>
                        <td className={styles.valCell}>{h.WS}</td>
                        <td className={styles.valCell}>{h.BS}</td>
                        <td className={styles.valCell}>{h.S}</td>
                        <td className={styles.valCell}>{h.T}</td>
                        <td className={styles.valCell}>{h.I}</td>
                        <td className={styles.valCell}>{h.Ag}</td>
                        <td className={styles.valCell}>{h.Dex}</td>
                        <td className={styles.valCell}>{h.Int}</td>
                        <td className={styles.valCell}>{h.WP}</td>
                        <td className={styles.valCell}>{h.Fel}</td>
                        <td className={styles.valCellBold}>{h.W}</td>
                      </tr>
                      {h.skills && (
                        <tr>
                          <td className={styles.hdrCell}>Skills</td>
                          <td className={styles.cellSmall} colSpan={14}>{h.skills}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Enterprises (conditional + house rule gated) */}
          {shouldRenderSection(ch, 'enterprises') && (
            <div className={styles.sectionBox} data-section="enterprises">
              <div className={styles.sectionTitle}>Enterprises</div>
              {(ch.enterprises ?? []).map((ent, i) => (
                <div key={i} style={{ marginBottom: i < (ch.enterprises ?? []).length - 1 ? '8px' : 0 }}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th className={styles.hdrCell}>Name</th>
                        <th className={styles.hdrCell}>Type</th>
                        <th className={`${styles.hdrCell} ${styles.colW28}`}>Level</th>
                        <th className={styles.hdrCell}>Debt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.cellBold}>{ent.name}</td>
                        <td className={styles.valCell}>{ent.type}</td>
                        <td className={styles.valCellBold}>{ent.expansionLevel}</td>
                        <td className={styles.valCell}>{ent.debt.gc}gc {ent.debt.ss}ss {ent.debt.d}d</td>
                      </tr>
                      {ent.incomeSources.length > 0 && (
                        <tr>
                          <td className={styles.hdrCell}>Income</td>
                          <td className={styles.cellSmall} colSpan={3}>
                            {ent.incomeSources.map(src => src.description).join('; ')}
                          </td>
                        </tr>
                      )}
                      {ent.specialRules.length > 0 && (
                        <tr>
                          <td className={styles.hdrCell}>Special Rules</td>
                          <td className={styles.cellSmall} colSpan={3}>
                            {ent.specialRules.join('; ')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Grudge Book (conditional + house rule gated) */}
          {shouldRenderSection(ch, 'grudgeBook') && (
            <div className={styles.sectionBox} data-section="grudgeBook">
              <div className={styles.sectionTitle}>Grudge Book</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Offence</th>
                    <th className={styles.hdrCell}>Perpetrator</th>
                    <th className={styles.hdrCell}>Restitution</th>
                    <th className={`${styles.hdrCell} ${styles.colW40}`}>Type</th>
                    <th className={`${styles.hdrCell} ${styles.colW45}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(ch.grudges ?? []).map((g, i) => (
                    <tr key={i}>
                      <td className={styles.cell}>{g.offence}</td>
                      <td className={styles.cellBold}>{g.perpetrator}</td>
                      <td className={styles.cell}>{g.restitution}</td>
                      <td className={styles.valCell}>{g.type}</td>
                      <td className={styles.valCell}>{g.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Psychology Traits (conditional + house rule gated) */}
          {shouldRenderSection(ch, 'psychologyTraits') && (
            <div className={styles.sectionBox} data-section="psychologyTraits">
              <div className={styles.sectionTitle}>Psychology Traits</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Type</th>
                    <th className={styles.hdrCell}>Target</th>
                    <th className={`${styles.hdrCell} ${styles.colW28}`}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {(ch.psychologyTraits ?? []).map((pt, i) => (
                    <tr key={i}>
                      <td className={styles.valCell}>{pt.type}</td>
                      <td className={styles.cell}>{pt.target}</td>
                      <td className={styles.valCellBold}>{pt.rating ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rituals (conditional) */}
          {shouldRenderSection(ch, 'rituals') && (
            <div className={styles.sectionBox} data-section="rituals">
              <div className={styles.sectionTitle}>Rituals</div>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th className={styles.hdrCell}>Name</th>
                    <th className={`${styles.hdrCell} ${styles.colW24}`}>CN</th>
                    <th className={`${styles.hdrCell} ${styles.colW45}`}>Type</th>
                    <th className={styles.hdrCell}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(ch.rituals ?? []).map((r, i) => (
                    <tr key={i}>
                      <td className={styles.cellBold}>{r.name}</td>
                      <td className={styles.valCell}>{r.cn}</td>
                      <td className={styles.valCell}>{r.type}</td>
                      <td className={styles.cellSmall}>{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Yenlui Balance (conditional + house rule gated) */}
          {shouldRenderSection(ch, 'yenlui') && (
            <div className={styles.sectionBox} data-section="yenlui">
              <div className={styles.sectionTitle}>Yenlui Balance</div>
              <table className={styles.tbl}>
                <tbody>
                  <tr>
                    <td className={styles.hdrCell}>State</td>
                    <td className={styles.valCellBold}>{ch.yenluiState ?? 'balanced'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Page 3+ Footer */}
          {renderPageFooter(ch.name, 3)}
        </div>

      </div>
    </div>
  );
}
