import type { ArmourPoints } from '../../types/character';

export type HitLocation = 'Head' | 'Left Arm' | 'Right Arm' | 'Body' | 'Left Leg' | 'Right Leg';

export interface HitLocationResult {
  reversed: number;
  location: HitLocation;
  apKey: keyof ArmourPoints;
}

export function getHitLocation(roll: number): HitLocationResult {
  const ones = roll % 10;
  const tens = Math.floor(roll / 10) % 10;
  const reversed = ones * 10 + tens;

  let location: HitLocation;
  let apKey: keyof ArmourPoints;

  if (reversed <= 9) { location = 'Head'; apKey = 'head'; }
  else if (reversed <= 24) { location = 'Left Arm'; apKey = 'lArm'; }
  else if (reversed <= 44) { location = 'Right Arm'; apKey = 'rArm'; }
  else if (reversed <= 79) { location = 'Body'; apKey = 'body'; }
  else if (reversed <= 89) { location = 'Left Leg'; apKey = 'lLeg'; }
  else { location = 'Right Leg'; apKey = 'rLeg'; }

  return { reversed, location, apKey };
}
