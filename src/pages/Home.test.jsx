import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from './Home';

vi.mock('@/components/DailyQuestsPanel', () => ({
  default: () => <div>Daily Quests</div>,
}));

describe('Home Page', () => {
  it('should render the welcome message', () => {
    render(<Home onNavigate={vi.fn()} />);
    
    expect(screen.getByText('Pokémon Adventure!')).toBeInTheDocument();
    expect(screen.getByText(/Catch amazing Pokémons/i)).toBeInTheDocument();
  });

  it('should have navigation buttons', () => {
    render(<Home onNavigate={vi.fn()} />);
    
    expect(screen.getByText('🔍 Find Pokémons')).toBeInTheDocument();
    expect(screen.getByText('⭐ My Collection')).toBeInTheDocument();
  });

  it('should navigate to browse when Find Pokémons is clicked', () => {
    const mockNavigate = vi.fn();
    render(<Home onNavigate={mockNavigate} />);
    
    fireEvent.click(screen.getByText('🔍 Find Pokémons'));
    
    expect(mockNavigate).toHaveBeenCalledWith('browse');
  });

  it('should navigate to collection when My Collection is clicked', () => {
    const mockNavigate = vi.fn();
    render(<Home onNavigate={mockNavigate} />);
    
    fireEvent.click(screen.getByText('⭐ My Collection'));
    
    expect(mockNavigate).toHaveBeenCalledWith('collection');
  });

  it('should render the game logo', () => {
    render(<Home onNavigate={vi.fn()} />);
    
    expect(screen.getByText('🎮')).toBeInTheDocument();
  });
});
