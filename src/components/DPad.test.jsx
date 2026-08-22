// ═══════════════════════════════════════════
// DPAD COMPONENT TESTS
// ═══════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DPad from './DPad';

describe('DPad Component', () => {
  const defaultProps = {
    onMove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render DPad with four directional buttons', () => {
    render(<DPad {...defaultProps} />);
    expect(screen.getByLabelText('Move up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move down')).toBeInTheDocument();
    expect(screen.getByLabelText('Move left')).toBeInTheDocument();
    expect(screen.getByLabelText('Move right')).toBeInTheDocument();
  });

  it('should call onMove with "up" when up button is clicked', () => {
    render(<DPad {...defaultProps} />);
    fireEvent.pointerDown(screen.getByLabelText('Move up'));
    expect(defaultProps.onMove).toHaveBeenCalledWith('up');
  });

  it('should call onMove with "down" when down button is clicked', () => {
    render(<DPad {...defaultProps} />);
    fireEvent.pointerDown(screen.getByLabelText('Move down'));
    expect(defaultProps.onMove).toHaveBeenCalledWith('down');
  });

  it('should call onMove with "left" when left button is clicked', () => {
    render(<DPad {...defaultProps} />);
    fireEvent.pointerDown(screen.getByLabelText('Move left'));
    expect(defaultProps.onMove).toHaveBeenCalledWith('left');
  });

  it('should call onMove with "right" when right button is clicked', () => {
    render(<DPad {...defaultProps} />);
    fireEvent.pointerDown(screen.getByLabelText('Move right'));
    expect(defaultProps.onMove).toHaveBeenCalledWith('right');
  });

  it('should not throw if onMove handler is optional', () => {
    expect(() => {
      render(<DPad />);
    }).not.toThrow();
  });

  it('should render button elements', () => {
    render(<DPad {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('should have visible up arrow indicator', () => {
    render(<DPad {...defaultProps} />);
    const upButton = screen.getByLabelText('Move up');
    expect(upButton).toBeVisible();
  });

  it('should render a center icon', () => {
    const { container } = render(<DPad {...defaultProps} />);
    expect(container.textContent).toContain('▲');
  });
});
