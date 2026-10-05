// Cross-check engine.js against the Python oracle.
const { execFileSync } = require('child_process');
const W = require('../engine.js');
const o = JSON.parse(execFileSync('python3', ['test/oracle.py']).toString());

let fails = 0, checked = 0;
function eq(a, b, label) {
  checked++;
  if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; if (fails <= 8) console.log('MISMATCH', label, 'js', JSON.stringify(a), 'py', JSON.stringify(b)); }
}
for (let ch = 1; ch <= 14; ch++) {
  const s = W.span24(ch);
  eq([s.lo, s.hi], o.spans24[ch], 'span24 ' + ch);
}
for (const region of ['us', 'etsi', 'japan']) {
  for (const ch of W.REGIONS[region].channels) {
    const js = W.overlaps24(ch, region).map(x => [x.channel, x.mhz]);
    eq(js, o.overlaps24[region + ':' + ch], 'overlaps24 ' + region + ':' + ch);
  }
  const sortSets = x => x.map(v => v.join(',')).sort();
  eq(sortSets(W.nonOverlappingSets24(region)), sortSets(o.sets24[region]), 'sets24 ' + region);
}
for (const ch of [36,40,44,48,52,56,60,64,100,116,132,144,149,153,157,161,165]) {
  for (const w of [20, 40, 80, 160]) {
    const s = W.span5(ch, w);
    eq(s ? [s.lo, s.hi] : null, o.spans5[ch + ':' + w], 'span5 ' + ch + ':' + w);
    const js = W.overlaps5(ch, w).map(x => [x.channel, x.mhz]);
    eq(js, o.overlaps5[ch + ':' + w], 'overlaps5 ' + ch + ':' + w);
  }
}
// Anchors from the published tables: ch6 = 2437 MHz, ch14 = 2484, ch36 = 5180, ch165 = 5825.
checked += 4;
if (W.center24(6) !== 2437 || W.center24(14) !== 2484 || W.center5(36) !== 5180 || W.center5(165) !== 5825) { fails++; console.log('ANCHOR FAIL'); }
console.log(`checked=${checked} fails=${fails}`);
process.exit(fails ? 1 : 0);
