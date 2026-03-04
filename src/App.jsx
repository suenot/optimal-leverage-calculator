import { useState, useMemo } from "react";

const C = {
  bg: "#0a0e17",
  card: "#111827",
  border: "#1e293b",
  accent: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  text: "#e2e8f0",
  dim: "#94a3b8",
  muted: "#64748b",
};

function kellyLev(wr, W, L) {
  if (W <= 0 || L <= 0) return 0;
  return Math.max(0, (wr * W - (1 - wr) * L) / (W * L));
}

function geoExp(wr, W, L, lev) {
  const wl = W * lev,
    ll = L * lev;
  if (ll >= 1) return -1;
  return Math.pow(1 + wl, wr) * Math.pow(1 - ll, 1 - wr) - 1;
}

function vDrag(dv, lev, days = 252) {
  return -0.5 * Math.pow(lev * dv, 2) * days;
}

function recov(pct) {
  return pct >= 100 ? Infinity : (pct / (100 - pct)) * 100;
}

function Slider({ label, value, onChange, min, max, step, unit = "", color = C.accent, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ color: C.dim, fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>
          {step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", color, height: 6, cursor: "pointer" }}
      />
      {hint && (
        <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

function Metric({ title, val, unit, color, sub }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "16px 12px",
        textAlign: "center",
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          color: C.muted,
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color,
          fontSize: 24,
          fontWeight: 800,
          fontFamily: "monospace",
          lineHeight: 1.1,
        }}
      >
        {val}
        <span style={{ fontSize: 12, fontWeight: 500 }}>{unit}</span>
      </div>
      {sub && (
        <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function Bar({ name, value, color, maxV, best, tag }) {
  const pct = maxV > 0 ? Math.min((value / maxV) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
            {name}
          </span>
          {tag && (
            <span
              style={{
                background: color + "22",
                color,
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {tag}
            </span>
          )}
          {best && (
            <span
              style={{
                background: C.green + "22",
                color: C.green,
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              BINDING
            </span>
          )}
        </div>
        <span
          style={{
            color,
            fontSize: 16,
            fontWeight: 800,
            fontFamily: "monospace",
          }}
        >
          {value === Infinity ? "\u221E" : value.toFixed(2)}x
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: C.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}

function Chart({ data, color, label, optX }) {
  if (!data?.length) return null;
  const w = 300, h = 130;
  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const maxX = Math.max(...data.map((d) => d.x));
  const rng = maxY - minY || 1;
  const p = 8,
    ch = h - 32;
  const pts = data
    .map(
      (d, i) =>
        `${p + (i / (data.length - 1)) * (w - p * 2)},${16 + ch - ((d.y - minY) / rng) * ch}`
    )
    .join(" ");
  const zY =
    minY < 0 && maxY > 0
      ? 16 + ch - ((0 - minY) / rng) * ch
      : null;
  const optPx = optX !== undefined && maxX > 0
    ? p + (optX / maxX) * (w - p * 2)
    : null;
  return (
    <div>
      {label && (
        <div
          style={{
            color: C.dim,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        {zY && (
          <line
            x1={p}
            y1={zY}
            x2={w - p}
            y2={zY}
            stroke={C.muted}
            strokeDasharray="4 3"
            strokeWidth={1}
            opacity={0.4}
          />
        )}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          points={pts}
          strokeLinejoin="round"
        />
        {optPx && (
          <line
            x1={optPx}
            y1={16}
            x2={optPx}
            y2={16 + ch}
            stroke={C.accent}
            strokeDasharray="3 3"
            strokeWidth={1}
            opacity={0.6}
          />
        )}
        <text x={p} y={12} fill={C.muted} fontSize={9}>
          {maxY.toFixed(1)}%
        </text>
        <text x={p} y={h - 2} fill={C.muted} fontSize={9}>
          {minY.toFixed(1)}%
        </text>
        <text x={w - p} y={h - 2} fill={C.muted} fontSize={9} textAnchor="end">
          {maxX.toFixed(1)}x
        </text>
      </svg>
    </div>
  );
}

function LeverageTable({ opt }) {
  const rows = [1, 2, 3, 5, 10, 20, 50, 100, 125];
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          fontFamily: "monospace",
        }}
      >
        <thead>
          <tr>
            {["Leverage", "Liquidation", "Drag \u00D7", "DD @-5%", "DD @-10%"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    color: C.muted,
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    padding: "6px 8px",
                    textAlign: "right",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const liq = (100 / l).toFixed(1);
            const drag = l * l;
            const dd5 = l * 5;
            const dd10 = l * 10;
            const isOpt = Math.abs(l - opt) < 0.5;
            const rowBg = isOpt ? C.accent + "15" : "transparent";
            return (
              <tr key={l} style={{ background: rowBg }}>
                <td
                  style={{
                    padding: "5px 8px",
                    textAlign: "right",
                    color: isOpt ? C.accent : C.text,
                    fontWeight: isOpt ? 700 : 400,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {l}×
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    textAlign: "right",
                    color: C.dim,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  -{liq}%
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    textAlign: "right",
                    color: drag > 100 ? C.red : drag > 25 ? C.orange : C.dim,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {drag}×
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    textAlign: "right",
                    color: dd5 >= 100 ? C.red : dd5 > 30 ? C.orange : C.dim,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {dd5 >= 100 ? "LIQD" : dd5 + "%"}
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    textAlign: "right",
                    color: dd10 >= 100 ? C.red : dd10 > 30 ? C.orange : C.dim,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {dd10 >= 100 ? "LIQD" : dd10 + "%"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MaxDDTable() {
  const dds = [5, 10, 20, 30, 50];
  const vars = [
    { label: "Crypto", sublabel: "VaR=8%", v: 0.08, color: C.orange },
    { label: "Stocks", sublabel: "VaR=3%", v: 0.03, color: C.accent },
    { label: "Forex", sublabel: "VaR=1%", v: 0.01, color: C.green },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          fontFamily: "monospace",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                color: C.muted,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                padding: "6px 8px",
                textAlign: "left",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              Max DD
            </th>
            {vars.map((v) => (
              <th
                key={v.label}
                style={{
                  color: v.color,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "6px 8px",
                  textAlign: "right",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {v.label}
                <br />
                <span style={{ color: C.muted, fontSize: 9 }}>{v.sublabel}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dds.map((dd) => (
            <tr key={dd}>
              <td
                style={{
                  padding: "5px 8px",
                  color: C.text,
                  fontWeight: 600,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {dd}%
              </td>
              {vars.map((v) => {
                const lev = (dd / 100) / v.v;
                return (
                  <td
                    key={v.label}
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      color: lev < 1 ? C.red : lev < 3 ? C.orange : v.color,
                      fontWeight: 600,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {lev.toFixed(1)}×
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          color: C.dim,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [wr, setWr] = useState(45);
  const [aW, setAW] = useState(3.0);
  const [aL, setAL] = useState(1.5);
  const [dv, setDv] = useState(4.0);
  const [mdd, setMdd] = useState(20);
  const [tv, setTv] = useState(25);
  const [kf, setKf] = useState(0.5);
  const [exMax, setExMax] = useState(20);
  const [tab, setTab] = useState("calc");

  const R = useMemo(() => {
    const w = wr / 100,
      W = aW / 100,
      L = aL / 100,
      d = dv / 100;
    const annVol = d * Math.sqrt(252);
    const var99 = d * 2.326;

    const fk = kellyLev(w, W, L);
    const frac = fk * kf;
    const ddL = var99 > 0 ? mdd / 100 / var99 : Infinity;
    const vtL = annVol > 0 ? tv / 100 / annVol : Infinity;

    const methods = [
      {
        name: `Kelly \u00D7${kf}`,
        value: frac,
        color: C.accent,
        tag: `full: ${fk.toFixed(2)}x`,
      },
      {
        name: "Drawdown Limit",
        value: ddL,
        color: C.orange,
        tag: `DD: ${mdd}%`,
      },
      {
        name: "Vol Targeting",
        value: vtL,
        color: C.purple,
        tag: `\u03C3: ${tv}%`,
      },
      {
        name: "Exchange Max",
        value: exMax,
        color: C.muted,
        tag: "hard cap",
      },
    ];

    const fin = methods
      .filter((m) => isFinite(m.value) && m.value > 0)
      .map((m) => m.value);
    const opt = fin.length > 0 ? Math.min(...fin) : 1;
    methods.forEach((m) => {
      m.best = isFinite(m.value) && Math.abs(m.value - opt) < 0.001;
    });

    const maxLev = Math.min(Math.max(opt * 3, fk * 1.5, 5), 50);
    const gC = [],
      dC = [];
    for (let i = 0; i <= 80; i++) {
      const l = (i / 80) * maxLev;
      gC.push({ x: l, y: geoExp(w, W, L, Math.max(l, 0.01)) * 100 });
      dC.push({ x: l, y: vDrag(d, Math.max(l, 0.01)) * 100 });
    }

    const ge = geoExp(w, W, L, opt);
    const dr = vDrag(d, opt);
    const ml = opt * L * 100;

    return { methods, opt, fk, gC, dC, ge, dr, ml, annVol: annVol * 100 };
  }, [wr, aW, aL, dv, mdd, tv, kf, exMax]);

  const tabs = [
    { id: "calc", label: "Calculator" },
    { id: "tables", label: "Tables" },
    { id: "formulas", label: "Formulas" },
  ];

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        padding: "20px 12px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <a
            href="https://marketmaker.cc"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.accent,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
              display: "block",
              textDecoration: "none",
            }}
          >
            Marketmaker.cc
          </a>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "4px 0",
              background: `linear-gradient(135deg, ${C.text}, ${C.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Optimal Leverage Calculator
          </h1>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
            Kelly &middot; Drawdown &middot; Vol-Targeting &middot; Exchange &rarr; min()
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            background: C.card,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: 8,
                background: tab === t.id ? C.accent + "22" : "transparent",
                color: tab === t.id ? C.accent : C.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Optimal Leverage Hero */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.accent}15, ${C.green}10)`,
            border: `1px solid ${C.accent}33`,
            borderRadius: 16,
            padding: "20px 16px",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: C.dim,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Recommended Leverage
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              fontFamily: "monospace",
              color: C.accent,
              lineHeight: 1.2,
            }}
          >
            {R.opt.toFixed(2)}
            <span style={{ fontSize: 20 }}>x</span>
          </div>
          <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>
            = min(
            {R.methods.map((m, i) => (
              <span key={m.name}>
                {i > 0 && ", "}
                <span style={{ color: m.best ? C.green : C.muted }}>
                  {m.value === Infinity ? "\u221E" : m.value.toFixed(2)}
                </span>
              </span>
            ))}
            )
          </div>
        </div>

        {tab === "calc" && (
          <>
            {/* Metrics */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <Metric
                title="Geo Exp/Trade"
                val={(R.ge * 100).toFixed(3)}
                unit="%"
                color={R.ge >= 0 ? C.green : C.red}
                sub="geometric expectation"
              />
              <Metric
                title="Vol Drag"
                val={(R.dr * 100).toFixed(1)}
                unit="% /yr"
                color={C.orange}
                sub="annual drag loss"
              />
              <Metric
                title="Max Loss/Trade"
                val={R.ml.toFixed(1)}
                unit="%"
                color={R.ml > 25 ? C.red : R.ml > 10 ? C.orange : C.green}
                sub={`recovery: +${recov(Math.min(R.ml, 99)).toFixed(0)}%`}
              />
            </div>

            {/* Methods */}
            <Section title="4 Methods → min()" icon="🎯">
              {R.methods.map((m) => (
                <Bar
                  key={m.name}
                  name={m.name}
                  value={m.value}
                  color={m.color}
                  maxV={Math.max(
                    ...R.methods
                      .filter((x) => isFinite(x.value))
                      .map((x) => x.value),
                    1
                  )}
                  best={m.best}
                  tag={m.tag}
                />
              ))}
            </Section>

            {/* Charts */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 12,
                  flex: 1,
                  minWidth: 280,
                }}
              >
                <Chart
                  data={R.gC}
                  color={C.green}
                  label="Geometric Expectation vs Leverage"
                  optX={R.opt}
                />
              </div>
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 12,
                  flex: 1,
                  minWidth: 280,
                }}
              >
                <Chart
                  data={R.dC}
                  color={C.red}
                  label="Volatility Drag vs Leverage"
                  optX={R.opt}
                />
              </div>
            </div>

            {/* Strategy inputs */}
            <Section title="Strategy Parameters" icon="📊">
              <Slider
                label="Win Rate"
                value={wr}
                onChange={setWr}
                min={10}
                max={90}
                step={1}
                unit="%"
                color={C.green}
                hint="Percentage of winning trades"
              />
              <Slider
                label="Avg Win"
                value={aW}
                onChange={setAW}
                min={0.1}
                max={20}
                step={0.1}
                unit="%"
                color={C.green}
                hint="Average profit per winning trade"
              />
              <Slider
                label="Avg Loss"
                value={aL}
                onChange={setAL}
                min={0.1}
                max={20}
                step={0.1}
                unit="%"
                color={C.red}
                hint="Average loss per losing trade"
              />
            </Section>

            {/* Risk inputs */}
            <Section title="Risk Parameters" icon="🛡️">
              <Slider
                label="Daily Volatility"
                value={dv}
                onChange={setDv}
                min={0.5}
                max={15}
                step={0.1}
                unit="%"
                color={C.orange}
                hint="BTC ~4%, ETH ~5%, alts ~8-12%, forex ~0.5-1%"
              />
              <Slider
                label="Max Drawdown"
                value={mdd}
                onChange={setMdd}
                min={5}
                max={50}
                step={1}
                unit="%"
                color={C.red}
                hint="Maximum acceptable drawdown"
              />
              <Slider
                label="Target Annual Vol"
                value={tv}
                onChange={setTv}
                min={5}
                max={100}
                step={1}
                unit="%"
                color={C.purple}
                hint="Target portfolio volatility (annual)"
              />
            </Section>

            {/* Constraints */}
            <Section title="Constraints" icon="⚙️">
              <Slider
                label="Kelly Fraction"
                value={kf}
                onChange={setKf}
                min={0.1}
                max={1.0}
                step={0.05}
                unit=""
                color={C.accent}
                hint="0.5 = half Kelly (recommended)"
              />
              <Slider
                label="Exchange Max Leverage"
                value={exMax}
                onChange={setExMax}
                min={1}
                max={125}
                step={1}
                unit="x"
                color={C.muted}
                hint="Maximum leverage allowed by exchange"
              />
            </Section>
          </>
        )}

        {tab === "tables" && (
          <>
            <Section title="Leverage, Liquidation & Volatility Drag" icon="📉">
              <LeverageTable opt={R.opt} />
            </Section>

            <Section title="Max Leverage by Target Drawdown" icon="🛡️">
              <MaxDDTable />
              <div style={{ color: C.dim, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                Formula: <code style={{ color: C.accent }}>L_max = D_max / VaR</code>
                <br />
                {"VaR(99%) \u2248 2.326 \u00D7 daily_vol (assuming normal distribution)"}
              </div>
            </Section>
          </>
        )}

        {tab === "formulas" && (
          <>
            <Section title="Core Formulas" icon="📐">
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: C.dim,
                  lineHeight: 2.2,
                }}
              >
                <div>
                  <span style={{ color: C.accent, fontWeight: 700 }}>Kelly Leverage:</span>
                </div>
                <div style={{ paddingLeft: 16, color: C.text }}>
                  {"L* = (p\u00B7W - (1-p)\u00B7L) / (W\u00B7L)"}
                </div>
                <div style={{ paddingLeft: 16, color: C.muted, fontSize: 11 }}>
                  Maximizes geometric growth rate
                </div>

                <div style={{ marginTop: 12 }}>
                  <span style={{ color: C.orange, fontWeight: 700 }}>Drawdown Limit:</span>
                </div>
                <div style={{ paddingLeft: 16, color: C.text }}>
                  L_max = D_max / VaR(99%)
                </div>
                <div style={{ paddingLeft: 16, color: C.muted, fontSize: 11 }}>
                  {"VaR(99%) \u2248 2.326 \u00D7 \u03C3_daily"}
                </div>

                <div style={{ marginTop: 12 }}>
                  <span style={{ color: C.purple, fontWeight: 700 }}>Vol Targeting:</span>
                </div>
                <div style={{ paddingLeft: 16, color: C.text }}>
                  {"L = \u03C3_target / \u03C3_annual"}
                </div>
                <div style={{ paddingLeft: 16, color: C.muted, fontSize: 11 }}>
                  {"\u03C3_annual = \u03C3_daily \u00D7 \u221A252"}
                </div>

                <div style={{ marginTop: 12 }}>
                  <span style={{ color: C.red, fontWeight: 700 }}>Volatility Drag:</span>
                </div>
                <div style={{ paddingLeft: 16, color: C.text }}>
                  {"drag = -\u00BD \u00D7 (L\u00B7\u03C3)\u00B2 \u00D7 days"}
                </div>
                <div style={{ paddingLeft: 16, color: C.muted, fontSize: 11 }}>
                  {"Drag scales with L\u00B2, not L"}
                </div>

                <div style={{ marginTop: 12 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>Geometric Expectation:</span>
                </div>
                <div style={{ paddingLeft: 16, color: C.text }}>
                  {"E_geo = (1+W\u00B7L)^p \u00D7 (1-L\u00B7L)^(1-p) - 1"}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: `1px solid ${C.border}`,
                    color: C.text,
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {"L_optimal = min(Kelly\u00D7f, DD, Vol, Exchange)"}
                </div>
              </div>
            </Section>

            <Section title="Why min()?" icon="🤔">
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>
                <p>
                  Each method provides a different upper bound on leverage.
                  Taking the minimum ensures all constraints are respected simultaneously:
                </p>
                <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                  <li style={{ marginBottom: 6 }}>
                    <span style={{ color: C.accent }}>Kelly</span> maximizes
                    long-term geometric growth but assumes perfect knowledge
                    of edge and volatility
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <span style={{ color: C.orange }}>Drawdown limit</span>{" "}
                    ensures survival — you never risk more than you can recover from
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <span style={{ color: C.purple }}>Vol targeting</span>{" "}
                    keeps portfolio volatility stable regardless of market regime
                  </li>
                  <li>
                    <span style={{ color: C.muted }}>Exchange limit</span> is
                    the hard technical cap
                  </li>
                </ul>
                <p style={{ marginTop: 10, color: C.text, fontWeight: 600 }}>
                  In practice, the drawdown constraint is usually the binding one.
                </p>
              </div>
            </Section>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            color: C.muted,
            fontSize: 10,
            padding: "12px 0 20px",
            lineHeight: 1.8,
          }}
        >
          <a
            href="https://marketmaker.cc/en/blog/post/loss-profit-asymmetry"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.accent, textDecoration: "none" }}
          >
            Read the full article: Loss-Profit Asymmetry
          </a>
          <br />
          Marketmaker.cc &middot; Not financial advice
        </div>
      </div>
    </div>
  );
}
