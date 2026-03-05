/**
 * Pure calculation functions for the Optimal Leverage Calculator.
 * Extracted from App.jsx for testability.
 */

/**
 * Kelly Criterion leverage.
 * L* = (p·W - (1-p)·L) / (W·L)
 * @param {number} wr - win rate (decimal, 0-1)
 * @param {number} W  - average win (decimal, e.g. 0.03 = 3%)
 * @param {number} L  - average loss (decimal, e.g. 0.015 = 1.5%)
 */
export function kellyLev(wr, W, L) {
  if (W <= 0 || L <= 0) return 0;
  return Math.max(0, (wr * W - (1 - wr) * L) / (W * L));
}

/**
 * Geometric expectation per trade at given leverage.
 * E_geo = (1 + W·lev)^p × (1 - L·lev)^(1-p) - 1
 * @param {number} wr  - win rate (decimal)
 * @param {number} W   - average win (decimal)
 * @param {number} L   - average loss (decimal)
 * @param {number} lev - leverage multiplier
 */
export function geoExp(wr, W, L, lev) {
  const wl = W * lev,
    ll = L * lev;
  if (ll >= 1) return -1;
  return Math.pow(1 + wl, wr) * Math.pow(1 - ll, 1 - wr) - 1;
}

/**
 * Annualized volatility drag.
 * drag = -0.5 × (lev × σ_daily)² × days
 * @param {number} dv   - daily volatility (decimal, e.g. 0.04 = 4%)
 * @param {number} lev  - leverage multiplier
 * @param {number} days - trading days per year (default 252)
 */
export function vDrag(dv, lev, days = 252) {
  return -0.5 * Math.pow(lev * dv, 2) * days;
}

/**
 * Recovery percentage needed after a loss.
 * recovery% = loss% / (100 - loss%) × 100
 * @param {number} pct - loss as percentage (0-100)
 */
export function recov(pct) {
  return pct >= 100 ? Infinity : (pct / (100 - pct)) * 100;
}

/**
 * Calculate optimal leverage and all related metrics.
 * This is the main calculation engine extracted from the React useMemo.
 *
 * @param {object} params
 * @param {number} params.wr   - win rate (%, 10-90)
 * @param {number} params.aW   - average win (%, 0.1-20)
 * @param {number} params.aL   - average loss (%, 0.1-20)
 * @param {number} params.dv   - daily volatility (%, 0.5-15)
 * @param {number} params.mdd  - max drawdown target (%, 5-50)
 * @param {number} params.tv   - target annual volatility (%, 5-300)
 * @param {boolean} [params.useVt=true] - whether vol targeting is enabled
 * @param {number} params.kf   - Kelly fraction (0.1-1.0)
 * @param {number} params.exMax - exchange max leverage (1-125)
 */
export function calcOptimalLeverage({ wr, aW, aL, dv, mdd, tv, useVt = true, kf, exMax }) {
  const w = wr / 100,
    W = aW / 100,
    L = aL / 100,
    d = dv / 100;

  const annVol = d * Math.sqrt(252);
  const var99 = d * 2.326;

  const fk = kellyLev(w, W, L);
  const frac = fk * kf;
  const ddL = var99 > 0 ? mdd / 100 / var99 : Infinity;
  const vtL = useVt && annVol > 0 ? tv / 100 / annVol : Infinity;

  const methods = [
    { name: `Kelly ×${kf}`, value: frac },
    { name: "Drawdown Limit", value: ddL },
    { name: "Vol Targeting", value: vtL },
    { name: "Exchange Max", value: exMax },
  ];

  const fin = methods
    .filter((m) => isFinite(m.value) && m.value > 0)
    .map((m) => m.value);
  const opt = fin.length > 0 ? Math.min(...fin) : 1;

  methods.forEach((m) => {
    m.best = isFinite(m.value) && Math.abs(m.value - opt) < 0.001;
  });

  const ge = geoExp(w, W, L, opt);
  const dr = vDrag(d, opt);
  const ml = opt * L * 100;

  return { methods, opt, fk, ge, dr, ml, annVol: annVol * 100 };
}
