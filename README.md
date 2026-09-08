# Athletics Manager

A browser-based national athletics management game.

## Project structure

- `index.html` — lightweight application shell
- `styles/game.css` — core interface styling
- `styles/event-2d.css` — top-down 2D Event Day and live scoreboard styling
- `scripts/game.js` — career simulation, UI and Athletics Engine
- `scripts/event-2d.js` — top-down 2D event renderer, live scoreboards and field-event highlights
- `assets/athlete-portraits.webp` — athlete portrait sprite sheet
- `assets/coach-portraits.webp` — staff portrait sprite sheet
- `assets/facilities.webp` — facility progression artwork
- `assets/first-day.webp` — opening career artwork

The game remains a static site with no build step required and is suitable for GitHub Pages. Existing browser saves continue to use the same local storage data.
