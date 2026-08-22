import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrainerCardPreview from './TrainerCardPreview';

const createApi = (overrides = {}) => ({
  getCosmetics: vi.fn().mockResolvedValue({
    user_id: 'user-1',
    cosmetics: [{ cosmetic_id: 'trainer_card_bronze', equipped: true }],
  }),
  ...overrides,
});

describe('TrainerCardPreview', () => {
  it('shows the equipped trainer-card cosmetic as a visible card frame', async () => {
    render(<TrainerCardPreview apiClient={createApi()} />);

    expect(await screen.findByText('Trainer Card')).toBeInTheDocument();
    expect(screen.getByText('Bronze Trainer Card')).toBeInTheDocument();
    expect(screen.getByText('Bronze frame equipped')).toBeInTheDocument();
  });

  it('falls back to the default card when no trainer-card cosmetic is equipped', async () => {
    render(<TrainerCardPreview apiClient={createApi({
      getCosmetics: vi.fn().mockResolvedValue({
        user_id: 'user-1',
        cosmetics: [{ cosmetic_id: 'trainer_card_bronze', equipped: false }],
      }),
    })} />);

    expect(await screen.findByText('Default Trainer Card')).toBeInTheDocument();
    expect(screen.getByText('No frame equipped')).toBeInTheDocument();
  });
});
