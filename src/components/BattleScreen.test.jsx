// ═══════════════════════════════════════════
// BATTLE SCREEN COMPONENT TESTS
// ═══════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BattleScreen from './BattleScreen';

// Mock the battle module
vi.mock('../game/battle', () => ({
  getMaxHP: vi.fn(),
  calculateDamage: vi.fn(),
  getCatchRate: vi.fn(),
  getFaintedCatchRate: vi.fn(),
}));

import * as battleModule from '../game/battle';

describe('BattleScreen Component', () => {
  const mockWildPokemon = {
    id: 'pokemon-1',
    name: 'WildMon',
    type: 'Fire',
    power_level: 50,
    image_url: '/test.png',
    rarity: 'Common',
    description: 'A wild pokemon',
  };

  const mockTeam = [
    {
      id: 'player-1',
      name: 'PlayerMon',
      type: 'Water',
      power_level: 55,
      image_url: '/player.png',
      rarity: 'Uncommon',
      currentHP: 150,
    },
  ];

  const defaultProps = {
    wildPokemon: mockWildPokemon,
    team: mockTeam,
    onEnd: vi.fn(),
    levelConfig: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    battleModule.getMaxHP.mockReturnValue(150);
    battleModule.calculateDamage.mockReturnValue({
      damage: 25,
      effectiveness: 'normal',
      isCritical: false,
    });
    battleModule.getCatchRate.mockReturnValue(0.5);
    battleModule.getFaintedCatchRate.mockReturnValue(0.9);
  });

  describe('Initial Render', () => {
    it('should render wild pokemon image', async () => {
      render(<BattleScreen {...defaultProps} />);
      // Pokemon name is in alt text of the image
      await waitFor(() => {
        expect(screen.getByAltText('WildMon')).toBeInTheDocument();
      });
    });

    it('should render player pokemon image', async () => {
      render(<BattleScreen {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByAltText('PlayerMon')).toBeInTheDocument();
      });
    });

    it('should display HP values', async () => {
      render(<BattleScreen {...defaultProps} />);
      await waitFor(() => {
        const hpElements = screen.getAllByText(/HP:/);
        expect(hpElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should show wild pokemon type emoji', async () => {
      render(<BattleScreen {...defaultProps} />);
      await waitFor(() => {
        // Fire type should show 🔥 somewhere in the document
        expect(document.body.textContent).toContain('🔥');
      });
    });

    it('should show battle message', async () => {
      render(<BattleScreen {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/A wild WildMon appeared/)).toBeInTheDocument();
      });
    });
  });
});
