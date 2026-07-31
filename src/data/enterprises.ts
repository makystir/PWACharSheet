import { EnterpriseCurrency, EnterpriseType } from '../types/character';

export interface EnterpriseTemplateIncomeSource {
  description: string;
  earningSkill: string;
  effectiveStatus: string;
  activeAtBase: boolean;
}

export interface EnterpriseExpansionLevel {
  cost: EnterpriseCurrency;
  minOwnerContribution: EnterpriseCurrency;
  interestPayment: EnterpriseCurrency;
  benefits: string;
  additionalTrappings: string[];
  additionalIncomeSources: EnterpriseTemplateIncomeSource[];
  additionalSpecialRules: string[];
}

export interface EnterpriseTemplate {
  type: EnterpriseType;
  displayName: string;
  incomeSources: EnterpriseTemplateIncomeSource[];
  trappings: string[];
  specialRules: string[];
  startUpCost: EnterpriseCurrency;
  minOwnerContribution: EnterpriseCurrency;
  baseInterestPayment: EnterpriseCurrency;
  expansions: {
    level2: EnterpriseExpansionLevel;
    level3: EnterpriseExpansionLevel;
    level4: EnterpriseExpansionLevel;
  };
  alternateEvent1: { title: string; description: string };
  alternateEvent2: { title: string; description: string };
}

