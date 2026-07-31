export interface EnterpriseEvent {
  rangeStart: number;  // inclusive
  rangeEnd: number;    // inclusive
  title: string;
  description: string;
  isAlternate?: boolean;  // true for 55-57 and 58-60 ranges
}

export interface EnterpriseEventResult {
  roll: number;
  title: string;
  description: string;
}

export const ENTERPRISE_EVENTS: EnterpriseEvent[] = [
  {
    rangeStart: 1,
    rangeEnd: 2,
    title: 'Looming Bankruptcy',
    description:
      'Poor investments, the ravages of war, or simple ill-fortune bring the Enterprise to the brink of failure. If the Enterprise has Expanded, it loses all advantages from its most recent Expansion but retains the increased Debt and Interest Payments. If the Enterprise has not Expanded, the business must close and sell its Trappings to cover costs.',
  },
  {
    rangeStart: 3,
    rangeEnd: 5,
    title: 'Recession',
    description:
      'Financial disaster strikes the local economy and the best the Character can do is keep their Enterprise doors open. No Character can use the Enterprise for Earning or Income Endeavours until the end of the next adventure.',
  },
  {
    rangeStart: 6,
    rangeEnd: 8,
    title: 'Shoplifter Strikes',
    description:
      'One of the Enterprise\'s Trappings, whatever is most valuable and portable, is stolen. The Character may attempt to reclaim it in the next adventure, or accept its loss as the cost of doing business.',
  },
  {
    rangeStart: 9,
    rangeEnd: 10,
    title: 'Interest Inflation',
    description:
      'The Enterprise\'s Creditor grows jealous of their success, and invokes an obscure clause in their contract to demand additional payment. The Enterprise\'s Interest Payments are now doubled until all outstanding Debt is paid off.',
  },
  {
    rangeStart: 11,
    rangeEnd: 13,
    title: 'Trapping Degrades',
    description:
      'One of the Enterprise\'s Trappings deteriorates in quality. It may acquire a Flaw (if an item), lose a Trained Skill (if a Trained animal), or gain a Condition (if an employee). The GM should determine the exact mechanical effects.',
  },
  {
    rangeStart: 14,
    rangeEnd: 16,
    title: 'New Competition',
    description:
      'A rival business providing a similar service starts muscling in on their territory. To keep up, the Character must undertake at least one Income Endeavour with the Enterprise during this batch, but receives only 50% of the usual income.',
  },
  {
    rangeStart: 17,
    rangeEnd: 20,
    title: 'Forced to Diversify',
    description:
      'The GM chooses one of the Enterprise\'s Sources of Income (whichever is most commonly used). That Source of Income is not available for Income Endeavours during this coming set of Endeavours due to a drop in supply or demand.',
  },
  {
    rangeStart: 21,
    rangeEnd: 23,
    title: 'The Dreaded Auditors',
    description:
      'Auditors from the treasury demand to see the Enterprise\'s books. The Character must spend an Endeavour assisting the investigation, or pay 10% of the Enterprise\'s most recent Start-Up Costs or Expansion Costs (whichever is higher) in non-compliance fees.',
  },
  {
    rangeStart: 24,
    rangeEnd: 26,
    title: 'Gimme a Discount',
    description:
      'A customer demands a substantial discount on the Enterprise\'s services. If the Character refuses, the customer begins to slander the business publicly. If the Character acquiesces, other customers follow suit and the Enterprise\'s Income Statuses may reduce.',
  },
  {
    rangeStart: 27,
    rangeEnd: 30,
    title: 'I Need a Holiday',
    description:
      'The Character experiences severe burnout and discovers the necessity of taking time off. They cannot choose the Income Endeavour in the next round of Endeavours. Other Characters invested in the Enterprise can use it for Income Endeavours as normal.',
  },
  {
    rangeStart: 31,
    rangeEnd: 33,
    title: 'Conservative Investments',
    description:
      'Hand-wringing bean counters regard the current economic climate with dismay, betting only on sure prospects. No Characters may acquire a Creditor to help Expand an Enterprise during the next round of Endeavours.',
  },
  {
    rangeStart: 34,
    rangeEnd: 36,
    title: 'The Grind',
    description:
      'The Character spends their next week trapped in a non-stop cycle of work and sleep, as exhausting as it is profitable. They must choose an Income Endeavour before the next adventure, if possible, but otherwise no special effects apply.',
  },
  {
    rangeStart: 37,
    rangeEnd: 39,
    title: 'I Quit!',
    description:
      'An NPC member of staff leaves the Enterprise\'s employ due to dissatisfaction, ambition, or untimely death. The employee is replaced by the start of the next adventure — this could be an opportunity to work more closely with an established NPC contact.',
  },
  {
    rangeStart: 40,
    rangeEnd: 41,
    title: 'New Creditor',
    description:
      'The Enterprise\'s Creditor sells the Character\'s Debt onto someone else. Depending on how well the Character got on with the old Creditor, this could be a cause for celebration — at least until the new Creditor is revealed.',
  },
  {
    rangeStart: 42,
    rangeEnd: 44,
    title: 'Closed for Refurbishment',
    description:
      'The Enterprise updates its storefront, offices, or other Trappings. It cannot be used to collect Income in the next batch of Endeavours, but afterwards the accommodation enjoys a practical and cosmetic uplift which may provide Skill Test bonuses.',
  },
  {
    rangeStart: 45,
    rangeEnd: 48,
    title: 'Creditor Visits',
    description:
      'The Creditor starts poking around the Enterprise and demanding updates. Whilst annoying, it provides an opportunity to repay Debts without jumping through the usual hoops. The Character may repay Debt without using an Endeavour.',
  },
  {
    rangeStart: 49,
    rangeEnd: 51,
    title: 'New Hire',
    description:
      'The Enterprise is profitable enough to recruit an NPC to help with its day-to-day business. Unfortunately, the Enterprise is not profitable enough to hire a particularly qualified, competent, or scrupulous employee, and they will need plenty of training.',
  },
  {
    rangeStart: 52,
    rangeEnd: 54,
    title: 'Breakup Opportunity',
    description:
      'An investor offers to purchase a less-profitable fraction of the business. If the Enterprise has Expanded, the Character may accept to lose all Trappings and benefits from the most recent Expansion, but also pay off all outstanding Debt.',
  },
  {
    rangeStart: 55,
    rangeEnd: 57,
    title: 'Alternate Event 1',
    description:
      'Refer to the corresponding Enterprise template for the specific enterprise type to determine this Event\'s effects.',
    isAlternate: true,
  },
  {
    rangeStart: 58,
    rangeEnd: 60,
    title: 'Alternate Event 2',
    description:
      'Refer to the corresponding Enterprise template for the specific enterprise type to determine this Event\'s effects.',
    isAlternate: true,
  },
  {
    rangeStart: 61,
    rangeEnd: 63,
    title: 'Business as Usual',
    description:
      'The Character stays busy with taking stock, networking events, and keeping their customers happy — all the routine activities you would expect whilst running an Enterprise, with no special effects.',
  },
  {
    rangeStart: 64,
    rangeEnd: 66,
    title: 'Co-Ownership',
    description:
      'An investor or employee offers to buy in to the Enterprise as a co-owner. If the Character accepts, the co-owner pays off half of the Enterprise\'s outstanding Debt, but insists on some \'interesting\' ideas for developing the Enterprise.',
  },
  {
    rangeStart: 67,
    rangeEnd: 69,
    title: 'Upgraded Trapping',
    description:
      'The Enterprise is profitable enough to improve one of its Trappings. It may acquire a Quality (if an item), gain a Trained Skill (if a Trained animal), or gain a new Skill (if an employee). The GM should determine the exact mechanical effects.',
  },
  {
    rangeStart: 70,
    rangeEnd: 72,
    title: 'Merger Opportunity',
    description:
      'Another business owner in an adjacent industry offers to join forces. The Character may choose to immediately Expand their Enterprise. Expansion Costs must be paid as normal, but Expansion does not cost an Endeavour and may be undertaken even if the Enterprise is still in Debt.',
  },
  {
    rangeStart: 73,
    rangeEnd: 75,
    title: 'Desperate Customer',
    description:
      'A customer has urgent need of the Enterprise\'s services and is willing to pay a premium. The Character chooses one Source of Income. Until the start of the next adventure, the numerical value of the Income Source\'s effective Status is increased by 1.',
  },
  {
    rangeStart: 76,
    rangeEnd: 78,
    title: 'In the Black',
    description:
      'The Enterprise is making a tidy profit — nothing spectacular, but good enough to put everyone at ease. No additional effects apply.',
  },
  {
    rangeStart: 79,
    rangeEnd: 81,
    title: 'Temporary Expansion',
    description:
      'The Character loans larger accommodations, extra equipment, and temporary staff to take advantage of a brief surge in demand. Until the end of the next adventure, the Enterprise enjoys all the benefits of having Expanded to the next level without paying Expansion Costs.',
  },
  {
    rangeStart: 82,
    rangeEnd: 85,
    title: 'Taking Care of Itself',
    description:
      'The Enterprise is sufficiently established to keep ticking along with minimal supervision. The Character may immediately use the Enterprise to undertake an Income Endeavour. This does not count towards their maximum number of Endeavours.',
  },
  {
    rangeStart: 86,
    rangeEnd: 88,
    title: 'Innovation',
    description:
      'Thanks to the Character\'s ingenuity, the Enterprise gains a new Source of Income. Players and GMs should work out together what the new Source of Income is, what Trappings are required, and what the exact mechanical effects are.',
  },
  {
    rangeStart: 89,
    rangeEnd: 91,
    title: 'Rolling Profits',
    description:
      'Business is booming! The Character reinvests those profits into improving the Enterprise\'s capacity to make money. They choose one Source of Income and increase the numeric value of its effective Status by 1, on an ongoing basis.',
  },
  {
    rangeStart: 92,
    rangeEnd: 94,
    title: 'New Trapping',
    description:
      'The Character spends the Enterprise\'s profits on acquiring a new Trapping. This may be a duplicate of a Trapping the Enterprise already owns, or a new Trapping with a value equal to or less than the Enterprise\'s Start-Up Costs or most recent Expansion Costs (whichever is higher).',
  },
  {
    rangeStart: 95,
    rangeEnd: 97,
    title: 'Unexpected Generosity',
    description:
      'Thanks to holiday cheer, a wedding, or the death of a wealthy relative, the Character\'s Creditor is in an uncharacteristically good mood. The Enterprise does not have to make an Interest Payment during this period of downtime.',
  },
  {
    rangeStart: 98,
    rangeEnd: 100,
    title: 'Offer to Buy-Out',
    description:
      'A wealthy entrepreneur is impressed with what the Character has built and offers to purchase it wholesale. If the Character accepts, they lose any benefits provided by the Enterprise, pay off all outstanding Debt, and gain wealth equal to double the Enterprise\'s Start-Up Costs or most recent Expansion Costs (whichever is greater).',
  },
];

export function lookupEvent(roll: number): EnterpriseEvent | undefined {
  return ENTERPRISE_EVENTS.find(
    (event) => roll >= event.rangeStart && roll <= event.rangeEnd
  );
}
