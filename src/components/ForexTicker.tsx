// components/ForexTicker.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ── Tipos ───────────────────────────────────────────────────────── */
type TickerItem = {
  pair: string;
  price: string;
  direction: "up" | "down" | "neutral";
  change: string;
};

type ApiResponse = {
  prices: Record<string, {
    price: string;
    direction: "up" | "down" | "neutral";
    change: string;
  }>;
  timestamp: number;
  fallback?: boolean;
};

/* ── Config ──────────────────────────────────────────────────────── */
const REFRESH_INTERVAL = 30_000; // 30 segundos
const PAIR_ORDER = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD",
  "USD/CAD", "NZD/USD", "USD/CHF", "XAU/USD",
];

/* ── Helpers ─────────────────────────────────────────────────────── */
const directionArrow = (d: TickerItem["direction"]) =>
  d === "up" ? "▲" : d === "down" ? "▼" : "●";

const directionClass = (d: TickerItem["direction"]) =>
  d === "up" ? "tick-up" : d === "down" ? "tick-down" : "tick-neutral";

/* ══════════════════════════════════════════════════════════════════
  COMPONENTE
══════════════════════════════════════════════════════════════════ */
export default function ForexTicker() {
  const [items, setItems]     = useState<TickerItem[]>([]);
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch ── */
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/forex", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ApiResponse = await res.json();

      const ordered = PAIR_ORDER
        .filter((p) => data.prices[p])
        .map((pair) => ({
          pair,
          price:     data.prices[pair].price,
          direction: data.prices[pair].direction,
          change:    data.prices[pair].change,
        }));

      setItems(ordered);
      setError(false);
    } catch (e) {
      console.warn("[ForexTicker] fetch failed:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPrices]);

  /* ── Duplicar items para el loop infinito del ticker ── */
  const loopItems = [...items, ...items];

  return (
    <div className="forex-ticker" aria-label="Precios forex en tiempo real">

      {/* Estado de carga */}
      {loading && (
        <div className="ticker-loading">
          <span className="ticker-dot-anim" />
          Cargando precios…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="ticker-error">
          ⚠ Precios no disponibles · reintentando…
        </div>
      )}

      {/* Ticker activo */}
      {!loading && !error && items.length > 0 && (
        <div className="ticker-overflow">
          <div className="ticker-track" style={{ "--items": items.length } as React.CSSProperties}>
            {loopItems.map((item, i) => (
              <span key={`${item.pair}-${i}`} className={`tick ${directionClass(item.direction)}`}>
                <span className="tick-pair">{item.pair}</span>
                <span className="tick-arrow">{directionArrow(item.direction)}</span>
                <span className="tick-price">{item.price}</span>
                {item.change !== "0.00000" && item.change !== "0.000" && (
                  <span className="tick-change">({item.change})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .forex-ticker {
          position: absolute;
          top: var(--nav-h);
          left: 0;
          right: 0;
          height: 36px;
          border-bottom: 1px solid var(--border);
          background: rgba(4, 6, 8, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          overflow: hidden;
          z-index: 10;
        }

        /* Loading */
        .ticker-loading,
        .ticker-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 1.5rem;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          letter-spacing: 0.06em;
        }
        .ticker-loading { color: var(--text-dim); }
        .ticker-error   { color: #ef4444; }

        .ticker-dot-anim {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--blue);
          animation: pulse-dot 1.2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }

        /* Track */
        .ticker-overflow {
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .ticker-track {
          display: flex;
          gap: 2.5rem;
          white-space: nowrap;
          padding: 0 1.5rem;
          /* Duración dinámica: más items → más lento para velocidad constante */
          animation: ticker-move calc(var(--items, 8) * 4s) linear infinite;
          will-change: transform;
        }

        @keyframes ticker-move {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Items */
        .tick {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          letter-spacing: 0.04em;
        }

        .tick-pair {
          color: var(--text-secondary);
          font-weight: 700;
        }

        .tick-arrow { font-size: 0.6rem; }
        .tick-price { font-weight: 700; }
        .tick-change {
          font-size: 0.62rem;
          opacity: 0.7;
        }

        /* Colores */
        .tick-up      { color: #22c55e; }
        .tick-down    { color: #ef4444; }
        .tick-neutral { color: var(--text-secondary); }

        /* Pausa al hover */
        .ticker-overflow:hover .ticker-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
