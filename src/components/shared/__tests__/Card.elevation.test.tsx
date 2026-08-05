import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from '../Card';

describe('Card elevation and hover styles', () => {
  it('renders with the card CSS module class', () => {
    const { container } = render(
      <Card>
        <p>Content</p>
      </Card>
    );
    const cardDiv = container.firstElementChild as HTMLElement;
    expect(cardDiv).toBeInTheDocument();
    expect(cardDiv.className).toContain('card');
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <span>Test child</span>
      </Card>
    );
    expect(getByText('Test child')).toBeInTheDocument();
  });

  it('applies optional style prop', () => {
    const { container } = render(
      <Card style={{ maxWidth: '300px' }}>
        <p>Styled card</p>
      </Card>
    );
    const cardDiv = container.firstElementChild as HTMLElement;
    expect(cardDiv.style.maxWidth).toBe('300px');
  });

  it('renders as a div element (surface container)', () => {
    const { container } = render(
      <Card>
        <p>Card</p>
      </Card>
    );
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });
});
