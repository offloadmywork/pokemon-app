import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrainerRecoveryPanel from './TrainerRecoveryPanel';

describe('TrainerRecoveryPanel', () => {
  const apiClient = {
    getTrainerRecoveryCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.getTrainerRecoveryCode.mockResolvedValue('trainer-code-123');
  });

  it('loads and displays the trainer recovery code', async () => {
    render(<TrainerRecoveryPanel apiClient={apiClient} />);

    expect(await screen.findByText('Trainer Recovery')).toBeInTheDocument();
    expect(await screen.findByText('trainer-code-123')).toBeInTheDocument();
    expect(screen.getByText(/Save this code/i)).toBeInTheDocument();
  });

  it('copies the trainer recovery code with visible feedback', async () => {
    const copyRecoveryCode = vi.fn().mockResolvedValue();

    render(<TrainerRecoveryPanel apiClient={apiClient} copyRecoveryCode={copyRecoveryCode} />);

    fireEvent.click(await screen.findByText('Copy Code'));

    expect(copyRecoveryCode).toHaveBeenCalledWith('trainer-code-123');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('shows an unavailable state when the code cannot be loaded', async () => {
    apiClient.getTrainerRecoveryCode.mockRejectedValue(new Error('No identity'));

    render(<TrainerRecoveryPanel apiClient={apiClient} />);

    expect(await screen.findByText('Recovery code unavailable')).toBeInTheDocument();
  });
});
