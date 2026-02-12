// ═══════════════════════════════════════════
// UI INPUT COMPONENT TESTS
// ═══════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';

describe('Input Component', () => {
  it('should render input with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should update value on change', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('should have value prop', () => {
    render(<Input value="test" readOnly />);
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should have type text by default', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  it('should render email type correctly', () => {
    render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('should have name attribute', () => {
    render(<Input name="username" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
  });

  it('should have id attribute', () => {
    render(<Input id="user-input" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'user-input');
  });

  it('should render with custom className', () => {
    const { container } = render(<Input className="custom-input" />);
    expect(container.firstChild).toHaveClass('custom-input');
  });

  it('should handle focus events', () => {
    const handleFocus = vi.fn();
    render(<Input onFocus={handleFocus} />);

    fireEvent.focus(screen.getByRole('textbox'));
    expect(handleFocus).toHaveBeenCalled();
  });

  it('should handle blur events', () => {
    const handleBlur = vi.fn();
    render(<Input onBlur={handleBlur} />);

    fireEvent.blur(screen.getByRole('textbox'));
    expect(handleBlur).toHaveBeenCalled();
  });

  it('should have required attribute', () => {
    render(<Input required />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });
});
