import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EvolutionPanel from './EvolutionPanel';

const mockApiClient = {
  getEvolutionOptions: vi.fn(),
  evolvePokemon: vi.fn(),
};

describe('EvolutionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders evolution options', async () => {
    mockApiClient.getEvolutionOptions.mockResolvedValue([
      {
        caught_id: 'c1',
        can_evolve: true,
        required_level: 3,
        from: { name: 'Flametail Jr', type: 'Fire', image_url: '' },
        to: { name: 'Blazetail', type: 'Fire', image_url: '' },
      },
    ]);

    render(<EvolutionPanel apiClient={mockApiClient} />);

    expect(await screen.findByText(/Flametail Jr/i)).toBeInTheDocument();
    expect(screen.getByText(/Blazetail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /evolve/i })).toBeInTheDocument();
  });

  it('calls evolve endpoint when clicking evolve', async () => {
    mockApiClient.getEvolutionOptions.mockResolvedValue([
      {
        caught_id: 'c1',
        can_evolve: true,
        required_level: 3,
        from: { name: 'Flametail Jr', type: 'Fire', image_url: '' },
        to: { name: 'Blazetail', type: 'Fire', image_url: '' },
      },
    ]);
    mockApiClient.evolvePokemon.mockResolvedValue({ success: true, caught_id: 'c1' });

    render(<EvolutionPanel apiClient={mockApiClient} />);

    const evolveButton = await screen.findByRole('button', { name: /evolve/i });
    fireEvent.click(evolveButton);

    expect(mockApiClient.evolvePokemon).toHaveBeenCalledWith('c1');
  });
});
