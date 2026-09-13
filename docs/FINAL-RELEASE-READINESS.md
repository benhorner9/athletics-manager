# Athletics Manager — Final Pre-Live Verification

This document tracks the final release-readiness pass on the development build following the September 2026 stability audit.

## Automated release gate

The normal browserless runtime regression now exercises:

- National Pool call-up, agreement expiry and automatic return to the Pool.
- Eight-week scouting discovery and Pool insertion.
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

## Manual device sign-off still required

Browserless responsive checks protect route/runtime structure but do not replace real Safari/iPad visual and touch verification. The final dev build must still receive a short manual iPad pass before any production promotion.

`main` is outside this verification task and must remain untouched until explicit release approval.
