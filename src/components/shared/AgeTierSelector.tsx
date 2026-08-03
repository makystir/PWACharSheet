import { useState } from 'react';
import { HIGH_ELF_AGE_TIERS } from '../../data/personal-details';
import type { HighElfAgeTier } from '../../data/personal-details';

interface AgeTierSelectorProps {
  onTierChange: (tier: HighElfAgeTier) => void;
}

/**
 * A select element listing all High Elf age tiers.
 * Defaults to "Time of Ending" (index 0).
 * The parent component controls visibility — this only renders for High_Elf species.
 */
export function AgeTierSelector({ onTierChange }: AgeTierSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = Number(e.target.value);
    setSelectedIndex(index);
    onTierChange(HIGH_ELF_AGE_TIERS[index]);
  };

  return (
    <select
      value={selectedIndex}
      onChange={handleChange}
      aria-label="High Elf age tier"
    >
      {HIGH_ELF_AGE_TIERS.map((tier, index) => (
        <option key={tier.label} value={index}>
          {tier.label}
        </option>
      ))}
    </select>
  );
}
