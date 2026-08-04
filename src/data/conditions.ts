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
    description: "You suffer a -10 penalty to all Tests involving sight per level of Blinded. Opponents gain +10 to hit you in melee combat per level. One Blinded Condition is removed at the end of every other Round.",
    effects: "-10 to all sight-based Tests per level; opponents gain +10 melee to hit per level",
    defaultDuration: "Until condition removed (one level removed every other Round)",
    removedBy: "Automatically removed 1 level per 2 Rounds, or magical healing"
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
    description: "You are lying on the ground. Opponents gain +20 to hit you in melee combat. You suffer -20 to all Tests involving movement. You must use a Move action to stand.",
    effects: "Opponents gain +20 melee to hit; -20 to movement-based Tests",
    defaultDuration: "Until you stand",
    removedBy: "Use Move action to stand (or Jump Up talent for Free Action)"
  },
  {
    name: "Stunned",
    stackable: true,
    maxLevel: 10,
    description: "Dazed and reeling. You suffer -10 to all Tests per level of Stunned. On your turn you may only take a single Move or Action (not both). Any opponent striking you in melee gains +1 Advantage before rolling. At end of each Round, attempt Challenging (+0) Endurance Test to remove; each SL removes an extra Stunned Condition.",
    effects: "-10 to all Tests per level; only Move OR Action per turn; opponents gain +1 Advantage before melee attacks",
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
