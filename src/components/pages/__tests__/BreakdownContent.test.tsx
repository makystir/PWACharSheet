import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SkillBreakdownContent } from '../SkillBreakdownContent';
import { CBBreakdownContent } from '../CBBreakdownContent';
import { EncumbranceBreakdownContent } from '../EncumbranceBreakdownContent';
import { CoinWeightBreakdownContent } from '../CoinWeightBreakdownContent';
import { APBreakdownContent } from '../APBreakdownContent';

/**
 * Unit tests for breakdown content components.
 * Validates: Requirements 1.2, 2.2, 3.2, 3.3, 4.2, 4.3, 5.2, 5.3
 */

describe('SkillBreakdownContent', () => {
  it('renders the characteristic name and value', () => {
    render(
      <SkillBreakdownContent charName="Agility" charValue={35} advances={10} total={45} />,
    );
    expect(screen.getByText('Agility:')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('renders the advances value', () => {
    render(
      <SkillBreakdownContent charName="Agility" charValue={35} advances={10} total={45} />,
    );
    expect(screen.getByText('Advances:')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders the total', () => {
    render(
      <SkillBreakdownContent charName="Strength" charValue={40} advances={15} total={55} />,
    );
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
  });
});

describe('CBBreakdownContent', () => {
  it('renders the current value', () => {
    render(<CBBreakdownContent charName="Strength" currentValue={43} bonus={4} />);
    expect(screen.getByText('Current:')).toBeInTheDocument();
    expect(screen.getByText('43')).toBeInTheDocument();
  });

  it('renders the bonus', () => {
    render(<CBBreakdownContent charName="Toughness" currentValue={37} bonus={3} />);
    expect(screen.getByText('CB:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('EncumbranceBreakdownContent', () => {
  it('renders SB and TB values', () => {
    render(
      <EncumbranceBreakdownContent sb={4} tb={3} strongBackLevel={0} sturdyLevel={0} total={7} />,
    );
    expect(screen.getByText('SB:')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('TB:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders total without talent lines when talents are zero', () => {
    render(
      <EncumbranceBreakdownContent sb={4} tb={3} strongBackLevel={0} sturdyLevel={0} total={7} />,
    );
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText('Strong Back:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sturdy/)).not.toBeInTheDocument();
  });

  it('renders Strong Back when strongBackLevel > 0', () => {
    render(
      <EncumbranceBreakdownContent sb={4} tb={3} strongBackLevel={2} sturdyLevel={0} total={9} />,
    );
    expect(screen.getByText('Strong Back:')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders Sturdy note when sturdyLevel > 0', () => {
    render(
      <EncumbranceBreakdownContent sb={4} tb={3} strongBackLevel={0} sturdyLevel={1} total={7} />,
    );
    expect(screen.getByText('Sturdy: halves overburdened penalties')).toBeInTheDocument();
  });
});

describe('CoinWeightBreakdownContent', () => {
  it('renders coin values and weight when coins are present', () => {
    render(
      <CoinWeightBreakdownContent gc={120} ss={45} d={30} total={0} isEmpty={false} />,
    );
    expect(screen.getByText('GC:')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('SS:')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('D:')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('195')).toBeInTheDocument();
    expect(screen.getByText('÷ 200')).toBeInTheDocument();
    expect(screen.getByText('Weight:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders "No coins carried" when isEmpty is true', () => {
    render(
      <CoinWeightBreakdownContent gc={0} ss={0} d={0} total={0} isEmpty={true} />,
    );
    expect(screen.getByText('No coins carried')).toBeInTheDocument();
    expect(screen.queryByText('GC:')).not.toBeInTheDocument();
  });
});

describe('APBreakdownContent', () => {
  it('renders armour items and total (non-flexible + flexible layer combine)', () => {
    render(
      <APBreakdownContent
        locationLabel="Head"
        items={[
          { name: 'Leather Cap', ap: 1, flexible: false, contributes: true },
          { name: 'Mail Coif', ap: 2, flexible: true, contributes: true },
        ]}
        total={3}
      />,
    );
    expect(screen.getByText('Leather Cap:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    // Flexible pieces are marked so users understand the layering rule.
    expect(screen.getByText('Mail Coif (Flexible):')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks a non-contributing layer and explains the layering rule', () => {
    render(
      <APBreakdownContent
        locationLabel="Body"
        items={[
          { name: 'Plate Breastplate', ap: 2, flexible: false, contributes: true },
          { name: 'Leather Jerkin', ap: 1, flexible: false, contributes: false },
        ]}
        total={2}
      />,
    );
    // Both pieces are still listed so all factors are visible.
    expect(screen.getByText('Plate Breastplate:')).toBeInTheDocument();
    expect(screen.getByText('Leather Jerkin:')).toBeInTheDocument();
    // Only the highest non-flexible layer counts: total is 2, not 3.
    const totalRow = screen.getByText('Total:').closest('div') as HTMLElement;
    expect(totalRow).toHaveTextContent('2');
    expect(
      screen.getByText('Only the highest non-flexible and highest flexible layer combine.'),
    ).toBeInTheDocument();
  });

  it('renders empty message when no items cover the location', () => {
    render(
      <APBreakdownContent locationLabel="Left Leg" items={[]} total={0} />,
    );
    expect(screen.getByText('No armour covers this location')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
