const TYPE_GLYPHS = {
  Fire: 'FIR',
  Water: 'WTR',
  Grass: 'GRS',
  Electric: 'ELC',
  Psychic: 'PSY',
  Dragon: 'DRG',
  Fairy: 'FRY',
  Rock: 'RCK',
  Ice: 'ICE',
  Flying: 'FLY',
  Poison: 'PSN',
  Bug: 'BUG',
  Normal: 'NRM',
  Dark: 'DRK',
  Ghost: 'GST',
  Steel: 'STL',
  Fighting: 'FIG',
  Ground: 'GRD',
};

const TYPE_STYLES = {
  Fire: 'bg-orange-500/30 text-orange-100 border-orange-400/40',
  Water: 'bg-blue-500/30 text-blue-100 border-blue-400/40',
  Grass: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40',
  Electric: 'bg-yellow-500/30 text-yellow-100 border-yellow-400/40',
  Psychic: 'bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-400/40',
  Dragon: 'bg-indigo-500/30 text-indigo-100 border-indigo-400/40',
  Fairy: 'bg-pink-500/30 text-pink-100 border-pink-400/40',
  Rock: 'bg-stone-500/30 text-stone-100 border-stone-400/40',
  Ice: 'bg-cyan-500/30 text-cyan-100 border-cyan-400/40',
  Flying: 'bg-sky-500/30 text-sky-100 border-sky-400/40',
  Poison: 'bg-purple-500/30 text-purple-100 border-purple-400/40',
  Bug: 'bg-lime-500/30 text-lime-100 border-lime-400/40',
  Normal: 'bg-gray-500/30 text-gray-100 border-gray-400/40',
  Dark: 'bg-slate-700/40 text-slate-100 border-slate-500/40',
  Ghost: 'bg-violet-500/30 text-violet-100 border-violet-400/40',
  Steel: 'bg-zinc-400/30 text-zinc-100 border-zinc-300/40',
  Fighting: 'bg-red-600/30 text-red-100 border-red-500/40',
  Ground: 'bg-amber-600/30 text-amber-100 border-amber-500/40',
};

export default function TypeBadge({ type, className = '' }) {
  const glyph = TYPE_GLYPHS[type] || TYPE_GLYPHS.Normal;
  const style = TYPE_STYLES[type] || TYPE_STYLES.Normal;
  return (
    <span className={`inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-black tracking-[0.2em] ${style} ${className}`}>
      {glyph}
    </span>
  );
}
