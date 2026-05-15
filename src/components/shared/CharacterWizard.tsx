import { useState, useCallback, useMemo } from 'react';
import type { Character, CharacteristicKey, CareerScheme, CareerLevel } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { SPECIES_DATA, SPECIES_OPTIONS } from '../../data/species';
import { CAREER_SCHEMES, CAREER_CLASS_LIST } from '../../data/careers';
import { TALENT_DB } from '../../data/talents';
import { getCareersByClass } from '../../logic/careers';
import styles from './CharacterWizard.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CharacterWizardProps {
  onComplete: (character: Character) => void;
  onCancel: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type CharMethod = 'random' | 'rearrange' | 'pointbuy';

const ALL_CHARS: CharacteristicKey[] = ['WS','BS','S','T','I','Ag','Dex','Int','WP','Fel'];

const CHAR_LABELS: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness',
  I: 'Initiative', Ag: 'Agility', Dex: 'Dexterity', Int: 'Intelligence',
  WP: 'Willpower', Fel: 'Fellowship',
};

// ─── Species flavor text ─────────────────────────────────────────────────────

const SPECIES_FLAVOR: Record<string, string> = {
  'Human / Reiklander': 'Humans are the most numerous and diverse of the civilised races. Reiklanders hail from the heart of the Empire, a land of rolling hills, dark forests, and bustling cities. Ambitious and adaptable, they are found in every walk of life.',
  'Dwarf': 'Dwarfs are a proud, ancient race of master craftsmen and fierce warriors. Stubborn and honourable, they hold grudges for generations and value gold, ale, and the bonds of kinship above all else.',
  'Halfling': 'Halflings are a small, cheerful folk known for their love of good food, fine pipe-weed, and comfortable living. Do not be fooled by their stature — they are surprisingly resilient and remarkably lucky.',
  'High Elf': 'High Elves are the eldest of the civilised races, hailing from the island continent of Ulthuan. Graceful, long-lived, and possessed of keen senses, they view the younger races with a mixture of pity and disdain.',
  'High Elves (Caledor)': 'Caledor was once the mightiest of Ulthuan\'s kingdoms, home to Dragon riders and proud warriors. Though the Dragons now slumber, Caledorians remain haughty and martial, ever seeking to restore their kingdom\'s former glory.',
  'High Elves (Ellyrion)': 'Ellyrion is a land of open plains and swift horses. Its people are renowned riders and breeders of steeds, with a deep bond to their animals and a love of freedom and the open sky.',
  'High Elves (Avelorn)': 'Avelorn is the spiritual heart of Ulthuan, a pastoral paradise ruled by the Everqueen. Its folk are whimsical and artistic, drawn to beauty and nature, yet fierce in defence of their idyllic homeland.',
  'High Elves (Saphery)': 'Saphery is the realm of mages and scholars, home to the White Tower of Hoeth. Its people prize knowledge above all else, and even the lowliest Sapherian values learning and arcane lore.',
  'High Elves (Eataine)': 'Eataine is the seat of the Phoenix King and home to the great city of Lothern. Its people are cosmopolitan traders, diplomats, and explorers, inspired by commerce and the wider world.',
  'High Elves (Tiranoc)': 'Tiranoc was devastated during the Sundering but its people endure. They are resilient charioteers and horsemasters who remember their kingdom\'s lost glory and harbour deep hatred for the Dark Elves.',
  'High Elves (Nagarythe)': 'The Shadowlands of Nagarythe breed restless, driven Elves consumed by the need to thwart the Druchii. They are stealthy scouts and relentless warriors, rarely welcomed elsewhere in Ulthuan.',
  'High Elves (Chrace)': 'Chrace is a rugged, forested kingdom whose people are hardy hunters and woodsmen. The legendary White Lions of Chrace serve as the Phoenix King\'s bodyguard, embodying their homeland\'s strength.',
  'High Elves (Cothique)': 'Cothique is a maritime kingdom of bold sailors and explorers. Its people are drawn to fresh horizons, seeking discovery, trade, and the sheer exhilaration of the open sea.',
  'High Elves (Yvresse)': 'Since Grom\'s invasion, Yvresse\'s subjects are resolute and dour, with a disarming tendency to blunt manners. Under Eltharion the Grim, they are expert Daemon-hunters who always hold the line.',
  'High Elves (Sea Elf)': 'Sea Elves are High Elves who dwell in trading enclaves abroad or spend their lives at sea. Cosmopolitan and worldly, they are looked down upon by Ulthuan\'s more conventional Asur.',
  'Wood Elf': 'Wood Elves dwell in the ancient forest of Athel Loren, living in harmony with nature. Wild and fierce, they are deadly archers and silent hunters who guard their woodland realm with lethal determination.',
};

const CLASS_FLAVOR: Record<string, string> = {
  Academics: 'Scholars, physicians, and learned folk who pursue knowledge and the arcane arts.',
  Burghers: 'Merchants, artisans, and townsfolk who form the backbone of the Empire\'s economy.',
  Courtiers: 'Nobles, diplomats, and those who navigate the treacherous waters of Imperial politics.',
  Peasants: 'The common folk — farmers, labourers, and humble servants of the land.',
  Rangers: 'Wanderers, scouts, and those who make their living in the wild places of the Old World.',
  Riverfolk: 'Boatmen, fishermen, and all who ply their trade upon the Empire\'s great rivers.',
  Rogues: 'Thieves, charlatans, and those who live outside the law — or at least bend it considerably.',
  Warriors: 'Soldiers, knights, and fighters who live and die by the sword.',
};

// ─── Dice helpers ────────────────────────────────────────────────────────────

function roll2d10(): number {
  return Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
}

function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

