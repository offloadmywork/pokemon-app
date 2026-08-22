// ═══════════════════════════════════════════
// BATTLE SCREEN COMPONENT TESTS
// ═══════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

    it('should show wild pokemon type label', async () => {
      render(<BattleScreen {...defaultProps} />);
      await waitFor(() => {
        expect(document.body.textContent).toContain('FIR');
      });
    });

    it('should show battle message', async () => {
      render(<BattleScreen {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/A wild WildMon appeared/)).toBeInTheDocument();
      });
    });

    it('should apply seasonal XP bonus when catching a boosted Pokémon', async () => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const onEnd = vi.fn();

      render(
        <BattleScreen
          {...defaultProps}
          wildPokemon={{ ...mockWildPokemon, type: 'Water', rarity: 'Common' }}
          onEnd={onEnd}
          seasonalEvent={{
            key: 'summer-splash',
            name: 'Summer Splash',
            boostedTypes: ['Water', 'Ice'],
            catchRateMultiplier: 1.15,
            xpMultiplier: 1.1,
          }}
        />
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      fireEvent.click(screen.getByText('Catch!', { selector: '.pixel-btn' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6700);
      });

      expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({
        caught: true,
        battleWon: true,
        xpGained: 11,
      }));

      randomSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should reflect an equipped Premier Ball skin in capture presentation', async () => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

      render(
        <BattleScreen
          {...defaultProps}
          equippedBallSkinCosmeticId="premier_ball_skin"
        />
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(screen.getByText('Catch!', { selector: '.pixel-btn-premier' })).toBeInTheDocument();
      expect(document.querySelector('.pixel-btn-premier [aria-hidden="true"]')).not.toBeNull();

      fireEvent.click(screen.getByText('Catch!', { selector: '.pixel-btn-premier' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByText('Go, Premier Ball!')).toBeInTheDocument();

      randomSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
