import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Browse from './Browse';
import { pokemonAPI } from '@/api/client';

// Mock the API client
vi.mock('@/api/client', () => ({
  pokemonAPI: {
    getCaughtPokemon: vi.fn(),
    getRandomPokemon: vi.fn(),
  },
}));

describe('Browse Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show loading state initially', () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    render(<Browse onNavigate={vi.fn()} />);
    // Component shows "Entering Forest..." instead of "Loading"
    expect(screen.getByText(/Entering/i)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    pokemonAPI.getCaughtPokemon.mockRejectedValue(new Error('Network error'));
    render(<Browse onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText(/Entering/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
