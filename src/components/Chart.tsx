import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from "lightweight-charts";
import { cn } from "@/lib/utils";
import type { ChartCandle } from "@/lib/chartData";

const IST = "Asia/Kolkata";

/** Convert chart Time to Date (UTC), then format in IST for display. */
function timeToDate(time: Time): Date {
  if (typeof time === "number") return new Date(time * 1000);
  if (typeof time === "string") return new Date(time);
  const b = time as { year: number; month: number; day: number };
  return new Date(Date.UTC(b.year, b.month - 1, b.day));
}

/** Format time in IST for crosshair (e.g. "19 Dec '25 15:30" for 3:30 PM). */
function formatTimeIST(time: Time): string {
  const d = timeToDate(time);
  return d.toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format time axis tick in IST (short labels). */
function formatTickIST(time: Time, tickMarkType: TickMarkType): string {
  const d = timeToDate(time);
  const opts: Intl.DateTimeFormatOptions = { timeZone: IST };
  switch (tickMarkType) {
    case TickMarkType.Year:
      return d.toLocaleString("en-IN", { ...opts, year: "2-digit" });
    case TickMarkType.Month:
      return d.toLocaleString("en-IN", { ...opts, month: "short" });
    case TickMarkType.DayOfMonth:
      return d.toLocaleString("en-IN", { ...opts, day: "2-digit", month: "short" });
    case TickMarkType.Time:
    case TickMarkType.TimeWithSeconds:
      return d.toLocaleString("en-IN", { ...opts, hour: "2-digit", minute: "2-digit", hour12: false });
    default:
      return d.toLocaleString("en-IN", { ...opts, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  }
}

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: "#ffffff" },
    textColor: "#374151",
  },
  grid: {
    vertLines: { color: "#f3f4f6" },
    horzLines: { color: "#f3f4f6" },
  },
  crosshair: { mode: 1 },
  rightPriceScale: {
    borderColor: "#e5e7eb",
    scaleMargins: { top: 0.1, bottom: 0.2 },
  },
  timeScale: {
    borderColor: "#e5e7eb",
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => formatTickIST(time, tickMarkType),
  },
  localization: {
    locale: "en-IN",
    timeFormatter: formatTimeIST,
    dateFormat: "dd MMM 'yy",
  },
};

/** Default number of candles visible on load; user can scroll left to see more. */
const DEFAULT_VISIBLE_CANDLES = 200;

export interface ChartProps {
  data: ChartCandle[];
  liveCandle?: ChartCandle | null;
  onOhlcChange?: (candle: ChartCandle | null) => void;
  className?: string;
  height?: number;
}

export function Chart({ data, liveCandle, onOhlcChange, className, height = 400 }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const initChart = useCallback(() => {
    if (!containerRef.current || chartRef.current) return;
    const chart = createChart(containerRef.current, {
      ...CHART_OPTIONS,
      width: containerRef.current.clientWidth,
      height,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });
    seriesRef.current = candleSeries;

    chart.addPane();
    const panes = chart.panes();
    if (panes.length >= 2) {
      panes[0].setStretchFactor(0.75);
      panes[1].setStretchFactor(0.25);
    }
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    }, 1);
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, borderVisible: false });
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      const candleData = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      const d = dataRef.current;
      let next: ChartCandle | null = null;
      if (candleData && param.time) {
        const t = param.time as ChartCandle["time"];
        const same = d.find((c) => c.time === t);
        next = {
          time: t,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: same?.volume ?? 0,
        };
      } else {
        next = d.length ? d[d.length - 1] : null;
      }
      onOhlcChange?.(next);
    });

    const handleResize = () => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [height]);

  useEffect(() => {
    const cleanup = initChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
      }
      cleanup?.();
    };
  }, [initChart]);

  useEffect(() => {
    const series = seriesRef.current;
    const volSeries = volumeSeriesRef.current;
    if (!series || !data.length) return;

    const chartData: CandlestickData[] = data.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(chartData);

    if (volSeries) {
      const volData: HistogramData[] = data.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(22, 163, 74, 0.5)" : "rgba(220, 38, 38, 0.5)",
      }));
      volSeries.setData(volData);
    }

    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      const n = data.length;
      const from = Math.max(0, n - DEFAULT_VISIBLE_CANDLES);
      const to = n - 1;
      timeScale.setVisibleLogicalRange({ from, to });
    }
    const last = data.length ? data[data.length - 1] : null;
    onOhlcChange?.(last);
  }, [data, onOhlcChange]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !liveCandle) return;
    series.update({
      time: liveCandle.time,
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });
  }, [liveCandle]);

  return <div ref={containerRef} className={cn("w-full", className)} style={{ height }} />;
}
