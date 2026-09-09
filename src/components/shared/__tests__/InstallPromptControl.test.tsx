import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InstallPromptControl, InstallHintBanner } from '../InstallPromptControl';

/**
 * Tests for the PWA install affordances (spec: ux-audit-improvements, Req 6).
 *
 * Both surfaces consume the real `useInstallPrompt` hook, so we drive
 * installability by dispatching the browser's `beforeinstallprompt` event
 * (jsdom does not emit it) and control installed-state via matchMedia
 * (defaulted to `{ matches: false }` in test-setup.ts).
 */

const HINT_DISMISSED_KEY = 'wfrp-install-hint-dismissed';

function createBeforeInstallPromptEvent() {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    platforms: string[];
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });
  event.platforms = ['web'];
  return event;
}

/** Fire the install-availability signal after mount so `canInstall` flips true. */
function signalInstallAvailable() {
  const event = createBeforeInstallPromptEvent();
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('InstallPromptControl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when the app is not installable', () => {
    // Requirement 6.5: no browser signal → control is hidden.
    const { container } = render(<InstallPromptControl />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('renders the install button once install becomes available', () => {
    render(<InstallPromptControl />);
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();

    signalInstallAvailable();

    // Requirement 6.1 / 6.2: control appears on the settings surface when installable.
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
  });

  it('invokes the browser install prompt when the button is activated', async () => {
    render(<InstallPromptControl />);
    const event = signalInstallAvailable();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /install app/i }));
    });

    // Requirement 6.4: activating the control calls promptInstall → browser prompt.
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });
});

describe('InstallHintBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when the app is not installable', () => {
    // Requirement 6.5: no signal → hint hidden.
    const { container } = render(<InstallHintBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the hint when installable and not previously dismissed', () => {
    render(<InstallHintBanner />);
    signalInstallAvailable();

    // Requirement 6.3: one-time install hint appears when install becomes available.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^install$/i })).toBeInTheDocument();
  });

  it('persists dismissal and hides the hint when dismissed', () => {
    render(<InstallHintBanner />);
    signalInstallAvailable();

    fireEvent.click(screen.getByRole('button', { name: /dismiss install hint/i }));

    // Requirement 6.7: dismissal hides the hint and is persisted.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(localStorage.getItem(HINT_DISMISSED_KEY)).toBe('true');
  });

  it('stays hidden on a fresh render after a prior dismissal', () => {
    localStorage.setItem(HINT_DISMISSED_KEY, 'true');

    render(<InstallHintBanner />);
    signalInstallAvailable();

    // Requirement 6.7: once dismissed, the hint never returns.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('persists dismissal when the user acts on the install button', async () => {
    render(<InstallHintBanner />);
    const event = signalInstallAvailable();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^install$/i }));
    });

    // Requirement 6.4: install button triggers the browser prompt...
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // ...and the hint has served its purpose, so it is dismissed/persisted (Req 6.7).
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(localStorage.getItem(HINT_DISMISSED_KEY)).toBe('true');
  });
});
