/**
 * Pure, React-free "Criminal Events" 1d100 reference table (Deft Steps, Light
 * Fingers — "Organised Crime" chapter).
 *
 * Deft Steps p.60 "CRIMINAL EVENTS" (docs/deftsteps.md L2247; first row 01-04 at
 * L2253, last row 97-00 at L2300). Every row range and body text below is
 * transcribed VERBATIM from docs/deftsteps.md; nothing is invented. GM/reference
 * content ONLY — no event auto-applies.
 *
 * Extent: 24 distinct result ranges, 01-04 → 97-00, fully transcribed (no
 * image-only / truncated rows). The ranges are not uniformly 4-wide: 65-70 is
 * 6 wide, 71-75 and 76-80 are 5 wide. The 93-96 row carries a conditional note
 * that, if the character declines the buy-out offer, it is replaced with the
 * 97-00 "Regicide" result — so 97-00 is a real, separately-listed row.
 */

export interface CriminalEventRow {
  /** Inclusive lower bound of the d100 range (1–100; 00 is modelled as 100). */
  readonly min: number;
  /** Inclusive upper bound of the d100 range (1–100; 00 is modelled as 100). */
  readonly max: number;
  /** Printed range label, e.g. "01-04", "97-00". */
  readonly range: string;
  /** Verbatim category + name, e.g. "Watch - Good Crooks And Bad Constables". */
  readonly title: string;
  /** Verbatim body text of the result. */
  readonly text: string;
}

