# Athletics Manager

A browser-based national athletics management game.

## Project structure

- `index.html` — lightweight application shell
- `styles/game.css` — core interface styling
- `styles/event-2d.css` — base top-down 2D Event Day and live scoreboard styling
- `styles/polish.css` — final alignment, overflow and responsive polish layer
- `styles/event-2d-refinement.css` — refined one-screen broadcast layout, scoreboard and motion polish
- `scripts/game.js` — career simulation, UI and Athletics Engine
- `scripts/event-2d.js` — base top-down 2D event renderer and Event Day flow
- `scripts/sprint-expansion.js` — Event Expansion I module for the 200m/400m world, qualification, simulation and commentary
- `scripts/polish.js` — final copy, compatibility and interface QA layer
- `scripts/event-2d-refinement.js` — accuracy layer that synchronises 2D visuals, scoreboards, stagger geometry and field-event measurements with live commentary
- `assets/athlete-portraits.webp` — athlete portrait sprite sheet
- `assets/coach-portraits.webp` — staff portrait sprite sheet
- `assets/facilities.webp` — facility progression artwork
- `assets/first-day.webp` — opening career artwork

The game remains a static site with no build step required and is suitable for GitHub Pages. Existing browser saves continue to use the same local storage data.
