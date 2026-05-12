// src/app/productos/fortiafx/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  LinearScale,
  Tooltip,
  Filler,
} from "chart.js";
import Annotation from "chartjs-plugin-annotation";
import ForexTicker from "@/components/ForexTicker";

Chart.register(LineElement, PointElement, LineController, LinearScale, Tooltip, Filler, Annotation);

/* ── Tipos & constantes ─────────────────────────────────────────── */
type HorizonPoint = { value: number; isConsulted: boolean };

const SCENARIOS = [
  { key: "pesimista", label: "Pesimista", factor: 0.5,  color: "#E24B4A", bw: 2 },
  { key: "base",      label: "Base",      factor: 1.0,  color: "#378ADD", bw: 3.5 },
  { key: "optimista", label: "Optimista", factor: 1.25, color: "#1D9E75", bw: 2 },
] as const;

function getHorizontes(p: number): HorizonPoint[] {
  let vals: number[];
  if (p <= 1) vals = [p, p * 6, p * 12];
  else if (p <= 3) vals = [p, p * 4, p * 8];
  else if (p <= 6) vals = [p, p * 2, p * 6];
  else if (p <= 12) vals = [p, p * 3, p * 5];
  else if (p <= 24) vals = [p, p * 2, p * 3];
  else vals = [p, Math.round(p * 1.5), p * 2];
  return vals.map((v, i) => ({ value: v, isConsulted: i === 0 }));
}

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

const fmtShort = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

