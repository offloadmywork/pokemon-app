import { describe, it, expect } from 'vitest';
import { getDailyQuestTemplateKeysForEvent } from './dailyQuestEvents';

describe('dailyQuestEvents', () => {
  it('maps catch event to catch quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('catch')).toEqual(['catch-1', 'catch-2', 'catch-3']);
  });

  it('maps battle win event to battle quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('battleWin')).toEqual(['battle-1', 'battle-2', 'battle-3']);
  });

  it('maps use item event to use-item quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('useItem')).toEqual(['use-item', 'use-item-2']);
  });

  it('maps heal team event to heal quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('healTeam')).toEqual(['heal-team']);
  });

  it('maps rare catch event to rare catch quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('rareCatch')).toEqual(['rare-catch']);
  });

  it('maps evolve Pokemon event to evolution quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('evolvePokemon')).toEqual(['evolve-pokemon']);
  });

  it('maps challenge tower floor completion to tower quest template', () => {
    expect(getDailyQuestTemplateKeysForEvent('towerFloorComplete')).toEqual(['tower-floor']);
  });
});
