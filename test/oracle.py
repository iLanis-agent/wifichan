"""Independent Wi-Fi channel geometry reference for cross-checking engine.js.
Constants from the published 802.11 channel tables."""
import json, sys
from itertools import combinations

REGIONS = {"us": list(range(1, 12)), "etsi": list(range(1, 14)), "japan": list(range(1, 15))}
BANDS5 = [("UNII-1", [36, 40, 44, 48], False), ("UNII-2A", [52, 56, 60, 64], True),
          ("UNII-2C", [100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144], True),
          ("UNII-3", [149, 153, 157, 161, 165], False)]
BLOCKS40 = [[36, 40], [44, 48], [52, 56], [60, 64], [100, 104], [108, 112], [116, 120],
            [124, 128], [132, 136], [140, 144], [149, 153], [157, 161]]
BLOCKS80 = [[36, 40, 44, 48], [52, 56, 60, 64], [100, 104, 108, 112], [116, 120, 124, 128],
            [132, 136, 140, 144], [149, 153, 157, 161]]
BLOCKS160 = [list(range(36, 65, 4)), list(range(100, 129, 4))]

def center24(ch):
    return 2484 if ch == 14 else 2407 + 5 * ch

def span24(ch):
    return (center24(ch) - 11, center24(ch) + 11)

def center5(ch):
    return 5000 + 5 * ch

def block(ch, width):
    if width == 20:
        return [ch] if any(ch in b[1] for b in BANDS5) else None
    table = {40: BLOCKS40, 80: BLOCKS80, 160: BLOCKS160}.get(width)
    if table is None:
        return None
    return next((b for b in table if ch in b), None)

def span5(ch, width):
    b = block(ch, width)
    if b is None:
        return None
    return (center5(b[0]) - 10, center5(b[-1]) + 10)

def overlap(a1, a2, b1, b2):
    o = min(a2, b2) - max(a1, b1)
    return o if o > 0 else 0

out = {"spans24": {}, "overlaps24": {}, "sets24": {}, "spans5": {}, "overlaps5": {}}
for ch in range(1, 15):
    out["spans24"][ch] = span24(ch)
for region, chs in REGIONS.items():
    for ch in chs:
        res = []
        for other in chs:
            if other == ch:
                continue
            o = overlap(*span24(ch), *span24(other))
            if o > 0:
                res.append([other, o])
        out["overlaps24"][f"{region}:{ch}"] = res
    best = []
    for k in range(1, len(chs) + 1):
        for combo in combinations(chs, k):
            ok = all(overlap(*span24(a), *span24(b)) == 0 for a, b in combinations(combo, 2))
            if ok:
                if not best or len(combo) > len(best[0]):
                    best = [list(combo)]
                elif len(combo) == len(best[0]):
                    best.append(list(combo))
    out["sets24"][region] = best
for ch in [36, 40, 44, 48, 52, 56, 60, 64, 100, 116, 132, 144, 149, 153, 157, 161, 165]:
    for w in (20, 40, 80, 160):
        out["spans5"][f"{ch}:{w}"] = span5(ch, w)
        me = span5(ch, w)
        res = []
        if me is not None:
            for _, chs, _ in BANDS5:
                for other in chs:
                    if other == ch:
                        continue
                    o = overlap(*me, center5(other) - 10, center5(other) + 10)
                    if o > 0:
                        res.append([other, o])
        out["overlaps5"][f"{ch}:{w}"] = res
print(json.dumps(out))
