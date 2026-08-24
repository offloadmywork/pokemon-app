import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import VerdantPathScene from '@/engine/VerdantPathScene';
import { pokemonAPI } from '@/api/client';

export default function AdventureWorld({ onNavigate, onEncounter, wardenDefeated = false }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  // The engine must live for the whole visit: a ref keeps the latest callback
  // reachable without re-running the init effect (which would rebuild Phaser
  // and reset the player's position whenever App re-renders).
  const onEncounterRef = useRef(onEncounter);
  useEffect(() => { onEncounterRef.current = onEncounter; }, [onEncounter]);
  const [encounterNotice, setEncounterNotice] = useState('Explore the glades. Wild traces stir in the tall grass.');
  const [cacheOpenedLabel, setCacheOpenedLabel] = useState(() => {
    try { return localStorage.getItem('verdant-cache-opened') === '1' ? 'The moonwell cache has been opened.' : 'The moonwell cache is sealed.'; } catch { return ''; }
  });
  const [objective, setObjective] = useState('');

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 720,
      height: 460,
      backgroundColor: '#10263a',
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [VerdantPathScene],
      render: { pixelArt: true, antialias: false },
    });
    const handleEncounter = () => {
      setEncounterNotice('A wild trace breaks through the grass — entering battle.');
      onEncounterRef.current?.('wild');
    };
    const handleBoss = () => {
      setEncounterNotice('The Grove Warden rises from the moonwell — defeat it to open the sealed cache!');
      onEncounterRef.current?.('boss');
    };
    const handleReward = () => {
      setEncounterNotice('The moonwell cache opens — 2 Potions and a Super Potion claimed!');
      setCacheOpenedLabel('The moonwell cache has been opened.');
      // The reward must be real, not cosmetic: bounded items via the
      // existing economy, granted exactly when the cache first opens.
      Promise.allSettled([
        pokemonAPI.addItem('potion', 2),
        pokemonAPI.addItem('super_potion', 1),
      ]).catch(() => {});
      try { localStorage.setItem('verdant-cache-opened', '1'); } catch { /* private mode */ }
    };
    const handleObjective = (label) => setObjective(label);
    game.registry.events.on('verdant-encounter', handleEncounter);
    game.registry.set('verdant-boss-defeated', Boolean(wardenDefeated));
    let cacheOpened = false;
    try { cacheOpened = wardenDefeated && localStorage.getItem('verdant-cache-opened') === '1'; } catch { /* private mode */ }
    game.registry.set('verdant-cache-opened', cacheOpened);
    game.registry.events.on('verdant-boss', handleBoss);
    game.registry.events.on('verdant-reward', handleReward);
    game.registry.events.on('verdant-objective', handleObjective);
    gameRef.current = game;
    return () => {
      game.registry.events.off('verdant-encounter', handleEncounter);
      game.registry.events.off('verdant-boss', handleBoss);
      game.registry.events.off('verdant-reward', handleReward);
      game.registry.events.off('verdant-objective', handleObjective);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const startMove = (direction) => gameRef.current?.registry.events.emit('verdant-move-start', direction);
  const stopMove = () => gameRef.current?.registry.events.emit('verdant-move-end');
  const controls = [
    { direction: 'up', label: 'Move north', symbol: '▲', className: 'col-start-2' },
    { direction: 'left', label: 'Move west', symbol: '◀', className: 'col-start-1' },
    { direction: 'down', label: 'Move south', symbol: '▼', className: 'col-start-2' },
    { direction: 'right', label: 'Move east', symbol: '▶', className: 'col-start-3' },
  ];

  return (
    <main className="min-h-screen bg-[#10263a] px-3 pb-28 pt-5 text-[#fff5ca]">
      <section className="mx-auto max-w-4xl">
        <p className="font-mono text-xs tracking-[0.2em] text-[#9bd28a]">PLAYABLE WORLD PROTOTYPE · PHASER</p>
        <h1 className="mt-2 font-serif text-4xl font-black tracking-tight sm:text-5xl">Verdant Path</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#cfdfc4]">An original engine-built exploration slice: camera-follow movement, collision, a bridge route choice, authored encounter glades, and landmark navigation.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border-4 border-[#c4aa74] bg-[#172f36] shadow-[0_14px_0_#0c1820,0_26px_45px_rgba(0,0,0,0.42)]">
          <div
        ref={hostRef}
        tabIndex={0}
        role="application"
        aria-label="Verdant Path playable world. Use WASD or arrow keys to explore."
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#ffe9a8]"
        onKeyDown={(event) => {
          // Keep game keys from scrolling or triggering page shortcuts while
          // the world has focus.
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
        }}
      />
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#55755a] bg-[#1a3540] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-sm font-semibold text-[#e8f0c7]">{encounterNotice}</p>
          <p className="sr-only" aria-live="polite">
            World state: {wardenDefeated
              ? 'The Grove Warden is defeated.'
              : 'Objective: defeat the Grove Warden at the moonwell arena.'}{' '}
            {cacheOpenedLabel}
          </p>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {objective && <p className="rounded-md border border-[#d7c071]/60 bg-[#0d2730] px-3 py-1 font-mono text-xs text-[#ffe9a8]" aria-label="Current objective">🎯 {objective}</p>}
            <button type="button" onClick={() => onNavigate('browse')} className="rounded-lg border-2 border-[#e2c477] bg-[#a9523d] px-4 py-2 text-sm font-black text-white shadow-[0_3px_0_#5a2923]">Open legacy battle map</button>
          </div>
        </div>
        <section aria-label="World touch controls" className="mt-5 rounded-2xl border border-[#6d946d] bg-[#0d2730] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-serif text-lg font-black text-[#fff5ca]">Trail compass</p>
              <p className="text-xs text-[#bed7b5]">Press and hold to explore. Keyboard controls still work.</p>
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Move through Verdant Path">
              {controls.map((control) => (
                <button
                  key={control.direction}
                  type="button"
                  aria-label={control.label}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#d7c071] bg-[#31534c] text-lg text-[#fff5ca] shadow-[0_3px_0_#07171c] active:translate-y-[2px] active:shadow-[0_1px_0_#07171c] ${control.className}`}
                  style={{ touchAction: 'none' }}
                  onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); startMove(control.direction); }}
                  onPointerUp={stopMove}
                  onPointerCancel={stopMove}
                  onPointerLeave={stopMove}
                  onKeyDown={(event) => { if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) startMove(control.direction); }}
                  onKeyUp={stopMove}
                >
                  <span aria-hidden="true">{control.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
