import { describe, it, expect } from "vitest";
import { kellyLev, geoExp, vDrag, recov, calcOptimalLeverage } from "./calc.js";

// ──────────────────────────────────────────────────────────────
// UNIT TESTS
// ──────────────────────────────────────────────────────────────

describe("kellyLev — Kelly Criterion leverage", () => {
  it("returns 0 when W <= 0", () => {
    expect(kellyLev(0.5, 0, 0.01)).toBe(0);
    expect(kellyLev(0.5, -0.01, 0.01)).toBe(0);
  });

  it("returns 0 when L <= 0", () => {
    expect(kellyLev(0.5, 0.01, 0)).toBe(0);
    expect(kellyLev(0.5, 0.01, -0.01)).toBe(0);
  });

  it("returns 0 when edge has negative expectancy (wr too low)", () => {
    // wr=0.1, W=0.01, L=0.01 → numerator = 0.1*0.01 - 0.9*0.01 = -0.008
    expect(kellyLev(0.1, 0.01, 0.01)).toBe(0);
  });

  it("calculates correctly for fair coin with 2:1 payoff (textbook case)", () => {
    // wr=0.5, W=0.02, L=0.01
    // Kelly = (0.5*0.02 - 0.5*0.01) / (0.02*0.01) = 0.005 / 0.0002 = 25
    const result = kellyLev(0.5, 0.02, 0.01);
    expect(result).toBeCloseTo(25, 5);
  });

  it("calculates correctly for symmetric odds (50% wr, equal W and L)", () => {
    // wr=0.5, W=0.01, L=0.01
    // Kelly = (0.5*0.01 - 0.5*0.01) / (0.01*0.01) = 0
    expect(kellyLev(0.5, 0.01, 0.01)).toBe(0);
  });

  it("calculates correctly for 60% wr, 3% win, 2% loss", () => {
    // Kelly = (0.6*0.03 - 0.4*0.02) / (0.03*0.02) = (0.018 - 0.008) / 0.0006 = 16.667
    const result = kellyLev(0.6, 0.03, 0.02);
    expect(result).toBeCloseTo(16.667, 2);
  });

  it("default params: wr=0.45, W=0.03, L=0.015", () => {
    // Kelly = (0.45*0.03 - 0.55*0.015) / (0.03*0.015) = (0.0135-0.00825)/0.00045 = 11.667
    const result = kellyLev(0.45, 0.03, 0.015);
    expect(result).toBeCloseTo(11.667, 2);
  });

  it("high win rate 80%, W=5%, L=2%", () => {
    // Kelly = (0.8*0.05 - 0.2*0.02) / (0.05*0.02) = (0.04-0.004)/0.001 = 36
    const result = kellyLev(0.8, 0.05, 0.02);
    expect(result).toBeCloseTo(36, 5);
  });

  it("barely profitable: wr=0.51, W=0.01, L=0.01", () => {
    // Kelly = (0.51*0.01 - 0.49*0.01) / (0.01*0.01) = 0.0002 / 0.0001 = 2
    const result = kellyLev(0.51, 0.01, 0.01);
    expect(result).toBeCloseTo(2, 5);
  });
});

