# Athlete Management UI Contract

The **National Squad** and **National Pool** views are two states of the same athlete-management surface.

## Layout invariants

- Header, segmented navigation, summary strip, filters and athlete table use the same shared geometry.
- Table column positions must not change when switching between Squad and National Pool.
- Content-driven column sizing must not be used for the desktop/iPad athlete table.
- First-time guidance must not exist on only one of the two views when that would shift the shared page geometry.
- During an athlete-management onboarding step, the active Squad or National Pool view receives the same-height guidance rail.
- Guidance may spotlight a row only when that athlete is actually present in the current view.
- When onboarding guidance is dismissed or completed, it must be removed from both athlete-management roots.

These rules exist so switching between National Squad and National Pool feels like changing a tab within one interface rather than navigating between two independently laid-out pages.
