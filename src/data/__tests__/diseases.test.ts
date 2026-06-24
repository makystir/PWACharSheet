import { describe, it, expect } from 'vitest';
import { DISEASE_REGISTRY } from '../diseases';
import { SYMPTOM_CATALOGUE } from '../symptoms';

// ─── Disease Registry Counts ────────────────────────────────────

describe('Disease Registry', () => {
  it('contains exactly 9 disease entries', () => {
    expect(DISEASE_REGISTRY).toHaveLength(9);
  });

  it('contains all expected disease names', () => {
    const expectedDiseases = [
      'Blood Rot',
      'The Bloody Flux',
      'Galloping Trots',
      'Itching Pox',
      'Neiglish Rot',
      "Packer's Pox",
      'Ratte Fever',
      'The Shakes',
      'Black Plague',
    ];
    const names = DISEASE_REGISTRY.map(d => d.name);
    for (const name of expectedDiseases) {
      expect(names).toContain(name);
    }
  });

  it('Blood Rot has correct data', () => {
    const bloodRot = DISEASE_REGISTRY.find(d => d.name === 'Blood Rot');
    expect(bloodRot).toBeDefined();
    expect(bloodRot!.contraction).toBe('Infected Wound');
    expect(bloodRot!.incubation).toBe('1d10 days');
    expect(bloodRot!.duration).toBe('1d10 days');
    expect(bloodRot!.symptoms).toEqual(['Blight', 'Fever', 'Malaise', 'Wounded']);
  });

  it('Black Plague has the most symptoms', () => {
    const blackPlague = DISEASE_REGISTRY.find(d => d.name === 'Black Plague');
    expect(blackPlague).toBeDefined();
    expect(blackPlague!.symptoms).toEqual([
      'Blight', 'Convulsions', 'Delirium', 'Fever', 'Flux', 'Lingering', 'Wounded',
    ]);
  });

  it('each disease has at least 1 symptom', () => {
    for (const disease of DISEASE_REGISTRY) {
      expect(disease.symptoms.length, `${disease.name} should have at least 1 symptom`).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Symptom Catalogue Counts ───────────────────────────────────

describe('Symptom Catalogue', () => {
  it('contains exactly 12 symptom entries', () => {
    expect(SYMPTOM_CATALOGUE).toHaveLength(12);
  });

  it('contains all expected symptom names', () => {
    const expectedSymptoms = [
      'Blight',
      'Convulsions',
      'Coughs and Sneezes',
      'Delirium',
      'Fever',
      'Flux',
      'Gangrene',
      'Lingering',
      'Malaise',
      'Nausea',
      'Pox',
      'Wounded',
    ];
    const names = SYMPTOM_CATALOGUE.map(s => s.name);
    for (const name of expectedSymptoms) {
      expect(names).toContain(name);
    }
  });

  it('Fever has non-empty description and effects', () => {
    const fever = SYMPTOM_CATALOGUE.find(s => s.name === 'Fever');
    expect(fever).toBeDefined();
    expect(fever!.description.length).toBeGreaterThan(0);
    expect(fever!.effects.length).toBeGreaterThan(0);
  });

  it('Gangrene has non-empty description and effects', () => {
    const gangrene = SYMPTOM_CATALOGUE.find(s => s.name === 'Gangrene');
    expect(gangrene).toBeDefined();
    expect(gangrene!.description.length).toBeGreaterThan(0);
    expect(gangrene!.effects.length).toBeGreaterThan(0);
  });

  it('each symptom has non-empty description and effects fields', () => {
    for (const symptom of SYMPTOM_CATALOGUE) {
      expect(symptom.description, `${symptom.name} description should not be empty`).toBeTruthy();
      expect(symptom.effects, `${symptom.name} effects should not be empty`).toBeTruthy();
    }
  });
});
