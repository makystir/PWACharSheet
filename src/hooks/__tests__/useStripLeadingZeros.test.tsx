import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { stripLeadingZeros, useStripLeadingZeros } from '../useStripLeadingZeros';

describe('stripLeadingZeros', () => {
  it.each([
    ['051', '51'],
    ['05', '5'],
    ['0005', '5'],
    ['-07', '-7'],
    ['00.5', '0.5'],
    ['000', '0'],
  ])('"%s" → "%s"', (text, expected) => {
    expect(stripLeadingZeros(text)).toBe(expected);
  });

  it.each(['0', '0.5', '-0.25', '51', '', '-'])('leaves "%s" alone', (text) => {
    expect(stripLeadingZeros(text)).toBe(text);
  });
});

/** A number field that falls back to 0 when cleared, as most sheet fields do. */
function NumberField({ strip = true }: { strip?: boolean }) {
  return strip ? <WithHook /> : <Field />;
}

function WithHook() {
  useStripLeadingZeros();
  return <Field />;
}

function Field() {
  const [value, setValue] = useState(0);
  const [text, setText] = useState('');
  return (
    <>
      <input type="number" aria-label="advances" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} />
      <output data-testid="stored">{value}</output>
      <input type="number" aria-label="amount" value={text} onChange={(e) => setText(e.target.value)} />
      <output data-testid="stored-text">{text}</output>
      <input type="text" aria-label="name" defaultValue="" />
    </>
  );
}

describe('useStripLeadingZeros', () => {
  it('typing after the 0 a cleared field shows gives the typed number, not 0-prefixed', () => {
    render(<NumberField />);
    const input = screen.getByLabelText('advances') as HTMLInputElement;

    fireEvent.input(input, { target: { value: '' } });
    expect(input.value).toBe('0');

    fireEvent.input(input, { target: { value: '05' } });
    expect(input.value).toBe('5');
    fireEvent.input(input, { target: { value: '51' } });
    expect(input.value).toBe('51');
    expect(screen.getByTestId('stored')).toHaveTextContent('51');
  });

  it('cleans the text before React reads it, so string-backed fields store it clean', () => {
    render(<NumberField />);
    const input = screen.getByLabelText('amount') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '051' } });
    expect(input.value).toBe('51');
    expect(screen.getByTestId('stored-text')).toHaveTextContent(/^51$/);
  });

  it('keeps decimals and a lone 0', () => {
    render(<NumberField />);
    const input = screen.getByLabelText('amount') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '0.5' } });
    expect(input.value).toBe('0.5');
    fireEvent.input(input, { target: { value: '0' } });
    expect(input.value).toBe('0');
  });

  it('leaves text fields alone', () => {
    render(<NumberField />);
    const input = screen.getByLabelText('name') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '007' } });
    expect(input.value).toBe('007');
  });

  it('does nothing without the hook mounted', () => {
    render(<NumberField strip={false} />);
    const input = screen.getByLabelText('amount') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '051' } });
    expect(input.value).toBe('051');
  });
});
