/* WifiChan engine: Wi-Fi channel geometry.
   Frequencies per IEEE 802.11: 2.4 GHz channels are 5 MHz apart starting at
   2412 MHz (ch 1), each 22 MHz wide; ch 14 centers at 2484 (Japan, DSSS only).
   5 GHz channels are 20 MHz wide, center = 5000 + 5 * channel. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WifiChan = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- 2.4 GHz ---
  function center24(ch) {
    if (ch === 14) return 2484;
    return 2407 + 5 * ch; // ch1 -> 2412
  }
  var WIDTH24 = 22; // 802.11b/g/n 20 MHz nominal, 22 MHz spectral mask convention
  function span24(ch) {
    var c = center24(ch);
    return { lo: c - WIDTH24 / 2, hi: c + WIDTH24 / 2, center: c };
  }
  var REGIONS = {
    us:    { label: 'US / FCC (1-11)', channels: [1,2,3,4,5,6,7,8,9,10,11] },
    etsi:  { label: 'Europe / ETSI (1-13)', channels: [1,2,3,4,5,6,7,8,9,10,11,12,13] },
    japan: { label: 'Japan (1-14)', channels: [1,2,3,4,5,6,7,8,9,10,11,12,13,14] }
  };

  // --- 5 GHz ---
  function center5(ch) { return 5000 + 5 * ch; }
  // UNII bands (US/FCC table): 20 MHz channels.
  var BANDS5 = [
    { name: 'UNII-1',   channels: [36, 40, 44, 48], dfs: false },
    { name: 'UNII-2A',  channels: [52, 56, 60, 64], dfs: true },
    { name: 'UNII-2C',  channels: [100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144], dfs: true },
    { name: 'UNII-3',   channels: [149, 153, 157, 161, 165], dfs: false }
  ];
  // Bonded blocks per 802.11 channel-bonding rules: a wide channel is a fixed
  // block of 20 MHz channels, not a span centered on the primary.
  var BLOCKS40 = [[36,40],[44,48],[52,56],[60,64],[100,104],[108,112],[116,120],[124,128],[132,136],[140,144],[149,153],[157,161]];
  var BLOCKS80 = [[36,40,44,48],[52,56,60,64],[100,104,108,112],[116,120,124,128],[132,136,140,144],[149,153,157,161]];
  var BLOCKS160 = [[36,40,44,48,52,56,60,64],[100,104,108,112,116,120,124,128]];
  function bondedBlock(ch, width) {
    if (width === 20) { return bandOf5(ch) ? [ch] : null; }
    var table = width === 40 ? BLOCKS40 : width === 80 ? BLOCKS80 : width === 160 ? BLOCKS160 : null;
    if (!table) return null;
    for (var i = 0; i < table.length; i++) {
      if (table[i].indexOf(ch) >= 0) return table[i];
    }
    return null;
  }
  function span5(ch, width) {
    var block = bondedBlock(ch, width || 20);
    if (!block) return null;
    var lo = center5(block[0]) - 10;
    var hi = center5(block[block.length - 1]) + 10;
    return { lo: lo, hi: hi, center: (lo + hi) / 2, block: block };
  }
  function bandOf5(ch) {
    for (var i = 0; i < BANDS5.length; i++) {
      if (BANDS5[i].channels.indexOf(ch) >= 0) return BANDS5[i];
    }
    return null;
  }

  // --- shared ---
  function overlapMHz(lo1, hi1, lo2, hi2) {
    var o = Math.min(hi1, hi2) - Math.max(lo1, lo2);
    return o > 0 ? Math.round(o * 1000) / 1000 : 0;
  }

  // For a 2.4 GHz channel: every region channel it overlaps, and by how much.
  function overlaps24(ch, regionKey) {
    var region = REGIONS[regionKey] || REGIONS.us;
    var me = span24(ch);
    var out = [];
    region.channels.forEach(function (other) {
      if (other === ch) return;
      var s = span24(other);
      var o = overlapMHz(me.lo, me.hi, s.lo, s.hi);
      if (o > 0) {
        out.push({ channel: other, mhz: o, pct: Math.round((o / WIDTH24) * 1000) / 10 });
      }
    });
    return out;
  }

  // Largest sets of mutually non-overlapping 2.4 GHz channels in a region,
  // found by exhaustive search over the region's channel list.
  function nonOverlappingSets24(regionKey) {
    var region = REGIONS[regionKey] || REGIONS.us;
    var chs = region.channels;
    var best = [];
    var n = chs.length;
    for (var mask = 1; mask < (1 << n); mask++) {
      var set = [];
      for (var i = 0; i < n; i++) if (mask & (1 << i)) set.push(chs[i]);
      var ok = true;
      for (var a = 0; a < set.length && ok; a++) {
        for (var b = a + 1; b < set.length && ok; b++) {
          var s1 = span24(set[a]), s2 = span24(set[b]);
          if (overlapMHz(s1.lo, s1.hi, s2.lo, s2.hi) > 0) ok = false;
        }
      }
      if (ok) {
        if (best.length === 0 || set.length > best[0].length) best = [set];
        else if (set.length === best[0].length) best.push(set);
      }
    }
    return best;
  }

  // 5 GHz: which channels a wide channel overlaps (primary + bonded secondaries).
  function overlaps5(ch, width) {
    var me = span5(ch, width);
    var out = [];
    if (!me) return out;
    BANDS5.forEach(function (b) {
      b.channels.forEach(function (other) {
        if (other === ch) return;
        var s = span5(other, 20);
        var o = overlapMHz(me.lo, me.hi, s.lo, s.hi);
        if (o > 0) out.push({ channel: other, mhz: o, band: b.name, dfs: b.dfs });
      });
    });
    return out;
  }

  return {
    center24: center24, span24: span24, REGIONS: REGIONS,
    center5: center5, span5: span5, BANDS5: BANDS5, bandOf5: bandOf5,
    overlapMHz: overlapMHz, overlaps24: overlaps24, bondedBlock: bondedBlock,
    nonOverlappingSets24: nonOverlappingSets24, overlaps5: overlaps5
  };
});