// ─── Species-restricted careers ──────────────────────────────────────────────
// Slayer is Dwarf-only, Badger Rider is Halfling-only, Warrior of Tzeentch is excluded from normal creation
const SPECIES_CAREER_EXCLUSIONS: Record<string, string[]> = {
  'Human / Reiklander': ['Slayer', 'Badger Rider', 'Ironbreaker', 'Warrior of Tzeentch'],
  'Dwarf': ['Badger Rider', 'Warrior of Tzeentch'],
  'Halfling': ['Slayer', 'Ironbreaker', 'Warrior of Tzeentch'],
  'High Elf': ['Slayer', 'Badger Rider', 'Ironbreaker', 'Warrior of Tzeentch'],
  'Wood Elf': ['Slayer', 'Badger Rider', 'Ironbreaker', 'Warrior of Tzeentch'],
};

function getExclusionsForSpecies(species: string): string[] {
  if (SPECIES_CAREER_EXCLUSIONS[species]) return SPECIES_CAREER_EXCLUSIONS[species];
  if (species.startsWith('High Elves')) return SPECIES_CAREER_EXCLUSIONS['High Elf'];
  if (species.startsWith('Dwarfs')) return SPECIES_CAREER_EXCLUSIONS['Dwarf'];
  return [];
}

function getCareersForClassAndSpecies(className: string, species: string): string[] {
  const all = getCareersByClass(className);
  const excluded = getExclusionsForSpecies(species);
  return all.filter(c => !excluded.includes(c) && CAREER_SCHEMES[c]?.level1);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CharacterWizard({ onComplete, onCancel }: CharacterWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: Name & Species
  const [charName, setCharName] = useState('');
  const [species, setSpecies] = useState('');
  const [speciesRolled, setSpeciesRolled] = useState(false);

  // Step 2: Class & Career
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCareer, setSelectedCareer] = useState('');
  const [careerRolled, setCareerRolled] = useState(false);

  // Step 3: Characteristics
  const [charMethod, setCharMethod] = useState<CharMethod>('random');
  const [rolledValues, setRolledValues] = useState<Record<CharacteristicKey, number> | null>(null);
  const [rearranged, setRearranged] = useState<Record<CharacteristicKey, number> | null>(null);
  const [pointBuy, setPointBuy] = useState<Record<CharacteristicKey, number>>(
    () => Object.fromEntries(ALL_CHARS.map(k => [k, 10])) as Record<CharacteristicKey, number>
  );
  const [charAdvances, setCharAdvances] = useState<Record<CharacteristicKey, number>>(
    () => Object.fromEntries(ALL_CHARS.map(k => [k, 0])) as Record<CharacteristicKey, number>
  );

  // Step 4: Skills & Talents
  const [speciesSkill5, setSpeciesSkill5] = useState<string[]>([]);
  const [speciesSkill3, setSpeciesSkill3] = useState<string[]>([]);
  const [speciesTalentChoices, setSpeciesTalentChoices] = useState<Record<number, string>>({});
  const [careerSkillAdvances, setCareerSkillAdvances] = useState<Record<string, number>>({});
  const [selectedCareerTalent, setSelectedCareerTalent] = useState('');

  // Step 5: Fate, Resilience & Details
  const [extraFate, setExtraFate] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [hair, setHair] = useState('');
  const [eyes, setEyes] = useState('');
  const [ambShort, setAmbShort] = useState('');
  const [ambLong, setAmbLong] = useState('');

  // ─── Derived data ────────────────────────────────────────────────────────

  const speciesData = species ? SPECIES_DATA[species] : null;
  const careerScheme: CareerScheme | undefined = selectedCareer ? CAREER_SCHEMES[selectedCareer] : undefined;
  const careerLevel1: CareerLevel | undefined = careerScheme?.level1;

  const availableCareers = useMemo(() => {
    if (!selectedClass || !species) return [];
    return getCareersForClassAndSpecies(selectedClass, species);
  }, [selectedClass, species]);

  // XP bonuses
  const speciesXP = speciesRolled ? 20 : 0;
  const careerXP = careerRolled ? 50 : 0;
  const charXP = charMethod === 'random' ? 50 : charMethod === 'rearrange' ? 25 : 0;
  const totalBonusXP = speciesXP + careerXP + charXP;

  // ─── Characteristic helpers ──────────────────────────────────────────────

  const rollAllCharacteristics = useCallback(() => {
    const vals = {} as Record<CharacteristicKey, number>;
    for (const k of ALL_CHARS) vals[k] = roll2d10();
    setRolledValues(vals);
    setRearranged({ ...vals });
  }, []);

  const getBaseRolls = useCallback((): Record<CharacteristicKey, number> => {
    if (charMethod === 'pointbuy') return pointBuy;
    if (charMethod === 'rearrange' && rearranged) return rearranged;
    if (rolledValues) return rolledValues;
    return Object.fromEntries(ALL_CHARS.map(k => [k, 0])) as Record<CharacteristicKey, number>;
  }, [charMethod, pointBuy, rearranged, rolledValues]);

  const getFinalChar = useCallback((key: CharacteristicKey): number => {
    const base = getBaseRolls()[key];
    const specMod = speciesData?.chars[key] ?? 0;
    const adv = charAdvances[key] ?? 0;
    return base + specMod + adv;
  }, [getBaseRolls, speciesData, charAdvances]);

  const totalCharAdvances = Object.values(charAdvances).reduce((a, b) => a + b, 0);

  const careerCharacteristics = careerLevel1?.characteristics ?? [];

  // ─── Rearrange swap helper ───────────────────────────────────────────────

  const [swapFrom, setSwapFrom] = useState<CharacteristicKey | null>(null);

  const handleRearrangeClick = useCallback((key: CharacteristicKey) => {
    if (!rearranged) return;
    if (swapFrom === null) {
      setSwapFrom(key);
    } else {
      if (swapFrom !== key) {
        setRearranged(prev => {
          if (!prev) return prev;
          const copy = { ...prev };
          const tmp = copy[swapFrom];
          copy[swapFrom] = copy[key];
          copy[key] = tmp;
          return copy;
        });
      }
      setSwapFrom(null);
    }
  }, [rearranged, swapFrom]);

  // ─── Species skill helpers ───────────────────────────────────────────────

  const speciesSkillList = speciesData?.skills ?? [];
  const totalCareerSkillAdvances = Object.values(careerSkillAdvances).reduce((a, b) => a + b, 0);

  // ─── Species talent helpers ──────────────────────────────────────────────

  const speciesTalentList = speciesData?.talents ?? [];

  const parseTalentOptions = useCallback((talent: string): { isChoice: boolean; options: string[] } => {
    if (talent.includes(' or ')) {
      return { isChoice: true, options: talent.split(' or ').map(s => s.trim()) };
    }
    return { isChoice: false, options: [talent] };
  }, []);

  const getTalentDesc = useCallback((name: string): string => {
    const t = TALENT_DB.find(t => t.name === name || name.startsWith(t.name.split(' (')[0]));
    return t?.desc ?? '';
  }, []);

  const getResolvedTalents = useCallback((): string[] => {
    return speciesTalentList.map((t, i) => {
      const parsed = parseTalentOptions(t);
      if (parsed.isChoice) {
        return speciesTalentChoices[i] || parsed.options[0];
      }
      return parsed.options[0];
    });
  }, [speciesTalentList, speciesTalentChoices, parseTalentOptions]);

  // ─── Random species roll ─────────────────────────────────────────────────

  const handleRandomSpecies = useCallback(() => {
    const roll = rollD100();
    let picked: string;
    if (roll <= 90) picked = 'Human / Reiklander';
    else if (roll <= 94) picked = 'Halfling';
    else if (roll <= 98) picked = 'Dwarf';
    else if (roll === 99) picked = 'High Elf';
    else picked = 'Wood Elf';
    setSpecies(picked);
    setSpeciesRolled(true);
    // Reset downstream
    setSelectedClass('');
    setSelectedCareer('');
    setCareerRolled(false);
  }, []);

  // ─── Random career roll ──────────────────────────────────────────────────

  const handleRandomCareer = useCallback(() => {
    if (!species) return;
    // Gather all available careers for this species
    const allCareers: string[] = [];
    for (const cls of CAREER_CLASS_LIST) {
      allCareers.push(...getCareersForClassAndSpecies(cls, species));
    }
    if (allCareers.length === 0) return;
    const idx = Math.floor(Math.random() * allCareers.length);
    const picked = allCareers[idx];
    const scheme = CAREER_SCHEMES[picked];
    if (scheme) {
      setSelectedClass(scheme.class);
      setSelectedCareer(picked);
      setCareerRolled(true);
    }
  }, [species]);

  // ─── Validation ──────────────────────────────────────────────────────────

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1: return charName.trim().length > 0 && species.length > 0;
      case 2: return selectedClass.length > 0 && selectedCareer.length > 0;
      case 3: {
        if (charMethod !== 'pointbuy' && !rolledValues) return false;
        if (charMethod === 'pointbuy') {
          const total = Object.values(pointBuy).reduce((a, b) => a + b, 0);
          if (total !== 100) return false;
        }
        if (totalCharAdvances !== 5) return false;
        return true;
      }
      case 4: {
        if (speciesSkill5.length !== 3) return false;
        if (speciesSkill3.length !== 3) return false;
        // No overlap
        if (speciesSkill5.some(s => speciesSkill3.includes(s))) return false;
        if (totalCareerSkillAdvances !== 40) return false;
        if (!selectedCareerTalent) return false;
        return true;
      }
      case 5: {
        const ep = speciesData?.extraPoints ?? 0;
        const extraRes = ep - extraFate;
        if (extraFate < 0 || extraRes < 0) return false;
        return true;
      }
      case 6: return true;
      default: return false;
    }
  }, [step, charName, species, selectedClass, selectedCareer, charMethod, rolledValues,
      pointBuy, totalCharAdvances, speciesSkill5, speciesSkill3, totalCareerSkillAdvances,
      selectedCareerTalent, speciesData, extraFate]);

  // ─── Build final character ───────────────────────────────────────────────

  const buildCharacter = useCallback((): Character => {
    const char = structuredClone(BLANK_CHARACTER);
    char.name = charName.trim();
    char.species = species;
    char.class = careerScheme?.class ?? '';
    char.career = selectedCareer;
    char.careerLevel = careerLevel1?.title ?? '';
    char.careerPath = selectedCareer;
    char.status = careerLevel1?.status ?? '';

    // Characteristics
    const baseRolls = getBaseRolls();
    for (const k of ALL_CHARS) {
      const specMod = speciesData?.chars[k] ?? 0;
      char.chars[k] = { i: baseRolls[k] + specMod, a: charAdvances[k], b: 0 };
    }

    // Movement
    const mv = speciesData?.move ?? 4;
    char.move = { m: mv, w: mv * 2, r: mv * 4 };

    // Fate & Resilience
    const baseFate = speciesData?.fate ?? 0;
    const baseRes = speciesData?.resilience ?? 0;
    const ep = speciesData?.extraPoints ?? 0;
    const extraRes = ep - extraFate;
    char.fate = baseFate + extraFate;
    char.fortune = baseFate + extraFate;
    char.resilience = baseRes + extraRes;
    char.resolve = baseRes + extraRes;
    char.speciesExtraPoints = ep;
    char.woundsUseSB = speciesData?.woundsUseSB ?? false;

    // Species data
    char.speciesSkills = speciesData?.skills ?? [];
    char.speciesTalents = speciesData?.talents ?? [];

    // Skills — apply species skill advances
    for (const skillName of speciesSkill5) {
      const bIdx = char.bSkills.findIndex(s => s.n === skillName);
      if (bIdx >= 0) {
        char.bSkills[bIdx] = { ...char.bSkills[bIdx], a: char.bSkills[bIdx].a + 5 };
      } else {
        // Might be an advanced skill or specialty
        const existing = char.aSkills.findIndex(s => s.n === skillName);
        if (existing >= 0) {
          char.aSkills[existing] = { ...char.aSkills[existing], a: char.aSkills[existing].a + 5 };
        } else {
          char.aSkills.push({ n: skillName, c: 'Int', a: 5 });
        }
      }
    }
    for (const skillName of speciesSkill3) {
      const bIdx = char.bSkills.findIndex(s => s.n === skillName);
      if (bIdx >= 0) {
        char.bSkills[bIdx] = { ...char.bSkills[bIdx], a: char.bSkills[bIdx].a + 3 };
      } else {
        const existing = char.aSkills.findIndex(s => s.n === skillName);
        if (existing >= 0) {
          char.aSkills[existing] = { ...char.aSkills[existing], a: char.aSkills[existing].a + 3 };
        } else {
          char.aSkills.push({ n: skillName, c: 'Int', a: 3 });
        }
      }
    }

    // Career skill advances
    const careerSkills = careerLevel1?.skills ?? [];
    for (const skillName of careerSkills) {
      const adv = careerSkillAdvances[skillName] ?? 0;
      if (adv <= 0) continue;
      const bIdx = char.bSkills.findIndex(s => s.n === skillName);
      if (bIdx >= 0) {
        char.bSkills[bIdx] = { ...char.bSkills[bIdx], a: char.bSkills[bIdx].a + adv };
      } else {
        const existing = char.aSkills.findIndex(s => s.n === skillName);
        if (existing >= 0) {
          char.aSkills[existing] = { ...char.aSkills[existing], a: char.aSkills[existing].a + adv };
        } else {
          char.aSkills.push({ n: skillName, c: 'Int', a: adv });
        }
      }
    }

    // Talents
    const resolvedTalents = getResolvedTalents();
    for (const t of resolvedTalents) {
      if (!char.talents.find(x => x.n === t)) {
        char.talents.push({ n: t, lvl: 1, desc: getTalentDesc(t) });
      }
    }
    if (selectedCareerTalent && !char.talents.find(x => x.n === selectedCareerTalent)) {
      char.talents.push({ n: selectedCareerTalent, lvl: 1, desc: getTalentDesc(selectedCareerTalent) });
    }

    // Details
    char.age = age;
    char.height = height;
    char.hair = hair;
    char.eyes = eyes;
    char.motivation = motivation;
    char.ambS = ambShort;
    char.ambL = ambLong;

    // XP
    char.xpCur = totalBonusXP;
    char.xpTotal = totalBonusXP;

    return char;
  }, [charName, species, careerScheme, selectedCareer, careerLevel1, getBaseRolls,
      speciesData, charAdvances, extraFate, speciesSkill5, speciesSkill3,
      careerSkillAdvances, getResolvedTalents, selectedCareerTalent,
      age, height, hair, eyes, motivation, ambShort, ambLong, totalBonusXP]);

  // ─── Step renderers ──────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <div className={styles.sectionTitle}>Step 1: Name &amp; Species</div>
      <p className={styles.flavorTextPlain}>
        Every hero begins with a name and a birthright. Choose wisely — the Old World is unforgiving.
      </p>

      <div className={styles.card}>
        <label className={styles.label}>Character Name</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Enter your character's name..."
          value={charName}
          onChange={e => setCharName(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.card}>
        <div className={styles.flexBetween}>
          <label className={styles.labelInline}>Species</label>
          <button
            type="button"
            className={styles.btnRollRandom}
            onClick={handleRandomSpecies}
            title="Roll d100 for random species (+20 XP)"
          >
            🎲 Roll Random <span className={styles.xpBadge}>+20 XP</span>
          </button>
        </div>
        {speciesRolled && <div className={styles.statusSuccess}>✓ Species rolled randomly — +20 XP bonus earned!</div>}
        <div className={styles.flexCol}>
          {SPECIES_OPTIONS.map(sp => (
            <button
              key={sp}
              type="button"
              onClick={() => {
                setSpecies(sp);
                if (speciesRolled && sp !== species) setSpeciesRolled(false);
                setSelectedClass('');
                setSelectedCareer('');
                setCareerRolled(false);
              }}
              className={species === sp ? styles.optionSelected : styles.option}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>

      {species && speciesData && (
        <div className={styles.card}>
          <div className={styles.flavorText}>{SPECIES_FLAVOR[species]}</div>
          <div className={styles.subTitle}>Racial Modifiers</div>
          <div className={styles.gridRow}>
            {ALL_CHARS.map(k => (
              <div key={k} className={styles.charCell}>
                <div className={styles.textMuted11}>{k}</div>
                <div className={styles.charValue}>{speciesData.chars[k]}</div>
              </div>
            ))}
          </div>
          <div className={styles.flexWrapGap16}>
            <span>Fate: <strong className={styles.parchmentStrong}>{speciesData.fate}</strong></span>
            <span>Resilience: <strong className={styles.parchmentStrong}>{speciesData.resilience}</strong></span>
            <span>Extra Points: <strong className={styles.parchmentStrong}>{speciesData.extraPoints}</strong></span>
            <span>Movement: <strong className={styles.parchmentStrong}>{speciesData.move}</strong></span>
          </div>
        </div>
      )}
    </div>
  );


  const renderStep2 = () => (
    <div>
      <div className={styles.sectionTitle}>Step 2: Class &amp; Career</div>
      <p className={styles.flavorTextPlain}>
        Your career defines your place in the Old World. Will you be a scholar, a soldier, or something altogether more... disreputable?
      </p>

      <div className={styles.card}>
        <div className={styles.flexBetween}>
          <label className={styles.labelInline}>Class</label>
          <button
            type="button"
            className={styles.btnRollRandom}
            onClick={handleRandomCareer}
            title="Roll randomly for career (+50 XP)"
          >
            🎲 Roll Random Career <span className={styles.xpBadge}>+50 XP</span>
          </button>
        </div>
        {careerRolled && <div className={styles.statusSuccess}>✓ Career rolled randomly — +50 XP bonus earned!</div>}
        <select
          className={styles.select}
          value={selectedClass}
          onChange={e => {
            setSelectedClass(e.target.value);
            setSelectedCareer('');
            if (careerRolled) setCareerRolled(false);
          }}
        >
          <option value="">— Select a Class —</option>
          {CAREER_CLASS_LIST.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        {selectedClass && <div className={`${styles.flavorText} ${styles.marginTop8}`}>{CLASS_FLAVOR[selectedClass]}</div>}
      </div>

      {selectedClass && (
        <div className={styles.card}>
          <label className={styles.label}>Career</label>
          <div className={styles.flexCol}>
            {availableCareers.map(career => {
              const scheme = CAREER_SCHEMES[career];
              const isSelected = selectedCareer === career;
              return (
                <button
                  key={career}
                  type="button"
                  onClick={() => {
                    setSelectedCareer(career);
                    if (careerRolled) setCareerRolled(false);
                  }}
                  className={isSelected ? styles.optionSelected : styles.option}
                >
                  <div className={styles.boldLabel}>{career}</div>
                  <div className={styles.careerDetailLabel}>
                    Level 1: {scheme.level1.title} — {scheme.level1.status}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedCareer && careerLevel1 && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{selectedCareer} — {careerLevel1.title}</div>
          <div className={styles.careerDetailStatus}>
            Status: <strong className={styles.parchmentStrong}>{careerLevel1.status}</strong>
          </div>
          <div className={styles.subTitle}>Advance Scheme</div>
          <div className={`${styles.flexWrap} ${styles.marginBottom12}`}>
            {careerLevel1.characteristics.map(c => <span key={c} className={styles.tag}>{c}</span>)}
          </div>
          <div className={styles.subTitle}>Career Skills</div>
          <div className={`${styles.flexWrap} ${styles.marginBottom12}`}>
            {careerLevel1.skills.map(s => <span key={s} className={styles.tag}>{s}</span>)}
          </div>
          <div className={styles.subTitle}>Career Talents</div>
          <div className={styles.flexWrap}>
            {careerLevel1.talents.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    const pointBuyTotal = Object.values(pointBuy).reduce((a, b) => a + b, 0);

    return (
      <div>
        <div className={styles.sectionTitle}>Step 3: Characteristics</div>
        <p className={styles.flavorTextPlain}>
          Your raw attributes define what you are capable of. The dice are cruel, but fortune favours the bold.
        </p>

        <div className={styles.card}>
          <div className={styles.subTitle}>Generation Method</div>
          <div className={styles.flexWrapLg}>
            {([
              ['random', 'Accept Random Rolls', '+50 XP'],
              ['rearrange', 'Rearrange Rolls', '+25 XP'],
              ['pointbuy', 'Point Buy (100 pts)', '+0 XP'],
            ] as const).map(([method, lbl, xp]) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setCharMethod(method);
                  if (method !== 'pointbuy' && !rolledValues) rollAllCharacteristics();
                }}
                className={charMethod === method ? styles.methodOptionSelected : styles.methodOption}
              >
                {lbl} <span className={styles.xpBadge}>{xp}</span>
              </button>
            ))}
          </div>

          {charMethod !== 'pointbuy' && (
            <button type="button" className={styles.btnReroll} onClick={rollAllCharacteristics}>
              🎲 Roll 2d10 for each
            </button>
          )}

          {charMethod === 'pointbuy' && (
            <div className={pointBuyTotal === 100 ? styles.statusSuccessLg : styles.statusWarning}>
              Points allocated: {pointBuyTotal} / 100 {pointBuyTotal === 100 ? '✓' : `(${100 - pointBuyTotal} remaining)`}
            </div>
          )}

          {charMethod === 'rearrange' && rearranged && (
            <div className={styles.swapHint}>
              Click two characteristics to swap their rolled values. {swapFrom && <span className={styles.swapHighlight}>Swapping from {swapFrom}...</span>}
            </div>
          )}

          <div className={styles.gridRow}>
            {ALL_CHARS.map(k => {
              const specMod = speciesData?.chars[k] ?? 0;
              const baseVal = charMethod === 'pointbuy' ? pointBuy[k]
                : charMethod === 'rearrange' ? (rearranged?.[k] ?? 0)
                : (rolledValues?.[k] ?? 0);
              const total = baseVal + specMod + (charAdvances[k] ?? 0);
              const isSwapTarget = swapFrom === k;

              return (
                <div
                  key={k}
                  className={charMethod === 'rearrange' ? (isSwapTarget ? styles.charCellSwap : styles.charCellRearrange) : styles.charCell}
                  onClick={() => charMethod === 'rearrange' && handleRearrangeClick(k)}
                >
                  <div className={styles.textMuted11}>{k}</div>
                  <div className={styles.textMuted10}>{CHAR_LABELS[k]}</div>
                  {charMethod === 'pointbuy' ? (
                    <div className={styles.flexCenter}>
                      <button type="button" className={styles.btnMini}
                        onClick={() => setPointBuy(prev => ({ ...prev, [k]: Math.max(4, prev[k] - 1) }))}>−</button>
                      <span className={styles.charValueCenter}>{pointBuy[k]}</span>
                      <button type="button" className={styles.btnMini}
                        onClick={() => setPointBuy(prev => ({ ...prev, [k]: Math.min(18, prev[k] + 1) }))}>+</button>
                    </div>
                  ) : (
                    <div className={styles.charBaseValue}>{baseVal || '—'}</div>
                  )}
                  <div className={styles.speciesMod}>+{specMod} species</div>
                  <div className={styles.charTotal}>
                    = {total || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Career characteristic advances */}
        <div className={styles.card}>
          <div className={styles.subTitle}>Career Characteristic Advances (5 points)</div>
          <div className={totalCharAdvances === 5 ? styles.statusSuccessLg : styles.statusWarning}>
            Allocated: {totalCharAdvances} / 5 {totalCharAdvances === 5 ? '✓' : ''}
          </div>
          <div className={styles.advanceHint}>
            Distribute 5 advances among your career's advance scheme characteristics: {careerCharacteristics.join(', ')}
          </div>
          <div className={styles.flexWrapLg}>
            {careerCharacteristics.map(k => (
              <div key={k} className={styles.charCellMin}>
                <div className={styles.textMuted12}>{k}</div>
                <div className={styles.flexCenter}>
                  <button type="button" className={styles.btnMini}
                    onClick={() => setCharAdvances(prev => ({ ...prev, [k]: Math.max(0, (prev[k] ?? 0) - 1) }))}>−</button>
                  <span className={styles.charValueSm}>{charAdvances[k] ?? 0}</span>
                  <button type="button" className={styles.btnMini}
                    onClick={() => setCharAdvances(prev => {
                      const cur = Object.values(prev).reduce((a, b) => a + b, 0);
                      if (cur >= 5) return prev;
                      return { ...prev, [k]: (prev[k] ?? 0) + 1 };
                    })}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  const renderStep4 = () => {
    const careerSkills = careerLevel1?.skills ?? [];
    const careerTalents = careerLevel1?.talents ?? [];

    return (
      <div>
        <div className={styles.sectionTitle}>Step 4: Skills &amp; Talents</div>
        <p className={styles.flavorTextPlain}>
          Your skills and talents set you apart from the common rabble. Choose carefully — they may save your life.
        </p>

        {/* Species Skills */}
        <div className={styles.card}>
          <div className={styles.subTitle}>Species Skills — Choose 3 for 5 Advances</div>
          <div className={speciesSkill5.length === 3 ? styles.statusSuccess : styles.statusWarning}>
            Selected: {speciesSkill5.length} / 3 {speciesSkill5.length === 3 ? '✓' : ''}
          </div>
          <div className={`${styles.flexWrap} ${styles.marginBottom12}`}>
            {speciesSkillList.map(skill => {
              const is5 = speciesSkill5.includes(skill);
              const is3 = speciesSkill3.includes(skill);
              return (
                <button
                  key={skill + '-5'}
                  type="button"
                  disabled={is3}
                  onClick={() => {
                    if (is5) setSpeciesSkill5(prev => prev.filter(s => s !== skill));
                    else if (speciesSkill5.length < 3) setSpeciesSkill5(prev => [...prev, skill]);
                  }}
                  className={is3 ? styles.skillBtnDisabled : is5 ? styles.skillBtnSelected5 : styles.skillBtn}
                >
                  {skill} {is5 && '(+5)'}
                </button>
              );
            })}
          </div>

          <div className={styles.subTitle}>Species Skills — Choose 3 for 3 Advances</div>
          <div className={speciesSkill3.length === 3 ? styles.statusSuccess : styles.statusWarning}>
            Selected: {speciesSkill3.length} / 3 {speciesSkill3.length === 3 ? '✓' : ''}
          </div>
          <div className={styles.flexWrap}>
            {speciesSkillList.map(skill => {
              const is5 = speciesSkill5.includes(skill);
              const is3 = speciesSkill3.includes(skill);
              return (
                <button
                  key={skill + '-3'}
                  type="button"
                  disabled={is5}
                  onClick={() => {
                    if (is3) setSpeciesSkill3(prev => prev.filter(s => s !== skill));
                    else if (speciesSkill3.length < 3) setSpeciesSkill3(prev => [...prev, skill]);
                  }}
                  className={is5 ? styles.skillBtnDisabled : is3 ? styles.skillBtnSelected3 : styles.skillBtn}
                >
                  {skill} {is3 && '(+3)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Species Talents */}
        <div className={styles.card}>
          <div className={styles.subTitle}>Species Talents</div>
          <div className={styles.flexCol}>
            {speciesTalentList.map((talent, i) => {
              const parsed = parseTalentOptions(talent);
              if (parsed.isChoice) {
                return (
                  <div key={i}>
                    <div className={styles.chooseOneLabel}>Choose one:</div>
                    <div className={styles.flexCol}>
                      {parsed.options.map(opt => {
                        const desc = getTalentDesc(opt);
                        return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSpeciesTalentChoices(prev => ({ ...prev, [i]: opt }))}
                          className={(speciesTalentChoices[i] || parsed.options[0]) === opt ? styles.talentOptionSelected : styles.talentOption}
                        >
                          <div className={styles.boldLabel}>{opt}</div>
                          {desc && <div className={styles.talentDesc}>{desc}</div>}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className={styles.fixedTalentRow}>
                  <div className={styles.boldLabel}>{talent} <span className={styles.fixedLabel}>(fixed)</span></div>
                  {getTalentDesc(parsed.options[0]) && <div className={styles.talentDesc}>{getTalentDesc(parsed.options[0])}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Career Skills */}
        <div className={styles.card}>
          <div className={styles.subTitle}>Career Skills — Allocate 40 Advances (max 10 each)</div>
          <div className={totalCareerSkillAdvances === 40 ? styles.statusSuccess : styles.statusWarning}>
            Allocated: {totalCareerSkillAdvances} / 40 {totalCareerSkillAdvances === 40 ? '✓' : `(${40 - totalCareerSkillAdvances} remaining)`}
          </div>
          <div className={styles.flexCol}>
            {careerSkills.map(skill => {
              const adv = careerSkillAdvances[skill] ?? 0;
              return (
                <div key={skill} className={styles.careerSkillRow}>
                  <span className={styles.careerSkillName}>{skill}</span>
                  <button type="button" className={styles.btnMini}
                    onClick={() => setCareerSkillAdvances(prev => ({ ...prev, [skill]: Math.max(0, (prev[skill] ?? 0) - 1) }))}>−</button>
                  <span className={styles.charValueSm}>{adv}</span>
                  <button type="button" className={styles.btnMini}
                    onClick={() => setCareerSkillAdvances(prev => {
                      const cur = Object.values(prev).reduce((a, b) => a + b, 0);
                      if (cur >= 40) return prev;
                      if ((prev[skill] ?? 0) >= 10) return prev;
                      return { ...prev, [skill]: (prev[skill] ?? 0) + 1 };
                    })}>+</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Career Talent */}
        <div className={styles.card}>
          <div className={styles.subTitle}>Career Talent — Choose 1</div>
          <div className={styles.flexCol}>
            {careerTalents.map(t => {
              const desc = getTalentDesc(t);
              return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedCareerTalent(t)}
                className={selectedCareerTalent === t ? styles.talentOptionSelected : styles.talentOption}
              >
                <div className={styles.boldLabel}>{t}</div>
                {desc && <div className={styles.talentDesc}>{desc}</div>}
              </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  const renderStep5 = () => {
    const baseFate = speciesData?.fate ?? 0;
    const baseRes = speciesData?.resilience ?? 0;
    const ep = speciesData?.extraPoints ?? 0;
    const extraRes = ep - extraFate;

    return (
      <div>
        <div className={styles.sectionTitle}>Step 5: Fate, Resilience &amp; Details</div>
        <p className={styles.flavorTextPlain}>
          Fate protects you from death. Resilience steels your mind against madness. Choose how to spend your extra points wisely.
        </p>

        <div className={styles.card}>
          <div className={styles.subTitle}>Fate &amp; Resilience</div>
          <div className={`${styles.textMuted12} ${styles.marginBottom12}`}>
            Distribute {ep} extra point{ep !== 1 ? 's' : ''} between Fate and Resilience.
          </div>
          <div className={styles.flexGap24}>
            <div className={styles.charCell}>
              <div className={styles.textMuted12}>Fate</div>
              <div className={styles.textMuted10}>Base: {baseFate}</div>
              <div className={styles.flexCenter}>
                <button type="button" className={styles.btnMini}
                  onClick={() => setExtraFate(prev => Math.max(0, prev - 1))}>−</button>
                <span className={styles.charValueCenter}>+{extraFate}</span>
                <button type="button" className={styles.btnMini}
                  onClick={() => setExtraFate(prev => Math.min(ep, prev + 1))}>+</button>
              </div>
              <div className={styles.fateResTotal}>
                Total: {baseFate + extraFate}
              </div>
              <div className={styles.textMuted10}>Fortune: {baseFate + extraFate}</div>
            </div>
            <div className={styles.charCell}>
              <div className={styles.textMuted12}>Resilience</div>
              <div className={styles.textMuted10}>Base: {baseRes}</div>
              <div className={styles.flexCenter}>
                <span className={styles.charValueCenter}>+{extraRes}</span>
              </div>
              <div className={styles.fateResTotal}>
                Total: {baseRes + extraRes}
              </div>
              <div className={styles.textMuted10}>Resolve: {baseRes + extraRes}</div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.subTitle}>Personal Details</div>
          <div className={styles.detailsGrid}>
            <div>
              <label className={styles.label}>Age</label>
              <input className={styles.input} type="text" placeholder="e.g. 25" value={age} onChange={e => setAge(e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Height</label>
              <input className={styles.input} type="text" placeholder={`e.g. 5'10"`} value={height} onChange={e => setHeight(e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Hair</label>
              <input className={styles.input} type="text" placeholder="e.g. Dark Brown" value={hair} onChange={e => setHair(e.target.value)} />
            </div>
            <div>
              <label className={styles.label}>Eyes</label>
              <input className={styles.input} type="text" placeholder="e.g. Green" value={eyes} onChange={e => setEyes(e.target.value)} />
            </div>
          </div>
          <div className={styles.marginBottom12}>
            <label className={styles.label}>Motivation</label>
            <input className={styles.input} type="text" placeholder="What drives your character?" value={motivation} onChange={e => setMotivation(e.target.value)} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.subTitle}>Ambitions</div>
          <div className={styles.marginBottom12}>
            <label className={styles.label}>Short-term Ambition</label>
            <input className={styles.input} type="text" placeholder="A goal for the next session or two..." value={ambShort} onChange={e => setAmbShort(e.target.value)} />
          </div>
          <div>
            <label className={styles.label}>Long-term Ambition</label>
            <input className={styles.input} type="text" placeholder="A grand aspiration for your character's story..." value={ambLong} onChange={e => setAmbLong(e.target.value)} />
          </div>
        </div>
      </div>
    );
  };


  const renderStep6 = () => {
    const baseFate = speciesData?.fate ?? 0;
    const baseRes = speciesData?.resilience ?? 0;
    const ep = speciesData?.extraPoints ?? 0;
    const extraRes = ep - extraFate;
    const resolvedTalents = getResolvedTalents();

    return (
      <div>
        <div className={styles.sectionTitle}>Step 6: Review &amp; Create</div>
        <p className={styles.flavorTextPlain}>
          Review your character before venturing forth into the grim darkness of the Old World.
        </p>

        <div className={styles.card}>
          <div className={styles.reviewHeader}>
            <div>
              <div className={styles.reviewName}>{charName}</div>
              <div className={styles.reviewCareer}>{species} — {selectedCareer} ({careerLevel1?.title})</div>
              <div className={styles.reviewClass}>{careerScheme?.class} • {careerLevel1?.status}</div>
            </div>
            <div className={styles.reviewXpRight}>
              <div className={styles.reviewXpLabel}>Bonus XP</div>
              <div className={styles.reviewXpValue}>{totalBonusXP}</div>
            </div>
          </div>

          {totalBonusXP > 0 && (
            <div className={styles.xpBreakdown}>
              {speciesXP > 0 && <span>Random species: +{speciesXP} XP • </span>}
              {careerXP > 0 && <span>Random career: +{careerXP} XP • </span>}
              {charXP > 0 && <span>Characteristics ({charMethod}): +{charXP} XP</span>}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.subTitle}>Characteristics</div>
          <div className={styles.gridRow}>
            {ALL_CHARS.map(k => (
              <div key={k} className={styles.charCell}>
                <div className={styles.textMuted11}>{k}</div>
                <div className={styles.charValueLg}>{getFinalChar(k)}</div>
                {(charAdvances[k] ?? 0) > 0 && (
                  <div className={styles.advBadge}>+{charAdvances[k]} adv</div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.flexWrapGap16}>
            <span>Move: <strong className={styles.parchmentStrong}>{speciesData?.move ?? 4}</strong></span>
            <span>Fate: <strong className={styles.parchmentStrong}>{baseFate + extraFate}</strong></span>
            <span>Fortune: <strong className={styles.parchmentStrong}>{baseFate + extraFate}</strong></span>
            <span>Resilience: <strong className={styles.parchmentStrong}>{baseRes + extraRes}</strong></span>
            <span>Resolve: <strong className={styles.parchmentStrong}>{baseRes + extraRes}</strong></span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.subTitle}>Skills</div>
          <div className={`${styles.flexCol} ${styles.marginBottom12}`}>
            {speciesSkill5.length > 0 && (
              <div className={styles.textMuted12}>
                Species (+5): {speciesSkill5.map(s => <span key={s} className={styles.tag}>{s}</span>)}
              </div>
            )}
            {speciesSkill3.length > 0 && (
              <div className={styles.textMuted12}>
                Species (+3): {speciesSkill3.map(s => <span key={s} className={styles.tag}>{s}</span>)}
              </div>
            )}
          </div>
          <div className={`${styles.textMuted12} ${styles.marginBottom12}`}>Career Skills:</div>
          <div className={styles.flexWrap}>
            {Object.entries(careerSkillAdvances).filter(([, v]) => v > 0).map(([skill, adv]) => (
              <span key={skill} className={styles.tag}>{skill} +{adv}</span>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.subTitle}>Talents</div>
          <div className={styles.flexWrap}>
            {resolvedTalents.map(t => <span key={t} className={styles.tag}>{t}</span>)}
            {selectedCareerTalent && <span className={styles.tagCareer}>{selectedCareerTalent} (career)</span>}
          </div>
        </div>

        {(age || height || hair || eyes || motivation || ambShort || ambLong) && (
          <div className={styles.card}>
            <div className={styles.subTitle}>Details</div>
            <div className={styles.reviewDetailRow}>
              {age && <span>Age: <strong className={styles.parchmentStrong}>{age}</strong></span>}
              {height && <span>Height: <strong className={styles.parchmentStrong}>{height}</strong></span>}
              {hair && <span>Hair: <strong className={styles.parchmentStrong}>{hair}</strong></span>}
              {eyes && <span>Eyes: <strong className={styles.parchmentStrong}>{eyes}</strong></span>}
            </div>
            {motivation && <div className={styles.reviewDetailText}>Motivation: <em className={styles.reviewEmphasis}>{motivation}</em></div>}
            {ambShort && <div className={styles.reviewDetailText}>Short-term: <em className={styles.reviewEmphasis}>{ambShort}</em></div>}
            {ambLong && <div className={styles.reviewDetailText}>Long-term: <em className={styles.reviewEmphasis}>{ambLong}</em></div>}
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────

  const STEP_LABELS = ['Name & Species', 'Class & Career', 'Characteristics', 'Skills & Talents', 'Fate & Details', 'Review'];

  return (
    <div className={styles.overlay}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>⚔ Character Creation Wizard</div>
        <div className={styles.stepIndicator}>
          {STEP_LABELS.map((lbl, i) => {
            const num = (i + 1) as WizardStep;
            return (
              <div key={num} className={styles.stepDotWrapper}>
                <div className={step === num ? styles.stepDotActive : step > num ? styles.stepDotCompleted : styles.stepDotDefault} title={lbl}>{num}</div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={step > num ? styles.stepConnectorActive : styles.stepConnectorDefault} />
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className={styles.btnDanger} onClick={onCancel}>✕ Cancel</button>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <div className={styles.bodyInner}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLabel}>
          Step {step} of 6: {STEP_LABELS[step - 1]}
        </div>
        <div className={styles.footerActions}>
          {totalBonusXP > 0 && (
            <span className={styles.bonusXpLabel}>Bonus XP: +{totalBonusXP}</span>
          )}
          {step > 1 && (
            <button type="button" className={styles.btn} onClick={() => setStep((step - 1) as WizardStep)}>
              ← Back
            </button>
          )}
          {step < 6 ? (
            <button
              type="button"
              className={canProceed() ? styles.btnPrimary : styles.btnPrimaryDisabled}
              disabled={!canProceed()}
              onClick={() => setStep((step + 1) as WizardStep)}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnCreate}
              onClick={() => onComplete(buildCharacter())}
            >
              ⚔ Create Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
