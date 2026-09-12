# Athlete Attribute Rating Scale

The player-facing athlete model uses event-specific attributes rated from 1 to 20. There is no player-facing Overall rating.

## Scale meaning

- **20 — Exceptional:** genuine world-leading attribute quality. A 20 requires exceptional event-performance evidence and is capped at one attribute per athlete.
- **18–19 — Elite International:** major-final / elite international quality.
- **15–17 — International:** established international-level quality.
- **12–14 — National:** senior national-level quality.
- **9–11 — Domestic:** competitive domestic-level quality.
- **6–8 — Developing:** developing athlete quality or a meaningful weakness.
- **1–5 — Raw:** major weakness or very limited evidence/capability.

## Calibration authority

Visible attribute level is anchored first to objective performance evidence: PB, event-specific national/international/world/Olympic standards and the world-record benchmark. The old hidden Overall value is fallback-only when usable performance evidence does not exist.

Individual attributes vary around the athlete's event-performance level in a deterministic profile shape. Elite caps prevent random variation from manufacturing 19–20 ratings that the athlete's actual event performance does not justify.

The runtime regression audits a generated career and fails if 20 ratings become too common, if any athlete receives multiple 20s, or if the whole database average becomes inflated.
