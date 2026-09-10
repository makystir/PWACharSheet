import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstatePage } from '../../pages/EstatePage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderEstatePage(charOverrides: Partial<Character> = {}) {
  const char = structuredClone({ ...BLANK_CHARACTER, ...charOverrides });
  return render(
    <EstatePage
      character={char}
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />
  );
}

// Validates: Requirements 2.1, 2.3, 2.4, 7.1
describe('EstatePage tab bar', () => {
  it('renders three tabs: Estate, Holdings, Treasury & Finances', () => {
    renderEstatePage();

    expect(screen.getByText('Estate')).toBeInTheDocument();
    expect(screen.getByText('Holdings')).toBeInTheDocument();
    expect(screen.getByText('Treasury & Finances')).toBeInTheDocument();
  });

  // money-locations-clarity Req 3.1/3.2/3.3: the money sub-tab reads
  // "Treasury & Finances" (not the old "Wealth & Finances"), and its routing id
  // "wealth" is unchanged. The tab keeps role="tab" and its id via aria/label.
  it('does not render the old "Wealth & Finances" sub-tab label', () => {
    renderEstatePage();

    expect(screen.queryByText('Wealth & Finances')).not.toBeInTheDocument();
  });

  it('exposes the money sub-tab as a tab labelled "Treasury & Finances"', () => {
    renderEstatePage();

    // The sub-tab id 'wealth' is unchanged (routing-key stability); the tab is
    // reached by its displayed label, which is now "Treasury & Finances".
    expect(screen.getByRole('tab', { name: 'Treasury & Finances' })).toBeInTheDocument();
    // Clicking it keeps the Treasury panel / money content visible (id 'wealth'
    // still selects the same content).
    fireEvent.click(screen.getByRole('tab', { name: 'Treasury & Finances' }));
    expect(screen.getAllByText('Treasury').length).toBeGreaterThan(0);
    expect(screen.getByText('Monthly Financial Summary')).toBeInTheDocument();
  });

  it('defaults to Treasury & Finances tab on mount', () => {
    renderEstatePage();

    // Wealth tab content should be visible: Treasury panel and Collect button.
    // "Treasury" appears both as the panel heading and as the withdraw
    // TransferControl's source-pool label, so assert at least one is present.
    expect(screen.getAllByText('Treasury').length).toBeGreaterThan(0);
    expect(screen.getByText('Collect Monthly Income & Pay Expenses')).toBeInTheDocument();
    expect(screen.getByText('Monthly Financial Summary')).toBeInTheDocument();

    // Estate tab content should NOT be visible
    expect(screen.queryByText('Estate & Holdings')).not.toBeInTheDocument();
    // Holdings tab content should NOT be visible
    expect(screen.queryByText('Holdings & Properties')).not.toBeInTheDocument();
  });

  it('clicking Estate tab shows estate content and hides wealth content', () => {
    renderEstatePage();

    fireEvent.click(screen.getByText('Estate'));

    // Estate tab content visible
    expect(screen.getByText('Estate & Holdings')).toBeInTheDocument();
    expect(screen.getByText('Estate Notes & Journal')).toBeInTheDocument();

    // Wealth tab content hidden
    expect(screen.queryByText('Treasury')).not.toBeInTheDocument();
    expect(screen.queryByText('Collect Monthly Income & Pay Expenses')).not.toBeInTheDocument();

    // Holdings tab content hidden
    expect(screen.queryByText('Holdings & Properties')).not.toBeInTheDocument();
  });

  it('clicking Holdings tab shows holdings content and hides wealth content', () => {
    renderEstatePage();

    fireEvent.click(screen.getByText('Holdings'));

    // Holdings tab content visible
    expect(screen.getByText('Holdings & Properties')).toBeInTheDocument();

    // Wealth tab content hidden
    expect(screen.queryByText('Treasury')).not.toBeInTheDocument();
    expect(screen.queryByText('Collect Monthly Income & Pay Expenses')).not.toBeInTheDocument();

    // Estate tab content hidden
    expect(screen.queryByText('Estate & Holdings')).not.toBeInTheDocument();
  });

  // money-locations-clarity Req 5.1: the Treasury panel carries a hint pointing
  // the player to the Coin Purse on the Character page.
  it('renders the Coin Purse cross-reference hint in the Treasury panel', () => {
    renderEstatePage();

    // Ensure the money sub-tab is active (tab order/selection may persist from
    // other tests via localStorage), then assert the Treasury panel hint.
    fireEvent.click(screen.getByRole('tab', { name: 'Treasury & Finances' }));

    expect(
      screen.getByText('Carried coin is stored in your Coin Purse (Character page).')
    ).toBeInTheDocument();
  });

  it('Financial Ledger section is NOT rendered on any tab', () => {
    renderEstatePage();

    // Check Wealth tab (default)
    expect(screen.queryByText('Financial Ledger')).not.toBeInTheDocument();

    // Check Estate tab
    fireEvent.click(screen.getByText('Estate'));
    expect(screen.queryByText('Financial Ledger')).not.toBeInTheDocument();

    // Check Holdings tab
    fireEvent.click(screen.getByText('Holdings'));
    expect(screen.queryByText('Financial Ledger')).not.toBeInTheDocument();
  });
});