describe("geoExp — Geometric expectation per trade", () => {
  it("returns -1 when leverage would cause liquidation (L*lev >= 1)", () => {
    expect(geoExp(0.5, 0.03, 0.015, 100)).toBe(-1); // 0.015*100 = 1.5 >= 1
    expect(geoExp(0.5, 0.03, 0.5, 2)).toBe(-1);     // 0.5*2 = 1 >= 1
  });

  it("returns positive for profitable strategy at 1x leverage", () => {
    // wr=0.6, W=3%, L=2%, lev=1
    const result = geoExp(0.6, 0.03, 0.02, 1);
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 at no leverage (lev=0)", () => {
    const result = geoExp(0.5, 0.03, 0.015, 0);
    // (1+0)^0.5 * (1-0)^0.5 - 1 = 1 * 1 - 1 = 0
    expect(result).toBeCloseTo(0, 10);
  });

  it("geo expectation peaks around Kelly leverage and drops after", () => {
    const w = 0.45, W = 0.03, L = 0.015;
    const kelly = kellyLev(w, W, L); // ~11.67
    const atKelly = geoExp(w, W, L, kelly);
    const atDouble = geoExp(w, W, L, kelly * 2);
    const atHalf = geoExp(w, W, L, kelly * 0.5);

    // At Kelly should be maximum
    expect(atKelly).toBeGreaterThan(atHalf);
    // At double Kelly should be less than at Kelly
    expect(atKelly).toBeGreaterThan(atDouble);
  });

  it("geo expectation becomes negative at very high leverage", () => {
    const result = geoExp(0.6, 0.03, 0.02, 40);
    expect(result).toBeLessThan(0);
  });

  it("specific value: wr=0.55, W=3%, L=1.5%, lev=5", () => {
    // (1 + 0.03*5)^0.55 * (1 - 0.015*5)^0.45 - 1
    // = (1.15)^0.55 * (0.925)^0.45 - 1
    const expected = Math.pow(1.15, 0.55) * Math.pow(0.925, 0.45) - 1;
    const result = geoExp(0.55, 0.03, 0.015, 5);
    expect(result).toBeCloseTo(expected, 10);
  });

  it("default params at default optimal leverage (~0.39x)", () => {
    const result = geoExp(0.45, 0.03, 0.015, 0.394);
    // Small positive number expected
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.01); // Very small gain per trade
  });
});

describe("vDrag — Volatility drag", () => {
  it("always returns negative or zero", () => {
    expect(vDrag(0.04, 2)).toBeLessThan(0);
    expect(vDrag(0, 2)).toBeCloseTo(0, 10);
    expect(vDrag(0.04, 0)).toBeCloseTo(0, 10);
  });

  it("is zero when leverage is 0", () => {
    expect(vDrag(0.04, 0)).toBeCloseTo(0, 10);
  });

  it("is zero when volatility is 0", () => {
    expect(vDrag(0, 10)).toBeCloseTo(0, 10);
  });

  it("scales quadratically with leverage", () => {
    const drag1x = vDrag(0.04, 1);
    const drag2x = vDrag(0.04, 2);
    const drag3x = vDrag(0.04, 3);
    // drag(2x) / drag(1x) should be 4
    expect(drag2x / drag1x).toBeCloseTo(4, 5);
    // drag(3x) / drag(1x) should be 9
    expect(drag3x / drag1x).toBeCloseTo(9, 5);
  });

  it("scales quadratically with volatility", () => {
    const drag2pct = vDrag(0.02, 1);
    const drag4pct = vDrag(0.04, 1);
    expect(drag4pct / drag2pct).toBeCloseTo(4, 5);
  });

  it("specific value: 4% daily vol, 2x leverage, 252 days", () => {
    // -0.5 * (2*0.04)^2 * 252 = -0.5 * 0.0064 * 252 = -0.8064
    const result = vDrag(0.04, 2);
    expect(result).toBeCloseTo(-0.8064, 4);
  });

  it("custom trading days", () => {
    const result = vDrag(0.04, 1, 365);
    const expected = -0.5 * Math.pow(0.04, 2) * 365;
    expect(result).toBeCloseTo(expected, 10);
  });
});

describe("recov — Recovery percentage", () => {
  it("10% loss needs ~11.11% to recover", () => {
    expect(recov(10)).toBeCloseTo(11.111, 2);
  });

  it("20% loss needs 25% to recover", () => {
    expect(recov(20)).toBeCloseTo(25, 5);
  });

  it("50% loss needs 100% to recover", () => {
    expect(recov(50)).toBeCloseTo(100, 5);
  });

  it("90% loss needs 900% to recover", () => {
    expect(recov(90)).toBeCloseTo(900, 5);
  });

  it("100% loss returns Infinity", () => {
    expect(recov(100)).toBe(Infinity);
  });

  it("0% loss needs 0% to recover", () => {
    expect(recov(0)).toBe(0);
  });

  it(">100% loss returns Infinity", () => {
    expect(recov(150)).toBe(Infinity);
  });
});

