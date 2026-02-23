/**
 * Upstox API client for historical candles, intraday, and market data WebSocket.
 * Docs: https://upstox.com/developer/api-documentation/open-api/
 */

// Use proxy in development to bypass CORS, direct URL in production
const BASE = import.meta.env.DEV ? "/api/upstox" : "https://api.upstox.com";

/** Runtime token cache — set via setUpstoxToken(), persisted in Supabase */
let _runtimeToken: string | null = null;

export function setUpstoxToken(token: string) {
  _runtimeToken = token.trim();
}

export function getUpstoxToken(): string | null {
  return _runtimeToken || (import.meta.env.VITE_UPSTOX_ACCESS_TOKEN as string | undefined)?.trim() || null;
}

function getToken(): string {
  const t = _runtimeToken || (import.meta.env.VITE_UPSTOX_ACCESS_TOKEN as string | undefined);
  if (!t?.trim()) throw new Error("Upstox access token is not set. Go to Settings tab to add it.");
  return t.trim();
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

/** Candle from API: [timestampISO, open, high, low, close, volume, openInterest] */
export type RawCandle = [string, number, number, number, number, number, number];

export interface CandleResponse {
  status: string;
  data: { candles: RawCandle[] };
}

/** V3 Historical: multi-day range. Unit: minutes|hours|days|weeks|months. Interval: 1-300 (minutes), 1-5 (hours), 1 (days/weeks/months). */
export async function getHistoricalCandleV3(
  instrumentKey: string,
  unit: "minutes" | "hours" | "days" | "weeks" | "months",
  interval: string,
  toDate: string,
  fromDate: string
): Promise<CandleResponse> {
  const enc = encodeURIComponent(instrumentKey);
  const url = `${BASE}/v3/historical-candle/${enc}/${unit}/${interval}/${toDate}/${fromDate}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox historical V3 ${res.status}: ${text}`);
  }
  return res.json();
}

/** V3 Intraday: current trading day only. Unit: minutes|hours|days, interval e.g. 1,5,15,30. */
export async function getIntradayCandleV3(
  instrumentKey: string,
  unit: "minutes" | "hours" | "days",
  interval: string
): Promise<CandleResponse> {
  const enc = encodeURIComponent(instrumentKey);
  const url = `${BASE}/v3/historical-candle/intraday/${enc}/${unit}/${interval}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox intraday V3 ${res.status}: ${text}`);
  }
  return res.json();
}

/** V2 Historical (day/week/month). Intervals: 1minute, 30minute, day, week, month. */
export async function getHistoricalCandleV2(
  instrumentKey: string,
  interval: "1minute" | "30minute" | "day" | "week" | "month",
  toDate: string,
  fromDate: string
): Promise<CandleResponse> {
  const enc = encodeURIComponent(instrumentKey);
  const url = `${BASE}/v2/historical-candle/${enc}/${interval}/${toDate}/${fromDate}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox historical V2 ${res.status}: ${text}`);
  }
  return res.json();
}

/** Get authorized WebSocket URL for market data feed (one-time use). */
export async function getMarketDataFeedWsUrl(): Promise<string> {
  const res = await fetch(
    "https://api.upstox.com/v2/feed/market-data-feed/authorize",
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox WS auth ${res.status}: ${text}`);
  }
  const json = await res.json();
  const uri = json?.data?.authorized_redirect_uri;
  if (!uri || typeof uri !== "string") throw new Error("No authorized_redirect_uri in response");
  return uri;
}

/** V3 market feed authorize (returns wss URL). */
export async function getMarketDataFeedWsUrlV3(): Promise<string> {
  const res = await fetch(
    "https://api.upstox.com/v3/feed/market-data-feed/authorize",
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox WS auth V3 ${res.status}: ${text}`);
  }
  const json = await res.json();
  const uri = json?.data?.authorized_redirect_uri;
  if (!uri || typeof uri !== "string") throw new Error("No authorized_redirect_uri in response");
  return uri;
}
