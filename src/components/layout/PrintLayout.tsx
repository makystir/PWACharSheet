import type { Character, ArmourPoints, CharacteristicKey } from '../../types/character';
import { getBonus, calculateMaxEncumbrance } from '../../logic/calculators';
import styles from './PrintLayout.module.css';

interface PrintLayoutProps {
  character: Character;
  totalWounds: number;
  armourPoints: ArmourPoints;
}

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

export function PrintLayout({ character, totalWounds, armourPoints }: PrintLayoutProps) {
  const ch = character;
  const SB = getBonus(ch.chars.S.i + ch.chars.S.a + ch.chars.S.b);
  const TB = getBonus(ch.chars.T.i + ch.chars.T.a + ch.chars.T.b);
  const WPB = getBonus(ch.chars.WP.i + ch.chars.WP.a + ch.chars.WP.b);
  const hardyLevel = ch.talents.find(t => t.n === 'Hardy')?.lvl ?? 0;
  const strongBackLevel = ch.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
  const maxEnc = calculateMaxEncumbrance(ch.chars, strongBackLevel);
  const eW = ch.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
  const eA = ch.armour.reduce((s, a) => {
    const baseEnc = parseFloat(a.enc) || 0;
    const wornEnc = a.worn !== false ? Math.max(0, baseEnc - 1) : baseEnc;
    return s + wornEnc;
  }, 0);
  const eT = ch.trappings.reduce((s, t) => s + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);
  const bSkills1 = ch.bSkills.slice(0, 13);
  const bSkills2 = ch.bSkills.slice(13);

  return (
    <div className={`print-layout ${styles.page}`}>
      {/* ═══ PAGE 1 ═══ */}
      <div className={styles.pageBreak}>
        {/* Title */}
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
              <tr><td className={styles.hdrCell}>Name</td><td className={styles.valCellLeftBold} colSpan={3}>{ch.name}</td><td className={styles.hdrCell}>Species</td><td className={styles.valCell} colSpan={2}>{ch.species}</td><td className={styles.hdrCell}>Class</td><td className={styles.valCell} colSpan={2}>{ch.class}</td></tr>
              <tr><td className={styles.hdrCell}>Career</td><td className={styles.valCellLeft} colSpan={3}>{ch.career}</td><td className={styles.hdrCell}>Level</td><td className={styles.valCell} colSpan={5}>{ch.careerLevel}</td></tr>
              <tr><td className={styles.hdrCell}>Career Path</td><td className={styles.valCellLeft} colSpan={7}>{ch.careerPath}</td><td className={styles.hdrCell}>Status</td><td className={styles.valCell}>{ch.status}</td></tr>
              <tr><td className={styles.hdrCell}>Age</td><td className={styles.valCell}>{ch.age}</td><td className={styles.hdrCell}>Height</td><td className={styles.valCell}>{ch.height}</td><td className={styles.hdrCell}>Hair</td><td className={styles.valCell} colSpan={2}>{ch.hair}</td><td className={styles.hdrCell}>Eyes</td><td className={styles.valCell} colSpan={2}>{ch.eyes}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Characteristics + Fate + Resilience + XP + Movement */}
        <div className={styles.gridCharsRow}>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Characteristics</div>
            <table className={styles.tbl}>
              <thead><tr><td className={styles.hdrCell}></td>{CHAR_KEYS.map(k => <td key={k} className={styles.hdrCell}>{k}</td>)}</tr></thead>
              <tbody>
                <tr><td className={styles.hdrCell}>Initial</td>{CHAR_KEYS.map(k => <td key={k} className={styles.valCell}>{ch.chars[k].i}</td>)}</tr>
                <tr><td className={styles.hdrCell}>Advances</td>{CHAR_KEYS.map(k => <td key={k} className={styles.valCell}>{ch.chars[k].a}</td>)}</tr>
                <tr><td className={styles.hdrCell}>Current</td>{CHAR_KEYS.map(k => <td key={k} className={styles.valCellBoldLg}>{ch.chars[k].i + ch.chars[k].a + ch.chars[k].b}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Fate</div>
            <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Fate</td><td className={styles.valCell}>{ch.fate}</td></tr><tr><td className={styles.hdrCell}>Fortune</td><td className={styles.valCell}>{ch.fortune}</td></tr></tbody></table>
          </div>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Resilience</div>
            <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Res</td><td className={styles.valCell}>{ch.resilience}</td><td className={styles.hdrCell}>Resolve</td><td className={styles.valCell}>{ch.resolve}</td></tr></tbody></table>
          </div>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Experience</div>
            <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Cur</td><td className={styles.valCell}>{ch.xpCur}</td></tr><tr><td className={styles.hdrCell}>Spent</td><td className={styles.valCell}>{ch.xpSpent}</td></tr><tr><td className={styles.hdrCell}>Total</td><td className={styles.valCell}>{ch.xpTotal}</td></tr></tbody></table>
          </div>
        </div>

        {/* Movement */}
        <div className={styles.movementBox}>
          <table className={styles.tblInline}><tbody><tr><td className={styles.hdrCell}>Move</td><td className={styles.valCell}>{ch.move.m}</td><td className={styles.hdrCell}>Walk</td><td className={styles.valCell}>{ch.move.w}</td><td className={styles.hdrCell}>Run</td><td className={styles.valCell}>{ch.move.r}</td></tr></tbody></table>
        </div>

        {/* Skills */}
        <div className={styles.gridSkills}>
          {[{ title: 'Basic Skills', skills: bSkills1 }, { title: 'Basic Skills', skills: bSkills2 }, { title: 'Grouped & Advanced Skills', skills: ch.aSkills.filter(s => s.n) }].map((block, bi) => (
            <div key={bi} className={styles.sectionBox}>
              <div className={styles.sectionTitle}>{block.title}</div>
              <table className={styles.tbl}>
                <thead><tr><th className={styles.hdrCell}>Name</th><th className={`${styles.hdrCell} ${styles.colW26}`}>Char</th><th className={`${styles.hdrCell} ${styles.colW22}`}>Adv</th><th className={`${styles.hdrCell} ${styles.colW26}`}>Skill</th></tr></thead>
                <tbody>{block.skills.map((s, i) => { const cv = ch.chars[s.c as CharacteristicKey]; const total = cv ? getBonus(cv.i + cv.a + cv.b) + s.a : s.a; return (<tr key={i}><td className={styles.cell}>{s.n}</td><td className={styles.valCell}>{s.c}</td><td className={styles.valCell}>{s.a || ''}</td><td className={styles.valCellBold}>{total || ''}</td></tr>); })}</tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Talents + Ambitions/Party */}
        <div className={styles.gridTalentsAmb}>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Talents</div>
            <table className={styles.tbl}>
              <thead><tr><th className={styles.hdrCell}>Talent</th><th className={`${styles.hdrCell} ${styles.colW28}`}>Taken</th><th className={styles.hdrCell}>Description</th></tr></thead>
              <tbody>{ch.talents.map((t, i) => (<tr key={i}><td className={styles.cellBold}>{t.n}</td><td className={styles.valCell}>{t.lvl}</td><td className={styles.cellSmall}>{t.desc}</td></tr>))}</tbody>
            </table>
          </div>
          <div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Ambitions</div>
              <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Short</td><td className={styles.valCellLeft}>{ch.ambS}</td></tr><tr><td className={styles.hdrCell}>Long</td><td className={styles.valCellLeft}>{ch.ambL}</td></tr></tbody></table>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Party</div>
              <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Name</td><td className={styles.valCellLeft}>{ch.partyN}</td></tr><tr><td className={styles.hdrCell}>Members</td><td className={styles.valCellLeft}>{ch.partyM}</td></tr></tbody></table>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PAGE 2 ═══ */}
      <div className={styles.pageSheet}>
        {/* Armour + AP */}
        <div className={styles.gridArmourAp}>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Armour</div>
            <table className={styles.tbl}>
              <thead><tr><th className={styles.hdrCell}>Name</th><th className={`${styles.hdrCell} ${styles.colW55}`}>Locations</th><th className={`${styles.hdrCell} ${styles.colW24}`}>Enc</th><th className={`${styles.hdrCell} ${styles.colW22}`}>AP</th><th className={styles.hdrCell}>Qualities</th></tr></thead>
              <tbody>{ch.armour.map((a, i) => (<tr key={i}><td className={styles.cell}>{a.name}</td><td className={styles.valCell}>{a.locations}</td><td className={styles.valCell}>{a.enc}</td><td className={styles.valCellBold}>{a.ap}</td><td className={styles.cellSmall}>{a.qualities}</td></tr>))}</tbody>
            </table>
          </div>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Armour Points</div>
            <table className={styles.tbl}><tbody>
              <tr><td className={styles.hdrCell}>Head (01-09)</td><td className={styles.valCellBold}>{armourPoints.head}</td></tr>
              <tr><td className={styles.hdrCell}>R Arm (25-44)</td><td className={styles.valCellBold}>{armourPoints.rArm}</td></tr>
              <tr><td className={styles.hdrCell}>L Arm (10-24)</td><td className={styles.valCellBold}>{armourPoints.lArm}</td></tr>
              <tr><td className={styles.hdrCell}>Body (45-79)</td><td className={styles.valCellBold}>{armourPoints.body}</td></tr>
              <tr><td className={styles.hdrCell}>R Leg (80-89)</td><td className={styles.valCellBold}>{armourPoints.rLeg}</td></tr>
              <tr><td className={styles.hdrCell}>L Leg (90-00)</td><td className={styles.valCellBold}>{armourPoints.lLeg}</td></tr>
              <tr><td className={styles.hdrCell}>Shield</td><td className={styles.valCellBold}>{armourPoints.shield}</td></tr>
            </tbody></table>
          </div>
        </div>

        {/* Trappings + Psychology + Corruption */}
        <div className={styles.gridTwoCol}>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Trappings</div>
            <table className={styles.tbl}>
              <thead><tr><th className={styles.hdrCell}>Name</th><th className={`${styles.hdrCell} ${styles.colW24}`}>Enc</th></tr></thead>
              <tbody>{ch.trappings.map((t, i) => (<tr key={i}><td className={styles.cell}>{t.name}</td><td className={styles.valCell}>{t.enc}</td></tr>))}</tbody>
            </table>
          </div>
          <div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Psychology</div>
              <div className={styles.textBlock}>{ch.psych}</div>
            </div>
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>Corruption &amp; Mutation</div>
              <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Corruption</td><td className={styles.valCell}>{ch.corr}</td><td className={styles.hdrCell}>Sin</td><td className={styles.valCell}>{ch.sin}</td></tr></tbody></table>
              {ch.muts && <div className={styles.textBlockSmall}>{ch.muts}</div>}
            </div>
          </div>
        </div>

        {/* Wealth + Encumbrance + Wounds */}
        <div className={styles.gridThreeCol}>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Wealth</div>
            <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>D</td><td className={styles.valCellBold}>{ch.wD}</td></tr><tr><td className={styles.hdrCell}>SS</td><td className={styles.valCellBold}>{ch.wSS}</td></tr><tr><td className={styles.hdrCell}>GC</td><td className={styles.valCellBold}>{ch.wGC}</td></tr></tbody></table>
          </div>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Encumbrance</div>
            <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>Weapons</td><td className={styles.valCell}>{eW}</td></tr><tr><td className={styles.hdrCell}>Armour</td><td className={styles.valCell}>{eA}</td></tr><tr><td className={styles.hdrCell}>Trappings</td><td className={styles.valCell}>{eT}</td></tr><tr><td className={styles.hdrCell}>Max Enc.</td><td className={styles.valCell}>{maxEnc}</td></tr><tr><td className={styles.hdrCellExtraBold}>Total</td><td className={styles.valCellExtraBold}>{eW + eA + eT}</td></tr></tbody></table>
          </div>
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Wounds</div>
            <table className={styles.tbl}><tbody><tr><td className={styles.hdrCell}>SB</td><td className={styles.valCell}>{SB}</td></tr><tr><td className={styles.hdrCell}>TB×2</td><td className={styles.valCell}>{TB * 2}</td></tr><tr><td className={styles.hdrCell}>WPB</td><td className={styles.valCell}>{WPB}</td></tr><tr><td className={styles.hdrCell}>Hardy</td><td className={styles.valCell}>{hardyLevel > 0 ? hardyLevel * TB : 0}</td></tr><tr><td className={styles.hdrCellExtraBold}>Wounds</td><td className={styles.valCellBoldXl}>{totalWounds}</td></tr></tbody></table>
          </div>
        </div>

        {/* Weapons */}
        <div className={styles.sectionBox}>
          <div className={styles.sectionTitle}>Weapons</div>
          <table className={styles.tbl}>
            <thead><tr><th className={styles.hdrCell}>Name</th><th className={`${styles.hdrCell} ${styles.colW45}`}>Group</th><th className={`${styles.hdrCell} ${styles.colW24}`}>Enc</th><th className={`${styles.hdrCell} ${styles.colW50}`}>Range/Reach</th><th className={`${styles.hdrCell} ${styles.colW40}`}>Damage</th><th className={styles.hdrCell}>Qualities</th></tr></thead>
            <tbody>{ch.weapons.map((w, i) => (<tr key={i}><td className={styles.cellBold}>{w.name}</td><td className={styles.valCell}>{w.group}</td><td className={styles.valCell}>{w.enc}</td><td className={styles.valCell}>{w.rangeReach || w.maxR || ''}</td><td className={styles.valCellBold}>{w.damage}</td><td className={styles.cellSmall}>{w.qualities}</td></tr>))}</tbody>
          </table>
        </div>

        {/* Spells */}
        {ch.spells.length > 0 && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Spells and Prayers</div>
            <table className={styles.tbl}>
              <thead><tr><th className={styles.hdrCell}>Name</th><th className={`${styles.hdrCell} ${styles.colW24}`}>TN</th><th className={`${styles.hdrCell} ${styles.colW45}`}>Range</th><th className={`${styles.hdrCell} ${styles.colW38}`}>Target</th><th className={`${styles.hdrCell} ${styles.colW45}`}>Duration</th><th className={styles.hdrCell}>Effect</th></tr></thead>
              <tbody>{ch.spells.map((s, i) => (<tr key={i}><td className={styles.cellBold}>{s.name}</td><td className={styles.valCell}>{s.cn}</td><td className={styles.valCell}>{s.range}</td><td className={styles.valCell}>{s.target}</td><td className={styles.valCell}>{s.duration}</td><td className={styles.cellSmall}>{s.effect}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        {/* Estate */}
        {ch.estate.name && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>Estate</div>
            <table className={styles.tbl}><tbody>
              <tr><td className={styles.hdrCell}>Name</td><td className={styles.valCellLeft}>{ch.estate.name}</td><td className={styles.hdrCell}>Location</td><td className={styles.valCellLeft}>{ch.estate.location}</td></tr>
              <tr><td className={styles.hdrCell}>Treasury</td><td className={styles.valCell}>{ch.estate.treasury.gc}gc {ch.estate.treasury.ss}ss {ch.estate.treasury.d}d</td><td className={styles.hdrCell}>Income</td><td className={styles.valCell}>{ch.estate.monthlyIncome.gc}gc {ch.estate.monthlyIncome.ss}ss {ch.estate.monthlyIncome.d}d</td></tr>
            </tbody></table>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          WFRP 4e Character Sheet — Generated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
