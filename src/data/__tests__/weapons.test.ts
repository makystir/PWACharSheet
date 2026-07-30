import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../weapons';

describe('Ogre melee weapons', () => {
  describe('Ogre Club', () => {
    const weapon = WEAPONS.find(w => w.name === 'Ogre Club');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Basic', () => {
      expect(weapon!.group).toBe('Basic');
    });

    it('has enc 2', () => {
      expect(weapon!.enc).toBe('2');
    });

    it('has reach Average', () => {
      expect(weapon!.rangeReach).toBe('Average');
    });

    it('has damage +SB+4', () => {
      expect(weapon!.damage).toBe('+SB+4');
    });

    it('notes non-Ogres treat as Improvised', () => {
      expect(weapon!.qualities).toContain('non-Ogres treat as Improvised');
    });
  });

  describe('Ironfist', () => {
    const weapon = WEAPONS.find(w => w.name === 'Ironfist');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Basic', () => {
      expect(weapon!.group).toBe('Basic');
    });

    it('has enc 2', () => {
      expect(weapon!.enc).toBe('2');
    });

    it('has reach Short', () => {
      expect(weapon!.rangeReach).toBe('Short');
    });

    it('has damage +SB+3', () => {
      expect(weapon!.damage).toBe('+SB+3');
    });

    it('has qualities Shield 1, Defensive', () => {
      expect(weapon!.qualities).toBe('Shield 1, Defensive');
    });
  });

  describe('Great Ogre Club', () => {
    const weapon = WEAPONS.find(w => w.name === '(2H) Great Ogre Club');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Two-Handed', () => {
      expect(weapon!.group).toBe('Two-Handed');
    });

    it('has enc 4', () => {
      expect(weapon!.enc).toBe('4');
    });

    it('has reach Long', () => {
      expect(weapon!.rangeReach).toBe('Long');
    });

    it('has damage +SB+6', () => {
      expect(weapon!.damage).toBe('+SB+6');
    });

    it('has qualities Impact, Tiring', () => {
      expect(weapon!.qualities).toBe('Impact, Tiring');
    });
  });
});

describe('Ogre ranged weapons', () => {
  describe('Great Throwing Spear', () => {
    const weapon = WEAPONS.find(w => w.name === 'Great Throwing Spear');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Throwing', () => {
      expect(weapon!.group).toBe('Throwing');
    });

    it('has enc 2', () => {
      expect(weapon!.enc).toBe('2');
    });

    it('has range SBx3', () => {
      expect(weapon!.maxR).toBe('SBx3');
    });

    it('has damage +SB+4', () => {
      expect(weapon!.damage).toBe('+SB+4');
    });

    it('has quality Impale', () => {
      expect(weapon!.qualities).toBe('Impale');
    });
  });

  describe('Leadbelcher Gun', () => {
    const weapon = WEAPONS.find(w => w.name === 'Leadbelcher Gun');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Blackpowder', () => {
      expect(weapon!.group).toBe('Blackpowder');
    });

    it('has enc 8', () => {
      expect(weapon!.enc).toBe('8');
    });

    it('has range 50', () => {
      expect(weapon!.maxR).toBe('50');
    });

    it('has damage +10', () => {
      expect(weapon!.damage).toBe('+10');
    });

    it('has reload 5', () => {
      expect(weapon!.reload).toBe('5');
    });

    it('has qualities Dangerous, Reload 5', () => {
      expect(weapon!.qualities).toContain('Dangerous');
      expect(weapon!.qualities).toContain('Reload 5');
    });
  });

  describe('Ogre Pistol', () => {
    const weapon = WEAPONS.find(w => w.name === 'Ogre Pistol');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Blackpowder', () => {
      expect(weapon!.group).toBe('Blackpowder');
    });

    it('has enc 3', () => {
      expect(weapon!.enc).toBe('3');
    });

    it('has range 20', () => {
      expect(weapon!.maxR).toBe('20');
    });

    it('has damage +8', () => {
      expect(weapon!.damage).toBe('+8');
    });

    it('has reload 3', () => {
      expect(weapon!.reload).toBe('3');
    });

    it('has qualities Dangerous, Pistol, Reload 3', () => {
      expect(weapon!.qualities).toContain('Dangerous');
      expect(weapon!.qualities).toContain('Pistol');
      expect(weapon!.qualities).toContain('Reload 3');
    });
  });

  describe('Harpoon Launcher', () => {
    const weapon = WEAPONS.find(w => w.name === 'Harpoon Launcher');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Engineering', () => {
      expect(weapon!.group).toBe('Engineering');
    });

    it('has enc 4', () => {
      expect(weapon!.enc).toBe('4');
    });

    it('has range 30', () => {
      expect(weapon!.maxR).toBe('30');
    });

    it('has damage +SB+5', () => {
      expect(weapon!.damage).toBe('+SB+5');
    });

    it('has reload 2', () => {
      expect(weapon!.reload).toBe('2');
    });

    it('has qualities Impale, Reload 2', () => {
      expect(weapon!.qualities).toContain('Impale');
      expect(weapon!.qualities).toContain('Reload 2');
    });
  });

  describe('Chain Trap', () => {
    const weapon = WEAPONS.find(w => w.name === 'Chain Trap');

    it('exists in WEAPONS', () => {
      expect(weapon).toBeDefined();
    });

    it('has group Entangling', () => {
      expect(weapon!.group).toBe('Entangling');
    });

    it('has enc 2', () => {
      expect(weapon!.enc).toBe('2');
    });

    it('has range SBx2', () => {
      expect(weapon!.maxR).toBe('SBx2');
    });

    it('has damage —', () => {
      expect(weapon!.damage).toBe('—');
    });

    it('has quality Entangle', () => {
      expect(weapon!.qualities).toBe('Entangle');
    });
  });
});

describe('Ogre ammunition', () => {
  describe('Leadbelcher Shot (12)', () => {
    const ammo = WEAPONS.find(w => w.name === 'Leadbelcher Shot (12)');

    it('exists in WEAPONS', () => {
      expect(ammo).toBeDefined();
    });

    it('has group Ammunition', () => {
      expect(ammo!.group).toBe('Ammunition');
    });

    it('has range Half Weapon', () => {
      expect(ammo!.maxR).toBe('Half Weapon');
    });

    it('has quality Blast 3', () => {
      expect(ammo!.qualities).toBe('Blast 3');
    });
  });

  describe('Leadbelcher Ball (1)', () => {
    const ammo = WEAPONS.find(w => w.name === 'Leadbelcher Ball (1)');

    it('exists in WEAPONS', () => {
      expect(ammo).toBeDefined();
    });

    it('has group Ammunition', () => {
      expect(ammo!.group).toBe('Ammunition');
    });

    it('has damage +4', () => {
      expect(ammo!.damage).toBe('+4');
    });

    it('has qualities Penetrating, Impale, Impact', () => {
      expect(ammo!.qualities).toContain('Penetrating');
      expect(ammo!.qualities).toContain('Impale');
      expect(ammo!.qualities).toContain('Impact');
    });
  });
});
