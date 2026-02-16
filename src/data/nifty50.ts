/**
 * Nifty 50 stocks for chart search. instrument_key format: NSE_EQ|ISIN (from Upstox BOD instruments).
 */
export interface Nifty50Instrument {
  symbol: string;
  name: string;
  instrument_key: string;
}

export const NIFTY_50: Nifty50Instrument[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", instrument_key: "NSE_EQ|INE002A01018" },
  { symbol: "TCS", name: "Tata Consultancy Services", instrument_key: "NSE_EQ|INE467B01029" },
  { symbol: "HDFCBANK", name: "HDFC Bank", instrument_key: "NSE_EQ|INE040A01036" },
  { symbol: "INFY", name: "Infosys", instrument_key: "NSE_EQ|INE009A01021" },
  { symbol: "ICICIBANK", name: "ICICI Bank", instrument_key: "NSE_EQ|INE090A01021" },
  { symbol: "SBIN", name: "State Bank of India", instrument_key: "NSE_EQ|INE062A01020" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", instrument_key: "NSE_EQ|INE397D01024" },
  { symbol: "ITC", name: "ITC", instrument_key: "NSE_EQ|INE154A01025" },
  { symbol: "LT", name: "Larsen & Toubro", instrument_key: "NSE_EQ|INE018A01030" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", instrument_key: "NSE_EQ|INE237A01028" },
  { symbol: "AXISBANK", name: "Axis Bank", instrument_key: "NSE_EQ|INE238A01034" },
  { symbol: "MARUTI", name: "Maruti Suzuki", instrument_key: "NSE_EQ|INE585B01010" },
  { symbol: "TATAMOTORS", name: "Tata Motors", instrument_key: "NSE_EQ|INE155A01022" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", instrument_key: "NSE_EQ|INE030A01027" },
  { symbol: "WIPRO", name: "Wipro", instrument_key: "NSE_EQ|INE075A01022" },
  { symbol: "NESTLEIND", name: "Nestle India", instrument_key: "NSE_EQ|INE239A01016" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", instrument_key: "NSE_EQ|INE296A01024" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", instrument_key: "NSE_EQ|INE044A01036" },
  { symbol: "ASIANPAINT", name: "Asian Paints", instrument_key: "NSE_EQ|INE021A01026" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", instrument_key: "NSE_EQ|INE481D01012" },
  { symbol: "M&M", name: "Mahindra & Mahindra", instrument_key: "NSE_EQ|INE101A01026" },
  { symbol: "POWERGRID", name: "Power Grid", instrument_key: "NSE_EQ|INE752E01010" },
  { symbol: "ONGC", name: "ONGC", instrument_key: "NSE_EQ|INE213A01029" },
  { symbol: "NTPC", name: "NTPC", instrument_key: "NSE_EQ|INE733E01010" },
  { symbol: "COALINDIA", name: "Coal India", instrument_key: "NSE_EQ|INE522F01014" },
  { symbol: "DRREDDY", name: "Dr Reddy's", instrument_key: "NSE_EQ|INE089A01023" },
  { symbol: "CIPLA", name: "Cipla", instrument_key: "NSE_EQ|INE059A01026" },
  { symbol: "HCLTECH", name: "HCL Technologies", instrument_key: "NSE_EQ|INE860A01027" },
  { symbol: "TECHM", name: "Tech Mahindra", instrument_key: "NSE_EQ|INE669C01036" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", instrument_key: "NSE_EQ|INE918I01018" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", instrument_key: "NSE_EQ|INE917I01010" },
  { symbol: "GRASIM", name: "Grasim", instrument_key: "NSE_EQ|INE047A01021" },
  { symbol: "JSWSTEEL", name: "JSW Steel", instrument_key: "NSE_EQ|INE019A01038" },
  { symbol: "HINDALCO", name: "Hindalco", instrument_key: "NSE_EQ|INE038A01020" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", instrument_key: "NSE_EQ|INE158A01026" },
  { symbol: "TITAN", name: "Titan", instrument_key: "NSE_EQ|INE280A01028" },
  { symbol: "BPCL", name: "BPCL", instrument_key: "NSE_EQ|INE029A01011" },
  { symbol: "UPL", name: "UPL", instrument_key: "NSE_EQ|INE628A01036" },
  { symbol: "ADANIPORTS", name: "Adani Ports", instrument_key: "NSE_EQ|INE742F01042" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", instrument_key: "NSE_EQ|INE095A01012" },
  { symbol: "BRITANNIA", name: "Britannia", instrument_key: "NSE_EQ|INE216A01030" },
  { symbol: "EICHERMOT", name: "Eicher Motors", instrument_key: "NSE_EQ|INE066A01013" },
  { symbol: "SBILIFE", name: "SBI Life", instrument_key: "NSE_EQ|INE536S01010" },
  { symbol: "HDFCLIFE", name: "HDFC Life", instrument_key: "NSE_EQ|INE040A01034" },
  { symbol: "TATASTEEL", name: "Tata Steel", instrument_key: "NSE_EQ|INE081A01020" },
  { symbol: "DIVISLAB", name: "Divi's Labs", instrument_key: "NSE_EQ|INE361B01023" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", instrument_key: "NSE_EQ|INE437A01024" },
  { symbol: "ADANIENT", name: "Adani Enterprises", instrument_key: "NSE_EQ|INE423A01024" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", instrument_key: "NSE_EQ|INE721A01013" },
];

export function searchNifty50(query: string): Nifty50Instrument[] {
  const q = query.trim().toLowerCase();
  if (!q) return NIFTY_50;
  return NIFTY_50.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );
}

// Import will be used for combined search
import { NIFTY_750 } from "./nifty750";

/** Search across all stocks (Nifty 50 + Nifty 750, deduplicated) */
export function searchAllStocks(query: string): Nifty50Instrument[] {
  const q = query.trim().toLowerCase();
  
  // Combine and deduplicate by instrument_key
  const seen = new Set<string>();
  const all: Nifty50Instrument[] = [];
  
  for (const s of NIFTY_50) {
    if (!seen.has(s.instrument_key)) {
      seen.add(s.instrument_key);
      all.push(s);
    }
  }
  for (const s of NIFTY_750) {
    if (!seen.has(s.instrument_key)) {
      seen.add(s.instrument_key);
      all.push(s);
    }
  }
  
  if (!q) return all; // Return all stocks when no query - dropdown will limit display
  
  return all.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );
}
