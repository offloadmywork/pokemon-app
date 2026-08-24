import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import VerdantPathScene from '@/engine/VerdantPathScene';

export default function AdventureWorld({ onNavigate, onEncounter }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [encounterNotice, setEncounterNotice] = useState('Explore the glades. Wild traces stir in the tall grass.');

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;
    const game = new Phaser.Game({
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
      onEncounter?.();
    };
    game.registry.events.on('verdant-encounter', handleEncounter);
    gameRef.current = game;
    return () => {
      game.registry.events.off('verdant-encounter', handleEncounter);
      game.destroy(true);
      gameRef.current = null;
    };
  }, [onEncounter]);

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
          <div ref={hostRef} aria-label="Verdant Path playable world. Use WASD or arrow keys to explore." />
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#55755a] bg-[#1a3540] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-sm font-semibold text-[#e8f0c7]">{encounterNotice}</p>
          <button type="button" onClick={() => onNavigate('browse')} className="rounded-lg border-2 border-[#e2c477] bg-[#a9523d] px-4 py-2 text-sm font-black text-white shadow-[0_3px_0_#5a2923]">Open legacy battle map</button>
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
