import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPortrait } from '../shared/CharacterPortrait';

const defaultProps = {
  portrait: '',
  characterName: 'Brunhilde',
  onUpload: vi.fn(),
  onRemove: vi.fn(),
};

function renderPortrait(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, onUpload: vi.fn(), onRemove: vi.fn(), ...overrides };
  const result = render(<CharacterPortrait {...props} />);
  return { ...result, props };
}

// ─── Req 1.2: Placeholder renders when portrait is empty ─────────────────────

describe('Placeholder display', () => {
  it('renders placeholder text when portrait is empty', () => {
    renderPortrait({ portrait: '' });
    expect(screen.getByText('No portrait set')).toBeInTheDocument();
  });

  it('does not render an img element when portrait is empty', () => {
    renderPortrait({ portrait: '' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

// ─── Req 1.3: Image renders with correct src when portrait is set ────────────

describe('Portrait image display', () => {
  it('renders an image with the correct src when portrait is set', () => {
    renderPortrait({ portrait: 'data:image/png;base64,abc123' });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
  });

  it('does not render placeholder text when portrait is set', () => {
    renderPortrait({ portrait: 'data:image/png;base64,abc123' });
    expect(screen.queryByText('No portrait set')).not.toBeInTheDocument();
  });
});

// ─── Req 1.4: Portrait frame has 200×280 dimensions ─────────────────────────

describe('Portrait frame dimensions', () => {
  it('portrait frame has width 200 and height 280', () => {
    renderPortrait();
    const frame = screen.getByTestId('portrait-frame');
    expect(frame.style.width).toBe('200px');
    expect(frame.style.height).toBe('280px');
  });
});

// ─── Req 2.1: Upload button is present ───────────────────────────────────────

describe('Upload button', () => {
  it('renders an upload button', () => {
    renderPortrait();
    expect(screen.getByRole('button', { name: /upload portrait/i })).toBeInTheDocument();
  });
});

// ─── Req 2.6: Guidance text "200×280" is visible ─────────────────────────────

describe('Guidance text', () => {
  it('displays guidance text with dimensions', () => {
    renderPortrait();
    expect(screen.getByText(/200×280/)).toBeInTheDocument();
  });
});


// ─── Req 3.1: Remove button visible when portrait is set ─────────────────────

describe('Remove button visibility', () => {
  it('shows remove button when portrait is set', () => {
    renderPortrait({ portrait: 'data:image/png;base64,abc123' });
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  // ─── Req 3.3: Remove button hidden when portrait is empty ─────────────────
  it('hides remove button when portrait is empty', () => {
    renderPortrait({ portrait: '' });
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});

// ─── Req 3.2: Clicking remove calls onRemove ────────────────────────────────

describe('Remove button interaction', () => {
  it('calls onRemove when remove button is clicked', () => {
    const { props } = renderPortrait({ portrait: 'data:image/png;base64,abc123' });
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });
});

// ─── Req 5.1: Image alt text includes character name ─────────────────────────

describe('Accessibility — alt text', () => {
  it('image alt text includes the character name', () => {
    renderPortrait({ portrait: 'data:image/png;base64,abc123', characterName: 'Sigmar' });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', expect.stringContaining('Sigmar'));
  });
});

// ─── Req 5.4: Error region has aria-live="polite" ────────────────────────────

describe('Accessibility — error region', () => {
  it('has an aria-live="polite" region for error messages', () => {
    const { container } = renderPortrait();
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});

// ─── Req 2.4: Error message displayed for invalid file type ─────────────────

describe('Validation error — invalid file type', () => {
  it('displays an error when a non-accepted file type is selected', async () => {
    renderPortrait();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['gif-content'], 'photo.gif', { type: 'image/gif' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/JPEG, PNG, or WebP/i)).toBeInTheDocument();
    });
  });
});

// ─── Req 2.5: Error message displayed for oversized file ────────────────────

describe('Validation error — oversized file', () => {
  it('displays an error when a file exceeds 2 MB', async () => {
    renderPortrait();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a file just over 2 MB
    const oversizedContent = new Uint8Array(2 * 1024 * 1024 + 1);
    const oversizedFile = new File([oversizedContent], 'big.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/2 MB/i)).toBeInTheDocument();
    });
  });
});
