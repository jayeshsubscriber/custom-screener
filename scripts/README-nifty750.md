# Nifty 750 list

To use the **full Nifty 750** (or your own) list for the consolidation breakout scan:

1. Replace `scripts/nifty750-raw.txt` with your tab-separated table.
2. Format: one header line, then one row per stock. Columns (tab-separated):
   - Company Name
   - Industry
   - Symbol
   - Series
   - ISIN Code
   - NSE IK Key (e.g. `NSE_EQ|INE002A01018`)
3. Rows with `NSE_INDEX` in the key are skipped. Only `NSE_EQ|...` rows are included.
4. Run: `node scripts/parse-nifty750.js`
5. This overwrites `src/data/nifty750.ts` with the new list.

Chart search still uses Nifty 50 only. The **Scan universe** dropdown (Nifty 50 | Nifty 750) controls which list is used when you click "Scan consolidation breakout stocks".
