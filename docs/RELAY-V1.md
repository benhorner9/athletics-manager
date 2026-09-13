# 4x100m Relay V1

Relay V1 is a development-only athletics system introduced after the 16f5ad55 live release.

## Current scope

- Senior national squad limit: 14 athletes.
- Men's 4x100m and Women's 4x100m.
- Relay-eligible managed athletes: active senior-squad 100m and 200m sprinters of the matching gender.
- Individual and relay entries are independent: an athlete may compete in the 100m and/or 200m and the 4x100m at the same meeting.
- Four ordered relay legs: lead-off, back straight, bend and anchor.
- Staff recommendation considers sprint speed, leg suitability, readiness, relay skill and exchange chemistry.
- Relay performance includes baton/exchange quality and rare exchange errors.
- Relay results and records belong to the nation/team rather than an individual athlete.
- Dedicated live relay track presentation and Gavin Potts relay commentary.

## Meetings in V1

Relay events are added to Spring Grand Prix, European Challenge, Diamond Invitational and World Athletics Cup. Existing careers receive relays only on eligible meetings that have not already passed or completed. If selection for one of those meetings was already locked, the meeting is reopened once so the new relay line-up cannot be silently skipped.

Olympic and Summit Series relay integration are intentionally outside V1. Both have specialist selection/qualification rules and should receive relay-aware implementations rather than inheriting generic behaviour.

## Architecture

Relay disciplines are registered as non-enumerable `DISCIPLINES` properties. This allows event-specific systems to use standard discipline formatting while preventing generic `Object.keys(DISCIPLINES)` loops (especially Summit/world simulation) from automatically treating a four-person team event as an individual discipline.

Public runtime authority: `window.AMRelayV1`.
