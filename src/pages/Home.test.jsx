import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from './Home';

const mockApiClient = {
  getCaughtPokemon: vi.fn(),
  getBossClears: vi.fn(),
  claimStarters: vi.fn(),
};

vi.mock('@/components/DailyQuestsPanel', () => ({
  default: () => <div>Daily Quests</div>,
}));


vi.mock('@/components/ChallengeTowerPanel', () => ({
  default: () => <div>Challenge Tower</div>,
}));

vi.mock('@/components/CoopRaidPanel', () => ({
  default: () => <div>Co-op Raids</div>,
}));

vi.mock('@/components/EvolutionPanel', () => ({
  default: () => <div>Evolution Panel</div>,
}));

vi.mock('@/components/PvpPanel', () => ({
  default: () => <div>PvP Arena</div>,
}));

vi.mock('@/components/TradingPanel', () => ({
  default: () => <div>Trading Post</div>,
}));

vi.mock('@/components/ShopPanel', () => ({
  default: () => <div>Trainer Shop</div>,
}));

vi.mock('@/components/UpgradePanel', () => ({
  default: () => <div>Trainer Upgrades</div>,
}));

vi.mock('@/components/CosmeticsPanel', () => ({
  default: () => <div>Trainer Cosmetics</div>,
}));

vi.mock('@/components/AchievementsPanel', () => ({
  default: () => <div>Achievements</div>,
}));

vi.mock('@/components/TrainerCardPreview', () => ({
  default: () => <div>Trainer Card Preview</div>,
}));

