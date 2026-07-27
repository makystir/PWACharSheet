export interface ArcaneMarkEntry {
  roll: number;
  description: string;
}

/**
 * Arcane Marks tables — one per College Lore (d10 each).
 * Keyed by Lore name matching getCharacterLore() output.
 */
export const ARCANE_MARKS: Record<string, ArcaneMarkEntry[]> = {
  Light: [
    { roll: 1, description: "Vulnerability to Darkness: When in areas of darkness, Channelling (Hysh) and Language (Magick) Tests suffer from -1 SL." },
    { roll: 2, description: "Aura of Light: You give off a radiant energy that makes other light sources glow brighter. All light sources within 20 yards provide stronger light (+2 yards)." },
    { roll: 3, description: "Autoluminescent: You give off a constant glow. You give off soft light allowing you to see 2 yards in darkness. Further manifestations increase this by 2 yards. Cannot be turned off." },
    { roll: 4, description: "Stoicism: You must resist Psychology Tests when you are able to, even if you feel it is not in your interest. Gain +2 SL to Cool Tests made to resist Psychology." },
    { roll: 5, description: "Enlightened Condescension: Your deep knowledge comes off as arrogant and pretentious. Take a -10 penalty to your initial Fellowship score." },
    { roll: 6, description: "White Eyes: You are momentarily blinded by the light of Hysh and gain 3 Blinded Conditions. Once you regain your sight your irises become pure white globes. Suffer -1 SL to all Fellowship-based Tests." },
    { roll: 7, description: "Bleaching: Hysh swirls around your head, making your hair stand out in all directions. Your hair becomes completely white." },
    { roll: 8, description: "Instant Recall: Whenever you use a Fortune Point to reroll a Test to recall information, you automatically succeed. If the test is Dramatic, treat results of less than +1 SL as +1 SL." },
    { roll: 9, description: "Purging: Pass a Hard (-20) Endurance Test or suffer the Fever Symptom for 2d10 days. Afterwards, gain +1 SL to any Tests to resist contracting disease." },
    { roll: 10, description: "Mark of Hysh: The rune of Hysh appears somewhere on your body. Gain the Suffuse with Hysh Talent." },
  ],
  Metal: [
    { roll: 1, description: "Quicksilver Tears: Your tears and sweat take on the appearance of mercury. They are practically unchanged but quite unsettling." },
    { roll: 2, description: "Mechanical: With your stiff gait and robotic movements, animals see you as an object rather than a creature. Charm Animal Tests suffer from -2 SL." },
    { roll: 3, description: "Forge's Glow: You glow with the faint radiance of hot metal. This gives off no heat but you suffer -1 SL to sight-based Stealth Tests." },
    { roll: 4, description: "Thieves! You suffer from paranoia, convinced everyone is out to steal your money. Gain Prejudice (Strangers)." },
    { roll: 5, description: "Leaden Tongue: Your voice takes on a harsh tone, akin to metal clashing upon metal. Tests involving speech, such as Gossip or Entertain (Singing) suffer from -1 SL." },
    { roll: 6, description: "Feeling A Bit Stiff: Chamon accretes on your joints, making movement difficult. Suffer a penalty of -5 to Ag and -1 to Movement." },
    { roll: 7, description: "Shining Orbs: Your eyes burn with agonising pain. Gain 3 Blinded Conditions. Once you regain your sight, your eyes become golden globes. Suffer -1 SL to all Fellowship-based Tests." },
    { roll: 8, description: "Hardness: If you take Damage from metal weapons, the 1 Wound minimum rule does not apply." },
    { roll: 9, description: "Metallic Affinity: You gain the Numismatics Talent, but it can only be applied to anything made of metal." },
    { roll: 10, description: "Mark of Chamon: The rune of Chamon appears somewhere on your body. Gain the Suffuse with Chamon Talent." },
  ],
  Life: [
    { roll: 1, description: "Rapid Growth: Your hair and fingernails grow at an alarming rate. You must spend a portion of each day trimming them back. Further manifestations cause plantlife to also form." },
    { roll: 2, description: "Barefoot: You can't abide wearing footwear and when you must, all Agility-based Tests suffer from a -2 SL penalty." },
    { roll: 3, description: "Winter's Nadir: During Ulriczeit and Vorhexen you must make a Very Easy (+60) Endurance Test every morning. If you fail, suffer from a Fatigued Condition." },
    { roll: 4, description: "Whiff of Ghyran: You give off an odour of damp earth, green shoots, and freshly cut grass." },
    { roll: 5, description: "Ghyran Face: Your skin takes on a greenish hue and your eyes turn emerald. You suffer -1 SL to all Fellowship-based Tests." },
    { roll: 6, description: "Vulnerability to Fire: When you suffer Damage from Ablaze Conditions, you take +1 Damage." },
    { roll: 7, description: "Catalyst: Your influence causes even destructive things to procreate. Diseases incubate twice as fast and last twice as long in Characters within 10 yards of you." },
    { roll: 8, description: "Aura of Growth: You emit an aura of growth and vigour. Remaining in one place causes a noticeable boost in surrounding flora. Outdoor Survival Tests to find food benefit from +1 SL." },
    { roll: 9, description: "Nemophilist: You gain the Arboreal Trait." },
    { roll: 10, description: "Mark of Ghyran: The rune of Ghyran appears somewhere on your body. Gain the Suffuse with Ghyran Talent." },
  ],
  Heavens: [
    { roll: 1, description: "Troubling Foresight: When under stress, you are plagued with unbidden visions of the future. If you fail any Willpower-based Test by 3 SL or more, you fall Prone and see disturbing revelations of disaster." },
    { roll: 2, description: "Cerulean Eyes: Your eyes become pale blue orbs which emit a faint glow. This is unnerving to others. Suffer -1 SL to all Fellowship-based Tests." },
    { roll: 3, description: "Whispery Voice: Your voice becomes thin and airy. You can no longer shout. In noisy surroundings, listeners must pass an Average (+20) Perception (Hearing) Test to hear you." },
    { roll: 4, description: "Insubstantial: You become very slightly transparent. You lose 10% of your weight and suffer from -5 Strength." },
    { roll: 5, description: "High-minded: In conversation you seem distracted and struggle to articulate specifics. You benefit from +5 Intelligence but suffer from -10 Fellowship." },
    { roll: 6, description: "Aura of Tranquility: You emit a strange, but peaceful aura that others find calming. All Intimidate Tests in your presence suffer from -1 SL." },
    { roll: 7, description: "Wandering Consciousness: You occasionally lose track of where your mind ends and the cosmos begins. Suffer from -5 Initiative." },
    { roll: 8, description: "Scentless: Your natural smell is replaced by the scent of clean, fresh air. Attempts to track you using scent can be no easier than Hard (-20)." },
    { roll: 9, description: "Stargazer: You become agitated when unable to scry the stars. For each night you fail to observe the night sky for at least an hour, Willpower- and Intelligence-based Tests become one step harder (max Very Hard)." },
    { roll: 10, description: "Mark of Azyr: The rune of Azyr appears somewhere on your body. Gain the Suffuse with Azyr Talent." },
  ],
  Shadows: [
    { roll: 1, description: "Vague: When speaking you are often unsure of yourself, given to obfuscation and hesitation. Suffer -1 SL to all Charm and Gossip Tests." },
    { roll: 2, description: "Mantle of Mist: Mist, fog, smoke, and other vapours seem drawn to your side. Stealth Tests in foggy areas benefit from +1 SL. Stealth Tests in brightly lit areas suffer from -1 SL." },
    { roll: 3, description: "Vulnerability to Sunlight: When exposed to sunshine, Channelling (Ulgu) and Language (Magick) Tests become one step harder." },
    { roll: 4, description: "Animal Aversion: An aura of mystery settles over you. Animals feel it. Animal Care, Animal Training, Charm Animal, and Ride Tests suffer from -1 SL." },
    { roll: 5, description: "Disturbing Eyes: Your eyes become grey and swirl with unnatural darkness. Advance the Night Vision Talent or gain it if you don't have it. Suffer -1 SL to all Fellowship-based Tests." },
    { roll: 6, description: "Wilful Shadow: Your shadow does not behave itself, often moving of its own accord. Suffer -1 SL to all Fellowship-based Tests and gain the Menacing Talent." },
    { roll: 7, description: "Cipher: You become less remarkable. Your face becomes less recognisable and more generic. Gain the Beneath Notice Talent." },
    { roll: 8, description: "Flicker: Light seems uncomfortable in your presence. Candles flicker, lanterns dim. If you succeed on a Difficult (-10) Willpower Test, you can extinguish a small flame within 20 yards." },
    { roll: 9, description: "Phantasmal: If you use Language (Magick) or Dodge to oppose an attack, rolling doubles and succeeding causes you to grow insubstantial, granting Ward (9) and Unstable Traits for WP Bonus rounds." },
    { roll: 10, description: "Mark of Ulgu: The rune of Ulgu appears somewhere on your body. Gain the Suffuse with Ulgu Talent." },
  ],
  Death: [
    { roll: 1, description: "Skeletal Frame: Your muscles wither; reduce your Strength by 5." },
    { roll: 2, description: "Cataracts: White film covers your eyes. Though you can still see, your stare is unnerving. Suffer -1 SL to all Fellowship-based Tests." },
    { roll: 3, description: "Cold Dead Hand: Your touch is repellent to those not of the Amethyst Order. Suffer -1 SL to all Fellowship-based Tests where tactile contact is involved." },
    { roll: 4, description: "Curse of Age: Any creature born within Willpower yards of you ages at an accelerated rate, living for no more than three quarters of the span it would otherwise." },
    { roll: 5, description: "Voice of the Dead: Your voice changes to an unsettling, hoarse whisper. It becomes impossible to shout. Suffer -1 SL to Casting Tests." },
    { roll: 6, description: "Grave Stench: You stink of the grave and attract scavengers such as carrion birds. Suffer -1 SL to all Fellowship-based Tests with those who can smell you." },
    { roll: 7, description: "Grim Determination: Fatigued Conditions do not give penalties to Language (Magick) and Channelling Tests." },
    { roll: 8, description: "I Hear Dead People: The voices of the dead follow you everywhere. You can focus on them by passing a Challenging (+0) Perception Test for helpful insight. If you Fumble, suffer Moderate Exposure to Corruption." },
    { roll: 9, description: "Siphon: When a living being of Size Small or larger who is suffering from Fatigued Conditions from one of your spells dies, you gain 1 Wound up to your maximum." },
    { roll: 10, description: "Mark of Shyish: The rune of Shyish appears somewhere on your body. Gain the Suffuse with Shyish Talent." },
  ],
  Fire: [
    { roll: 1, description: "Fiery Hair: Your hair and eyebrows turn bright, fiery red, naturally shaped like flame. Your hair ignites as you cast spells or if your temper flares. This fire is hot but you are unaffected." },
    { roll: 2, description: "Whiff of Aqshy: You leave behind the smell of burnt toast, and strands of smoke, in your wake." },
    { roll: 3, description: "Red Mist: When you receive a Surprised Condition, pass an Average (+20) Cool Test or enter Frenzy (combat) or Animosity (Everyone) (non-combat)." },
    { roll: 4, description: "Vulnerable to Cold: You are uncomfortable in the cold. All Tests you make while suffering from Cold Exposure are one step more difficult." },
    { roll: 5, description: "Aquaphobic: You must pass an Average (+20) Cool Test to cross any significant body of water or set foot on a boat." },
    { roll: 6, description: "Pyromania: You become agitated when unable to spend time gazing at a blaze. For each day without observing a fire for an hour, WP- and Int-based Tests become one step harder (max Very Hard)." },
    { roll: 7, description: "Bright Skin: Tattoo-like symbols glowing beneath your skin. The glowing intensifies as you become more emotional. Suffer -1 SL to sight-based Stealth Tests." },
    { roll: 8, description: "Feed the Fire: When you are within 4 yards of an Ablaze Condition stack (including your own), it deals +1 Damage." },
    { roll: 9, description: "Fire Resistant: You double your Toughness Bonus when calculating Damage from fire including Ablaze Conditions and breath attacks." },
    { roll: 10, description: "Mark of Aqshy: The rune of Aqshy appears somewhere on your body. Gain the Suffuse with Aqshy Talent." },
  ],
  Beasts: [
    { roll: 1, description: "Savage Gaze: You may use Willpower to oppose melee attacks from wolves, bears, boars, and rats. If you roll a Critical, roll on the Head Critical Wounds Table; the Wounds value equals Broken Conditions the animal receives." },
    { roll: 2, description: "Claustrophobia: You must pass an Easy (+40) Cool Test to enter any building or artificial construction. If you fail, receive one Broken Condition." },
    { roll: 3, description: "Restless: You tend not to want to stay in one place for long. You cannot lose Fatigued Conditions within the walls of a large city (except Middenheim)." },
    { roll: 4, description: "Dirty: For some reason, you attract dirt and can never fully get clean." },
    { roll: 5, description: "Hairy: You grow thick hair all over your body. You don't take penalties for Endurance Tests to withstand Cold Exposure if you lack proper clothing, but you are rather unsightly." },
    { roll: 6, description: "Feral: Your nails thicken and lengthen, and your teeth grow pointed. You have a wild-eyed appearance. Suffer -1 SL to all Fellowship-based Tests." },
    { roll: 7, description: "Musk: You exude a strong natural musk. Fellowship Tests made when interacting with Gold Status Characters suffer -1 SL when you are within 5 yards." },
    { roll: 8, description: "Hunter's Instincts: You benefit from a bonus of +1 SL when using Outdoor Survival for hunting and fishing." },
    { roll: 9, description: "Small Friends: You attract small harmless animals like squirrels, mice, small birds. They show up when least appropriate. This may occur when a party member Fumbles any Fellowship-based Test within 20 yards of you." },
    { roll: 10, description: "Mark of Ghur: The rune of Ghur appears somewhere on your body. Gain the Suffuse with Ghur Talent." },
  ],
};

/**
 * Maps the character's lore (from getCharacterLore) to the ARCANE_MARKS key.
 * Handles both short names ("Fire") and Wind names ("Aqshy") if needed.
 */
const LORE_ALIASES: Record<string, string> = {
  Hysh: 'Light',
  Chamon: 'Metal',
  Ghyran: 'Life',
  Azyr: 'Heavens',
  Ulgu: 'Shadows',
  Shyish: 'Death',
  Aqshy: 'Fire',
  Ghur: 'Beasts',
};

export function getArcaneMarksTable(lore: string): ArcaneMarkEntry[] | null {
  if (ARCANE_MARKS[lore]) return ARCANE_MARKS[lore];
  const mapped = LORE_ALIASES[lore];
  if (mapped && ARCANE_MARKS[mapped]) return ARCANE_MARKS[mapped];
  return null;
}

export function rollArcaneMark(lore: string): ArcaneMarkEntry | null {
  const table = getArcaneMarksTable(lore);
  if (!table) return null;
  const roll = Math.floor(Math.random() * 10) + 1;
  return table.find((e) => e.roll === roll) ?? null;
}
