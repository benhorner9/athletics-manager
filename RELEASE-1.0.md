# Athletics Manager 1.0 — Shipping Baseline

**Release:** 1.0  
**Baseline date:** 11 September 2026  
**Failsafe branch:** `release/1.0`

This document is the canonical versioning baseline for the shippable game. From this point forward, every current production system starts at **1.0**. Historical filenames such as `home-v2.js`, `inbox-v3.js` or `live-event-broadcast-v4.js` are implementation lineage only; they no longer define the version Ben tracks for the game.

## Locked 1.0 authorities

| System | Shipping version | Production authority |
| --- | --- | --- |
| Core Game Runtime | 1.0 | `scripts/game.js` |
| UI Platform / Shell | 1.0 | `scripts/ui-platform-v1.js` |
| Home | 1.0 | `scripts/home-v2.js` |
| Inbox | 1.0 | `scripts/inbox-v3.js` |
| Squad / National Pool / Athlete Profile | 1.0 | `scripts/squad-athlete-v2.js` |
| Calendar | 1.0 | `scripts/calendar-v2.js` |
| Training | 1.0 | `scripts/training-v2-bootstrap.js` (with `training-v3.js` enhancement only) |
| Scouting | 1.0 | `scripts/scouting-v2-bootstrap.js` (`scouting-v3.js` compatibility only) |
| Competition Journey | 1.0 | `scripts/competition-journey-v2.js` |
| Selection Centre | 1.0 | `scripts/selection-centre-v2.js` + `selection-decision-v3.js` logic |
| Event Flow | 1.0 | `scripts/event-flow-v3.js` |
| Live Events | 1.0 | `scripts/live-event-broadcast-v4.js` + `live-event-engine-v3.js` simulation |
| Event AI | 1.0 | `scripts/event-ai-realism.js` + `event-ai-display.js` |
| Staff / Finance | 1.0 | `scripts/staff-finance-v2.js` |
| Summit Series / Rankings / Qualification / World News | 1.0 | `scripts/world-season-v2.js` |
| Manager Career / My Profile | 1.0 | `scripts/manager-career-v1.js` |
| First-Time Player Experience | 1.0 | `scripts/first-time-experience-v2.js` |
| Alpha Access / Main Menu | 1.0 | `scripts/alpha-menu-gate.js` |
| Sprint Expansion | 1.0 | `scripts/sprint-expansion.js` |
| Endurance Expansion | 1.0 | `scripts/endurance-expansion.js` |

## Versioning rules from 1.0 onward

1. **One authority per system.** Future work edits or replaces the listed authority deliberately; it must not add a second competing screen or renderer over the top.
2. **Small compatible upgrades:** 1.0 → 1.1 → 1.2.
3. **Major redesign/replacement:** move that system to 2.0 only when the existing authority is deliberately superseded.
4. **Product version:** the whole game is Athletics Manager 1.0 at this baseline. Future release numbers are separate from historical implementation-generation names.
5. **Failsafe:** `release/1.0` is the known-good branch. If a later update breaks a system, this baseline is the comparison/rollback point.
6. **No silent authority changes.** A future system upgrade must update `scripts/release-baseline.js` and the regression contract in the same change.

This is the build Ben has approved as shippable.
