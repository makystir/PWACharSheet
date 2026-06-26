import type { ConditionData } from '../types/character';

export const CONDITIONS: ConditionData[] = [
  {
    name: "Ablaze",
    stackable: true,
    maxLevel: 10,
    description: "You are on fire. At end of each round, suffer 1d10 + (level-1) Wounds reduced by TB and lowest AP (minimum 1 Wound). Athletics test to extinguish (each SL removes 1 level).",
    effects: "1d10 + (level-1) Damage at end of round, reduced by TB and lowest AP (minimum 1 Wound)",
    defaultDuration: "Until extinguished",
    removedBy: "Agility test (end of round) or water/smothering"
  },
  {
    name: "Bleeding",
    stackable: true,
    maxLevel: 10,
    description: "You are bleeding profusely. At the end of each round, lose 1 Wound per level.",
    effects: "Lose 1 Wound per level at end of round",
    defaultDuration: "Until healed",
    removedBy: "Heal test or magical healing"
  },
  {
    name: "Blinded",
    stackable: true,
    maxLevel: 10,
    description: "You cannot see. All Tests relying on vision fail automatically. Opponents gain +20 to hit you in melee, +40 at range.",
    effects: "Vision-based tests auto-fail; opponents gain +20 melee, +40 ranged to hit",
    defaultDuration: "Until condition removed",
    removedBy: "Varies by source (temporary blindness ends after duration, permanent requires healing)"
  },
  {
    name: "Broken",
    stackable: false,
    maxLevel: 1,
    description: "Your spirit is crushed. You must flee or surrender. If you cannot, you cower and gain the Stunned condition.",
    effects: "Must flee or surrender; if unable, gain Stunned condition",
    defaultDuration: "Until rallied",
    removedBy: "Cool test (end of round) or ally uses Leadership to rally"
  },
  {
    name: "Deafened",
    stackable: true,
    maxLevel: 10,
    description: "You cannot hear. All Tests relying on hearing fail automatically. Surprised by attacks you cannot see coming.",
    effects: "Hearing-based tests auto-fail; may be Surprised by unseen attacks",
    defaultDuration: "Until condition removed",
    removedBy: "Varies by source (temporary deafness ends after duration, permanent requires healing)"
  },
  {
    name: "Entangled",
    stackable: false,
    maxLevel: 1,
    description: "You are trapped or restrained. You cannot move and all Tests involving physical movement suffer -20 penalty.",
    effects: "Cannot move; physical movement tests at -20",
    defaultDuration: "Until freed",
    removedBy: "Strength test to break free, or ally frees you"
  },
  {
    name: "Fatigued",
    stackable: true,
    maxLevel: 10,
    description: "You are exhausted. Reduce Movement by 1 per level (Walk by 2, Run by 4). At level equal to TB or higher, gain Unconscious condition.",
    effects: "Movement -1 per level (Walk -2, Run -4); Unconscious at level ≥ TB",
    defaultDuration: "Until rested",
    removedBy: "Rest (remove 1 level per hour of rest)"
  },
  {
    name: "Poisoned",
    stackable: true,
    maxLevel: 10,
    description: "You are poisoned. Effects vary by poison type. Typically suffer ongoing damage or penalties until poison is neutralized.",
    effects: "Varies by poison (ongoing damage, penalties, etc.)",
    defaultDuration: "Until poison runs its course or is neutralized",
    removedBy: "Endurance test (varies by poison) or antidote"
  },
  {
    name: "Prone",
    stackable: false,
    maxLevel: 1,
    description: "You are lying on the ground. Ranged attacks against you suffer -20 to hit. Melee attacks against you gain +20 to hit. You must use Move action to stand.",
    effects: "Ranged attacks at -20; melee attacks at +20 to hit you",
    defaultDuration: "Until you stand",
    removedBy: "Use Move action to stand (or Jump Up talent for Free Action)"
  },
  {
    name: "Stunned",
    stackable: true,
    maxLevel: 10,
    description: "Dazed and reeling. Only Move action on your turn. Opponents gain +20 to hit. At end of each round, attempt Challenging (+0) Endurance Test to remove; each SL removes an extra Stunned Condition.",
    effects: "Can only take Move action; opponents gain +20 to hit; Endurance Test to remove",
    defaultDuration: "Until removed by Endurance Test",
    removedBy: "Challenging (+0) Endurance Test at end of each round (each SL removes extra)"
  },
  {
    name: "Surprised",
    stackable: false,
    maxLevel: 1,
    description: "You are caught off-guard. You may not take an Action or Move on your turn. Opponents gain +20 to hit you.",
    effects: "Cannot take Action or Move; opponents gain +20 to hit",
    defaultDuration: "End of your turn",
    removedBy: "Automatically removed at end of your turn"
  },
  {
    name: "Unconscious",
    stackable: false,
    maxLevel: 1,
    description: "You are knocked out or asleep. You are helpless and unaware. Attacks against you automatically hit and count as critical hits.",
    effects: "Helpless; attacks auto-hit and are critical hits",
    defaultDuration: "Until awakened or healed",
    removedBy: "Heal Wounds above 0, or wake after time passes (varies by cause)"
  },
];
