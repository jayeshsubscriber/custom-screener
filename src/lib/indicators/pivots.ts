/**
 * Pivot levels: Standard, Camarilla, CPR.
 * Computed from previous bar's high, low, close.
 */
import type { OhlcvRow } from "@/types/screener";

interface PivotLevels {
  pp: number;
  r1: number; r2: number; r3: number;
  s1: number; s2: number; s3: number;
}

interface CamarillaLevels {
  r1: number; r2: number; r3: number; r4: number;
  s1: number; s2: number; s3: number; s4: number;
}

function standardPivot(h: number, l: number, c: number): PivotLevels {
  const pp = (h + l + c) / 3;
  return {
    pp,
    r1: 2 * pp - l,
    r2: pp + (h - l),
    r3: h + 2 * (pp - l),
    s1: 2 * pp - h,
    s2: pp - (h - l),
    s3: l - 2 * (h - pp),
  };
}

function camarillaPivot(h: number, l: number, c: number): CamarillaLevels {
  const range = h - l;
  return {
    r1: c + range * 1.1 / 12,
    r2: c + range * 1.1 / 6,
    r3: c + range * 1.1 / 4,
    r4: c + range * 1.1 / 2,
    s1: c - range * 1.1 / 12,
    s2: c - range * 1.1 / 6,
    s3: c - range * 1.1 / 4,
    s4: c - range * 1.1 / 2,
  };
}

type PivotField =
  | "pp" | "r1" | "r2" | "r3" | "s1" | "s2" | "s3"
  | "cam_r1" | "cam_r2" | "cam_r3" | "cam_r4"
  | "cam_s1" | "cam_s2" | "cam_s3" | "cam_s4"
  | "cpr_upper" | "cpr_lower" | "cpr_width_pct";

export function computePivot(data: OhlcvRow[], field: PivotField): number[] {
  const out: number[] = [NaN];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const h = prev.high, l = prev.low, c = prev.close;

    if (field.startsWith("cam_")) {
      const cam = camarillaPivot(h, l, c);
      const key = field.slice(4) as keyof CamarillaLevels;
      out.push(cam[key]);
    } else if (field === "cpr_upper" || field === "cpr_lower" || field === "cpr_width_pct") {
      const pp = (h + l + c) / 3;
      const bc = (h + l) / 2;
      const tc = 2 * pp - bc;
      const upper = Math.max(tc, bc);
      const lower = Math.min(tc, bc);
      if (field === "cpr_upper") out.push(upper);
      else if (field === "cpr_lower") out.push(lower);
      else out.push(pp > 0 ? ((upper - lower) / pp) * 100 : 0);
    } else {
      const std = standardPivot(h, l, c);
      out.push(std[field as keyof PivotLevels]);
    }
  }
  return out;
}
