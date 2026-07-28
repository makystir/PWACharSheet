import type { YenluiState } from '../types/character';

export interface ObsessionData {
  description: string;
  relatedTests: string;
}

export interface ObsessionDisplayState {
  showBenefit: boolean;
  showPenalty: boolean;
  benefitText: string;
  penaltyText: string;
}

const BENEFIT_TEXT = '+2 SL on related Tests';
const PENALTY_BALANCED = 'Must take benefit first; penalty then applies';
const PENALTY_DARK = 'Penalty applies even without benefit';

export function getObsessionDisplayState(
  yenluiState: YenluiState | undefined,
  obsession: ObsessionData | undefined
): ObsessionDisplayState {
  if (!obsession || !obsession.description) {
    return { showBenefit: false, showPenalty: false, benefitText: '', penaltyText: '' };
  }

  switch (yenluiState) {
    case 'light':
      return { showBenefit: true, showPenalty: false, benefitText: BENEFIT_TEXT, penaltyText: '' };
    case 'balanced':
      return { showBenefit: true, showPenalty: true, benefitText: BENEFIT_TEXT, penaltyText: PENALTY_BALANCED };
    case 'dark':
      return { showBenefit: false, showPenalty: true, benefitText: '', penaltyText: PENALTY_DARK };
    default:
      return { showBenefit: false, showPenalty: false, benefitText: '', penaltyText: '' };
  }
}
