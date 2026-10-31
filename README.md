# Chip Leverage Map

An interactive night map of the AI chip supply chain between the US, its allies and China.

- **Blue lines:** what China needs from the US (bright) and its allies (faint)
- **Red lines:** what the US needs from China
- **Dotted lines:** chips, servers and tools that got around export controls
- **★ Chokepoints:** items where one country or company makes most of the supply
- **Hollow circles:** US fabs, packaging plants and mineral sites being built to close the gaps

Every item has a source. Smuggling cases are marked convicted, charged, alleged or reported. Data is current as of October 28, 2026.

**Live map:** https://nathanpljohnson.github.io/chip-leverage-map/

## How to use it

- Take the guided tour, or explore the overview.
- Hover over a line to see what it carries. Click it for details and sources.
- Double-click a grouped line to split it into its items. Double-click empty map to regroup.
- Use "List all items" and the Type filter to find anything.

## Project layout

- `data.json` holds the merged dataset (items, US projects, country groups).
- `research/` holds the raw research files and their format (`SCHEMA.md`).
- `src/template.html` and `src/app.js` hold the page. It uses D3 and topojson-client from CDNs.
- `build/countries-50m.json` holds country shapes from [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth).
- `build.py` inlines the data and shapes into one page, `index.html`.

## Build

```bash
python3 build.py
```
