/**
 * Short descriptions for WFRP 4e skills, used for tooltips.
 * Based on the Core Rulebook Chapter 4: Skills and Talents.
 */
export const SKILL_DESCRIPTIONS: Record<string, string> = {
  'Art': 'Create works of art in your chosen medium. (Dex, Basic, Grouped)',
  'Athletics': 'Run, jump, and move with speed or grace. Used for combat movement. (Ag, Basic)',
  'Bribery': 'Judge if someone will accept a bribe and how to offer it. (Fel, Basic)',
  'Charm': 'Make people think favourably of you and your proposals. (Fel, Basic)',
  'Charm Animal': 'Befriend, calm, or subjugate animals. (WP, Basic)',
  'Climb': 'Ascend steep or vertical surfaces. (S, Basic)',
  'Cool': 'Remain calm under stress, resist fear, stick to convictions. (WP, Basic)',
  'Consume Alcohol': 'Handle alcohol without clouding judgment. (T, Basic)',
  'Dodge': 'Avoid incoming attacks, falling rocks, and traps. (Ag, Basic)',
  'Drive': 'Guide vehicles along roads safely. (Ag, Basic)',
  'Endurance': 'Withstand hardship, deprivation, and harsh environments. (T, Basic)',
  'Entertain': 'Delight crowds with singing, acting, comedy, or storytelling. (Fel, Basic, Grouped)',
  'Gamble': 'Measure odds and engage in games of chance. (Int, Basic)',
  'Gossip': 'Ferret out useful news and spread rumours. (Fel, Basic)',
  'Haggle': 'Negotiate prices when buying or selling goods. (Fel, Basic)',
  'Intimidate': 'Frighten or coerce others through threats. (S, Basic)',
  'Intuition': 'Sense when something is wrong or spot hidden dangers. (I, Basic)',
  'Leadership': 'Command, inspire, and direct others. (Fel, Basic)',
  'Melee (Basic)': 'Fight with basic hand weapons in close combat. (WS, Basic)',
  'Melee ()': 'Fight with a specialised melee weapon group. (WS, Basic, Grouped)',
  'Navigation': 'Find your way using landmarks, stars, or maps. (I, Basic)',
  'Outdoor Survival': 'Survive in the wilderness — find food, water, shelter. (Int, Basic)',
  'Perception': 'Notice things using your senses — sight, hearing, smell. (I, Basic)',
  'Ride': 'Control a mount while riding. (Ag, Basic, Grouped)',
  'Row': 'Propel a boat using oars. (S, Basic)',
  'Stealth ()': 'Move silently and remain hidden. (Ag, Basic, Grouped)',
  // Advanced skills
  'Animal Care': 'Tend to animals — feed, groom, and treat minor ailments. (Int, Advanced)',
  'Animal Training': 'Train animals to perform tasks and obey commands. (Int, Advanced, Grouped)',
  'Channelling': 'Call upon and control the Winds of Magic. (WP, Advanced, Grouped)',
  'Evaluate': 'Determine the value of rare items and detect counterfeits. (Int, Advanced)',
  'Heal': 'Treat wounds, diseases, and poisons. (Int, Advanced)',
  'Language': 'Speak and understand a foreign language. (Int, Advanced, Grouped)',
  'Lore': 'Knowledge of a specific academic subject. (Int, Advanced, Grouped)',
  'Perform': 'Physical performance — acrobatics, juggling, fire-breathing. (Ag, Advanced, Grouped)',
  'Pick Lock': 'Open locks without the proper key. (Dex, Advanced)',
  'Play': 'Play a musical instrument. (Dex, Advanced, Grouped)',
  'Pray': 'Commune with your deity and invoke divine power. (Fel, Advanced)',
  'Ranged': 'Attack with ranged weapons — bows, crossbows, firearms. (BS, Advanced, Grouped)',
  'Research': 'Find information in books, libraries, and archives. (Int, Advanced)',
  'Sail': 'Operate and navigate sailing vessels. (Ag, Advanced, Grouped)',
  'Secret Signs': 'Communicate using hidden symbols and codes. (Int, Advanced, Grouped)',
  'Set Trap': 'Construct and place traps. (Dex, Advanced)',
  'Sleight of Hand': 'Perform tricks, pick pockets, and palm objects. (Dex, Advanced)',
  'Swim': 'Move through water without drowning. (S, Advanced)',
  'Track': 'Follow trails and tracks left by creatures. (I, Advanced)',
  'Trade': 'Craft items using a specific trade skill. (Dex, Advanced, Grouped)',
};

/** Look up a skill description, trying exact match then prefix match */
export function getSkillDescription(skillName: string): string {
  if (SKILL_DESCRIPTIONS[skillName]) return SKILL_DESCRIPTIONS[skillName];
  // Try prefix match for grouped skills like "Melee (Cavalry)", "Language (Khazalid)"
  const base = skillName.split(' (')[0];
  if (SKILL_DESCRIPTIONS[base]) return SKILL_DESCRIPTIONS[base];
  return '';
}
