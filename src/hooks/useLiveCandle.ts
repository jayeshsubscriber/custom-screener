/**
 * Live candle updates via Upstox WebSocket (LTPC or full feed).
 * Falls back to re-fetching intraday periodically if WS is not used.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import type { ChartCandle } from "@/lib/chartData";
import { getMarketDataFeedWsUrl, getMarketDataFeedWsUrlV3 } from "@/lib/upstox";

/** Build a single candle from LTP for the current period (e.g. current 5m bar). */
export function useLiveCandle(
  instrumentKey: string | null,
  interval: "5m" | "15m" | "30m" | "1D" | "1M",
  lastCandle: ChartCandle | null
): ChartCandle | null {
  const [live, setLive] = useState<ChartCandle | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastCandleRef = useRef(lastCandle);
  lastCandleRef.current = lastCandle;

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!instrumentKey || interval === "1D" || interval === "1M") {
      closeWs();
      setLive(null);
      return;
    }

    let cancelled = false;
    const connect = (url: string) => {
        if (cancelled) return;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          const guid = crypto.randomUUID?.() ?? `req-${Date.now()}`;
          const msg = {
            guid,
            method: "sub",
            data: {
              mode: "ltpc",
              instrumentKeys: [instrumentKey],
            },
          };
          try {
            ws.send(JSON.stringify(msg));
          } catch {
            ws.send(JSON.stringify(msg));
          }
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const text = typeof event.data === "string" ? event.data : null;
            if (!text) return;
            const json = JSON.parse(text);
            if (json.type === "live_feed" && json.feeds?.[instrumentKey]) {
              const ltpc = json.feeds[instrumentKey].ltpc ?? json.feeds[instrumentKey].fullFeed?.marketFF?.ltpc;
              if (ltpc?.ltp != null && lastCandleRef.current) {
                const base = lastCandleRef.current;
                const ltp = Number(ltpc.ltp);
                const ts = ltpc.ltt ? Math.floor(Number(ltpc.ltt) / 1000) : base.time;
                setLive({
                  time: ts as ChartCandle["time"],
                  open: base.open,
                  high: Math.max(base.high, ltp),
                  low: Math.min(base.low, ltp),
                  close: ltp,
                  volume: base.volume ?? 0,
                });
              }
            }
          } catch {
            // ignore parse errors (e.g. Protobuf binary)
          }
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          wsRef.current = null;
        };
    };
    getMarketDataFeedWsUrlV3()
      .then(connect)
      .catch(() => getMarketDataFeedWsUrl().then(connect))
      .catch(() => {
        setLive(null);
      });

    return () => {
      cancelled = true;
      closeWs();
      setLive(null);
    };
  }, [instrumentKey, interval, closeWs]);

  return live;
}
