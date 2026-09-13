# Programme Economy & Management Systems V2

## Authority

`window.AMProgrammeEconomy` / `scripts/programme-economy-v2.js` is the canonical authority for player-programme finance, funded athlete agreements, staff employment contracts, the staff market and facility operating state.

The current cash balance remains `s.funding` for save compatibility. Every new economy movement is recorded through the shared `s.finance.ledger`. Per-nation programme state lives in `s.programmeEconomies[nation]` and is versioned.

## Compatibility boundary

Existing gameplay systems remain authoritative for performance simulation. The economy layer does **not** add a second competition-performance modifier. Facility condition feeds the existing simulation through the canonical `facilityLevel()` compatibility adapter. Existing `s.staff` levels remain the compatibility bridge for training/performance while named staff contracts and role-specific attributes live in Programme Economy V2.

## Weekly order

1. Existing gameplay/training week is processed.
2. Programme Economy processes facility construction and condition.
3. Athlete payroll is charged.
4. Staff payroll is charged.
5. Facility upkeep is charged.
6. Performance operations are charged.
7. Contract expiry and financial-health rules are resolved.
8. Every movement is written to the ledger and persisted by the normal save cycle.

## Annual order

The established season rollover remains authoritative for federation core/performance funding. Programme Economy wraps that rollover to update board financial confidence, refresh the staff market and run the simplified AI-nation economy. It must not duplicate the existing grant award.

## Athlete agreements

National programme status and club affiliation are separate. A funded agreement contains status, duration, guaranteed annual funding and medal-bonus rate. Expiry or release returns the athlete to club-led/National Pool activity without deleting the athlete or career history.

## Staff

Staff are named people with role-specific 1–20 capabilities, reputation, style, salary expectations and employment contracts. There is no player-facing single staff OVR in the new market. Existing staff migrate in place.

## Facilities

Facilities have actual level, condition, capacity, upkeep and construction state. Effective level is condition-adjusted and is the only value exposed back to existing performance logic.

## Financial safety

Health states are Healthy, Watch, Restricted and Critical. Critical programmes restrict major new commitments and may receive one contextual emergency stabilisation intervention per season rather than an instant cash-zero game over.

## Long careers

Funding, salaries and upkeep use controlled 2% annual inflation capped at 2.2x the initial scale. AI programmes use a simplified annual budget model so the same concepts can later support playable nations without simulating every AI transaction weekly.

## Migration

Existing facilities, named staff, squad members, funding and legacy finance history are retained. Migration is versioned through `s.programmeEconomies[nation].migration`; no existing career is required to restart.