export const ENTERPRISE_TEMPLATES: EnterpriseTemplate[] = [
  // ─── Courier Service ───────────────────────────────────────────────
  {
    type: 'Courier Service',
    displayName: 'Courier Service',
    incomeSources: [
      { description: 'Deliveries on foot', earningSkill: 'Endurance', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Deliveries on horseback', earningSkill: 'Ride (Horse)', effectiveStatus: 'Silver 1', activeAtBase: true },
      { description: 'Deliveries by wagon', earningSkill: 'Drive', effectiveStatus: 'Silver 2', activeAtBase: true },
      { description: 'Deliveries by rowboat', earningSkill: 'Row', effectiveStatus: 'Silver 2', activeAtBase: true },
      { description: 'Deliveries by riverboat', earningSkill: 'Sail', effectiveStatus: 'Silver 3', activeAtBase: true },
    ],
    trappings: [
      'Storage depot with filing system',
      'Calling cards',
      "Customers' letters and parcels",
      'Riding Horse or Rowboat or Wagon or Riverboat',
    ],
    specialRules: [
      'When using the Courier Service for the Income Endeavour, gain +20 on Tests to travel or navigate the territory the Enterprise operates in for the following adventure.',
    ],
    startUpCost: { gc: 10, ss: 0, d: 0 },
    minOwnerContribution: { gc: 1, ss: 0, d: 0 },
    baseInterestPayment: { gc: 0, ss: 10, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Improve means of transporting goods. Gain additional transport (Horse, Rowboat, Wagon, or Riverboat) and hire runners for local deliveries.',
        additionalTrappings: ['Additional transport vehicle or animal', 'Local delivery runners'],
        additionalIncomeSources: [],
        additionalSpecialRules: [],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Storage facilities grow larger and more secure. Choose a Source of Income to gain effective Status of Silver 5. Depot gains stabling/repair/mooring facilities and employees.',
        additionalTrappings: ['Expanded secure storage depot', 'Stabling and repair facilities', 'Site employees'],
        additionalIncomeSources: [],
        additionalSpecialRules: [],
      },
      level4: {
        cost: { gc: 300, ss: 0, d: 0 },
        minOwnerContribution: { gc: 30, ss: 0, d: 0 },
        interestPayment: { gc: 15, ss: 0, d: 0 },
        benefits: 'Recruit enough couriers to expand territory to a grand province. Travel bonus increases. Depot gains customer-facing storefront. Gain additional Wagon or Riverboat.',
        additionalTrappings: ['Customer-facing storefront', 'Additional Wagon or Riverboat'],
        additionalIncomeSources: [
          { description: 'Storefront sales of packaging and general goods', earningSkill: 'Haggle', effectiveStatus: 'Silver 1', activeAtBase: false },
        ],
        additionalSpecialRules: ['Territory expands to a grand province. Travel bonus increases to +40 (province) or +60 (single city).'],
      },
    },
    alternateEvent1: {
      title: 'Intercepted Delivery',
      description: 'One of the deliveries is intercepted by bandits and an important package is lost. Pay triple the current Interest Payment to compensate the customer, or attempt to recover the package in the next adventure.',
    },
    alternateEvent2: {
      title: 'Military Demand',
      description: 'The Imperial State Army enters the province on campaign. Any Character using the Courier Service for an Income Endeavour gains +50% to money earned. During the next adventure, enemy infiltrators target the Character.',
    },
  },

  // ─── Crafting Workshop ─────────────────────────────────────────────
  {
    type: 'Crafting Workshop',
    displayName: 'Crafting Workshop',
    incomeSources: [
      { description: 'Mass production of common goods', earningSkill: 'Trade (Any)', effectiveStatus: 'Brass 5', activeAtBase: true },
      { description: 'Commission of a unique item', earningSkill: 'Art (Any) or Trade (Any)', effectiveStatus: 'Silver 2', activeAtBase: true },
    ],
    trappings: [
      'Tools and small Workshop for a specific Trade',
      'Steady supply of raw materials',
      'Guild licence',
      'Technical books and training materials',
      'A distinctive signature',
    ],
    specialRules: [
      'Choose an Art or Trade Skill Specialisation — Tests of that Skill within the Workshop gain +20. If a Trade Skill is chosen and used for a Crafting Endeavour, raw materials cost nothing.',
    ],
    startUpCost: { gc: 15, ss: 0, d: 0 },
    minOwnerContribution: { gc: 1, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 15, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 5, ss: 0, d: 0 },
        minOwnerContribution: { gc: 0, ss: 10, d: 0 },
        interestPayment: { gc: 0, ss: 15, d: 0 },
        benefits: 'Take on apprentices (one per invested Character). Apprentices provide Assistance (+10) on Trade Tests, make deliveries, and watch the workshop.',
        additionalTrappings: ['Apprentices'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Apprentices provide +10 Assistance on Trade Tests.'],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Apprentices complete training (Assistance now +20). Expand Workshop size. Gain one additional Source of Income: rented workspace, new Trade workshop, dedicated storefront, or fine tools for specialist items.',
        additionalTrappings: ['Expanded Workshop'],
        additionalIncomeSources: [
          { description: 'Rented workspace to other craftworkers', earningSkill: 'Haggle', effectiveStatus: 'Silver 1', activeAtBase: false },
        ],
        additionalSpecialRules: ['Apprentices now provide +20 Assistance on Trade Tests.'],
      },
      level4: {
        cost: { gc: 200, ss: 0, d: 0 },
        minOwnerContribution: { gc: 20, ss: 0, d: 0 },
        interestPayment: { gc: 10, ss: 0, d: 0 },
        benefits: 'Workshop becomes a Guildhall. Gain another Source of Income option, plus collecting guild dues. Expanded political influence.',
        additionalTrappings: ['Guildhall'],
        additionalIncomeSources: [
          { description: 'Collecting guild dues', earningSkill: 'Leadership', effectiveStatus: 'Gold 1', activeAtBase: false },
        ],
        additionalSpecialRules: ['Workshop constitutes a Guildhall, expanding political influence.'],
      },
    },
    alternateEvent1: {
      title: 'Resource Shortage',
      description: 'Supply of a precious resource essential to your craft runs dry. The Enterprise cannot gain Income in the upcoming Endeavours. If you find a new supply source in the next adventure, subsequent Income Endeavours provide double wealth.',
    },
    alternateEvent2: {
      title: 'Rush Order',
      description: 'A demanding customer asks for a complicated item in a short time. Use all Endeavours on Income Endeavours to complete the order and receive a bonus equivalent to an additional free Income Endeavour. If unable, the Event has no effect.',
    },
  },

  // ─── Criminal Gang ─────────────────────────────────────────────────
  {
    type: 'Criminal Gang',
    displayName: 'Criminal Gang',
    incomeSources: [
      { description: 'Theft', earningSkill: 'Stealth (Any)', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Trafficking of outlaws', earningSkill: 'Stealth (Any)', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Extortion or debt collection', earningSkill: 'Intimidate', effectiveStatus: 'Brass 5', activeAtBase: true },
      { description: 'Sale of contraband or fraudulent items', earningSkill: 'Charm', effectiveStatus: 'Brass 5', activeAtBase: true },
      { description: 'Murder-for-hire', earningSkill: 'Melee (Any)', effectiveStatus: 'Brass 5', activeAtBase: true },
    ],
    trappings: [
      'Hidden lair (loft, cellar, hideout, or sewer)',
      'Turf (streets, village, or stretch of road/river)',
      'Gang symbols (scars, tattoos, or sigils)',
    ],
    specialRules: [
      'Characters do not need to contribute any of their own money towards Start-Up Costs (can borrow all from a Creditor). Any Character who invests at least 1 GC gains the Criminal Talent for free (once only).',
    ],
    startUpCost: { gc: 5, ss: 0, d: 0 },
    minOwnerContribution: { gc: 0, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 10, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 10, ss: 0, d: 0 },
        minOwnerContribution: { gc: 1, ss: 0, d: 0 },
        interestPayment: { gc: 2, ss: 0, d: 0 },
        benefits: 'Gain a dozen gang prospects. Private code-phrases for secret communication. Double turf size. Choose one Source of Income to increase effective Status to Silver 2.',
        additionalTrappings: ['Gang prospects (a dozen young toughs)', 'Expanded turf'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Gang prospects may provide Assistance in appropriate circumstances.'],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 20, ss: 0, d: 0 },
        benefits: 'Prospects mature into full gang members. Steady influx of new recruits. Turf doubles again. Choose one Source of Income to increase to Silver 4. Gain lair upgrade (changing location, secure vault, legitimate storefront, or armoury).',
        additionalTrappings: ['Full gang members', 'Lair upgrade'],
        additionalIncomeSources: [
          { description: 'Legitimate storefront (money laundering)', earningSkill: 'Haggle', effectiveStatus: 'Silver 1', activeAtBase: false },
        ],
        additionalSpecialRules: ['Gang members are tough and dependable. Steady influx of new prospects.'],
      },
      level4: {
        cost: { gc: 400, ss: 0, d: 0 },
        minOwnerContribution: { gc: 40, ss: 0, d: 0 },
        interestPayment: { gc: 80, ss: 0, d: 0 },
        benefits: 'Buy into high society. One Character gains the Kingpin Talent for free. Gain additional lair upgrade. Turf encompasses an entire province or major city. Delegate operations to subordinate gang bosses.',
        additionalTrappings: ['Additional lair upgrade', 'Network of informants'],
        additionalIncomeSources: [
          { description: 'Collecting tribute from other gangs', earningSkill: 'Intimidate', effectiveStatus: 'Gold 1', activeAtBase: false },
        ],
        additionalSpecialRules: ['One Character gains the Kingpin Talent for free. No-one undertakes criminal activity in your turf without treating with you first.'],
      },
    },
    alternateEvent1: {
      title: 'Turf War',
      description: 'Another gang encroaches on your territory. Back down and no Characters can use the Enterprise for Income this round. Fight back and begin the next adventure with the Fatigued Condition but gain +20 to interact with local criminals.',
    },
    alternateEvent2: {
      title: 'Major Score',
      description: 'Your latest score draws heat from law enforcement. If you use the Income Endeavour you gain +50% earnings, but can only use it once this round and cannot use it at all in the following round of Endeavours.',
    },
  },

  // ─── Holy Temple ───────────────────────────────────────────────────
  {
    type: 'Holy Temple',
    displayName: 'Holy Temple',
    incomeSources: [
      { description: 'Donations of the faithful', earningSkill: 'Charm', effectiveStatus: 'Brass 3', activeAtBase: true },
      { description: 'Ceremonial duties (weddings, funerals)', earningSkill: 'Lore (Theology)', effectiveStatus: 'Silver 1', activeAtBase: true },
      { description: 'Academic services (translations of holy texts)', earningSkill: 'Language (Any) or Lore (Any)', effectiveStatus: 'Silver 1', activeAtBase: true },
    ],
    trappings: [
      'Modest-sized place of worship',
      'Large religious symbol',
      'Wardrobe of religious vestments',
      'Holy texts',
    ],
    specialRules: [
      'Choose a god to consecrate the Temple to. Characters gain +20 on Pray Tests within the Temple grounds and may treat Pray as a Basic Skill. All invested Characters can use the Holy Visions Talent within the Temple grounds.',
    ],
    startUpCost: { gc: 5, ss: 0, d: 0 },
    minOwnerContribution: { gc: 0, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 0, d: 6 },
    expansions: {
      level2: {
        cost: { gc: 10, ss: 0, d: 0 },
        minOwnerContribution: { gc: 1, ss: 0, d: 0 },
        interestPayment: { gc: 0, ss: 10, d: 0 },
        benefits: 'Temple becomes a fully-fledged place of worship. Donations effective Status increases to Silver 1. Cult awards a Religious Relic.',
        additionalTrappings: ['Religious Relic'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Donations of the faithful effective Status increases to Silver 1.'],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Temple becomes provincial centre of the cult. Subordinate priests attend in your absence. Donations effective Status increases to Silver 3. Gain a library, workshop, or fortifications. Choose a Blessing from your cult.',
        additionalTrappings: ['Subordinate priests', 'Library or Workshop or Fortifications'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Choose a Blessing from your cult — any Characters may enact that Blessing within the Temple borders.'],
      },
      level4: {
        cost: { gc: 400, ss: 0, d: 0 },
        minOwnerContribution: { gc: 40, ss: 0, d: 0 },
        interestPayment: { gc: 20, ss: 0, d: 0 },
        benefits: 'Temple becomes a place of pilgrimage. Place of worship grows to cathedral size. Donations effective Status increases to Gold 2. A small army of zealous believers defends the Temple. Choose a Miracle of your god.',
        additionalTrappings: ['Cathedral-sized place of worship', 'Army of zealous believers'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Choose a Miracle of your god — any Characters may invoke it within the Temple borders. Voice in senior cult leadership.'],
      },
    },
    alternateEvent1: {
      title: 'Stricture Violation',
      description: 'One of your flock violates a stricture of your god within the Temple grounds. Choose: invite your god to smite the NPC (harsh punishment), or accept the trespass as your own failing and gain 1 Sin point (but +20 on social Tests targeting the grateful lay-person for the next adventure).',
    },
    alternateEvent2: {
      title: 'Divine Favour',
      description: 'You devote yourself to supplication and are rewarded for your piety. For the next adventure, treat Pray as a Basic Skill and gain the Bless Talent. If you already have Bless for this Divine Lore, gain access to a Miracle instead.',
    },
  },

  // ─── Knightly Order ────────────────────────────────────────────────
  {
    type: 'Knightly Order',
    displayName: 'Knightly Order',
    incomeSources: [
      { description: 'Financial services (managing estates of campaigning knights)', earningSkill: 'Evaluate', effectiveStatus: 'Silver 5', activeAtBase: true },
      { description: 'Charitable donations from military, religious, or political figures', earningSkill: 'Charm', effectiveStatus: 'Silver 4', activeAtBase: true },
      { description: 'Plunder won on campaign', earningSkill: 'Melee (Any)', effectiveStatus: 'Silver 4', activeAtBase: true },
    ],
    trappings: [
      'Chapterhouse with assembly hall, chapel, armoury, fortified entrance, and stable',
      'Founding charter (code of conduct)',
      'Battle standard of the Order',
      'Treasure vault',
    ],
    specialRules: [
      'Any Character who has invested at least 1 GC gains +20 to all Leadership Tests targeting loyal citizens of the Empire. Choose secular (gain Warrior Born Talent) or templar order (gain Holy Visions Talent).',
    ],
    startUpCost: { gc: 50, ss: 0, d: 0 },
    minOwnerContribution: { gc: 5, ss: 0, d: 0 },
    baseInterestPayment: { gc: 2, ss: 10, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Three NPC knights join the Order with retainers and Trappings. Gain membership dues as a Source of Income. Gain a pair of Destriers with Saddle, Tack, and Barding.',
        additionalTrappings: ['Three NPC knights with retainers', 'Pair of Destriers with Saddle, Tack, and Barding'],
        additionalIncomeSources: [
          { description: 'Collection of membership dues', earningSkill: 'Leadership', effectiveStatus: 'Silver 5', activeAtBase: false },
        ],
        additionalSpecialRules: [],
      },
      level3: {
        cost: { gc: 300, ss: 0, d: 0 },
        minOwnerContribution: { gc: 30, ss: 0, d: 0 },
        interestPayment: { gc: 15, ss: 0, d: 0 },
        benefits: 'Half a dozen NPC knights join. At least one knight protects the chapterhouse at all times and provides Assistance. Choose one Source of Income to increase to Gold 2. Gain chapterhouse upgrade (Library, Workshop, improved defences, or men-at-arms).',
        additionalTrappings: ['Six additional NPC knights', 'Chapterhouse upgrade (Library, Workshop, defences, or men-at-arms)'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['At least one knight protects the chapterhouse at all times and provides Assistance.'],
      },
      level4: {
        cost: { gc: 400, ss: 0, d: 0 },
        minOwnerContribution: { gc: 40, ss: 0, d: 0 },
        interestPayment: { gc: 20, ss: 0, d: 0 },
        benefits: 'Another dozen knights join. One contributes a magic item. First knights gain Knights of the Inner Circle title. Choose one Source of Income to increase to Gold 4. Chapterhouse gains perimeter fortifications.',
        additionalTrappings: ['Dozen additional knights', 'Magic item (weapon, talisman, standard, or armour)', 'Perimeter fortifications'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['First knights gain Knights of the Inner Circle title.'],
      },
    },
    alternateEvent1: {
      title: 'Knight Called to Crusade',
      description: "One of the Order's knights is called to crusade beyond the Empire's borders. They may never return, but tracking their exploits may promote the Order. If no NPCs have joined, this Event has no effect.",
    },
    alternateEvent2: {
      title: 'Jousting Tournament',
      description: 'The Order is invited to a jousting tournament hosted by another Knightly Order or Bretonnian rivals. A splendid opportunity for valour and prizes. Until end of next adventure, the tournament provides an additional Source of Income (Melee (Cavalry), Gold 2).',
    },
  },

  // ─── Tavern ────────────────────────────────────────────────────────
  {
    type: 'Tavern',
    displayName: 'Tavern',
    incomeSources: [
      { description: 'Serving food and drink', earningSkill: 'Trade (Cook)', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Servicing rental accommodation', earningSkill: 'Endurance', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Buying and selling local gossip and secrets', earningSkill: 'Gossip', effectiveStatus: 'Brass 4', activeAtBase: true },
    ],
    trappings: [
      'Reliable supply of food and cheap ale',
      'Bar and stools',
      'Tables and chairs',
      'Kitchen and cellar',
      'Boarding rooms with beds and basic amenities',
    ],
    specialRules: [
      'Any regular Character may add Consume Alcohol to their Career Skills. Any Character who begins an adventure at the Tavern may choose to begin Stinking Drunk (roll 1d10 for effects) and gain a free point of Fortune.',
    ],
    startUpCost: { gc: 5, ss: 0, d: 0 },
    minOwnerContribution: { gc: 0, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 5, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 50, ss: 0, d: 0 },
        minOwnerContribution: { gc: 5, ss: 0, d: 0 },
        interestPayment: { gc: 2, ss: 10, d: 0 },
        benefits: 'Recruit bar staff and a bouncer. Optionally upgrade quality of one Source of Income to Silver 1. Gain a small stable and ostler, plus a Riding Horse and Saddle.',
        additionalTrappings: ['Bar staff', 'Bouncer', 'Small stable with ostler', 'Riding Horse and Saddle'],
        additionalIncomeSources: [],
        additionalSpecialRules: [],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Choose one Source of Income to increase to Silver 3. Invest in barricades, secure locks, and defences to fortify the Tavern. Gain a Blunderbuss behind the bar.',
        additionalTrappings: ['Barricades and secure locks', 'Blunderbuss'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Can secure inside the Tavern with consumable supply during crises.'],
      },
      level4: {
        cost: { gc: 200, ss: 0, d: 0 },
        minOwnerContribution: { gc: 20, ss: 0, d: 0 },
        interestPayment: { gc: 10, ss: 0, d: 0 },
        benefits: 'Tavern becomes the social centre of the community. Bar staff double as effective informants. Stable now houses a Coach with a driver.',
        additionalTrappings: ['Coach and driver', 'Expanded stable'],
        additionalIncomeSources: [
          { description: 'Event accommodation', earningSkill: 'Haggle', effectiveStatus: 'Silver 4', activeAtBase: false },
        ],
        additionalSpecialRules: ['Bar staff double as effective informants, keeping you apprised of current affairs.'],
      },
    },
    alternateEvent1: {
      title: 'Supplier Price Hike',
      description: 'Your regular ale supplier raises prices, forcing you to water down drinks. Patrons tolerate it until end of next adventure. If you have not found a cheaper supplier by then, the effective Status of serving food and drink decreases.',
    },
    alternateEvent2: {
      title: 'Local Festival',
      description: 'A local festival sees increased demand for accommodation and alcohol. Characters using the Tavern for Income gain +50% earnings until the next adventure. If no Characters use Income, a competing establishment picks up the custom instead.',
    },
  },

  // ─── Market Parlour ────────────────────────────────────────────────
  {
    type: 'Market Parlour',
    displayName: 'Market Parlour',
    incomeSources: [
      { description: 'Sale of general goods', earningSkill: 'Haggle', effectiveStatus: 'Brass 5', activeAtBase: true },
      { description: 'Sale of specialist goods (ordered or made-to-order)', earningSkill: 'Haggle', effectiveStatus: 'Brass 5', activeAtBase: true },
    ],
    trappings: [
      'Covered stall with canvas tarpaulin (mobile and collapsible)',
      'Steady supply of saleable goods',
      'Abacus and secure moneybox',
      'Guild licence (if applicable)',
    ],
    specialRules: [
      'Characters who spend an Endeavour gaining Income from general goods gain +20 to Haggle Tests until end of next adventure. Characters gaining Income from specialist goods gain +20 to Availability Tests until end of next adventure.',
    ],
    startUpCost: { gc: 5, ss: 0, d: 0 },
    minOwnerContribution: { gc: 0, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 5, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 50, ss: 0, d: 0 },
        minOwnerContribution: { gc: 5, ss: 0, d: 0 },
        interestPayment: { gc: 2, ss: 10, d: 0 },
        benefits: 'Employ shopkeepers. Exchange collapsible stall for permanent shopfront. Choose one Source of Income to increase to Silver 1. Optionally gain a residence above the shop or rent it out.',
        additionalTrappings: ['Permanent shopfront', 'Shopkeepers', 'Room above/behind shop'],
        additionalIncomeSources: [
          { description: 'Rental income from room above shop', earningSkill: 'Haggle', effectiveStatus: 'Silver 1', activeAtBase: false },
        ],
        additionalSpecialRules: [],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Expand store and back rooms. Choose upgrade: Workshop, Draught Horse and Wagon, or large Warehouse with guard. More shopkeepers with working rota. Choose a Source of Income to increase to Silver 3.',
        additionalTrappings: ['Expanded store', 'Workshop or Wagon or Warehouse'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Working rota permits unlimited time off.'],
      },
      level4: {
        cost: { gc: 200, ss: 0, d: 0 },
        minOwnerContribution: { gc: 20, ss: 0, d: 0 },
        interestPayment: { gc: 10, ss: 0, d: 0 },
        benefits: 'Transforms into centre of its own marketplace. Invite other retailers to set up stalls for a cut of profits. Shopkeepers double as informants. Gain additional store upgrade and dedicated security team.',
        additionalTrappings: ['Marketplace', 'Security guards', 'Barricades and defences', 'Additional store upgrade'],
        additionalIncomeSources: [
          { description: 'Retailer stall rentals', earningSkill: 'Haggle', effectiveStatus: 'Silver 5', activeAtBase: false },
        ],
        additionalSpecialRules: ['Shopkeepers double as informants. Dedicated security guards defend the Parlour.'],
      },
    },
    alternateEvent1: {
      title: 'Market Day Closed',
      description: 'The local council closes market day for the month to mark a tragedy or special event. No Character may use the Market Parlour for Income until the next adventure. Following that, all Income is increased by 50% due to built-up demand.',
    },
    alternateEvent2: {
      title: 'Convenient Alignment',
      description: 'Business interests and stakeholder needs conveniently align. Choose a Favour owed by you or the Enterprise and downgrade it one level (Significant becomes Major, Major becomes Minor, Minor is repaid entirely).',
    },
  },

  // ─── Noble Estate ──────────────────────────────────────────────────
  {
    type: 'Noble Estate',
    displayName: 'Noble Estate',
    incomeSources: [
      { description: 'Domestic labour', earningSkill: 'Endurance', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Field labour', earningSkill: 'Endurance', effectiveStatus: 'Brass 3', activeAtBase: true },
    ],
    trappings: [
      'A single farm, garden, lodge, or wing of a mansion',
      'Trade tools relevant to your position',
    ],
    specialRules: [
      'Any Character who has invested at least 6d into the Estate doubles the bonuses and penalties of Status on any Skill Tests.',
    ],
    startUpCost: { gc: 5, ss: 0, d: 0 },
    minOwnerContribution: { gc: 0, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 5, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 50, ss: 0, d: 0 },
        minOwnerContribution: { gc: 5, ss: 0, d: 0 },
        interestPayment: { gc: 2, ss: 10, d: 0 },
        benefits: 'Trusted with oversight of neighbouring sections. Administrative duties provide a new Source of Income. Neighbours provide Assistance. Gain access to a Riding Horse with Saddle and Harness.',
        additionalTrappings: ['Oversight of neighbouring sections', 'Riding Horse with Saddle and Harness'],
        additionalIncomeSources: [
          { description: 'Administrative duties (tax collection, inventory, informing)', earningSkill: 'Perception', effectiveStatus: 'Silver 2', activeAtBase: false },
        ],
        additionalSpecialRules: ['Neighbours provide Assistance when asked.'],
      },
      level3: {
        cost: { gc: 300, ss: 0, d: 0 },
        minOwnerContribution: { gc: 30, ss: 0, d: 0 },
        interestPayment: { gc: 3, ss: 0, d: 0 },
        benefits: 'Take over the whole Estate as feudal master. 200 peasants labour. Choose three Trappings (Library, Workshop, wardrobe, stable, coaches, boathouse, or barracks). Gain tax revenue as Source of Income. Expected to provide soldiers.',
        additionalTrappings: ['Whole Estate', 'Three chosen Trappings (Library, Workshop, stable, coaches, etc.)'],
        additionalIncomeSources: [
          { description: 'Tax revenue from surrounding districts', earningSkill: 'Leadership', effectiveStatus: 'Gold 3', activeAtBase: false },
        ],
        additionalSpecialRules: ['Expected to provide soldiers for your elector count.'],
      },
      level4: {
        cost: { gc: 500, ss: 0, d: 0 },
        minOwnerContribution: { gc: 50, ss: 0, d: 0 },
        interestPayment: { gc: 25, ss: 0, d: 0 },
        benefits: 'Extend dominion beyond inheritance. Choose two additional Trappings from level 3 or suggest an extravagant one. Tax revenue effective Status increases to Gold 5. Become a major political figure in the grand province.',
        additionalTrappings: ['Two additional extravagant Trappings'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Major political figure in the grand province. Expected to involve yourself in high society events.'],
      },
    },
    alternateEvent1: {
      title: 'Workers in Need',
      description: "The Estate's poorest workers beg for charity to survive the upcoming season. Pay an amount equal to your current Interest Payments. If you donate, you may ignore Status penalties on Skill Tests until end of next adventure.",
    },
    alternateEvent2: {
      title: 'Master Abroad',
      description: 'Your master travels abroad and places additional responsibility on your shoulders. Until the next adventure, you may use a Source of Income from the next higher Expansion level. If already at level 4, no additional effect.',
    },
  },

  // ─── Performance Troupe ────────────────────────────────────────────
  {
    type: 'Performance Troupe',
    displayName: 'Performance Troupe',
    incomeSources: [
      { description: 'Donations following public performances', earningSkill: 'Entertain (Any) or Perform (Any) or Play (Any)', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Bookings for private events', earningSkill: 'Entertain (Any) or Perform (Any) or Play (Any)', effectiveStatus: 'Silver 1', activeAtBase: true },
      { description: 'Sale of merchandise', earningSkill: 'Haggle', effectiveStatus: 'Brass 5', activeAtBase: true },
    ],
    trappings: [
      'Draught Horse and Wagon',
      'Eclectic mix of costumes, props, instruments, and scripts (mostly in poor condition)',
    ],
    specialRules: [
      'Any invested Character (at least 6d) can treat all Perform and Play Skills as Basic Skills, or select a single Entertain/Perform/Play Specialisation to add to Career Skills. Spending an Endeavour to produce new material gives +50% earnings on the next three Income Endeavours.',
    ],
    startUpCost: { gc: 5, ss: 0, d: 0 },
    minOwnerContribution: { gc: 0, ss: 10, d: 0 },
    baseInterestPayment: { gc: 0, ss: 5, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 50, ss: 0, d: 0 },
        minOwnerContribution: { gc: 5, ss: 0, d: 0 },
        interestPayment: { gc: 2, ss: 10, d: 0 },
        benefits: 'Joined by five additional performers who provide Assistance. Stage larger productions or perform in two locations. Choose one Source of Income to increase to Silver 3. Wagon adapts into improvised Stage.',
        additionalTrappings: ['Five additional performers', 'Improvised Stage (adapted Wagon)'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Additional performers provide Assistance.'],
      },
      level3: {
        cost: { gc: 200, ss: 0, d: 0 },
        minOwnerContribution: { gc: 20, ss: 0, d: 0 },
        interestPayment: { gc: 10, ss: 0, d: 0 },
        benefits: 'Gain a permanent entertainment venue (theatre, concert hall, or arena). Rent the space to others for income. Greater selection of costumes, props, instruments, and scripts in decent condition. Each performer has a dedicated understudy.',
        additionalTrappings: ['Permanent entertainment venue', 'Improved costumes, props, and instruments', 'Dedicated understudies'],
        additionalIncomeSources: [
          { description: 'Venue rental to other performers', earningSkill: 'Haggle', effectiveStatus: 'Silver 3', activeAtBase: false },
        ],
        additionalSpecialRules: [],
      },
      level4: {
        cost: { gc: 300, ss: 0, d: 0 },
        minOwnerContribution: { gc: 30, ss: 0, d: 0 },
        interestPayment: { gc: 3, ss: 0, d: 0 },
        benefits: 'Venue becomes a hangout for social elites and VIPs. Choose one venue upgrade (spectacular stage, expanded backstage, prop Workshop, or trained animals). Occasionally courted by celebrities.',
        additionalTrappings: ['Venue upgrade (spectacular stage, expanded backstage, Workshop, or trained animals)'],
        additionalIncomeSources: [
          { description: 'Celebrity guest performances', earningSkill: 'Entertain (Any) or Perform (Any) or Play (Any)', effectiveStatus: 'Gold 2', activeAtBase: false },
        ],
        additionalSpecialRules: ['Celebrity performers occasionally produce content for you (alternating Endeavour phases only).'],
      },
    },
    alternateEvent1: {
      title: 'Frivolities Outlawed',
      description: 'A local lord outlaws dance and frivolities in response to personal tragedy. If Characters Earn or gain Income with the Troupe, they are flouting the ban or performing in secret venues, which may have ramifications during the next adventure.',
    },
    alternateEvent2: {
      title: 'Wealthy Patron',
      description: 'A wealthy individual reveals themselves as a fan. Roll 1d10 after future Event Table rolls. On 8-10, gain double wealth from Income but the patron demands adjustments or favours. On 1-2, the patron loses interest and this Event has no further effect.',
    },
  },

  // ─── Publishing House ──────────────────────────────────────────────
  {
    type: 'Publishing House',
    displayName: 'Publishing House',
    incomeSources: [
      { description: 'Mass-printing of popular items', earningSkill: 'Trade (Printer)', effectiveStatus: 'Brass 4', activeAtBase: true },
      { description: 'Limited editions, hand produced or printed-to-order', earningSkill: 'Trade (Printer)', effectiveStatus: 'Brass 5', activeAtBase: true },
      { description: 'Paid advertisements or advertorials', earningSkill: 'Haggle', effectiveStatus: 'Brass 4', activeAtBase: true },
    ],
    trappings: [
      'Printing press, paper, type pieces, and moulds',
      'Office with desks, chairs, books, and writing kits',
      'Small library of records, reference materials, and prior publications',
    ],
    specialRules: [
      'First time a Character undertakes Income Endeavour at the Publishing House, they gain Read/Write Talent for free (or Speedreader if already literate). Invested Characters (at least 1ss) gain +20 to all Tests for the Research Lore Endeavour.',
    ],
    startUpCost: { gc: 10, ss: 0, d: 0 },
    minOwnerContribution: { gc: 1, ss: 0, d: 0 },
    baseInterestPayment: { gc: 0, ss: 10, d: 0 },
    expansions: {
      level2: {
        cost: { gc: 50, ss: 0, d: 0 },
        minOwnerContribution: { gc: 5, ss: 0, d: 0 },
        interestPayment: { gc: 2, ss: 10, d: 0 },
        benefits: 'Employ three clerks to operate press, produce content, and market. They can research topics or provide Assistance. Choose a Source of Income to increase to Silver 2; all others increase to Silver 1. Gain a Riding Horse with Saddle and Tack.',
        additionalTrappings: ['Three clerks', 'Riding Horse with Saddle and Tack'],
        additionalIncomeSources: [],
        additionalSpecialRules: ['Clerks can research specialist topics on your behalf or provide Assistance.'],
      },
      level3: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Employ a network of informants. Publishing House becomes a pre-eminent source of knowledge. Patrons commission investigations. Gain a Draught Horse and Wagon for mass deliveries.',
        additionalTrappings: ['Network of informants', 'Draught Horse and Wagon'],
        additionalIncomeSources: [
          { description: 'Commissioned investigations for patrons', earningSkill: 'Perception', effectiveStatus: 'Silver 4', activeAtBase: false },
        ],
        additionalSpecialRules: ['Publishing House is considered a pre-eminent source of knowledge in your subject of expertise.'],
      },
      level4: {
        cost: { gc: 100, ss: 0, d: 0 },
        minOwnerContribution: { gc: 10, ss: 0, d: 0 },
        interestPayment: { gc: 5, ss: 0, d: 0 },
        benefits: 'Employ another dozen writers. Publishing House becomes a prestige imprint. Celebrity writers produce content. Choose a Source of Income to increase to Silver 5.',
        additionalTrappings: ['Dozen additional writers', 'Prestige imprint status'],
        additionalIncomeSources: [
          { description: 'Celebrity writer content', earningSkill: 'Art (Writing)', effectiveStatus: 'Gold 2', activeAtBase: false },
        ],
        additionalSpecialRules: ['Celebrity writers produce content (alternating Endeavour phases only). Choose a Source of Income to increase to Silver 5.'],
      },
    },
    alternateEvent1: {
      title: 'Controversial Advertisement',
      description: 'An advertisement from a controversial figure draws reader ire. Pull the ad (halve Income from advertisements until next adventure) or let it run (halve Income from all other Sources). Either choice may have consequences.',
    },
    alternateEvent2: {
      title: 'Unexpected Bestseller',
      description: 'One of your releases is unexpectedly popular and quickly sells out. Spend an Endeavour fast-tracking a second printing to double earnings from Income Endeavours in the round following the next adventure.',
    },
  },
];

// O(1) lookup map by enterprise type
export const ENTERPRISE_TEMPLATE_MAP: Record<EnterpriseType, EnterpriseTemplate> =
  ENTERPRISE_TEMPLATES.reduce(
    (map, template) => {
      map[template.type] = template;
      return map;
    },
    {} as Record<EnterpriseType, EnterpriseTemplate>
  );
