import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '../shared/WelcomeScreen';
import { importFromJSON } from '../../storage/export-import';

vi.mock('../../storage/export-import', () => ({
  importFromJSON: vi.fn(),
}));

const mockedImportFromJSON = vi.mocked(importFromJSON);

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
  onImportCharacter: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

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

// ─── Helper: simulate file selection on hidden input ─────────────────────────

function createFile(content: string, name = 'character.json') {
  return new File([content], name, { type: 'application/json' });
}

function getHiddenFileInput(): HTMLInputElement {
  // The hidden file input is the only input[type="file"] in the DOM
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (!input) throw new Error('Hidden file input not found');
  return input;
}

// ─── Import from File Tests (Task 3) ────────────────────────────────────────

describe('Import from File', () => {
  // 3.1 "Import from File" button renders in initial view alongside existing buttons
  it('renders "Import from File" button alongside existing buttons', () => {
    renderWelcome();
    expect(screen.getByRole('button', { name: /import from file/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create with wizard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
  });

  // 3.2 clicking import button triggers the hidden file input
  it('clicking import button triggers the hidden file input click', () => {
    renderWelcome();
    const fileInput = getHiddenFileInput();
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: /import from file/i }));
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  // 3.3 successful file import calls onImportCharacter with parsed character
  it('successful file import calls onImportCharacter with parsed character', async () => {
    const mockCharacter = { name: 'Imported Hero', species: 'Human', _v: 6, chars: {} };
    mockedImportFromJSON.mockReturnValue({ success: true, character: mockCharacter as any });

    const onImportCharacter = vi.fn();
    renderWelcome({ onImportCharacter });

    const fileInput = getHiddenFileInput();
    const file = createFile(JSON.stringify(mockCharacter));

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImportCharacter).toHaveBeenCalledWith(mockCharacter);
    });
    expect(mockedImportFromJSON).toHaveBeenCalled();
  });

  // 3.4 failed file import displays error message with role="alert"
  it('failed file import displays error message with role="alert"', async () => {
    mockedImportFromJSON.mockReturnValue({ success: false, error: 'Missing required field: "name".' });

    renderWelcome();

    const fileInput = getHiddenFileInput();
    const file = createFile('{"bad": "data"}');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Missing required field: "name".');
    });
  });

  // 3.5 error clears when import is retried
  it('error clears when import is retried', async () => {
    // First import fails
    mockedImportFromJSON.mockReturnValue({ success: false, error: 'Invalid JSON: failed to parse.' });
    renderWelcome();

    const fileInput = getHiddenFileInput();
    fireEvent.change(fileInput, { target: { files: [createFile('not json')] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Second import succeeds — error should clear
    const mockCharacter = { name: 'Retry Hero', species: 'Dwarf', _v: 6, chars: {} };
    mockedImportFromJSON.mockReturnValue({ success: true, character: mockCharacter as any });

    fireEvent.change(fileInput, { target: { files: [createFile(JSON.stringify(mockCharacter))] } });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // 3.6 all three buttons remain visible after an import error
  it('all three buttons remain visible after an import error', async () => {
    mockedImportFromJSON.mockReturnValue({ success: false, error: 'Invalid data: expected a JSON object.' });

    renderWelcome();

    const fileInput = getHiddenFileInput();
    fireEvent.change(fileInput, { target: { files: [createFile('[]')] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /create with wizard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import from file/i })).toBeInTheDocument();
  });

  // 3.7 import button is reachable via keyboard tab navigation
  it('import button is reachable via keyboard tab navigation', async () => {
    renderWelcome();
    const user = userEvent.setup();

    // "Create with Wizard" receives auto-focus on mount
    expect(screen.getByRole('button', { name: /create with wizard/i })).toHaveFocus();

    // Tab to "Quick Start"
    await user.tab();
    expect(screen.getByRole('button', { name: /quick start/i })).toHaveFocus();

    // Tab to "Import from File"
    await user.tab();
    expect(screen.getByRole('button', { name: /import from file/i })).toHaveFocus();
  });
});