vi.mock('@/components/TrainerRecoveryPanel', () => ({
  default: () => <div>Trainer Recovery</div>,
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.getCaughtPokemon.mockReturnValue(new Promise(() => {}));
    mockApiClient.getBossClears.mockResolvedValue([]);
    mockApiClient.claimStarters.mockResolvedValue({ success: true, starters: [] });
  });

  it('should render the welcome message', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    
    expect(screen.getByText('Pokémon Adventure!')).toBeInTheDocument();
    expect(screen.getByText(/Catch amazing Pokémons/i)).toBeInTheDocument();
  });

  it('should have navigation buttons', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    
    expect(screen.getByText('Find Pokémons')).toBeInTheDocument();
    expect(screen.getByText('My Collection')).toBeInTheDocument();
  });

  it('should navigate to browse when Find Pokémons is clicked', () => {
    const mockNavigate = vi.fn();
    render(<Home onNavigate={mockNavigate} apiClient={mockApiClient} />);
    
    fireEvent.click(screen.getByText('Find Pokémons'));
    
    expect(mockNavigate).toHaveBeenCalledWith('browse');
  });

  it('should navigate to collection when My Collection is clicked', () => {
    const mockNavigate = vi.fn();
    render(<Home onNavigate={mockNavigate} apiClient={mockApiClient} />);
    
    fireEvent.click(screen.getByText('My Collection'));
    
    expect(mockNavigate).toHaveBeenCalledWith('collection');
  });

  it('should show starter path actions for new players', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    expect(screen.getByText('Starter Path')).toBeInTheDocument();
    expect(screen.getByText('Catch First Pokémon')).toBeInTheDocument();
    expect(screen.getByText('Build Team')).toBeInTheDocument();
  });

  it('should navigate from starter path actions', () => {
    const mockNavigate = vi.fn();
    render(<Home onNavigate={mockNavigate} apiClient={mockApiClient} />);

    fireEvent.click(screen.getByText('Catch First Pokémon'));
    fireEvent.click(screen.getByText('Build Team'));

    expect(mockNavigate).toHaveBeenCalledWith('browse');
    expect(mockNavigate).toHaveBeenCalledWith('collection');
  });

  it('should render the game title', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    
    expect(screen.getByText('Pokémon Adventure!')).toBeInTheDocument();
  });

  it('should show starter claim action for empty collections', async () => {
    mockApiClient.getCaughtPokemon.mockResolvedValue([]);

    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    expect(await screen.findByText('Claim Starters')).toBeInTheDocument();
  });

  it('should claim starters from the Home path and mark them ready', async () => {
    mockApiClient.getCaughtPokemon.mockResolvedValue([]);
    mockApiClient.claimStarters.mockResolvedValue({ success: true, starters: [{ id: 's1' }] });

    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    fireEvent.click(await screen.findByText('Claim Starters'));

    expect(mockApiClient.claimStarters).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Starters Ready')).toBeInTheDocument();
    expect(screen.getByText('Start First Battle')).toBeInTheDocument();
  });

  it('should route battle-ready players from starter path to Browse', async () => {
    mockApiClient.getCaughtPokemon.mockResolvedValue([{ id: 'starter-1' }]);
    const mockNavigate = vi.fn();

    render(<Home onNavigate={mockNavigate} apiClient={mockApiClient} />);

    fireEvent.click(await screen.findByText('Start First Battle'));

    expect(mockNavigate).toHaveBeenCalledWith('browse');
  });

  it('should surface cleared zone boss progress', async () => {
    mockApiClient.getCaughtPokemon.mockResolvedValue([{ id: 'starter-1' }]);
    mockApiClient.getBossClears.mockResolvedValue([
      { boss_key: 'grove-guardian', name: 'Grove Guardian', reward_xp: 120 },
    ]);

    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    expect(await screen.findByText('Zone Bosses')).toBeInTheDocument();
    expect(screen.getByText('1 cleared')).toBeInTheDocument();
    expect(screen.getByText('Latest: Grove Guardian')).toBeInTheDocument();
  });

  it('should surface the active seasonal event', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} today="2026-07-05" />);

    expect(screen.getByText('Seasonal Event')).toBeInTheDocument();
    expect(screen.getByText('Summer Splash')).toBeInTheDocument();
    expect(screen.getByText('Water / Ice boosted')).toBeInTheDocument();
  });

  // Scenario: Home is a tabbed hub, not a 13-panel dump
  //   Given a trainer opens Home
  //   When they look at the hub
  //   Then Play is the default section and other content lives behind section tabs
  it('should default to the Play section and hide other sections until selected', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    expect(screen.getByRole('tab', { name: 'Play', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Daily Quests')).toBeInTheDocument();
    expect(screen.queryByText('PvP Arena')).not.toBeInTheDocument();
    expect(screen.queryByText('Trainer Shop')).not.toBeInTheDocument();
  });

  it('should reveal Social panels only from the Social tab', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Social' }));

    expect(screen.getByText('PvP Arena')).toBeInTheDocument();
    expect(screen.getByText('Co-op Raids')).toBeInTheDocument();
    expect(screen.getByText('Trading Post')).toBeInTheDocument();
    expect(screen.queryByText('Daily Quests')).not.toBeInTheDocument();
  });

  it('should reveal economy panels from the Shop tab', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Shop' }));

    expect(screen.getByText('Trainer Shop')).toBeInTheDocument();
    expect(screen.getByText('Trainer Upgrades')).toBeInTheDocument();
    expect(screen.getByText('Trainer Cosmetics')).toBeInTheDocument();
  });

  it('should reveal profile panels from the Profile tab', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('Trainer Card Preview')).toBeInTheDocument();
    expect(screen.getByText('Trainer Recovery')).toBeInTheDocument();
  });

  it('should surface the PvP arena panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Social' }));

    expect(screen.getByText('PvP Arena')).toBeInTheDocument();
  });

  it('should surface the Co-op Raids panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Social' }));

    expect(screen.getByText('Co-op Raids')).toBeInTheDocument();
  });

  it('should surface the Trading panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Social' }));

    expect(screen.getByText('Trading Post')).toBeInTheDocument();
  });

  it('should surface the Trainer Shop panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Shop' }));

    expect(screen.getByText('Trainer Shop')).toBeInTheDocument();
  });

  it('should surface the Trainer Upgrades panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Shop' }));

    expect(screen.getByText('Trainer Upgrades')).toBeInTheDocument();
  });

  it('should surface the Trainer Cosmetics panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Shop' }));

    expect(screen.getByText('Trainer Cosmetics')).toBeInTheDocument();
  });

  it('should surface the Achievements panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));

    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  it('should surface the Trainer Card preview', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));

    expect(screen.getByText('Trainer Card Preview')).toBeInTheDocument();
  });

  it('should surface the trainer recovery code panel', () => {
    render(<Home onNavigate={vi.fn()} apiClient={mockApiClient} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));

    expect(screen.getByText('Trainer Recovery')).toBeInTheDocument();
  });
});
