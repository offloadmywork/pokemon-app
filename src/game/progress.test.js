import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadProgress,
  saveProgress,
  loadProgressAsync,
  saveProgressAsync,
  addXP,
  addXPAsync,
  resetProgress,
  setProgressApiClient,
} from './progress';
import { getLevelFromXP, XP_REWARDS } from './constants';

describe('Player Progress Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset API client
    setProgressApiClient(null);
  });

  describe('Load and Save Progress (Sync - localStorage)', () => {
    it('should return default progress when nothing is saved', () => {
      const progress = loadProgress();
      expect(progress).toEqual({ xp: 0, level: 1 });
    });

    it('should save and load progress correctly', () => {
      saveProgress(250, 3);
      const progress = loadProgress();
      
      expect(progress.xp).toBe(250);
      expect(progress.level).toBe(3);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('pokemon-adventure-progress', 'invalid-json');
      const progress = loadProgress();
      
      expect(progress).toEqual({ xp: 0, level: 1 });
    });
  });

  describe('Load and Save Progress (Async - API)', () => {
    it('should load from API when client is available', async () => {
      const mockClient = {
        getProgress: vi.fn().mockResolvedValue({ xp: 500, level: 4 }),
      };
      
      setProgressApiClient(mockClient);
      const progress = await loadProgressAsync();
      
      expect(mockClient.getProgress).toHaveBeenCalled();
      expect(progress.xp).toBe(500);
      expect(progress.level).toBe(4);
      
      // Should also cache to localStorage
      const cached = loadProgress();
      expect(cached.xp).toBe(500);
    });

    it('should fallback to localStorage when API fails', async () => {
      const mockClient = {
        getProgress: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      
      // Set some cached data
      saveProgress(150, 2);
      
      setProgressApiClient(mockClient);
      const progress = await loadProgressAsync();
      
      // Should use cached data
      expect(progress.xp).toBe(150);
      expect(progress.level).toBe(2);
    });

    it('should save to API when client is available', async () => {
      const mockClient = {
        setProgress: vi.fn().mockResolvedValue({ xp: 300, level: 3 }),
      };
      
      setProgressApiClient(mockClient);
      const result = await saveProgressAsync(300, 3);
      
      expect(mockClient.setProgress).toHaveBeenCalledWith(300, 3);
      expect(result.xp).toBe(300);
      expect(result.level).toBe(3);
      
      // Should also cache to localStorage
      const cached = loadProgress();
      expect(cached.xp).toBe(300);
    });

    it('should fallback to localStorage when API save fails', async () => {
      const mockClient = {
        setProgress: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      
      setProgressApiClient(mockClient);
      const result = await saveProgressAsync(200, 2);
      
      // Should still save to localStorage
      expect(result.xp).toBe(200);
      const cached = loadProgress();
      expect(cached.xp).toBe(200);
    });
  });

  describe('Add XP (Sync)', () => {
    it('should add XP and update level when threshold is reached', () => {
      saveProgress(50, 1);
      
      const result = addXP(XP_REWARDS.Uncommon); // +25 XP
      
      expect(result.xp).toBe(75);
      expect(result.level).toBe(1);
    });

    it('should level up when reaching XP threshold', () => {
      saveProgress(90, 1); // 10 away from level 2 (requires 100)
      
      const result = addXP(XP_REWARDS.Uncommon); // +25 XP = 115 total
      
      expect(result.xp).toBe(115);
      expect(result.level).toBe(2);
      expect(result.leveledUp).toBe(true);
    });

    it('should handle multiple level ups', () => {
      saveProgress(0, 1);
      
      const result = addXP(350); // Should jump multiple levels
      
      expect(result.xp).toBe(350);
      expect(result.level).toBe(3); // Level 3 requires 300 XP, level 4 requires 600
      expect(result.leveledUp).toBe(true);
    });
  });

  describe('Add XP (Async)', () => {
    it('should add XP via API when client is available', async () => {
      const mockClient = {
        getProgress: vi.fn().mockResolvedValue({ xp: 50, level: 1 }),
        setProgress: vi.fn().mockResolvedValue({ xp: 75, level: 1 }),
      };
      
      setProgressApiClient(mockClient);
      
      // Load initial progress
      await loadProgressAsync();
      
      const result = await addXPAsync(25);
      
      expect(mockClient.setProgress).toHaveBeenCalledWith(75, 1);
      expect(result.xp).toBe(75);
      expect(result.level).toBe(1);
    });

    it('should detect level up via API', async () => {
      const mockClient = {
        getProgress: vi.fn().mockResolvedValue({ xp: 90, level: 1 }),
        setProgress: vi.fn().mockResolvedValue({ xp: 140, level: 2 }),
      };
      
      setProgressApiClient(mockClient);
      await loadProgressAsync();
      
      const result = await addXPAsync(50);
      
      expect(result.xp).toBe(140);
      expect(result.level).toBe(2);
      expect(result.leveledUp).toBe(true);
    });
  });

  describe('Reset Progress', () => {
    it('should reset progress to defaults', () => {
      saveProgress(500, 4);
      
      resetProgress();
      
      const progress = loadProgress();
      expect(progress.xp).toBe(0);
      expect(progress.level).toBe(1);
    });
  });

  describe('Backwards Compatibility', () => {
    it('should migrate old localStorage format if exists', () => {
      // Simulate old format
      localStorage.setItem('pokemon-adventure-progress', JSON.stringify({ xp: 200, level: 2 }));
      
      const progress = loadProgress();
      expect(progress.xp).toBe(200);
      expect(progress.level).toBe(2);
    });
  });
});
