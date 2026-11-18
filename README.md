# Velmara After Dark

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/memelljk/velmara-after-dark-2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/memelljk/velmara-after-dark-2/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Velmara is a port city that only really wakes up after the rain starts. You are
Jax Rook, a getaway driver with a empty wallet and a good right foot, and Odile
Vane — the fixer who works out of a pink-lit booth on the Neon Mile — has work.
Twelve jobs long, the work runs from a single parcel pickup in the Old Market
to a five-star escape past the city limits with the harbour vault's cash in
the trunk. Between jobs the city stays open: steal anything with wheels, hold
up pedestrians, run checkpoint races, move courier drops, and try to keep the
VPD's interceptors off your mirrors.

Everything is generated from one seed and runs from static files — no build
step, no network calls. The city is baked into merged geometry, so a whole
neon skyline costs a couple of draw calls, and every sound, from the rain to
the four radio stations, is synthesised live with WebAudio.

## What's in the city

- **12 story missions** in one campaign chain, each with dialogue: First
  Parcel; Nine Minutes to Dock Nine; Indigo Heart; Dock Crew; The Vault Run;
  Market Shakedown; Night Courier; Siren Song; Rooftop Cover; The Ledger;
  Harbor Blockade; and the finale, Velmara Goodbye. Checkpoint races and
  courier runs repeat as side earners.
- **5 districts** — Neon Mile, Harbor, Old Market, The Heights, Dockyards —
  with a harbour of piers, cranes and a vault warehouse, market stalls, and a
  container yard.
- **205 buildings** with lit windows and **648 streetlights**, placed by the
  seeded generator (seed 7) and asserted by the build tests.
- **6 shops**, all walk-in and interactable: Mirella Arms (ammo, armour),
  Fixer Garage (repairs, tuning), Stitch & Co (outfits that raise max
  health), Noodle Nine (meals that heal), Pawn Star (sells your loot),
  St. Mirella Clinic (treatment and surgery).
- **3 safehouses** — Jax's Loft, Harbor Bunk, The Heights Flat — that save
  the game, heal you, and shed a wanted star.
- **4 radio stations** while driving: Bassline FM, Neon Wave, Rain FM and
  Harbor Talk, all synthesised note by note.
- **40 ambient vehicles** at spawn (24 traffic, 16 parked) plus police
  interceptors, and **30 pedestrians** who stroll, flee gunfire, and can be
  robbed at gunpoint.
- A **0–5 star wanted system** with heat that cools when you break line of
  sight, interceptors that chase and ram, foot officers at high stars, a
  BUSTED meter, and WASTED/BUSTED respawns at St. Mirella Hospital for a fee.
- Pistol combat with tracers, reloads and melee; thugs and rooftop gunmen
  who shoot back; loot drops the Pawn Star pays for.
- Live circular minimap, a full city map, title and pause screens, and a
  localStorage save with Continue.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse drag | Orbit camera |
| E (or F) | Talk, enter/exit cars, use shops and safehouses |
| Shift | Sprint on foot |
| Space | Handbrake |
| Mouse click | Shoot pistol (on foot) |
| Q | Melee |
| R | Cycle radio in a car · reload on foot |
| P | Full city map |
| M | Mute |
| Esc | Pause |

## Running it

```sh
node serve.ts            # serves game/ at http://localhost:8080
```

Open the page, press New Game, and go see Odile. To hand the entry in the
make.fun way: `MAKEFUN_OUTPUT_DIR=out node main.ts` copies `game/` and
`screenshots/` to the output folder and writes `dossier.json`.

Screenshots in `screenshots/` are unedited renders posed by the game's own
`?shot=` scenes (see `shots.json` for the rig, lens and intent of each).
