# Athletics Manager — Final Pre-Live Verification

This document tracks the final release-readiness pass on the development build following the September 2026 stability audit.

## Automated release gate

The normal browserless runtime regression now exercises:

- National Pool call-up, agreement expiry and automatic return to the Pool.
- Scouting V2 assignment creation, weekly progression and due-week resolution.
- Programme Economy V4 Staff and Finance authority/rendering.
- Annual season rollover.
- Olympic Year 4 creation, cycle review and next-cycle continuation.
- Accelerated 40-season / ten-Olympic-cycle career progression invariants.
- Representative Broadcast V4 track and field presentation families that exist in the current discipline set.
- Core route rendering at phone, tablet and desktop viewport widths.

## First finding

The new gate exposed an agreement-expiry defect: the migration helper recreated an agreement whose end week had been reached before the expiry processor could return the athlete to the National Pool. The release branch changes migration so only missing or invalid agreements are created; genuine expired agreements remain available to the expiry authority.

## Gate infrastructure

The standard runtime-smoke watchdog is now 120 seconds so the final release-readiness lifecycle checks can run after the existing full-route smoke sweep. Audit-mode soak testing retains its longer 900-second allowance.

## Scouting V2 weekly integration finding

The release gate also exposed a real cutover defect in Scouting V2. The V2 assignment system was loaded, but it was not connected to the weekly career lifecycle; meanwhile the retired eight-week legacy discovery hook could still call V2's compatibility generator and seed hidden talent without producing the intended assignment outcome.

The Scouting V2 bootstrap now owns weekly scouting progression once V2 is ready. It seeds the first assignment, advances search, assessment, testing, camp, pathway, long-term and communication processors once per career week, and suppresses the retired legacy discovery trigger while V2 is active. The release gate verifies that the first search assignment is created, reaches its due week and resolves to a valid outcome.

## Save compatibility

The release repair does not change the career storage key or save envelope format. `scripts/save-codec.js` remains the existing lossless codec and the fixes migrate through the current career state rather than resetting a save. A real existing career should still be opened on the deployed dev client during the final iPad pass before production promotion.

## Final automated result

The release candidate passed repository hygiene, static asset/load-order regression, Live Event Broadcast V4.6 validation, JavaScript syntax checks and the browserless runtime gate. The release-readiness soak passed National Pool agreement expiry, Scouting V2 assignment progression, Staff/Finance authority, annual and Olympic-cycle rollover, a 40-season / ten-cycle career, representative live-event families and phone/tablet/desktop route structure.

## Manual device sign-off still required

Browserless responsive checks protect route/runtime structure but do not replace real Safari/iPad visual and touch verification. The final dev build must still receive a short manual iPad pass before any production promotion.

`main` is outside this verification task and must remain untouched until explicit release approval.
