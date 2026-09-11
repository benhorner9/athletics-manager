# Athletics Manager schedule invariants

The season calendar has multiple systems that can create or move activities. These rules prevent two progression-gated Event Day authorities from owning the same career week.

## Summit Series reserved weeks

Summit Series rounds are fixed at Weeks **14, 20, 26, 32, 38 and 44**.

A normal `competition`, `championship` or `olympics` meeting must not be moved onto one of those weeks by onboarding, migrations or future schedule-generation changes.

For the first-season guided schedule, the Spring Grand Prix is moved to **Week 13**, leaving Week 14 exclusively for Summit Series 1.

## Runtime recovery

Schedule data from an older save may already contain a collision. Runtime code must therefore remain defensive:

- Summit owns the Competition route while a Summit round is the active or remembered Event Day.
- A meeting with official results for every scheduled discipline must reconcile to completed state.
- Returning Home from a completed Summit round clears the remembered Summit Event Day route.

These runtime rules are recovery safeguards; they do not replace collision-free schedule generation.