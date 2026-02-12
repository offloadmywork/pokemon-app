// ═══════════════════════════════════════════
// UI CHECKBOX COMPONENT TESTS
// ═══════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox Component', () => {
  it('should render checkbox', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should be unchecked by default', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('should be checked when checked prop is true', () => {
    render(<Checkbox checked readOnly />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('should call onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox onCheckedChange={handleChange} />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('should have name attribute', () => {
    render(<Checkbox name="terms" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('name', 'terms');
  });

  it('should have id attribute', () => {
    render(<Checkbox id="terms" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'terms');
  });

  it('should render with custom className', () => {
    const { container } = render(<Checkbox className="custom-checkbox" />);
    expect(container.firstChild).toHaveClass('custom-checkbox');
  });

  it('should toggle state on click', () => {
    const { rerender } = render(<Checkbox checked={false} onCheckedChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).not.toBeChecked();

    rerender(<Checkbox checked={true} onCheckedChange={() => {}} />);
    expect(checkbox).toBeChecked();
  });

  it('should be required when specified', () => {
    render(<Checkbox required />);
    expect(screen.getByRole('checkbox')).toBeRequired();
  });
});