// ──────────────────────────────────────────────────────────────
// INTEGRATION TESTS — calcOptimalLeverage
// ──────────────────────────────────────────────────────────────

describe("calcOptimalLeverage — integration (full pipeline)", () => {
  const defaults = {
    wr: 45,
    aW: 3.0,
    aL: 1.5,
    dv: 4.0,
    mdd: 20,
    tv: 25,
    kf: 0.5,
    exMax: 20,
  };

  it("default params: optimal leverage is ~0.39x (Vol Targeting binds)", () => {
    const r = calcOptimalLeverage(defaults);
    // Vol targeting: 0.25 / (0.04 * sqrt(252)) = 0.25 / 0.6350 = 0.3937
    expect(r.opt).toBeCloseTo(0.394, 1);
    // Binding constraint should be Vol Targeting
    const binding = r.methods.find((m) => m.best);
    expect(binding.name).toBe("Vol Targeting");
  });

  it("default params: Kelly full is ~11.67x", () => {
    const r = calcOptimalLeverage(defaults);
    expect(r.fk).toBeCloseTo(11.667, 1);
  });

  it("default params: all 4 method values are computed", () => {
    const r = calcOptimalLeverage(defaults);
    expect(r.methods).toHaveLength(4);
    r.methods.forEach((m) => {
      expect(m.value).toBeGreaterThan(0);
      expect(isFinite(m.value)).toBe(true);
    });
  });

  it("verifies each method value independently for defaults", () => {
    const r = calcOptimalLeverage(defaults);
    const [kelly, dd, vol, exch] = r.methods;

    // Kelly * 0.5 = 11.667 * 0.5 = 5.833
    expect(kelly.value).toBeCloseTo(5.833, 1);
    // DD limit: (20/100) / (0.04*2.326) = 0.20 / 0.09304 = 2.149
    expect(dd.value).toBeCloseTo(2.149, 1);
    // Vol targeting: (25/100) / (0.04*sqrt(252)) = 0.25 / 0.6350 = 0.3937
    expect(vol.value).toBeCloseTo(0.394, 1);
    // Exchange max: 20
    expect(exch.value).toBe(20);
  });

  // ──── Vol targeting dominance analysis ────

  it("vol targeting almost always gives sub-1x for dv >= 2% with tv=25%", () => {
    // This test shows WHY leverage seems too small:
    // At dv=2%, annVol = 0.02*15.87 = 31.7%, vtL = 25/31.7 = 0.79x
    // At dv=4%, annVol = 0.04*15.87 = 63.5%, vtL = 25/63.5 = 0.39x
    for (const dailyVol of [2, 3, 4, 5, 8, 10]) {
      const r = calcOptimalLeverage({ ...defaults, dv: dailyVol });
      const volMethod = r.methods.find((m) => m.name === "Vol Targeting");
      const annVol = (dailyVol / 100) * Math.sqrt(252);
      const expectedVtL = 0.25 / annVol;
      expect(volMethod.value).toBeCloseTo(expectedVtL, 2);

      // For dv >= 2%, vol targeting gives < 1x at tv=25%
      if (dailyVol >= 2) {
        expect(volMethod.value).toBeLessThan(1);
      }
    }
  });

  it("raising target volatility to 100% gives more reasonable leverage", () => {
    const r = calcOptimalLeverage({ ...defaults, tv: 100 });
    const volMethod = r.methods.find((m) => m.name === "Vol Targeting");
    // tv=100%: 1.0 / (0.04*15.87) = 1.575x
    expect(volMethod.value).toBeCloseTo(1.575, 1);
    // Now drawdown limit binds (~2.15x), not vol targeting
    expect(r.opt).toBeCloseTo(1.575, 1);
  });

  // ──── Binding constraint changes ────

  it("exchange max binds when set very low", () => {
    const r = calcOptimalLeverage({ ...defaults, exMax: 0.1 });
    expect(r.opt).toBeCloseTo(0.1, 5);
    const binding = r.methods.find((m) => m.best);
    expect(binding.name).toBe("Exchange Max");
  });

  it("Kelly binds when other constraints are loose", () => {
    const r = calcOptimalLeverage({
      wr: 51, aW: 1, aL: 1, dv: 0.5, mdd: 50, tv: 100, kf: 0.5, exMax: 125,
    });
    const binding = r.methods.find((m) => m.best);
    expect(binding.name).toContain("Kelly");
  });

  it("drawdown limit binds with high vol and low mdd", () => {
    const r = calcOptimalLeverage({
      ...defaults, dv: 1, mdd: 5, tv: 100, kf: 1, exMax: 125,
    });
    const binding = r.methods.find((m) => m.best);
    expect(binding.name).toBe("Drawdown Limit");
  });

  // ──── Sanity of output metrics ────

  it("geometric expectation is positive at optimal leverage for profitable strategy", () => {
    const r = calcOptimalLeverage({ ...defaults, wr: 55, aW: 3, aL: 1.5 });
    expect(r.ge).toBeGreaterThan(0);
  });

  it("volatility drag is negative at any nonzero leverage and vol", () => {
    const r = calcOptimalLeverage(defaults);
    expect(r.dr).toBeLessThan(0);
  });

  it("max loss per trade = opt * avgLoss%", () => {
    const r = calcOptimalLeverage(defaults);
    expect(r.ml).toBeCloseTo(r.opt * 1.5, 4);
  });

  it("annualized vol is daily * sqrt(252) * 100", () => {
    const r = calcOptimalLeverage(defaults);
    expect(r.annVol).toBeCloseTo(4 * Math.sqrt(252), 2);
  });

  // ──── Edge cases ────

  it("no edge (wr=50%, W=L): Kelly=0, fallback to other methods", () => {
    const r = calcOptimalLeverage({ ...defaults, wr: 50, aW: 2, aL: 2 });
    expect(r.fk).toBe(0);
    const kellyMethod = r.methods.find((m) => m.name.includes("Kelly"));
    expect(kellyMethod.value).toBe(0);
    // Kelly is filtered out (value=0), other methods decide
    expect(r.opt).toBeGreaterThan(0);
  });

  it("losing strategy (wr=30%, W=1%, L=2%): Kelly=0", () => {
    const r = calcOptimalLeverage({ ...defaults, wr: 30, aW: 1, aL: 2 });
    expect(r.fk).toBe(0);
  });

  it("very low volatility gives high vol-target leverage", () => {
    const r = calcOptimalLeverage({ ...defaults, dv: 0.5 });
    const volMethod = r.methods.find((m) => m.name === "Vol Targeting");
    // annVol = 0.005 * 15.87 = 0.0794 → vtL = 0.25/0.0794 = 3.15x
    expect(volMethod.value).toBeCloseTo(3.15, 1);
  });

  // ──── Leverage sensitivity analysis ────

  it("optimal leverage increases when daily volatility decreases", () => {
    const r1 = calcOptimalLeverage({ ...defaults, dv: 4 });
    const r2 = calcOptimalLeverage({ ...defaults, dv: 2 });
    const r3 = calcOptimalLeverage({ ...defaults, dv: 1 });
    expect(r2.opt).toBeGreaterThan(r1.opt);
    expect(r3.opt).toBeGreaterThan(r2.opt);
  });

  it("optimal leverage increases when max drawdown increases", () => {
    const r1 = calcOptimalLeverage({ ...defaults, mdd: 10 });
    const r2 = calcOptimalLeverage({ ...defaults, mdd: 30 });
    const r3 = calcOptimalLeverage({ ...defaults, mdd: 50 });
    expect(r2.opt).toBeGreaterThanOrEqual(r1.opt);
    expect(r3.opt).toBeGreaterThanOrEqual(r2.opt);
  });

  it("optimal leverage increases when target vol increases", () => {
    const r1 = calcOptimalLeverage({ ...defaults, tv: 25 });
    const r2 = calcOptimalLeverage({ ...defaults, tv: 50 });
    const r3 = calcOptimalLeverage({ ...defaults, tv: 100 });
    expect(r2.opt).toBeGreaterThanOrEqual(r1.opt);
    expect(r3.opt).toBeGreaterThanOrEqual(r2.opt);
  });

  it("Kelly fraction scales Kelly leverage linearly", () => {
    const r05 = calcOptimalLeverage({ ...defaults, kf: 0.5 });
    const r10 = calcOptimalLeverage({ ...defaults, kf: 1.0 });
    const kellyFull = r10.methods.find((m) => m.name.includes("Kelly")).value;
    const kellyHalf = r05.methods.find((m) => m.name.includes("Kelly")).value;
    expect(kellyFull).toBeCloseTo(kellyHalf * 2, 5);
  });

  // ──── Realistic scenario tests ────

  describe("realistic scenarios", () => {
    it("conservative stock trader: should get moderate leverage", () => {
      // Low vol stock, high win rate, conservative targets
      const r = calcOptimalLeverage({
        wr: 55, aW: 2, aL: 1, dv: 1.5, mdd: 15, tv: 20, kf: 0.5, exMax: 4,
      });
      // Kelly = (0.55*0.02 - 0.45*0.01) / (0.02*0.01) = 0.0065/0.0002 = 32.5 * 0.5 = 16.25
      // DD = 0.15 / (0.015*2.326) = 0.15/0.03489 = 4.3
      // VT = 0.20 / (0.015*15.87) = 0.20/0.238 = 0.84
      // ExMax = 4
      // Min = 0.84 (Vol Targeting)
      expect(r.opt).toBeCloseTo(0.84, 1);
    });

    it("crypto scalper: high vol means very low leverage recommended", () => {
      const r = calcOptimalLeverage({
        wr: 52, aW: 1, aL: 0.8, dv: 8, mdd: 20, tv: 30, kf: 0.5, exMax: 125,
      });
      // annVol = 0.08*15.87 = 127% → vtL = 0.30/1.27 = 0.236x
      expect(r.opt).toBeLessThan(0.5);
    });

    it("forex swing trader: moderate vol, decent edge", () => {
      const r = calcOptimalLeverage({
        wr: 48, aW: 4, aL: 2, dv: 0.8, mdd: 15, tv: 20, kf: 0.5, exMax: 50,
      });
      // Kelly = (0.48*0.04 - 0.52*0.02)/(0.04*0.02) = (0.0192-0.0104)/0.0008 = 11 * 0.5 = 5.5
      // annVol = 0.008*15.87 = 12.7% → vtL = 0.20/0.127 = 1.57
      // DD = 0.15/(0.008*2.326) = 0.15/0.0186 = 8.06
      // Min = 1.57 (Vol Targeting)
      expect(r.opt).toBeCloseTo(1.575, 1);
    });
  });

  // ──── Vol Targeting toggle (useVt) ────

  describe("useVt toggle", () => {
    it("disabling vol targeting (useVt=false) removes it from constraints", () => {
      const r = calcOptimalLeverage({ ...defaults, useVt: false });
      const vtMethod = r.methods.find((m) => m.name === "Vol Targeting");
      expect(vtMethod.value).toBe(Infinity);
      // Without vol targeting, drawdown limit should bind (2.15x)
      expect(r.opt).toBeCloseTo(2.149, 1);
      const binding = r.methods.find((m) => m.best);
      expect(binding.name).toBe("Drawdown Limit");
    });

    it("useVt=true (default) keeps vol targeting active", () => {
      const r = calcOptimalLeverage(defaults);
      const vtMethod = r.methods.find((m) => m.name === "Vol Targeting");
      expect(vtMethod.value).toBeCloseTo(0.394, 1);
    });

    it("disabling vol targeting significantly increases leverage for high-vol assets", () => {
      const withVt = calcOptimalLeverage({ ...defaults, dv: 8 });
      const withoutVt = calcOptimalLeverage({ ...defaults, dv: 8, useVt: false });
      // With: opt ≈ 0.197 (vol targeting), without: opt ≈ 1.07 (drawdown limit)
      expect(withoutVt.opt).toBeGreaterThan(withVt.opt * 3);
    });
  });

  // ──── Higher target vol (slider max now 300%) ────

  describe("extended target vol range (up to 300%)", () => {
    it("tv=200% gives reasonable leverage for crypto (dv=4%)", () => {
      const r = calcOptimalLeverage({ ...defaults, tv: 200 });
      const vtMethod = r.methods.find((m) => m.name === "Vol Targeting");
      // vtL = 2.0 / (0.04*15.87) = 2.0 / 0.635 = 3.15x
      expect(vtMethod.value).toBeCloseTo(3.15, 1);
    });

    it("tv=300% lets Kelly or DD limit bind instead", () => {
      const r = calcOptimalLeverage({ ...defaults, tv: 300 });
      const vtMethod = r.methods.find((m) => m.name === "Vol Targeting");
      // vtL = 3.0 / 0.635 = 4.72x → DD limit (2.15x) binds
      expect(vtMethod.value).toBeCloseTo(4.72, 1);
      expect(r.opt).toBeCloseTo(2.149, 1);
      const binding = r.methods.find((m) => m.best);
      expect(binding.name).toBe("Drawdown Limit");
    });
  });

  // ──── KEY FINDING: why leverage seems always small ────

  describe("DIAGNOSIS: why leverage is always small", () => {
    it("vol targeting constraint is almost always the tightest with default tv=25%", () => {
      // For typical crypto/stock daily volatility (1-8%), vol targeting at 25%
      // will produce sub-2x leverage, often sub-1x
      const testCases = [
        { dv: 1, expectedVtL: 1.575 },  // Low vol stock
        { dv: 2, expectedVtL: 0.787 },  // Normal stock
        { dv: 4, expectedVtL: 0.394 },  // Crypto
        { dv: 8, expectedVtL: 0.197 },  // High vol crypto
      ];

      for (const { dv, expectedVtL } of testCases) {
        const r = calcOptimalLeverage({ ...defaults, dv });
        const vtMethod = r.methods.find((m) => m.name === "Vol Targeting");
        expect(vtMethod.value).toBeCloseTo(expectedVtL, 2);
      }
    });

    it("with tv=25%, leverage exceeds 1x only when daily vol < 1.58%", () => {
      // 0.25 / (dv/100 * sqrt(252)) > 1 → dv < 25/sqrt(252) ≈ 1.575%
      const threshold = 25 / Math.sqrt(252);

      const belowThreshold = calcOptimalLeverage({ ...defaults, dv: 1.5 });
      const aboveThreshold = calcOptimalLeverage({ ...defaults, dv: 2.0 });

      const vtBelow = belowThreshold.methods.find((m) => m.name === "Vol Targeting");
      const vtAbove = aboveThreshold.methods.find((m) => m.name === "Vol Targeting");

      expect(vtBelow.value).toBeGreaterThan(1);
      expect(vtAbove.value).toBeLessThan(1);
      expect(threshold).toBeCloseTo(1.575, 2);
    });

    it("to get 3x leverage from vol targeting, need tv ≈ daily_vol * sqrt(252) * 3 * 100", () => {
      // For dv=4%, need tv = 0.04*15.87*3*100 = 190.5%
      // But slider max is 100%!
      const r = calcOptimalLeverage({ ...defaults, dv: 4, tv: 100 });
      const vtMethod = r.methods.find((m) => m.name === "Vol Targeting");
      // Even at 100% target vol, you only get 1.575x
      expect(vtMethod.value).toBeCloseTo(1.575, 2);
    });

    it("removing vol targeting (tv=100%) lets drawdown limit take over", () => {
      const r = calcOptimalLeverage({ ...defaults, tv: 100 });
      // With tv=100%: vtL = 1.575x, ddL = 2.15x, kelly*0.5 = 5.83x
      // Vol targeting still binds even at max slider!
      expect(r.opt).toBeCloseTo(1.575, 1);
      const binding = r.methods.find((m) => m.best);
      expect(binding.name).toBe("Vol Targeting");
    });
  });
});