export const CRIMINAL_EVENTS: readonly CriminalEventRow[] = [
  {
    min: 1,
    max: 4,
    range: '01-04',
    title: 'Watch - Good Crooks And Bad Constables',
    text: "The Watch has been taken over by a corrupt commander who has started muscling in on the organisation's territory. To keep up, the Character must undertake at least one Income Endeavour during this downtime period but receives only 50% of the income. If they do not do this, they may not make any Maintain Influence or Organising Crime Endeavours. The rivals remain an ongoing threat, and the next 'Gang War' result will involve them. Due to the support they can pull from legitimate Watch members, any Test made to oppose them will be Difficult (-20%).",
  },
  {
    min: 5,
    max: 8,
    range: '05-08',
    title: 'Watch - Someone Must be Found to Pay for the Crime',
    text: "The headquarters is raided by the Watch, forcing them to relocate to an older (and smaller) hideout. The organisation's level for the purpose of Organising Crime Endeavours is reduced by one level until three adventures have passed or the character re-purchases the lost level. If a 'Gang War' event occurs during this period, the rival gang/leader gains +1 SL on all Tests.",
  },
  {
    min: 9,
    max: 12,
    range: '09-12',
    title: 'Watch - Criminals Become Victims of their Own Success',
    text: 'Due to a spectacular crime drawing attention, the Watch have begun a major crackdown. No Character can make Organising Crime Endeavours until the end of the next adventure. In addition, characters with Criminal Careers may not perform the Income Endeavour at all until the end of the next adventure.',
  },
  {
    min: 13,
    max: 16,
    range: '13-16',
    title: 'Watch - Are you Sure this is a Legitimate Business?',
    text: "The Watch have directed excisemen to investigate the organisation's legal fronts. The Character must spend an Endeavour assisting the investigation or pay 10% of the Enterprise's most recent Build Gang Endeavour Costs in non-compliance fees.",
  },
  {
    min: 17,
    max: 20,
    range: '17-20',
    title: 'Watch - Keep it Quiet',
    text: 'Your latest score draws heat from the Watch. If you use the Organising Crime Endeavour during this period of downtime you gain +50% to any resources you collect. However, you cannot use the Organising Crime Endeavour during the next period of downtime.',
  },
  {
    min: 21,
    max: 24,
    range: '21-24',
    title: 'No Honour Among Thieves',
    text: "One of your Character's Trappings, whatever is most valuable and portable, is stolen. The Character may attempt to reclaim it in the next adventure or accept its loss as part of the cost of doing business.",
  },
  {
    min: 25,
    max: 28,
    range: '25-28',
    title: 'Factionalism',
    text: "A disillusioned member leaves to start their own gang. The member is replaced by the start of the next adventure; however, the new gang may become an ongoing threat, and the next 'Gang War' result may involve them. Due to past friendships within the gang, and knowledge of your operations, this rival receives a bonus of +10 to opposed Tests.",
  },
  {
    min: 29,
    max: 32,
    range: '29-32',
    title: 'Market Jitters',
    text: "The organisation's source of income dries up, meaning it must select a new source of income. If this was the organisation's only source of income, the organisation counts as a Level 1 every time it tries to Get Resource during this downtime, as it is working hard to establish new contacts and fresh lines of supply.",
  },
  {
    min: 33,
    max: 36,
    range: '33-36',
    title: 'Time to Make an Example',
    text: "A 'customer' can't make his protection payment, or a gang member falls short on his take. The character can either 'make an example' of the individual, and until the end of the next adventure, the character gains +10 to Intimidate Tests, but -10 to Charm Tests, or show mercy, causing others to follow suit, reducing the criminal organisation's level by 1 until the end of the next adventure.",
  },
  {
    min: 37,
    max: 40,
    range: '37-40',
    title: 'Knock-on Effects',
    text: "The gang's activities unexpectedly cause a complication for the Character's companions. Roll on the Events Table (WFRP, page 193) and apply the effect to a different random Character.",
  },
  {
    min: 41,
    max: 44,
    range: '41-44',
    title: 'A Fortunate Friend',
    text: "A Priest of Ranald has befriended the gang. This has caused members to forswear the use of violence and attempt daring heists. If the Character uses Get Resource they receive d10 shillings per level rather than the usual amount. Alternatively, they may chase off the Priest, but doing so earns Ranald's disfavour, and they lose 1 Fortune Point next session.",
  },
  {
    min: 45,
    max: 48,
    range: '45-48',
    title: 'Our Man on the Inside',
    text: "The gang gains a high-ranking informant in the Watch. This can be used to either negate a single future Watch Event or grant 2 additional SL on a 'Gang War' Test as the informant directs the Watch against the rival gang.",
  },
  {
    min: 49,
    max: 52,
    range: '49-52',
    title: 'You Get What You Take',
    text: 'As part of the gang\'s usual operations, they come upon an item of value that is highly illegal/heretical (the GM can decide the exact item). Obviously, the character can keep or sell the item, but alternatively, they can hand it in to the proper authorities, earning a degree of goodwill. Next time the character rolls a Watch Event, that Event may be rerolled. The Character must accept the result of the second roll.',
  },
  {
    min: 53,
    max: 56,
    range: '53-56',
    title: 'Bad Bookkeeping',
    text: 'A problem with rogues is that they tend to skive off administrative tasks. The Character must spend an Endeavour catching up on all the duties that their underlings have shirked. This does not count as an Income Endeavour. However, your sheepish members are nervous around the Character for the next few days, and any Skill Tests the Character is required to make as part of their other Endeavours they receive an assist with, as their underlings rush to help out.',
  },
  {
    min: 57,
    max: 60,
    range: '57-60',
    title: 'Keep Your Friends Close…',
    text: "A visitor to the city offers his skills in return for the organisation's permission to engage in activity in the city. The Character may perform a single Endeavour usually restricted to a specific Class, even if he is not of that Class.",
  },
  {
    min: 61,
    max: 64,
    range: '61-64',
    title: 'Talent Is Forever',
    text: 'A gang member, proud of a remarkable feat of skill he pulled off in a recent heist, is eager to share his knowledge. One Training Endeavour carried out by the organisation can be carried out at zero monetary cost. Alternatively, one Unusual Learning Endeavour can be carried out at half the monetary cost, but at Average Difficulty (+20%).',
  },
  {
    min: 65,
    max: 70,
    range: '65-70',
    title: 'A Little Birdie Told Me',
    text: 'The gang gains an informant in a rival gang. This grants the Character +2 SL to any Tests as part of the next Gang War Event. After the war has concluded, the informant joins the gang permanently. If the GM wishes the Character may take this opportunity to create a new Contact.',
  },
  {
    min: 71,
    max: 75,
    range: '71-75',
    title: 'Diversification',
    text: 'The Enterprise gains a new Source of income. Any successful attempts to Get Resource this period of downtime result in double the usual amount of money.',
  },
  {
    min: 76,
    max: 80,
    range: '76-80',
    title: 'Fell Off The Back Of A Cart',
    text: "A gang member lays his hands on a valuable item that he donates to the organisation. This can be any item of value up to the criminal organisation's costs to grow to its current level.",
  },
  {
    min: 81,
    max: 84,
    range: '81-84',
    title: 'Trouble for the Watch',
    text: "Members of the local watch have been chastised. They may have inadvertently arrested a powerful noble or priest or had corrupt practices exposed by followers of Verena or Ranald. For a period of the GM's choosing, but no less than a week, they err on the side of caution and turn a blind eye to petty crimes.",
  },
  {
    min: 85,
    max: 88,
    range: '85-88',
    title: "Gang War - He's No Longer With Us",
    text: 'Another gang encroaches onto the territory. If the Character backs down, they may not make Organising Crime Endeavours during this period of downtime. If the Character fights back, the number of Racketeers who turn up the next time the Character uses Get Muscle is reduced by 2, but the Character gains a +2 SL bonus to interact with local criminals, who respect them for taking a stand.',
  },
  {
    min: 89,
    max: 92,
    range: '89-92',
    title: 'Gang War - Turning the Heat Up',
    text: 'A rival gang instigates an all-out war. Make an Opposed Challenging (+0) Intimidation Test against the upstart and record the result, adding +1 SL for each level of the gang. The war continues into subsequent downtimes: make a further test each downtime until one side achieves 10 SL. No Build Gang Endeavours may be made with the Enterprise while the conflict continues. If the rivals win, the Enterprise is disbanded. If the character wins, all "Gang War" results are ignored for the next 5 downtimes, during which any successful attempts to Get Resource benefit from a 50% increase to earnings.',
  },
  {
    min: 93,
    max: 96,
    range: '93-96',
    title: 'Gang War - A Tempting Offer',
    text: 'A member of the Inner Circle, or an underling backed by mysterious sponsors offers to purchase the gang. If the Character and their co-investors accept, they lose control of the gang and they gain wealth equal to double the organisation\'s most recent cost to grow. However, this offer is not a suggestion, and if the character declines, replace it with "97-00: Gang War - Regicide".',
  },
  {
    min: 97,
    max: 100,
    range: '97-00',
    title: 'Gang War - Regicide',
    text: "A gang member, such as an underboss, makes a play for control, resulting in a bloody conflict that costs the organisation significant resources. Make an Opposed Challenging (+0) Intimidation Test against the upstart. If you lose the organisation's level is reduced by one. Furthermore, no Build Gang Endeavours may be made with the organisation during this downtime.",
  },
];

/**
 * Map a 1d100 roll to its Criminal Events row (display only — applies no
 * mechanics). Pure and total: clamps to [1,100] and treats 100/00 as the 97-00
 * row, handling the wider 65-70 / 71-75 / 76-80 ranges. Returns a well-defined
 * row for every input.
 */
export function resolveCriminalEvent(roll: number): CriminalEventRow {
  const raw = Math.trunc(roll);
  // 0 (printed "00") maps to 100; otherwise clamp into [1,100].
  const normalised = raw === 0 ? 100 : Math.min(100, Math.max(1, Number.isFinite(raw) ? raw : 1));
  const found = CRIMINAL_EVENTS.find((e) => normalised >= e.min && normalised <= e.max);
  // By construction the ranges tile 1–100 contiguously, so `found` is always
  // defined; the fallback keeps the function total for a malformed data edit.
  return found ?? CRIMINAL_EVENTS[CRIMINAL_EVENTS.length - 1];
}
