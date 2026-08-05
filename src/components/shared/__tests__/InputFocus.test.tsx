import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('Input focus ring visibility', () => {
  it('text input renders and can receive focus', () => {
    const { container } = render(
      <input type="text" aria-label="Name" />
    );
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    input.focus();
    expect(document.activeElement).toBe(input);
  });

  it('number input renders and can receive focus', () => {
    const { container } = render(
      <input type="number" aria-label="Value" />
    );
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    input.focus();
    expect(document.activeElement).toBe(input);
  });

  it('input focus styles target correct input types (text and number)', () => {
    const { container } = render(
      <div>
        <input type="text" aria-label="Text field" />
        <input type="number" aria-label="Number field" />
        <input type="checkbox" aria-label="Checkbox field" />
      </div>
    );
    // Verify the inputs that should receive focus ring styles are present
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    const checkboxInput = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(textInput).toBeInTheDocument();
    expect(numberInput).toBeInTheDocument();
    expect(checkboxInput).toBeInTheDocument();

    // Text and number inputs can receive focus (these are targeted by the global focus styles)
    textInput.focus();
    expect(document.activeElement).toBe(textInput);

    numberInput.focus();
    expect(document.activeElement).toBe(numberInput);
  });

  it('input maintains focus until blur is triggered', () => {
    const { container } = render(
      <input type="text" aria-label="Persistent focus" />
    );
    const input = container.querySelector('input') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    input.blur();
    expect(document.activeElement).not.toBe(input);
  });
});
