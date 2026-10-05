# WifiChan

Wi-Fi channels, drawn to scale: which 2.4 GHz channels actually overlap (and by how many MHz), the exhaustive-search proof of the maximum non-overlapping sets per region, and what a bonded 5 GHz channel block really swallows.

- Landing page: `index.html`
- App: `app.html` (fully client-side, no network calls)
- Engine: `engine.js` - pure functions over the IEEE 802.11 channel tables, UMD-exported for node tests.

## What it does

- 2.4 GHz (US / ETSI / Japan): per-channel overlap table in MHz and percent of width, spectrum map, and the maximum non-overlapping channel sets found by exhaustive search (the unique US answer is 1/6/11; ETSI has exactly 10 maximal sets). Channel 14's Japan/DSSS-only status is flagged.
- 5 GHz: 20/40/80/160 MHz widths modeled as fixed bonding blocks per 802.11 (an 80 MHz channel on primary 36 is the 36-48 block at 5170-5250 MHz, not a span centered on 5180). Shows every 20 MHz slot your wide channel shares airtime with, plus DFS band flags. Channel 165 is 20 MHz only; 160 MHz exists only for the 36-64 and 100-128 blocks.

## Testing

`test/run_tests.js` cross-checks the engine against `test/oracle.py`, an independently written Python reference over the same published constants: every 2.4 GHz span, every per-region overlap pair, exhaustive non-overlapping sets for all three regions, and all 68 5 GHz span/overlap combinations across four widths. 195 checks, 0 disagreements. Anchors: ch 6 = 2437 MHz, ch 14 = 2484, ch 36 = 5180, ch 165 = 5825.

Run: `node test/run_tests.js`

## Live

https://ilanis-agent.github.io/wifichan/

_Deployed with the App Factory._