/* ══════════════════════════════════════════════════════════════════ */
export default function FortiaFXPage() {
  const [balance, setBalance] = useState(500);
  const [periodos, setPeriodos] = useState(6);
  const [tasa, setTasa] = useState(4);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  const data = useMemo(() => {
    const principal = Math.max(1, balance);
    const totalP = Math.max(1, periodos);
    const rateBase = tasa / 100;
    const horizontes = getHorizontes(totalP);
    const maxP = horizontes[horizontes.length - 1].value;

    const escenarios = SCENARIOS.map((sc) => {
      const rate = rateBase * sc.factor;
      const serie = Array.from({ length: maxP + 1 }, (_, i) => ({
        x: i,
        y: parseFloat((principal * Math.pow(1 + rate, i)).toFixed(2)),
      }));
      const resultados = horizontes.map((h) => {
        const valor = principal * Math.pow(1 + rate, h.value);
        return { ...h, valor, ganancia: valor - principal };
      });
      return { ...sc, rate, serie, resultados };
    });

    return { principal, totalP, rateBase, horizontes, maxP, escenarios };
  }, [balance, periodos, tasa]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const { principal, rateBase, horizontes, maxP, escenarios, totalP } = data;
    const horizonVals = horizontes.map((h) => h.value);

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const tickColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    const ttBg = isDark ? "#1e2024" : "#ffffff";
    const ttBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
    const ttText = isDark ? "#f0f4ff" : "#111111";
    const stepSize = Math.max(1, Math.floor(maxP / 10));

    const datasets = escenarios.map((sc) => ({
      label: sc.label,
      data: sc.serie,
      borderColor: sc.color,
      backgroundColor: "transparent",
      borderWidth: sc.bw,
      tension: 0.35,
      fill: false,
      pointRadius: sc.serie.map((p) =>
        p.x === totalP ? 7 : horizonVals.includes(p.x) ? 5 : 0
      ),
      pointHoverRadius: sc.serie.map((p) =>
        p.x === totalP ? 9 : horizonVals.includes(p.x) ? 7 : 3
      ),
      pointBackgroundColor: sc.serie.map((p) => {
        if (p.x === totalP) return "#BA7517";
        if (horizonVals.includes(p.x)) return "#888780";
        return sc.color;
      }),
      pointBorderColor: sc.serie.map((p) =>
        horizonVals.includes(p.x) ? "#ffffff" : sc.color
      ),
      pointBorderWidth: sc.serie.map((p) =>
        horizonVals.includes(p.x) ? 2 : 0
      ),
    }));

    // ✅ UPDATE si ya existe
    if (chartRef.current) {
      chartRef.current.data.datasets = datasets;
      chartRef.current.update();
      return;
    }

    const annotations: Record<string, object> = {};
    horizontes.forEach((h, i) => {
      annotations[`vline${i}`] = {
        type: "line",
        xMin: h.value,
        xMax: h.value,
        borderColor: h.isConsulted
          ? "rgba(186,117,23,0.65)"
          : "rgba(136,135,128,0.3)",
        borderWidth: h.isConsulted ? 2 : 1,
        borderDash: h.isConsulted ? [6, 4] : [4, 6],
      };
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ttBg,
            borderColor: ttBorder,
            borderWidth: 1,
            titleColor: ttText,
            bodyColor: ttText,
            padding: 12,
            callbacks: {
              title: (items) => {
                const p = items[0].parsed.x;
                const isC = p === totalP;
                const isH = p !== null && horizonVals.includes(p);
                return `Período ${p}${isC ? " ★ consultado" : isH ? " ◆ horizonte" : ""}`;
              },
              label: (item) => {
                const sc = escenarios[item.datasetIndex];
                const rate = (rateBase * sc.factor * 100).toFixed(2);
                return `${sc.label} (${rate}%): ${fmtMoney(item.parsed.y ?? 0)}`;
              },
            },
          },
          
          annotation: { annotations },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: maxP,
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              stepSize,
              callback: (v) => `P.${v}`,
            },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              callback: (v) => fmtShort(Number(v)),
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  const cardValues = SCENARIOS.map((sc) => {
    const rate = data.rateBase * sc.factor;
    const valor = data.principal * Math.pow(1 + rate, data.totalP);
    return { ...sc, valor, ganancia: valor - data.principal, rate };
  });

  return (
    <main className="compound-page">

      {/* HERO */}
      <section className="compound-hero">
        <div className="section-inner">
          <div className="section-label">— Simulación educativa</div>
          <h1 className="compound-title">Calculadora de interés compuesto</h1>
          <p className="compound-subtitle">
            Proyecta el crecimiento de tu capital en múltiples horizontes y
            compara escenarios&nbsp;
            <span className="tag tag-red">pesimista</span>,&nbsp;
            <span className="tag tag-blue">base</span>&nbsp;y&nbsp;
            <span className="tag tag-green">optimista</span> automáticamente.
          </p>
        </div>

        <div className="ticker">
                  <ForexTicker />
                </div>
        
      </section>

      {/* LAYOUT */}
      <section className="compound-layout">
        <div className="section-inner compound-grid">

          {/* FORM */}
          <div className="compound-card form-card">
            <h2 className="card-title">Configura tu simulación</h2>

            <label className="field">
              <span>Balance inicial (USD)</span>
              <input type="number" min="1" value={balance}
                onChange={(e) => setBalance(Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Períodos consultados</span>
              <input type="number" min="1" max="120" value={periodos}
                onChange={(e) => setPeriodos(Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Tasa base por período (%)</span>
              <div className="input-slider-wrap">
                <input type="range" min="0.5" max="30" step="0.5" value={tasa}
                  onChange={(e) => setTasa(Number(e.target.value))} />
                <input type="number" step="0.1" min="0.1" value={tasa}
                  onChange={(e) => setTasa(Number(e.target.value))} />
              </div>
            </label>

            <div className="scenarios-info">
              <p className="si-title">Escenarios automáticos</p>
              {SCENARIOS.map((sc) => (
                <div key={sc.key} className="si-row">
                  <span className="si-dot" style={{ background: sc.color }} />
                  <span className="si-label">{sc.label}</span>
                  <span className="si-rate" style={{ color: sc.color }}>
                    {(tasa * sc.factor).toFixed(2)}% / período
                  </span>
                </div>
              ))}
            </div>

            <div className="formula-box">
              <strong>Fórmula</strong>
              <p>VF = BI × (1 + g)<sup>p</sup></p>
              <small>BI = balance inicial · g = tasa · p = períodos</small>
            </div>
          </div>

          {/* RESULTADOS */}
          <div className="compound-card results-card">
            <h2 className="card-title">Proyecciones al período {data.totalP}</h2>

            {/* Tarjetas escenario */}
            <div className="scenario-cards">
              {cardValues.map((cv) => (
                <div key={cv.key} className={`sc-card sc-${cv.key}`}>
                  <span className="sc-label">{cv.label}</span>
                  <strong className="sc-value" style={{ color: cv.color }}>
                    {fmtMoney(cv.valor)}
                  </strong>
                  <small className="sc-gain">+{fmtMoney(cv.ganancia)}</small>
                  <span className="sc-rate" style={{ color: cv.color }}>
                    {(cv.rate * 100).toFixed(2)}%/per
                  </span>
                </div>
              ))}
            </div>

            {/* GRÁFICO */}
            <div className="chart-wrap">
              <div className="chart-legend">
                {SCENARIOS.map((sc) => (
                  <span key={sc.key} className="legend-item">
                    <i style={{
                      display: "inline-block",
                      width: 24, height: sc.key === "base" ? 4 : 3,
                      background: sc.color, borderRadius: 2, verticalAlign: "middle",
                    }} />
                    {sc.label}
                  </span>
                ))}
                <span className="legend-item">
                  <i style={{
                    display: "inline-block", width: 10, height: 10,
                    background: "#BA7517", borderRadius: "50%", verticalAlign: "middle",
                  }} />
                  Período consultado
                </span>
                <span className="legend-item">
                  <i style={{
                    display: "inline-block", width: 10, height: 10,
                    background: "#888780", borderRadius: "50%", verticalAlign: "middle", opacity: 0.6,
                  }} />
                  Horizontes
                </span>
              </div>

              <div style={{ position: "relative", width: "100%", height: 380 }}>
                <canvas ref={canvasRef} />
              </div>
            </div>

            {/* Tarjetas de horizonte */}
            <div className="horizons-row">
              {data.horizontes.map((h) => {
                const valor   = data.principal * Math.pow(1 + data.rateBase, h.value);
                const ganancia = valor - data.principal;
                return (
                  <div key={h.value} className={`horizon-pill ${h.isConsulted ? "horizon-active" : ""}`}>
                    <span className="hp-period">
                      {h.isConsulted ? "★ " : ""}Período {h.value}
                      {h.isConsulted ? " — consultado" : ""}
                    </span>
                    <strong className="hp-value">{fmtMoney(valor)}</strong>
                    <small className="hp-gain">+{fmtMoney(ganancia)} base</small>
                  </div>
                );
              })}
            </div>

            <p className="disclaimer">
              Simulación educativa. No garantiza rendimientos futuros.
              Pesimista = tasa×0.5 · Base = tasa exacta · Optimista = tasa×2.
            </p>

          
          </div>

        </div>

              
      </section>

      <style jsx>{`
        .compound-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 20%, rgba(59,130,246,0.09), transparent 35%),
            radial-gradient(circle at 85% 80%, rgba(52,211,153,0.07), transparent 30%),
            #04060a;
          color: #f0f4ff;
          font-family: 'Syne', system-ui, sans-serif;
        }
        .section-inner { width: min(1220px, calc(100% - 32px)); margin: 0 auto; }

        .compound-hero { padding: 100px 0 32px; }
        .section-label {
          font-family: 'Space Mono', monospace;
          color: #60a5fa; font-size: 0.78rem;
          letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 14px;
        }
        .compound-title {
          font-size: clamp(2.2rem, 5vw, 4rem);
          font-weight: 800; letter-spacing: -0.04em; line-height: 1; margin: 0 0 18px;
        }
        .compound-subtitle { max-width: 64ch; color: rgba(240,244,255,0.68); line-height: 1.8; font-size: 1rem; }
        .tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 0.88em; font-weight: 700; }
        .tag-red   { background: rgba(226,75,74,0.15);  color: #f87171; }
        .tag-blue  { background: rgba(55,138,221,0.15); color: #60a5fa; }
        .tag-green { background: rgba(29,158,117,0.15); color: #34d399; }

        .compound-layout { padding: 20px 0 100px; }
        .compound-grid {
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          gap: 20px; align-items: start;
        }
        .compound-card {
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
          backdrop-filter: blur(16px);
          padding: 26px;
        }
        .card-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 20px; letter-spacing: -0.02em; }

        .field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .field span { font-size: 0.83rem; font-weight: 600; color: rgba(240,244,255,0.7); }
        .field input[type="number"] {
          width: 100%; height: 46px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04); color: #f0f4ff;
          padding: 0 14px; font-size: 1rem; outline: none;
          font-family: 'Space Mono', monospace;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field input[type="number"]:focus {
          border-color: rgba(55,138,221,0.5);
          box-shadow: 0 0 0 3px rgba(55,138,221,0.12);
        }
        .input-slider-wrap { display: flex; align-items: center; gap: 10px; }
        .input-slider-wrap input[type="range"] { flex: 1; accent-color: #378ADD; cursor: pointer; }
        .input-slider-wrap input[type="number"] {
          width: 72px; height: 40px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04); color: #f0f4ff;
          padding: 0 10px; font-family: 'Space Mono', monospace; font-size: 0.9rem; outline: none;
        }

        .scenarios-info {
          margin: 6px 0 18px; padding: 14px; border-radius: 12px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        }
        .si-title {
          font-size: 0.72rem; font-family: 'Space Mono', monospace;
          color: rgba(255,255,255,0.4); letter-spacing: 0.1em;
          text-transform: uppercase; margin-bottom: 10px;
        }
        .si-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .si-row:last-child { border-bottom: none; }
        .si-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .si-label { font-size: 0.85rem; color: rgba(255,255,255,0.7); flex: 1; }
        .si-rate { font-family: 'Space Mono', monospace; font-size: 0.78rem; font-weight: 700; }

        .formula-box { padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .formula-box strong { display: block; font-size: 0.72rem; font-family: 'Space Mono', monospace; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 7px; }
        .formula-box p { font-family: 'Space Mono', monospace; font-size: 1.05rem; color: #f0f4ff; font-weight: 700; margin-bottom: 5px; }
        .formula-box small { color: rgba(255,255,255,0.5); font-size: 0.8rem; line-height: 1.6; }

        .scenario-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 22px; }
        .sc-card { padding: 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 3px; }
        .sc-base { border-color: rgba(55,138,221,0.2); background: rgba(55,138,221,0.05); }
        .sc-label { font-size: 0.75rem; color: rgba(255,255,255,0.55); font-family: 'Space Mono', monospace; letter-spacing: 0.04em; }
        .sc-value { font-family: 'Space Mono', monospace; font-size: clamp(0.85rem, 1.5vw, 1.05rem); font-weight: 700; line-height: 1.2; }
        .sc-gain  { font-size: 0.72rem; color: rgba(255,255,255,0.45); font-family: 'Space Mono', monospace; }
        .sc-rate  { font-size: 0.72rem; font-family: 'Space Mono', monospace; font-weight: 700; margin-top: 3px; }

        .chart-wrap { padding: 16px; border-radius: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 18px; }
        .chart-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 12px; }
        .legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; color: rgba(255,255,255,0.6); font-family: 'Space Mono', monospace; }

        .horizons-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
        .horizon-pill { flex: 1; min-width: 130px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; gap: 3px; }
        .horizon-active { border-color: rgba(186,117,23,0.35); background: rgba(186,117,23,0.05); }
        .hp-period { font-size: 0.72rem; font-family: 'Space Mono', monospace; color: rgba(255,255,255,0.5); }
        .horizon-active .hp-period { color: #BA7517; font-weight: 700; }
        .hp-value { font-family: 'Space Mono', monospace; font-size: 0.95rem; font-weight: 700; color: #f0f4ff; }
        .hp-gain  { font-size: 0.72rem; color: rgba(255,255,255,0.45); font-family: 'Space Mono', monospace; }

        .disclaimer { font-size: 0.8rem; color: rgba(255,255,255,0.45); line-height: 1.7; margin-bottom: 18px; }
        .hero-ctas { display: flex; flex-wrap: wrap; gap: 10px; }
        .btn-primary, .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 46px; padding: 0 20px; border-radius: 10px;
          font-weight: 700; font-size: 0.88rem;
          font-family: 'Syne', system-ui, sans-serif;
          text-decoration: none; transition: all 0.2s;
        }
        .btn-primary { background: #3b82f6; color: #fff; box-shadow: 0 0 18px rgba(59,130,246,0.3); }
        .btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-secondary { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.75); }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.2); color: #fff; }

        @media (max-width: 960px) { .compound-grid { grid-template-columns: 1fr; } }
        @media (max-width: 600px) {
          .compound-hero { padding-top: 80px; }
          .compound-card { padding: 18px; }
          .scenario-cards { grid-template-columns: 1fr; }
          .horizons-row { flex-direction: column; }
        }
      `}</style>
    </main>
  );
}
