import type { ConditionData } from '../types/character';

export const CONDITIONS: ConditionData[] = [
  {
    name: "Ablaze",
    stackable: true,
    maxLevel: 10,
    description: "You are on fire. At end of each round, suffer 1d10 + (level-1) Wounds reduced by TB and lowest AP (minimum 1 Wound). Athletics test to extinguish (each SL removes 1 level).",
    effects: "1d10 + (level-1) Damage at end of round, reduced by TB and lowest AP (minimum 1 Wound)",
    defaultDuration: "Until extinguished",
    // Core p.167: extinguished with an Athletics Test (each SL removes 1 level).
    removedBy: "Athletics test (end of round) or water/smothering"
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
    // Core p.167-168: Broken stacks (e.g. Terror inflicts Broken equal to its
    // Rating); each Broken gives -10 to all Tests; you must use your Move to flee
    // the source. At the end of a Round (if not Engaged) attempt a Cool Test to
    // remove one Broken, each SL removing an extra. It grants no Stunned.
    name: "Broken",
    stackable: true,
    maxLevel: 10,
    description: "Your resolve is shaken. Suffer -10 to all Tests per level of Broken, and you must use your Move each turn to flee the source of your fear. At the end of a Round, if you are not Engaged, you may attempt a Cool Test to remove a Broken Condition, each SL removing an extra.",
    effects: "-10 to all Tests per level; must use Move to flee the source",
    defaultDuration: "Until rallied",
    removedBy: "Cool test at end of round when not Engaged (each SL removes extra), or ally uses Leadership to rally"
  },
  {
    // Core p.168: -10 to hearing-based Tests per level; opponents gain +10 to hit
    // you from the flank or rear. One Deafened is removed at the end of every
    // other Round.
    name: "Deafened",
    stackable: true,
    maxLevel: 10,
    description: "Your hearing is impaired. Suffer -10 to all Tests relying on hearing per level, and opponents gain +10 to hit you from the flank or rear per level. One Deafened Condition is removed at the end of every other Round.",
    effects: "-10 to hearing-based Tests per level; opponents gain +10 to hit from flank/rear per level",
    defaultDuration: "Until condition removed (one level removed every other Round)",
    removedBy: "Automatically removed 1 level per 2 Rounds, or magical healing"
  },
  {
    // Core p.167: Entangled imposes -10 to Tests involving movement and you
    // cannot move away from what entangles you; freed via an Opposed test against
    // the entangler (or the entangler's rating).
    name: "Entangled",
    stackable: false,
    maxLevel: 1,
    description: "You are trapped or restrained. You cannot move away from whatever entangles you, and suffer -10 to all Tests involving movement.",
    effects: "Cannot move away from the entangler; movement-based Tests at -10",
    defaultDuration: "Until freed",
    removedBy: "Opposed test to break free, or ally frees you"
  },
  {
    // Core p.168: Fatigued imposes -10 to all Tests per level (it does not reduce
    // Movement). How rest removes it is left to the GM.
    name: "Fatigued",
    stackable: true,
    maxLevel: 10,
    description: "You are exhausted. Suffer -10 to all Tests per level of Fatigued.",
    effects: "-10 to all Tests per level",
    defaultDuration: "Until rested",
    removedBy: "Rest (amount of rest to remove a level is up to the GM)"
  },
  {
    // Core p.169: At the end of each Round lose 1 Wound (flat, ignoring all
    // modifiers) and suffer -10 to all Tests. At the end of a Round you may
    // attempt an Endurance Test to remove a Poisoned Condition, each SL removing
    // an extra; a Heal Test works too. Test difficulty is set by the poison.
    name: "Poisoned",
    stackable: true,
    maxLevel: 10,
    description: "You have been poisoned. At the end of each Round, lose 1 Wound, ignoring all modifiers (a flat 1 Wound, not per level). Also suffer -10 to all Tests.",
    effects: "Lose 1 Wound at end of round (flat, ignoring modifiers); -10 to all Tests",
    defaultDuration: "Until poison runs its course or is neutralized",
    removedBy: "Endurance test at end of round (each SL removes extra; difficulty set by the poison), Heal test, or antidote"
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
