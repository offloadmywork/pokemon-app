import { useCallback } from "react";
import { Gamepad2 } from "lucide-react";

// Big, kid-friendly directional pad
export default function DPad({ onMove }) {
  const handleMove = useCallback((dir) => {
    if (onMove) onMove(dir);
  }, [onMove]);

  const btnBase = {
    width: '64px',
    height: '64px',
    fontSize: '28px',
    fontWeight: 'bold',
    border: '3px solid rgba(255,255,255,0.3)',
    borderRadius: '16px',
    background: 'rgba(0,0,0,0.45)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    backdropFilter: 'blur(4px)',
    transition: 'transform 0.1s, background 0.1s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 40,
        display: 'grid',
        gridTemplateColumns: '64px 64px 64px',
        gridTemplateRows: '64px 64px 64px',
        gap: '4px',
        pointerEvents: 'auto',
      }}
    >
      {/* Row 1: empty, UP, empty */}
      <div />
      <button
        style={btnBase}
        onPointerDown={(e) => { e.preventDefault(); handleMove('up'); }}
        aria-label="Move up"
      >
        ▲
      </button>
      <div />

      {/* Row 2: LEFT, center, RIGHT */}
      <button
        style={btnBase}
        onPointerDown={(e) => { e.preventDefault(); handleMove('left'); }}
        aria-label="Move left"
      >
        ◄
      </button>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}
      >
        <Gamepad2 className="w-7 h-7" />
      </div>
      <button
        style={btnBase}
        onPointerDown={(e) => { e.preventDefault(); handleMove('right'); }}
        aria-label="Move right"
      >
        ►
      </button>

      {/* Row 3: empty, DOWN, empty */}
      <div />
      <button
        style={btnBase}
        onPointerDown={(e) => { e.preventDefault(); handleMove('down'); }}
        aria-label="Move down"
      >
        ▼
      </button>
      <div />
    </div>
  );
}
