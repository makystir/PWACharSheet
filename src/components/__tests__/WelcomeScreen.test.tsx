import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '../shared/WelcomeScreen';

// Mock CharacterWizard to avoid rendering the full wizard in tests
vi.mock('../shared/CharacterWizard', () => ({
  CharacterWizard: ({ onComplete, onCancel }: { onComplete: (c: unknown) => void; onCancel: () => void }) => (
    <div data-testid="character-wizard">
      <button type="button" onClick={() => onComplete({ name: 'WizardChar' })}>Complete Wizard</button>
      <button type="button" onClick={onCancel}>Cancel Wizard</button>
    </div>
  ),
}));

const defaultProps = {
  onCreateCharacter: vi.fn(),
  onWizardComplete: vi.fn(),
};

function renderWelcome(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<WelcomeScreen {...props} />);
}

// ─── Initial View Tests (Req 1.1, 1.3, 1.4, 2.1, 3.1) ─────────────────────

describe('Initial view', () => {
  it('renders the title "WFRP 4e Character Sheet"', () => {
    renderWelcome();
    expect(screen.getByText('WFRP 4e Character Sheet')).toBeInTheDocument();
  });

  it('renders introductory text explaining the two options', () => {
    renderWelcome();
    expect(screen.getByText(/wizard.*quick-start|quick-start.*wizard/i)).toBeInTheDocument();
  });

  it('renders a "Create with Wizard" button', () => {
    renderWelcome();
    expect(screen.getByRole('button', { name: /create with wizard/i })).toBeInTheDocument();
  });

  it('renders a "Quick Start" button', () => {
    renderWelcome();
    expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
  });
});

// ─── Wizard Flow Tests (Req 2.2, 2.4) ───────────────────────────────────────

describe('Wizard flow', () => {
  it('clicking "Create with Wizard" renders the CharacterWizard', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /create with wizard/i }));
    expect(screen.getByTestId('character-wizard')).toBeInTheDocument();
  });

  it('wizard onCancel returns to the initial view with both buttons visible', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /create with wizard/i }));
    fireEvent.click(screen.getByText('Cancel Wizard'));
    expect(screen.getByRole('button', { name: /create with wizard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
  });

  it('wizard onComplete calls onWizardComplete with the character', () => {
    const onWizardComplete = vi.fn();
    renderWelcome({ onWizardComplete });
    fireEvent.click(screen.getByRole('button', { name: /create with wizard/i }));
    fireEvent.click(screen.getByText('Complete Wizard'));
    expect(onWizardComplete).toHaveBeenCalledWith({ name: 'WizardChar' });
  });
});

// ─── Quick-Start Flow Tests (Req 3.2, 3.3, 3.4, 3.5) ───────────────────────

describe('Quick-start flow', () => {
  it('clicking "Quick Start" shows the name input field', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));
    expect(screen.getByPlaceholderText(/character name/i)).toBeInTheDocument();
  });

  it('submitting a valid name calls onCreateCharacter with the trimmed name', async () => {
    const onCreateCharacter = vi.fn();
    renderWelcome({ onCreateCharacter });
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));

    const input = screen.getByPlaceholderText(/character name/i);
    await userEvent.type(input, '  Brunhilde  ');
    fireEvent.click(screen.getByRole('button', { name: /create character/i }));
    expect(onCreateCharacter).toHaveBeenCalledWith('Brunhilde');
  });

  it('submit button is disabled when input is empty', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));
    expect(screen.getByRole('button', { name: /create character/i })).toBeDisabled();
  });

  it('submit button is disabled when input is whitespace-only', async () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));

    const input = screen.getByPlaceholderText(/character name/i);
    await userEvent.type(input, '   ');
    expect(screen.getByRole('button', { name: /create character/i })).toBeDisabled();
  });

  it('pressing Enter in the input field submits a valid name', async () => {
    const onCreateCharacter = vi.fn();
    renderWelcome({ onCreateCharacter });
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));

    const input = screen.getByPlaceholderText(/character name/i);
    await userEvent.type(input, 'Sigmar');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCreateCharacter).toHaveBeenCalledWith('Sigmar');
  });

  it('pressing Enter with empty input does not submit', () => {
    const onCreateCharacter = vi.fn();
    renderWelcome({ onCreateCharacter });
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));

    const input = screen.getByPlaceholderText(/character name/i);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCreateCharacter).not.toHaveBeenCalled();
  });

  it('back button returns to the initial view', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('button', { name: /create with wizard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
  });
});

// ─── Keyboard Accessibility Tests (Req 5.1, 5.2) ────────────────────────────

describe('Keyboard accessibility', () => {
  it('all buttons in initial view are reachable via Tab key', async () => {
    renderWelcome();
    const user = userEvent.setup();

    // "Create with Wizard" receives auto-focus on mount
    expect(screen.getByRole('button', { name: /create with wizard/i })).toHaveFocus();

    // Tab moves to "Quick Start"
    await user.tab();
    expect(screen.getByRole('button', { name: /quick start/i })).toHaveFocus();
  });

  it('name input in quick-start mode receives focus when shown', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /quick start/i }));
    expect(screen.getByPlaceholderText(/character name/i)).toHaveFocus();
  });
});
