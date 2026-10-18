# Region 3 ICT — Industry Development Dashboard

A static dashboard that visualizes digital initiative budgets, obligations, and performance metrics from Google Sheets. It provides three views: a main chart dashboard, a Per UACS view grouped by object code, and a detailed budget table.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- [Chart.js](https://www.chartjs.org/) (CDN) for charts
- [Feather Icons](https://feathericons.com/) (CDN) for icons
- [Tailwind CSS](https://tailwindcss.com/) for utilities, compiled to `tailwind.css`

No framework, bundler, or backend is required.

## Project Structure

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, views, modal, and script order |
| `tailwind.css` | Compiled Tailwind output (generated) |
| `input.css` | Tailwind entry point |
| `index.css` | Custom components, scrollbars, animations, print rules |
| `utils.js` | Shared formatting, escaping, and icon helpers |
| `sheets.js` | Fetches and normalizes Google Sheets data |
| `charts.js` | Main dashboard charts and activity list |
| `logic.js` | Table modal, filters, and table rendering |
| `projlogic.js` | Per UACS view switching |
| `projcharts.js` | Per UACS charts and BUR list |
| `tailwind.config.js` | Tailwind content and theme configuration |
| `package.json` | CSS build script |

## Getting Started

1. Clone or copy the project files into a directory.
2. Serve the directory with any static file server. Loading via `file://` may be blocked by browser security policies.
3. Open `index.html` through the server. Data loads automatically from Google Sheets.

### Rebuilding Tailwind CSS

Install dependencies and rebuild after changing classes in HTML or JavaScript:

```bash
npm install
npm run build:css
```

The build writes a minified `tailwind.css`.

## Data Source

Data is read from a single public Google Sheet configured in `SHEET_ID` at the top of `sheets.js`.

Two tabs are required, named exactly:

- **Funds** — totals, allocation by program, obligation distribution, unobligated balances, and the detail table.
- **Per UACS** — allocation, obligation, and unobligated balances by object code.

Columns are resolved by header name, not position. Renaming or reordering columns is supported as long as the header matches one of the aliases defined in `sheets.js`. Missing columns are reported in the browser console.

Required Funds headers: `Component Program`, `Activity`, `Specific Activity`, `Sub-ARO`, `Allocation`, `Obligation`, `BUR`, `Unobligated Balances`.

Required Per UACS headers additionally include `Object Code` and `Object Name`.

## How It Works

All scripts are deferred and loaded in dependency order: `utils.js` → `sheets.js` → `charts.js` → `logic.js` → `projlogic.js` → `projcharts.js`.

`sheets.js` fetches both tabs and dispatches two custom events:

- `projectionDataReady` — Per UACS data for the projection view.
- `dataReady` — Funds data for the main charts and table.

The remaining scripts listen for these events and render their respective views. View changes are broadcast through `projectionViewChanged`, `projectionViewShown`, `projectionViewHidden`, and `tableViewClosed`.

## Notes and Limitations

- Chart.js and Feather Icons load from public CDNs; an internet connection is required. Missing libraries are logged to the console and degrade gracefully.
- The dashboard is read-only; all data edits happen in Google Sheets.
- There are no automated tests or lint configuration.
- CSS is committed as compiled output; rebuild it whenever new Tailwind classes are added.
