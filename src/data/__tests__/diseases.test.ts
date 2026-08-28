import { describe, it, expect } from 'vitest';
import { DISEASE_REGISTRY } from '../diseases';
import { SYMPTOM_CATALOGUE } from '../symptoms';

// ─── Disease Registry Counts ────────────────────────────────────

describe('Disease Registry', () => {
  it('contains exactly 9 disease entries', () => {
    expect(DISEASE_REGISTRY).toHaveLength(9);
  });

  it('contains all expected disease names (Core p.185-186)', () => {
    const expectedDiseases = [
      'The Black Plague',
      'Blood Rot',
      'The Bloody Flux',
      'Festering Wound',
      'Galloping Trots',
      'Itching Pox',
      'Minor Infection',
      "Packer's Pox",
      'Ratte Fever',
    ];
    const names = DISEASE_REGISTRY.map(d => d.name);
    for (const name of expectedDiseases) {
      expect(names).toContain(name);
    }
  });

  it('Blood Rot matches the rulebook (Core p.185)', () => {
    const bloodRot = DISEASE_REGISTRY.find(d => d.name === 'Blood Rot');
    expect(bloodRot).toBeDefined();
    expect(bloodRot!.incubation).toBe('Instant');
    expect(bloodRot!.duration).toBe('1d10 days');
    expect(bloodRot!.symptoms).toEqual(['Blight', 'Fever (Severe)', 'Malaise']);
  });

  it('Galloping Trots includes Malaise (Core p.186)', () => {
    const trots = DISEASE_REGISTRY.find(d => d.name === 'Galloping Trots');
    expect(trots).toBeDefined();
    expect(trots!.incubation).toBe('1d10 hours');
    expect(trots!.symptoms).toEqual(['Flux (Moderate)', 'Malaise', 'Nausea']);
  });

  it('The Bloody Flux includes Malaise and severity tags (Core p.185)', () => {
    const flux = DISEASE_REGISTRY.find(d => d.name === 'The Bloody Flux');
    expect(flux).toBeDefined();
    expect(flux!.incubation).toBe('2d10 days');
    expect(flux!.symptoms).toEqual([
      'Flux (Severe)', 'Lingering (Challenging)', 'Fever', 'Malaise', 'Nausea',
    ]);
  });

  it('Itching Pox records its Permanent immunity clause (Core p.186)', () => {
    const pox = DISEASE_REGISTRY.find(d => d.name === 'Itching Pox');
    expect(pox).toBeDefined();
    expect(pox!.duration).toBe('1d10+7 days');
    expect(pox!.permanent).toBeTruthy();
    expect(pox!.permanent).toMatch(/immune/i);
  });

  it('The Black Plague matches the rulebook (Core p.185)', () => {
    const blackPlague = DISEASE_REGISTRY.find(d => d.name === 'The Black Plague');
    expect(blackPlague).toBeDefined();
    expect(blackPlague!.incubation).toBe('1d10 minutes');
    expect(blackPlague!.duration).toBe('3d10 days');
    expect(blackPlague!.symptoms).toEqual([
      'Buboes', 'Blight (Moderate)', 'Fever', 'Gangrene', 'Malaise',
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

  it('contains all expected symptom names (Core p.187-188)', () => {
    const expectedSymptoms = [
      'Blight',
      'Buboes',
      'Convulsions',
      'Coughs and Sneezes',
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
