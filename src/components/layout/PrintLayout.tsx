import type { CSSProperties } from 'react';
import type { Character, ArmourPoints, CharacteristicKey } from '../../types/character';
import { getBonus, calculateMaxEncumbrance } from '../../logic/calculators';

interface PrintLayoutProps {
  character: Character;
  totalWounds: number;
  armourPoints: ArmourPoints;
}

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

// Warhammer-themed print styles
const page: CSSProperties = { fontFamily: "'Cinzel', 'Times New Roman', serif", fontSize: '9px', color: '#1a1510', lineHeight: 1.35, background: '#f5efe0' };
const ornBorder = '3px double #8a7a5a';
const sectionBox: CSSProperties = { border: '1px solid #a89878', borderRadius: '4px', padding: '8px 10px', marginBottom: '6px', background: 'rgba(168,136,78,0.06)' };
const sectionTitle: CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', color: '#4a3a20', borderBottom: '2px solid #8a7a5a', paddingBottom: '3px', marginBottom: '5px' };
const cell: CSSProperties = { border: '1px solid #c8b898', padding: '2px 4px', fontSize: '9px' };
const hdrCell: CSSProperties = { ...cell, fontWeight: 700, background: '#e8dcc8', color: '#4a3a20', textAlign: 'center', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const valCell: CSSProperties = { ...cell, textAlign: 'center' };
const tbl: CSSProperties = { width: '100%', borderCollapse: 'collapse' };

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
    <div className="print-layout" style={page}>
      {/* ═══ PAGE 1 ═══ */}
      <div style={{ pageBreakAfter: 'always', border: ornBorder, padding: '12px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '18px', fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', color: '#3a2a10', borderBottom: '3px double #8a7a5a', borderTop: '3px double #8a7a5a', padding: '4px 0' }}>
            {ch.name || 'Unnamed Character'}
          </div>
          <div style={{ fontSize: '9px', color: '#6a5a40', letterSpacing: '1px', marginTop: '2px' }}>Warhammer Fantasy Roleplay — Character Record</div>
        </div>

        {/* Personal Details */}
        <div style={sectionBox}>
          <table style={tbl}>
            <tbody>
              <tr><td style={hdrCell}>Name</td><td style={{ ...valCell, textAlign: 'left', fontWeight: 600 }} colSpan={3}>{ch.name}</td><td style={hdrCell}>Species</td><td style={valCell} colSpan={2}>{ch.species}</td><td style={hdrCell}>Class</td><td style={valCell} colSpan={2}>{ch.class}</td></tr>
              <tr><td style={hdrCell}>Career</td><td style={{ ...valCell, textAlign: 'left' }} colSpan={3}>{ch.career}</td><td style={hdrCell}>Level</td><td style={valCell} colSpan={5}>{ch.careerLevel}</td></tr>
              <tr><td style={hdrCell}>Career Path</td><td style={{ ...valCell, textAlign: 'left' }} colSpan={7}>{ch.careerPath}</td><td style={hdrCell}>Status</td><td style={valCell}>{ch.status}</td></tr>
              <tr><td style={hdrCell}>Age</td><td style={valCell}>{ch.age}</td><td style={hdrCell}>Height</td><td style={valCell}>{ch.height}</td><td style={hdrCell}>Hair</td><td style={valCell} colSpan={2}>{ch.hair}</td><td style={hdrCell}>Eyes</td><td style={valCell} colSpan={2}>{ch.eyes}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Characteristics + Fate + Resilience + XP + Movement */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1.2fr', gap: '4px', marginBottom: '4px' }}>
          <div style={sectionBox}>
            <div style={sectionTitle}>Characteristics</div>
            <table style={tbl}>
              <thead><tr><td style={hdrCell}></td>{CHAR_KEYS.map(k => <td key={k} style={hdrCell}>{k}</td>)}</tr></thead>
              <tbody>
                <tr><td style={hdrCell}>Initial</td>{CHAR_KEYS.map(k => <td key={k} style={valCell}>{ch.chars[k].i}</td>)}</tr>
                <tr><td style={hdrCell}>Advances</td>{CHAR_KEYS.map(k => <td key={k} style={valCell}>{ch.chars[k].a}</td>)}</tr>
                <tr><td style={hdrCell}>Current</td>{CHAR_KEYS.map(k => <td key={k} style={{ ...valCell, fontWeight: 700, fontSize: '10px' }}>{ch.chars[k].i + ch.chars[k].a + ch.chars[k].b}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <div style={sectionBox}>
            <div style={sectionTitle}>Fate</div>
            <table style={tbl}><tbody><tr><td style={hdrCell}>Fate</td><td style={valCell}>{ch.fate}</td></tr><tr><td style={hdrCell}>Fortune</td><td style={valCell}>{ch.fortune}</td></tr></tbody></table>
          </div>
          <div style={sectionBox}>
            <div style={sectionTitle}>Resilience</div>
            <table style={tbl}><tbody><tr><td style={hdrCell}>Res</td><td style={valCell}>{ch.resilience}</td><td style={hdrCell}>Resolve</td><td style={valCell}>{ch.resolve}</td></tr></tbody></table>
          </div>
          <div style={sectionBox}>
            <div style={sectionTitle}>Experience</div>
            <table style={tbl}><tbody><tr><td style={hdrCell}>Cur</td><td style={valCell}>{ch.xpCur}</td></tr><tr><td style={hdrCell}>Spent</td><td style={valCell}>{ch.xpSpent}</td></tr><tr><td style={hdrCell}>Total</td><td style={valCell}>{ch.xpTotal}</td></tr></tbody></table>
          </div>
        </div>

        {/* Movement */}
        <div style={{ ...sectionBox, display: 'flex', justifyContent: 'flex-end', padding: '4px 10px' }}>
          <table style={{ borderCollapse: 'collapse' }}><tbody><tr><td style={hdrCell}>Move</td><td style={valCell}>{ch.move.m}</td><td style={hdrCell}>Walk</td><td style={valCell}>{ch.move.w}</td><td style={hdrCell}>Run</td><td style={valCell}>{ch.move.r}</td></tr></tbody></table>
        </div>

        {/* Skills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '4px' }}>
          {[{ title: 'Basic Skills', skills: bSkills1 }, { title: 'Basic Skills', skills: bSkills2 }, { title: 'Grouped & Advanced Skills', skills: ch.aSkills.filter(s => s.n) }].map((block, bi) => (
            <div key={bi} style={sectionBox}>
              <div style={sectionTitle}>{block.title}</div>
              <table style={tbl}>
                <thead><tr><th style={hdrCell}>Name</th><th style={{ ...hdrCell, width: '26px' }}>Char</th><th style={{ ...hdrCell, width: '22px' }}>Adv</th><th style={{ ...hdrCell, width: '26px' }}>Skill</th></tr></thead>
                <tbody>{block.skills.map((s, i) => { const cv = ch.chars[s.c as CharacteristicKey]; const total = cv ? getBonus(cv.i + cv.a + cv.b) + s.a : s.a; return (<tr key={i}><td style={cell}>{s.n}</td><td style={valCell}>{s.c}</td><td style={valCell}>{s.a || ''}</td><td style={{ ...valCell, fontWeight: 600 }}>{total || ''}</td></tr>); })}</tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Talents + Ambitions/Party */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '4px' }}>
          <div style={sectionBox}>
            <div style={sectionTitle}>Talents</div>
            <table style={tbl}>
              <thead><tr><th style={hdrCell}>Talent</th><th style={{ ...hdrCell, width: '28px' }}>Taken</th><th style={hdrCell}>Description</th></tr></thead>
              <tbody>{ch.talents.map((t, i) => (<tr key={i}><td style={{ ...cell, fontWeight: 600 }}>{t.n}</td><td style={valCell}>{t.lvl}</td><td style={{ ...cell, fontSize: '7px' }}>{t.desc}</td></tr>))}</tbody>
            </table>
          </div>
          <div>
            <div style={sectionBox}>
              <div style={sectionTitle}>Ambitions</div>
              <table style={tbl}><tbody><tr><td style={hdrCell}>Short</td><td style={{ ...valCell, textAlign: 'left' }}>{ch.ambS}</td></tr><tr><td style={hdrCell}>Long</td><td style={{ ...valCell, textAlign: 'left' }}>{ch.ambL}</td></tr></tbody></table>
            </div>
            <div style={sectionBox}>
              <div style={sectionTitle}>Party</div>
              <table style={tbl}><tbody><tr><td style={hdrCell}>Name</td><td style={{ ...valCell, textAlign: 'left' }}>{ch.partyN}</td></tr><tr><td style={hdrCell}>Members</td><td style={{ ...valCell, textAlign: 'left' }}>{ch.partyM}</td></tr></tbody></table>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PAGE 2 ═══ */}
      <div style={{ border: ornBorder, padding: '12px' }}>
        {/* Armour + AP */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '4px', marginBottom: '4px' }}>
          <div style={sectionBox}>
            <div style={sectionTitle}>Armour</div>
            <table style={tbl}>
              <thead><tr><th style={hdrCell}>Name</th><th style={{ ...hdrCell, width: '55px' }}>Locations</th><th style={{ ...hdrCell, width: '24px' }}>Enc</th><th style={{ ...hdrCell, width: '22px' }}>AP</th><th style={hdrCell}>Qualities</th></tr></thead>
              <tbody>{ch.armour.map((a, i) => (<tr key={i}><td style={cell}>{a.name}</td><td style={valCell}>{a.locations}</td><td style={valCell}>{a.enc}</td><td style={{ ...valCell, fontWeight: 700 }}>{a.ap}</td><td style={{ ...cell, fontSize: '7px' }}>{a.qualities}</td></tr>))}</tbody>
            </table>
          </div>
          <div style={sectionBox}>
            <div style={sectionTitle}>Armour Points</div>
            <table style={tbl}><tbody>
              <tr><td style={hdrCell}>Head (01-09)</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.head}</td></tr>
              <tr><td style={hdrCell}>R Arm (25-44)</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.rArm}</td></tr>
              <tr><td style={hdrCell}>L Arm (10-24)</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.lArm}</td></tr>
              <tr><td style={hdrCell}>Body (45-79)</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.body}</td></tr>
              <tr><td style={hdrCell}>R Leg (80-89)</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.rLeg}</td></tr>
              <tr><td style={hdrCell}>L Leg (90-00)</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.lLeg}</td></tr>
              <tr><td style={hdrCell}>Shield</td><td style={{ ...valCell, fontWeight: 700 }}>{armourPoints.shield}</td></tr>
            </tbody></table>
          </div>
        </div>

        {/* Trappings + Psychology + Corruption */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
          <div style={sectionBox}>
            <div style={sectionTitle}>Trappings</div>
            <table style={tbl}>
              <thead><tr><th style={hdrCell}>Name</th><th style={{ ...hdrCell, width: '24px' }}>Enc</th></tr></thead>
              <tbody>{ch.trappings.map((t, i) => (<tr key={i}><td style={cell}>{t.name}</td><td style={valCell}>{t.enc}</td></tr>))}</tbody>
            </table>
          </div>
          <div>
            <div style={sectionBox}>
              <div style={sectionTitle}>Psychology</div>
              <div style={{ ...cell, minHeight: '24px', whiteSpace: 'pre-wrap' }}>{ch.psych}</div>
            </div>
            <div style={sectionBox}>
              <div style={sectionTitle}>Corruption &amp; Mutation</div>
              <table style={tbl}><tbody><tr><td style={hdrCell}>Corruption</td><td style={valCell}>{ch.corr}</td><td style={hdrCell}>Sin</td><td style={valCell}>{ch.sin}</td></tr></tbody></table>
              {ch.muts && <div style={{ ...cell, fontSize: '8px', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{ch.muts}</div>}
            </div>
          </div>
        </div>

        {/* Wealth + Encumbrance + Wounds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '4px' }}>
          <div style={sectionBox}>
            <div style={sectionTitle}>Wealth</div>
            <table style={tbl}><tbody><tr><td style={hdrCell}>D</td><td style={{ ...valCell, fontWeight: 700 }}>{ch.wD}</td></tr><tr><td style={hdrCell}>SS</td><td style={{ ...valCell, fontWeight: 700 }}>{ch.wSS}</td></tr><tr><td style={hdrCell}>GC</td><td style={{ ...valCell, fontWeight: 700 }}>{ch.wGC}</td></tr></tbody></table>
          </div>
          <div style={sectionBox}>
            <div style={sectionTitle}>Encumbrance</div>
            <table style={tbl}><tbody><tr><td style={hdrCell}>Weapons</td><td style={valCell}>{eW}</td></tr><tr><td style={hdrCell}>Armour</td><td style={valCell}>{eA}</td></tr><tr><td style={hdrCell}>Trappings</td><td style={valCell}>{eT}</td></tr><tr><td style={hdrCell}>Max Enc.</td><td style={valCell}>{maxEnc}</td></tr><tr><td style={{ ...hdrCell, fontWeight: 900 }}>Total</td><td style={{ ...valCell, fontWeight: 900 }}>{eW + eA + eT}</td></tr></tbody></table>
          </div>
          <div style={sectionBox}>
            <div style={sectionTitle}>Wounds</div>
            <table style={tbl}><tbody><tr><td style={hdrCell}>SB</td><td style={valCell}>{SB}</td></tr><tr><td style={hdrCell}>TB×2</td><td style={valCell}>{TB * 2}</td></tr><tr><td style={hdrCell}>WPB</td><td style={valCell}>{WPB}</td></tr><tr><td style={hdrCell}>Hardy</td><td style={valCell}>{hardyLevel > 0 ? hardyLevel * TB : 0}</td></tr><tr><td style={{ ...hdrCell, fontWeight: 900 }}>Wounds</td><td style={{ ...valCell, fontWeight: 900, fontSize: '11px' }}>{totalWounds}</td></tr></tbody></table>
          </div>
        </div>

        {/* Weapons */}
        <div style={sectionBox}>
          <div style={sectionTitle}>Weapons</div>
          <table style={tbl}>
            <thead><tr><th style={hdrCell}>Name</th><th style={{ ...hdrCell, width: '45px' }}>Group</th><th style={{ ...hdrCell, width: '24px' }}>Enc</th><th style={{ ...hdrCell, width: '50px' }}>Range/Reach</th><th style={{ ...hdrCell, width: '40px' }}>Damage</th><th style={hdrCell}>Qualities</th></tr></thead>
            <tbody>{ch.weapons.map((w, i) => (<tr key={i}><td style={{ ...cell, fontWeight: 600 }}>{w.name}</td><td style={valCell}>{w.group}</td><td style={valCell}>{w.enc}</td><td style={valCell}>{w.rangeReach || w.maxR || ''}</td><td style={{ ...valCell, fontWeight: 700 }}>{w.damage}</td><td style={{ ...cell, fontSize: '7px' }}>{w.qualities}</td></tr>))}</tbody>
          </table>
        </div>

        {/* Spells */}
        {ch.spells.length > 0 && (
          <div style={sectionBox}>
            <div style={sectionTitle}>Spells and Prayers</div>
            <table style={tbl}>
              <thead><tr><th style={hdrCell}>Name</th><th style={{ ...hdrCell, width: '24px' }}>TN</th><th style={{ ...hdrCell, width: '45px' }}>Range</th><th style={{ ...hdrCell, width: '38px' }}>Target</th><th style={{ ...hdrCell, width: '45px' }}>Duration</th><th style={hdrCell}>Effect</th></tr></thead>
              <tbody>{ch.spells.map((s, i) => (<tr key={i}><td style={{ ...cell, fontWeight: 600 }}>{s.name}</td><td style={valCell}>{s.cn}</td><td style={valCell}>{s.range}</td><td style={valCell}>{s.target}</td><td style={valCell}>{s.duration}</td><td style={{ ...cell, fontSize: '7px' }}>{s.effect}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        {/* Estate */}
        {ch.estate.name && (
          <div style={sectionBox}>
            <div style={sectionTitle}>Estate</div>
            <table style={tbl}><tbody>
              <tr><td style={hdrCell}>Name</td><td style={{ ...valCell, textAlign: 'left' }}>{ch.estate.name}</td><td style={hdrCell}>Location</td><td style={{ ...valCell, textAlign: 'left' }}>{ch.estate.location}</td></tr>
              <tr><td style={hdrCell}>Treasury</td><td style={valCell}>{ch.estate.treasury.gc}gc {ch.estate.treasury.ss}ss {ch.estate.treasury.d}d</td><td style={hdrCell}>Income</td><td style={valCell}>{ch.estate.monthlyIncome.gc}gc {ch.estate.monthlyIncome.ss}ss {ch.estate.monthlyIncome.d}d</td></tr>
            </tbody></table>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '7px', color: '#8a7a5a', letterSpacing: '1px', borderTop: '1px solid #c8b898', paddingTop: '4px' }}>
          WFRP 4e Character Sheet — Generated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
