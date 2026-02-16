/**
 * Run: node scripts/parse-nifty750.js
 * Reads nifty750-raw.txt (tab-separated: Symbol, NSE IK Key)
 * Writes src/data/nifty750.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPath = path.join(__dirname, "nifty750-raw.txt");
const outPath = path.join(__dirname, "..", "src", "data", "nifty750.ts");
const raw = fs.readFileSync(rawPath, "utf8");
const lines = raw.trim().split(/\r?\n/);
const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  // Support tab or multiple spaces as separator; format: Symbol, NSE IK Key
  const parts = line.includes("\t") ? line.split("\t") : line.split(/\s+/);
  if (parts.length < 2) continue;
  const symbol = parts[0].trim();
  const key = parts[parts.length - 1].trim(); // Last part is always the key
  // Skip header row and index entries
  if (symbol === "Symbol" || key === "NSE IK Key") continue;
  if (!key.startsWith("NSE_EQ|")) continue;
  if (!symbol) continue;
  out.push({ symbol, name: symbol, instrument_key: key }); // Use symbol as name
}
const ts = `/**
 * Nifty 750 stocks for consolidation scan. Source: NSE IK Key (NSE_EQ|ISIN).
 */
export interface Nifty750Instrument {
  symbol: string;
  name: string;
  instrument_key: string;
}

export const NIFTY_750: Nifty750Instrument[] = ${JSON.stringify(out, null, 2)};
`;
fs.writeFileSync(outPath, ts, "utf8");
console.log("Wrote", outPath, "with", out.length, "instruments");
